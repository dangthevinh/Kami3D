/**
 * Measures the site the way a phone sees it.
 *
 * Kami3D is designed as a night product on a desktop monitor, and the mobile experience had never been
 * measured — only assumed from the fact that a navbar disclosure exists and the canvases set
 * \`touch-action: none\`. This drives headless Chrome at two real phone sizes and reports the four
 * things that make a page feel broken on a phone:
 *
 *   horizontal overflow   anything that pushes the page wider than the screen, named, with its width
 *   tap targets           interactive elements under 44x44 CSS px (WCAG 2.5.5, Apple's HIG)
 *   small text            text under 12px that a visitor has to read rather than glance at
 *   viewport height       \`100dvh\` against the real visual viewport, which is where mobile Safari
 *                         and the URL bar disagree
 *
 * Needs Chrome and a running server, so it is not part of \`npm run check\`:
 *
 *   npm run build && npm start &
 *   npm run audit:mobile
 *
 * Environment: BASE_URL, ROUTES (comma separated), WIDTHS (e.g. \"390x844,360x800\"), CHROME_PATH.
 */

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";

const PORT = 9414;
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
const routes = (process.env.ROUTES || "/,/explore,/animal/lion,/quiz,/leaderboard,/settings,/analytics,/about").split(",").map((r) => r.trim()).filter(Boolean);
const sizes = (process.env.WIDTHS || "390x844,360x800").split(",").map((pair) => {
  const [width, height] = pair.split("x").map(Number);
  return { width, height };
});

/** Runs in the page: what a phone would complain about. */
const PROBE = `(() => {
  const label = (element) => {
    const tag = element.tagName.toLowerCase();
    const id = element.id ? "#" + element.id : "";
    const cls = typeof element.className === "string" && element.className ? "." + element.className.trim().split(/\\s+/).slice(0, 2).join(".") : "";
    const text = (element.getAttribute("aria-label") || element.textContent || "").trim().slice(0, 28);
    return tag + id + cls + (text ? ' "' + text + '"' : "");
  };
  const visible = (element) => {
    const style = getComputedStyle(element);
    if (style.visibility === "hidden" || style.display === "none" || Number(style.opacity) === 0) return false;
    const rect = element.getBoundingClientRect();
    // 1x1 and clipped-to-nothing is how this project hides a control it still needs in the DOM:
    // an sr-only radio is driven by its <label>, which is what a finger actually touches.
    if (rect.width <= 1 || rect.height <= 1) return false;
    return true;
  };

  /**
   * WCAG 2.5.8 exempts a target that sits inside a sentence, and it is right to: "3D model: Lion by
   * doizy" is a line of text, not a button. A link in a list of links is not exempt, so the test is
   * whether its own box is inline and its parent is the text block rather than a list or a nav.
   */
  const inlineInText = (element) => {
    const display = getComputedStyle(element).display;
    if (display !== "inline") return false;
    const parent = element.parentElement;
    if (!parent) return false;
    if (parent.closest("nav, ul, ol, footer, [role='navigation']")) return false;
    return true;
  };

  const viewport = window.innerWidth;
  const overflow = [];
  const small = [];
  const taps = [];

  for (const element of document.querySelectorAll("body *")) {
    if (!visible(element)) continue;
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);

    // Anything sticking out to the right, or wider than the screen.
    const right = rect.right + window.scrollX;
    if (right > viewport + 1) {
      const bleeds = Math.round(right - viewport);
      const clipped = ["hidden", "clip", "auto", "scroll"].includes(style.overflowX);
      // A child of a horizontally scrollable box is allowed to be wider than the screen.
      let scrollable = false;
      for (let parent = element.parentElement; parent; parent = parent.parentElement) {
        const ps = getComputedStyle(parent);
        if (ps.overflowX === "auto" || ps.overflowX === "scroll") { scrollable = true; break; }
        if (ps.overflowX === "hidden" || ps.overflowX === "clip") break;
      }
      if (!clipped && !scrollable) overflow.push({ element: label(element), bleeds, width: Math.round(rect.width) });
    }

    const interactive = element.matches("a[href], button, input, select, textarea, summary, [role=button], [tabindex]:not([tabindex='-1'])");
    if (interactive && !inlineInText(element)) {
      const w = Math.round(rect.width);
      const h = Math.round(rect.height);
      if (w < 44 || h < 44) taps.push({ element: label(element), w, h, area: w * h });
    }

    // Text a visitor reads, not decorative glyphs.
    const ownText = Array.from(element.childNodes).some((node) => node.nodeType === 3 && node.textContent.trim().length > 12);
    if (ownText && !element.closest("[aria-hidden='true']")) {
      const size = parseFloat(style.fontSize);
      if (size < 12) small.push({ element: label(element), size });
    }
  }

  overflow.sort((a, b) => b.bleeds - a.bleeds);
  taps.sort((a, b) => a.area - b.area);
  small.sort((a, b) => a.size - b.size);

  return JSON.stringify({
    viewport,
    scrollWidth: document.documentElement.scrollWidth,
    innerHeight: window.innerHeight,
    visualHeight: window.visualViewport ? Math.round(window.visualViewport.height) : null,
    overflow: overflow.slice(0, 6),
    overflowCount: overflow.length,
    taps: taps.slice(0, 8),
    tapCount: taps.length,
    small: small.slice(0, 5),
    smallCount: small.length,
  });
})()`;

