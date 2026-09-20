/**
 * Measures what a real browser actually downloads and paints.
 *
 * `npm run build` reports "First Load JS", but that number is an accounting of a
 * route's chunk graph, not a network log: it excludes async chunks and says
 * nothing about *when* a chunk is fetched. Twice now that gap hid a regression —
 * Clerk's UI arriving on every page for signed-out visitors, and the 3D bundles
 * racing the first paint — so this script drives headless Chrome over the
 * DevTools protocol and reports the honest numbers:
 *
 *   - TTFB / FCP / LCP / CLS measured in the page
 *   - JavaScript transferred *before the load event* (what a visitor waits for)
 *     versus after it (what streams in behind an already usable page)
 *
 * It needs Chrome and a running production server, so it is deliberately not part
 * of `npm run check`:
 *
 *   npm run build && npm start &
 *   npm run audit:perf
 *
 * Environment:
 *   CHROME_PATH  override the browser binary
 *   ROUTES       comma-separated paths (default: the six public surfaces)
 *   BASE_URL     origin to test (default: NEXT_PUBLIC_SITE_URL or :9000)
 *   THROTTLE=1   emulate Slow 4G with a 4x CPU slowdown
 */

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";

const PORT = 9411;
const DEFAULT_ROUTES = ["/", "/explore", "/animal/lion", "/quiz", "/leaderboard", "/about"];

const CANDIDATES = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].filter(Boolean);

const chromePath = CANDIDATES.find((candidate) => existsSync(candidate));
if (!chromePath) {
  console.error("No Chrome found. Set CHROME_PATH to a Chrome or Chromium binary.");
  process.exit(1);
}

