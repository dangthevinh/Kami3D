#!/usr/bin/env node
/**
 * Proves the hybrid rule in a real browser: `/map?species=lion`, click the toggle, and check what
 * happens to the map - at a laptop width and at a phone width.
 *
 *   npm run build && npm start &
 *   npm run audit:hybrid
 *
 * The rule being checked is not visual. A map is a WebGL context and the 3D viewer is a second one,
 * so on a phone opening the viewer must **unmount** the map rather than hide it: a canvas with
 * `display: none` is still a context, and this machine's headless Chrome has no WebGL anyway, which
 * is why the assertion is about the map's DOM subtree rather than about pixels.
 *
 * It selects the species through the URL (`?species=lion`) instead of clicking a shape, because
 * clicking a shape needs a rendered map and this browser has none. That is the same entry point a
 * shared link uses, so it exercises the real code path.
 *
 * Environment: BASE_URL (default http://127.0.0.1:9000), CHROME_PATH, PORT.
 */

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";

const PORT = Number(process.env.PORT || 9412);
const baseUrl = (process.env.BASE_URL || "http://127.0.0.1:9000").replace(/\/$/, "");
const chromePath = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].filter(Boolean).find((candidate) => existsSync(candidate));

if (!chromePath) {
  console.error("No Chrome found. Set CHROME_PATH to a Chrome or Chromium binary.");
  process.exit(1);
}

const chrome = spawn(
  chromePath,
  [
    "--headless=new",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-gpu",
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${process.env.CHROME_PROFILE || "/tmp/kami-hybrid-profile"}`,
    "about:blank",
  ],
  { stdio: "ignore" },
);

async function devtoolsReady() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      if ((await fetch(`http://127.0.0.1:${PORT}/json/version`)).ok) return;
    } catch {
      // Not up yet.
    }
    await sleep(250);
  }
  throw new Error("Chrome never exposed its DevTools endpoint");
}

/** One viewport, one answer. */
async function inspect(width, height) {
  const target = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: "PUT" })).json();
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.onopen = resolve;
    socket.onerror = reject;
  });

  let messageId = 0;
  const pending = new Map();
  socket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      pending.get(message.id)(message.result);
      pending.delete(message.id);
    }
  };
  const send = (method, params = {}) =>
    new Promise((resolve) => {
      const id = ++messageId;
      pending.set(id, resolve);
      socket.send(JSON.stringify({ id, method, params }));
    });

  const evaluate = async (expression) => {
    const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    return result?.result?.value;
  };

  try {
    await send("Page.enable");
    await send("Runtime.enable");
    await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 1024 });
    await send("Page.navigate", { url: `${baseUrl}/map?species=lion` });
    await sleep(Number(process.env.SETTLE_MS || 6000));

    const probe = `({
      toggle: Boolean(document.querySelector('[aria-controls="hybrid-3d"]')),
      slotChildren: document.querySelector('[data-map-slot]')?.children.length ?? -1,
      maplibreCanvases: document.querySelectorAll('.maplibregl-canvas').length,
      asidePanel: Boolean(document.querySelector('#hybrid-3d')),
    })`;

    const before = await evaluate(probe);

    await evaluate(`document.querySelector('[aria-controls="hybrid-3d"]')?.click(); true`);
    await sleep(Number(process.env.SETTLE_MS || 6000));

    const after = await evaluate(`({
      expanded: document.querySelector('[aria-controls="hybrid-3d"]')?.getAttribute('aria-expanded'),
      slotChildren: document.querySelector('[data-map-slot]')?.children.length ?? -1,
      maplibreCanvases: document.querySelectorAll('.maplibregl-canvas').length,
      asidePanel: Boolean(document.querySelector('#hybrid-3d')),
      viewerText: document.body.innerText.includes('3D view'),
      unmountNote: document.body.innerText.includes('The map is unmounted while this is open'),
      keepNote: document.body.innerText.includes('The map keeps running behind this panel'),
    })`);

    return { before, after };
  } finally {
    socket.close();
    await fetch(`http://127.0.0.1:${PORT}/json/close/${target.id}`).catch(() => undefined);
  }
}

try {
  await devtoolsReady();

  const laptop = await inspect(1280, 900);
  const phone = await inspect(420, 860);

  console.log("laptop (1280x900)");
  console.log("  toggle present:", laptop.before.toggle, "| map slot children before:", laptop.before.slotChildren);
  console.log(
    "  after click - expanded:",
    laptop.after.expanded,
    "| viewer in the aside:",
    laptop.after.asidePanel,
    "| map slot children:",
    laptop.after.slotChildren,
    "| note:",
    laptop.after.keepNote ? "keeps running" : "unmounted wording",
  );
  console.log("phone (420x860)");
  console.log("  toggle present:", phone.before.toggle, "| map slot children before:", phone.before.slotChildren);
  console.log(
    "  after click - expanded:",
    phone.after.expanded,
    "| viewer in the map slot:",
    phone.after.slotChildren > 0 && !phone.after.asidePanel,
    "| map slot children:",
    phone.after.slotChildren,
    "| note:",
    phone.after.unmountNote ? "map unmounted wording" : "wrong wording",
  );

  const ok =
    laptop.before.toggle &&
    laptop.after.expanded === "true" &&
    laptop.after.asidePanel &&
    laptop.after.slotChildren > 0 &&
    laptop.after.keepNote &&
    phone.before.toggle &&
    phone.after.expanded === "true" &&
    phone.after.viewerText &&
    !phone.after.asidePanel &&
    phone.after.unmountNote;

  console.log(ok ? "PASS: two contexts on a laptop, one on a phone." : "FAIL: see the lines above.");
  process.exitCode = ok ? 0 : 1;
} finally {
  chrome.kill();
}
