/**
 * Measures whether two documents can agree on a theme.
 *
 * The theme is stored twice — next-themes’ `kami-theme` key and the settings object —
 * and both are shared between documents. When the reconciler compared the two values and
 * re-imposed its own whenever they differed, two tabs of the site argued forever: tab A
 * wrote light, the storage event flipped tab B, tab B wrote dark back, and `<html>`
 * alternated until one of them was closed. Screenshots cannot show that, and neither can
 * a single-document test — so this drives **two documents on one origin** through the
 * DevTools protocol and counts how often the theme class is written.
 *
 * An iframe is used rather than a second tab on purpose: background tabs are throttled in
 * headless Chrome, and the fight is a foreground behaviour.
 *
 * It needs Chrome and a running server, so it is not part of `npm run check`:
 *
 *   npm run build && npm start &
 *   npm run audit:theme-stability
 *
 * Environment:
 *   BASE_URL     origin to test (default NEXT_PUBLIC_SITE_URL or http://localhost:9000)
 *   ROUTE        page to test (default /explore)
 *   CHROME_PATH  override the browser binary
 *   SETTLE_MS    quiet period that counts as settled (default 6000)
 */

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";

const PORT = 9413;
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

const baseUrl = (process.env.BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:9000").replace(/\/$/, "");
const route = process.env.ROUTE || "/explore";
const settleMs = Number(process.env.SETTLE_MS || 6000);
const pageUrl = baseUrl + route;

const chrome = spawn(chromePath, [
  "--headless=new",
  "--remote-debugging-port=" + PORT,
  "--user-data-dir=/tmp/kami-audit-theme-stability",
  "--no-first-run",
  "--no-default-browser-check",
  "--window-size=1300,900",
  "--disable-background-timer-throttling",
  "--disable-renderer-backgrounding",
  "--disable-backgrounding-occluded-windows",
  "about:blank",
], { stdio: "ignore" });

/** The class writes on <html>, in order, for one document. */
const OBSERVE = `(() => {
  window.__themeLog = [];
  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.attributeName !== "class") continue;
      window.__themeLog.push(document.documentElement.className.split(" ").pop());
    }
  }).observe(document.documentElement, { attributes: true });
  return document.documentElement.className.split(" ").pop();
})()`;

/** Which document an interaction is aimed at: the page itself, or the second one. */
const pickDocument = (where) =>
  where === "second"
    ? 'document.getElementById("second-document").contentDocument'
    : "document";

const clickOption = (where) => `(() => {
  const doc = ${pickDocument(where)};
  const button = doc.querySelector('button[aria-label="Settings"]');
  if (!button) return "no settings button";
  button.click();
  return "opened the menu";
})()`;

const chooseOption = (where, label) => `(() => {
  const doc = ${pickDocument(where)};
  const dialog = doc.querySelector('[role="dialog"][aria-label="Settings"]');
  if (!dialog) return "no dialog";
  const option = [...dialog.querySelectorAll("button")].find((node) => node.textContent.trim() === "${label}");
  if (!option) return "no option";
  option.click();
  return "chose ${label}";
})()`;

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

async function main() {
  await ready();
  const list = await (await fetch("http://127.0.0.1:" + PORT + "/json/list")).json();
  const target = list.find((entry) => entry.type === "page");

  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });

  let sequence = 0;
  const pending = new Map();
  socket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      pending.get(message.id)(message);
      pending.delete(message.id);
    }
  };
  const send = (method, params = {}) =>
    new Promise((resolve) => {
      const id = ++sequence;
      pending.set(id, (message) => resolve(message.result ?? message.error));
      socket.send(JSON.stringify({ id, method, params }));
    });
  const evaluate = async (expression, contextId) => {
    const result = await send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      ...(contextId ? { contextId } : {}),
    });
    if (result?.exceptionDetails) return "threw: " + (result.exceptionDetails.exception?.description ?? "").split("\n")[0];
    return result?.result?.value;
  };

  await send("Page.enable");
  await send("Runtime.enable");
  await send("Page.navigate", { url: pageUrl });
  await sleep(8000);

  const first = await evaluate(OBSERVE);
  console.log("route        " + pageUrl);
  console.log("document 1    <html class=\"" + first + "\">");

  // The second document: same origin, same localStorage, its own copy of the settings.
  await evaluate(`(() => {
    const frame = document.createElement("iframe");
    frame.id = "second-document";
    frame.src = "${route}";
    frame.style.cssText = "position:fixed;left:0;top:0;width:1000px;height:700px;z-index:99999;border:0";
    document.body.appendChild(frame);
    return "added";
  })()`);
  await sleep(9000);

  const frameTree = (await send("Page.getFrameTree")).frameTree;
  const frames = [];
  (function walk(node) {
    frames.push({ id: node.frame.id, url: node.frame.url });
    (node.childFrames ?? []).forEach(walk);
  })(frameTree);
  const inner = frames.find((frame) => frame.id !== frameTree.frame.id && frame.url.includes(route));
  if (!inner) {
    console.error("The second document never loaded — cannot measure.");
    process.exit(1);
  }

  const world = await send("Page.createIsolatedWorld", { frameId: inner.id, worldName: "theme-stability" });
  const context = world?.executionContextId;
  const second = await evaluate(OBSERVE, context);
  console.log("document 2    <html class=\"" + second + "\">");
  console.log("");

  // The two clicks that used to start the argument: one document picks Light, the other
  // picks Dark, and each keeps its own settings while sharing one stored theme.
  await evaluate(clickOption("second"));
  await sleep(900);
  console.log("document 2    " + (await evaluate(chooseOption("second", "Light"))));
  await sleep(2000);

  await evaluate(clickOption("top"));
  await sleep(900);
  console.log("document 1    " + (await evaluate(chooseOption("top", "Dark"))));
  console.log("");

  await sleep(settleMs);
  const settled = JSON.parse((await evaluate("JSON.stringify(window.__themeLog)")) ?? "[]");
  const settledSecond = JSON.parse((await evaluate("JSON.stringify(window.__themeLog)", context)) ?? "[]");

  await sleep(settleMs);
  const after = JSON.parse((await evaluate("JSON.stringify(window.__themeLog)")) ?? "[]");
  const afterSecond = JSON.parse((await evaluate("JSON.stringify(window.__themeLog)", context)) ?? "[]");

  // Two clicks, two class writes each — anything above a small bound is an exchange that
  // is still going, even if a sampling window happens to fall between two of its rounds.
  const WRITE_BUDGET = 6;
  const quiet = after.length === settled.length && afterSecond.length === settledSecond.length;
  const bounded = after.length <= WRITE_BUDGET && afterSecond.length <= WRITE_BUDGET;
  const finalFirst = await evaluate("document.documentElement.className.split(\" \").pop()");
  const finalSecond = await evaluate("document.documentElement.className.split(\" \").pop()", context);
  const agree = finalFirst === finalSecond;

  console.log("document 1    " + after.length + " class writes: " + JSON.stringify(after.slice(-8)));
  console.log("document 2    " + afterSecond.length + " class writes: " + JSON.stringify(afterSecond.slice(-8)));
  console.log("quiet for " + settleMs + " ms?  " + (quiet ? "yes" : "no — still flipping"));
  console.log("within " + WRITE_BUDGET + " writes?      " + (bounded ? "yes" : "no — that is an argument, not a switch"));
  console.log("both on        " + (agree ? finalFirst : finalFirst + " vs " + finalSecond));
  console.log("");

  socket.close();
  chrome.kill("SIGKILL");

  if (!quiet || !bounded || !agree) {
    console.error("FAIL - the two documents never settled. This is the flicker: <html> keeps flipping.");
    process.exit(1);
  }
  console.log("PASS - the exchange ends after one round and both documents agree.");
}

main().catch((error) => {
  console.error(error);
  chrome.kill("SIGKILL");
  process.exit(1);
});