const baseUrl = (process.env.BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:9000").replace(/\/$/, "");
const routes = (process.env.ROUTES || DEFAULT_ROUTES.join(",")).split(",").map((route) => route.trim()).filter(Boolean);
const throttled = process.env.THROTTLE === "1";

const chrome = spawn(
  chromePath,
  [
    "--headless=new",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-gpu",
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${process.env.CHROME_PROFILE || "/tmp/kami-audit-profile"}`,
    "about:blank",
  ],
  { stdio: "ignore" },
);

async function devtoolsReady() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (response.ok) return;
    } catch {
      // Not up yet.
    }
    await sleep(250);
  }
  throw new Error("Chrome never exposed its DevTools endpoint");
}

async function openTarget() {
  const response = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: "PUT" });
  return response.json();
}

/** One measurement against one URL. */
async function measure(url) {
  const target = await openTarget();
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

  try {
    await send("Page.enable");
    await send("Runtime.enable");
    await send("Network.enable");
    // Every route is measured as a first visit: without this the second route in
    // a run reports the framework chunks as 0 bytes, they are already cached.
    await send("Network.setCacheDisabled", { cacheDisabled: true });
    if (throttled) {
      await send("Network.emulateNetworkConditions", {
        offline: false,
        latency: 150,
        downloadThroughput: (1.6 * 1024 * 1024) / 8,
        uploadThroughput: (750 * 1024) / 8,
      });
      await send("Emulation.setCPUThrottlingRate", { rate: 4 });
    }
    await send("Page.addScriptToEvaluateOnNewDocument", {
      source: `window.__lcp = 0; window.__cls = 0;
        new PerformanceObserver((list) => { for (const entry of list.getEntries()) window.__lcp = entry.startTime; })
          .observe({ type: "largest-contentful-paint", buffered: true });
        new PerformanceObserver((list) => { for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__cls += entry.value; })
          .observe({ type: "layout-shift", buffered: true });`,
    });

    await send("Page.navigate", { url });
    // Long enough for anything a page defers to an idle callback to have started,
    // so the "after load" column is the real trailing cost, not a truncated view.
    await sleep(Number(process.env.SETTLE_MS || 9000));

    const { result } = await send("Runtime.evaluate", {
      expression: `JSON.stringify({
        resources: performance.getEntriesByType("resource").map((entry) => ({
          name: entry.name.replace(location.origin, ""),
          bytes: entry.transferSize,
          end: Math.round(entry.responseEnd),
        })),
        nav: (() => {
          const nav = performance.getEntriesByType("navigation")[0];
          return {
            ttfb: Math.round(nav.responseStart),
            fcp: Math.round(performance.getEntriesByName("first-contentful-paint")[0]?.startTime ?? 0),
            load: Math.round(nav.loadEventEnd),
          };
        })(),
        lcp: Math.round(window.__lcp),
        cls: Number(window.__cls.toFixed(4)),
      })`,
      returnByValue: true,
    });

    const data = JSON.parse(result.value);
    const scripts = data.resources.filter((entry) => entry.name.endsWith(".js"));
    const beforeLoad = scripts.filter((entry) => entry.end <= data.nav.load);
    const total = data.resources.reduce((sum, entry) => sum + entry.bytes, 0);

    return {
      route: url.replace(baseUrl, "") || "/",
      ttfb: data.nav.ttfb,
      fcp: data.nav.fcp,
      lcp: data.lcp,
      cls: data.cls,
      load: data.nav.load,
      requests: data.resources.length,
      jsBeforeLoadKb: +(beforeLoad.reduce((sum, entry) => sum + entry.bytes, 0) / 1024).toFixed(1),
      jsTotalKb: +(scripts.reduce((sum, entry) => sum + entry.bytes, 0) / 1024).toFixed(1),
      totalKb: +(total / 1024).toFixed(1),
      deferred: scripts
        .filter((entry) => entry.end > data.nav.load)
        .sort((a, b) => b.bytes - a.bytes)
        .slice(0, 4)
        .map((entry) => `${(entry.bytes / 1024).toFixed(1)}kB@${entry.end}ms`),
    };
  } finally {
    socket.close();
  }
}

/**
 * Fails loudly rather than reporting zeroes for a server that is not there.
 *
 * `redirect: "manual"` matters when Clerk's middleware is active: in dev mode it
 * answers a cookieless request with its handshake redirect, and a client that
 * follows redirects without keeping cookies loops until it gives up. A real
 * browser completes the handshake (two extra round trips to Clerk, which is worth
 * knowing about when reading the TTFB column) and a crawler that keeps cookies
 * does too.
 */
async function assertServerIsUp() {
  try {
    const response = await fetch(baseUrl, { headers: { accept: "text/html" }, redirect: "manual" });
    const html = await response.text();
    const hasNextAssets = html.includes("/_next/");
    if (!hasNextAssets && !(response.status >= 300 && response.status < 400)) {
      throw new Error(`${baseUrl} answered ${response.status} without Next assets`);
    }
  } catch (error) {
    const cause = error.cause?.message ? ` (${error.cause.message})` : "";
    console.error(`Nothing to measure at ${baseUrl}: ${error.message}${cause}`);
    console.error("Build and start the app first: npm run build && npm start");
    process.exit(1);
  }
}

try {
  await devtoolsReady();
  await assertServerIsUp();
  const results = [];
  for (const route of routes) results.push(await measure(`${baseUrl}${route}`));

  if (process.env.JSON === "1") {
    console.log(JSON.stringify(results, null, 2));
  } else {
    console.log(`${baseUrl}${throttled ? "  (Slow 4G, 4x CPU)" : ""}\n`);
    console.log(
      ["route".padEnd(16), "ttfb".padStart(6), "fcp".padStart(6), "lcp".padStart(6), "cls".padStart(6), "js<load".padStart(9), "js total".padStart(9), "transfer".padStart(9)].join(" "),
    );
    for (const row of results) {
      console.log(
        [
          row.route.padEnd(16),
          `${row.ttfb}ms`.padStart(6),
          `${row.fcp}ms`.padStart(6),
          `${row.lcp}ms`.padStart(6),
          String(row.cls).padStart(6),
          `${row.jsBeforeLoadKb}kB`.padStart(9),
          `${row.jsTotalKb}kB`.padStart(9),
          `${row.totalKb}kB`.padStart(9),
        ].join(" "),
      );
      if (row.deferred.length) console.log(`${"".padEnd(16)}  deferred past load: ${row.deferred.join("  ")}`);
    }
  }
} finally {
  chrome.kill("SIGKILL");
}