const chrome = spawn(chromePath, [
  "--headless=new",
  "--remote-debugging-port=" + PORT,
  "--user-data-dir=/tmp/kami-audit-mobile",
  "--no-first-run",
  "--no-default-browser-check",
  "--hide-scrollbars",
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
  const evaluate = async (expression) => {
    const result = await send("Runtime.evaluate", { expression, returnByValue: true });
    return result?.exceptionDetails ? null : result?.result?.value;
  };

  await send("Page.enable");
  await send("Runtime.enable");

  let failures = 0;
  const rows = [];

  for (const size of sizes) {
    console.log("");
    console.log("=== " + size.width + "x" + size.height + " (mobile, DPR 3)");
    await send("Emulation.setDeviceMetricsOverride", {
      width: size.width,
      height: size.height,
      deviceScaleFactor: 3,
      mobile: true,
    });

    for (const route of routes) {
      await send("Page.navigate", { url: baseUrl + route });
      await sleep(2600);
      const raw = await evaluate(PROBE);
      if (!raw) {
        console.log("  " + route.padEnd(18) + " probe failed");
        failures += 1;
        continue;
      }
      const data = JSON.parse(raw);
      const bleed = Math.max(0, data.scrollWidth - data.viewport);
      const bad = bleed > 0 || data.tapCount > 0;
      if (bad) failures += 1;

      rows.push({ size: size.width, route, bleed, taps: data.tapCount, small: data.smallCount });

      console.log(
        "  " + route.padEnd(18) +
          (bleed > 0 ? "OVERFLOW " + bleed + "px" : "no overflow").padEnd(16) +
          "  taps<44: " + String(data.tapCount).padStart(3) +
          "  text<12px: " + String(data.smallCount).padStart(3),
      );
      for (const entry of data.overflow) {
        console.log("      overflow: " + entry.element + "  " + entry.width + "px wide, " + entry.bleeds + "px past the edge");
      }
      for (const entry of data.taps.slice(0, 5)) {
        console.log("      tap " + entry.w + "x" + entry.h + ": " + entry.element);
      }
      for (const entry of data.small.slice(0, 3)) {
        console.log("      text " + entry.size + "px: " + entry.element);
      }
    }
  }

  socket.close();
  chrome.kill("SIGKILL");

  console.log("");
  const worst = rows.slice().sort((a, b) => b.taps - a.taps)[0];
  console.log(
    "Summary: " + rows.length + " route/size pairs, " +
      rows.filter((row) => row.bleed > 0).length + " with horizontal overflow, " +
      (worst ? worst.taps + " tap targets under 44px at worst (" + worst.route + ")" : "no tap data"),
  );

  if (failures > 0) {
    console.error("FAIL - " + failures + " route/size pair(s) need work. See the lines above.");
    process.exit(1);
  }
  console.log("PASS - no horizontal overflow and every tap target is at least 44px.");
}

main().catch((error) => {
  console.error(error);
  chrome.kill("SIGKILL");
  process.exit(1);
});
