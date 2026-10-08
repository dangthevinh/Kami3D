#!/usr/bin/env node
/**
 * How much does a 3D page actually draw when nobody is touching it?
 *
 *   npm run audit:frames                        # the species page, 5-second idle window
 *   ROUTE=/landmarks/eiffel-tower npm run audit:frames
 *   IDLE_MS=8000 npm run audit:frames
 *
 * The viewer's frame loop is the difference between a page that keeps a laptop fan spinning and one
 * that costs nothing while a reader reads. Nothing else in this project measures it: `audit:perf`
 * measures load, `audit:mobile` measures layout, and neither can see whether the canvas is still
 * rendering after the visitor stopped moving.
 *
 * It reads **three's own counters** through the R3F store attached to the canvas element
 * (`gl.info.render.frame`, `.calls`, `.triangles`), so the number is what the renderer did rather
 * than what a wrapper thinks it did.
 *
 * Requires Chrome and a running server, like the other audits:
 *
 *   npm run dev &        (or npm run build && npm start)
 *   npm run audit:frames
 *
 * Environment: BASE_URL, ROUTE, IDLE_MS, CHROME_PATH.
 */

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";

// A port and a profile directory of this run's own: an interrupted run can leave a Chrome holding the
// debugging port, and the next one then silently talks to the wrong browser (measured: the socket
// opens and closes with code 1006 before the first command is answered).
const PORT = Number(process.env.CDP_PORT || 9416 + (process.pid % 200));
const PROFILE = "/tmp/kami-audit-frames-" + process.pid;
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

const baseUrl = (process.env.BASE_URL || "http://localhost:9000").replace(/\/$/, "");
const route = process.env.ROUTE || "/animal/lion";
const idleMs = Number(process.env.IDLE_MS || 5000);

/** Three's counters, read from the store R3F hangs off the canvas element. */
const COUNTERS = `(() => {
  const canvas = document.querySelector("canvas");
  if (!canvas) return JSON.stringify({ present: false });
  const attached = canvas.__r3f;
  const store = attached && (attached.root || attached.store);
  const state = store && store.getState ? store.getState() : null;
  if (!state) return JSON.stringify({ present: true, store: false });
  const info = state.gl.info;
  return JSON.stringify({
    present: true,
    store: true,
    frames: info.render.frame,
    calls: info.render.calls,
    triangles: info.render.triangles,
    dpr: state.viewport && state.viewport.dpr,
    frameloop: state.frameloop,
  });
})()`;

/** Click the toolbar's auto-spin toggle so the idle window really is idle. */
const STOP_SPIN = `(() => {
  const button = document.querySelector('button[title="Auto-spin"]');
  if (!button) return "no auto-spin button";
  if (button.getAttribute("aria-pressed") === "true") button.click();
  return "auto-spin " + button.getAttribute("aria-pressed");
})()`;

const chrome = spawn(process.env.CHROME || chromePath, [
  "--headless=new",
  "--remote-debugging-port=" + PORT,
  "--user-data-dir=" + PROFILE,
  "--no-first-run",
  "--no-default-browser-check",
  "--hide-scrollbars",
  "--window-size=1440,900",
  "about:blank",
], { stdio: "ignore" });

async function ready() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      await fetch("http://127.0.0.1:" + PORT + "/json/version");
      return;
    } catch {
      await sleep(500);
    }
  }
  throw new Error("Chrome never opened its debugging port");
}

await ready();
const list = await (await fetch("http://127.0.0.1:" + PORT + "/json/list")).json();
const target = list.find((entry) => entry.type === "page");
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.onopen = resolve;
  socket.onerror = reject;
});

let sequence = 0;
const pending = new Map();

/**
 * A request the page will never answer is failed, not left waiting.
 *
 * The same fault `scripts/render-model-previews.mjs` was fixed for: `send()` below can only resolve
 * from a message, so a DevTools socket that closes - or a Chrome that dies - left every caller
 * waiting on a promise nothing could settle, and the run looked like a hang with no browser running.
 * Logging the close was not enough; the wait has to end.
 */
const failPending = (reason) => {
  const waiting = [...pending.entries()];
  pending.clear();
  for (const [id, settle] of waiting) settle({ id, error: { message: reason } });
};

socket.onmessage = (event) => {
  let message;
  try {
    message = JSON.parse(event.data);
  } catch (error) {
    console.error("unparseable CDP message:", String(error.message), String(event.data).slice(0, 80));
    return;
  }
  if (process.env.DEBUG_CDP) console.error("cdp <-", message.id ?? message.method ?? "?", pending.has(message.id) ? "(pending)" : "");
  if (message.id && pending.has(message.id)) {
    pending.get(message.id)(message);
    pending.delete(message.id);
  }
};
socket.onclose = (event) => {
  console.error("cdp socket closed:", event.code, event.reason);
  failPending("the DevTools socket closed (" + event.code + ")");
};
socket.onerror = (event) => {
  console.error("cdp socket error:", event.message ?? String(event.type));
  failPending("the DevTools socket errored");
};
const SEND_TIMEOUT_MS = 30000;
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = ++sequence;
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(method + " timed out after " + SEND_TIMEOUT_MS + " ms"));
    }, SEND_TIMEOUT_MS);
    pending.set(id, (message) => {
      clearTimeout(timer);
      if (message.error) reject(new Error(method + ": " + message.error.message));
      else resolve(message.result ?? message.error);
    });
    socket.send(JSON.stringify({ id, method, params }));
  });
const evaluate = async (expression) => {
  const result = await send("Runtime.evaluate", { expression, returnByValue: true });
  return result?.exceptionDetails ? null : result?.result?.value;
};

await send("Page.enable");
await send("Runtime.enable");
await send("Page.navigate", { url: baseUrl + route });

console.log("route      :" + " " + route);
console.log("idle window: " + idleMs + " ms");

// Wait for the canvas, then for the model: the viewer mounts late on purpose (MountWhenVisible).
let opened = null;
for (let attempt = 0; attempt < 60; attempt += 1) {
  await sleep(1000);
  const raw = await evaluate(COUNTERS);
  opened = raw ? JSON.parse(raw) : null;
  if (opened?.store && opened.frames > 0) break;
}

if (!opened?.present) {
  console.error("No canvas on this route — the viewer may be below the fold or gated.");
  chrome.kill("SIGKILL");
  process.exit(2);
}
if (!opened.store) {
  console.error("The canvas has no readable R3F store; the counters cannot be read on this build.");
  chrome.kill("SIGKILL");
  process.exit(3);
}

// Let the load settle, stop the auto-spin, then let the damping decay before the window opens.
await sleep(1500);
const spin = await evaluate(STOP_SPIN);
await sleep(2500);

const before = JSON.parse(await evaluate(COUNTERS));
await sleep(idleMs);
const after = JSON.parse(await evaluate(COUNTERS));

const frames = after.frames - before.frames;
const perSecond = frames / (idleMs / 1000);

console.log("");
console.log("frameloop  : " + after.frameloop);
console.log("dpr        : " + after.dpr);
console.log("draw calls : " + after.calls + " per frame, " + after.triangles.toLocaleString("en-US") + " triangles");
console.log("auto-spin  : " + spin);
console.log("");
console.log("frames drawn in the idle window : " + frames + "  (" + perSecond.toFixed(1) + "/s)");
console.log(
  perSecond < 1
    ? "VERDICT: the canvas stops rendering when nothing moves."
    : "VERDICT: the canvas renders continuously while idle — " + Math.round(perSecond * 60) + " frames a minute nobody asked for.",
);

chrome.kill("SIGKILL");
