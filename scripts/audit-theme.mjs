/**
 * Measures the theme in a real browser: is any text unreadable, and did any dark
 * surface survive into light mode?
 *
 * `scripts/check-theme.mjs` proves the *palette* is sound, but it cannot see the
 * composition — a rule that paints a hard-coded dark panel, or a translucent chip
 * whose contrast the tokens do not describe, only shows up once the page is laid
 * out. This walks the rendered DOM, composites each text element's colour over its
 * effective background (walking up through translucent layers) and reports every
 * element below the WCAG AA threshold for its size and weight.
 *
 * It needs Chrome and a running production server, so it is not part of
 * `npm run check`:
 *
 *   npm run build && npm start &
 *   npm run audit:theme
 *
 * Environment:
 *   CHROME_PATH  override the browser binary
 *   ROUTES       comma-separated paths
 *   THEMES       comma-separated themes (default: both)
 *   BASE_URL     origin to test (default: NEXT_PUBLIC_SITE_URL or :9000)
 */

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";

const PORT = 9412;
const DEFAULT_ROUTES = ["/", "/explore", "/animal/lion", "/quiz", "/leaderboard", "/about"];

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
const routes = (process.env.ROUTES || DEFAULT_ROUTES.join(",")).split(",").map((route) => route.trim()).filter(Boolean);
const themes = (process.env.THEMES || "dark,light").split(",").map((theme) => theme.trim());

/** Runs in the page: composites colours and reports what fails AA. */
const CONTRAST_PROBE = `(() => {
  const parse = (value) => {
    const match = /rgba?\\(([^)]+)\\)/.exec(value || "");
    if (!match) return null;
    const parts = match[1].split(/[,\\s\\/]+/).filter(Boolean).map(Number);
    if (parts.length < 3 || parts.some(Number.isNaN)) return null;
    return [parts[0], parts[1], parts[2], parts.length > 3 ? parts[3] : 1];
  };
  const over = (top, bottom) => {
    const alpha = top[3] + bottom[3] * (1 - top[3]);
    if (alpha === 0) return [0, 0, 0, 0];
    return [0, 1, 2].map((i) => (top[i] * top[3] + bottom[i] * bottom[3] * (1 - top[3])) / alpha).concat(alpha);
  };
  const luminance = (colour) => {
    const [r, g, b] = colour.slice(0, 3).map((value) => {
      const channel = value / 255;
      return channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const ratio = (a, b) => {
    const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (lighter + 0.05) / (darker + 0.05);
  };
  const backgroundOf = (element) => {
    const chain = [];
    for (let node = element; node; node = node.parentElement) chain.push(node);
    chain.reverse();
    let background = [0, 0, 0, 0];
    for (const node of chain) {
      const style = getComputedStyle(node);
      const colour = parse(style.backgroundColor);
      if (colour && colour[3] > 0) background = over(colour, background);
      // A gradient or image we cannot sample: assume a mid grey rather than
      // pretending the text sits on the page background.
      if (style.backgroundImage && style.backgroundImage !== "none" && background[3] === 0) background = [128, 128, 128, 1];
    }
    return background[3] === 0 ? [255, 255, 255, 1] : background;
  };

  const problems = [];
  for (const element of document.querySelectorAll("body *")) {
    if (element.closest("[aria-hidden='true']") || element.closest("canvas") || element.tagName === "svg") continue;
    const hasText = Array.from(element.childNodes).some((node) => node.nodeType === 3 && node.textContent.trim().length > 1);
    if (!hasText) continue;

    const rect = element.getBoundingClientRect();
    if (rect.width < 4 || rect.height < 4) continue;

    const style = getComputedStyle(element);
    if (style.visibility === "hidden" || style.display === "none" || Number(style.opacity) < 0.15) continue;

    const foreground = parse(style.color);
    // Gradient-filled text has no measurable colour; webkitTextFillColor paints it.
    if (!foreground || foreground[3] === 0 || style.webkitTextFillColor === "transparent") continue;

    const background = backgroundOf(element);
    const composited = over([foreground[0], foreground[1], foreground[2], foreground[3] * Number(style.opacity || 1)], background);
    const value = ratio(composited, background);

    const size = parseFloat(style.fontSize);
    const weight = Number(style.fontWeight) || 400;
    const large = size >= 24 || (size >= 18.66 && weight >= 700);
    const required = large ? 3 : 4.5;

    if (value < required) {
      problems.push({
        ratio: Math.round(value * 100) / 100,
        required,
        text: (element.textContent || "").trim().slice(0, 44),
        tag: element.tagName.toLowerCase(),
        className: (element.getAttribute("class") || "").split(" ").slice(0, 2).join(" "),
        foreground: style.color,
        background: \`rgb(\${background.slice(0, 3).map(Math.round).join(",")})\`,
        fontSize: Math.round(size),
      });
    }
  }
  return JSON.stringify(problems);
})()`;

/** Runs in the page: dark panels that should have followed the light palette. */
const DARK_SURFACE_PROBE = `(() => {
  const parse = (value) => { const m = /rgba?\\(([^)]+)\\)/.exec(value || ""); if (!m) return null;
    const parts = m[1].split(/[,\\s\\/]+/).filter(Boolean).map(Number); return parts.length < 3 ? null : parts; };
  const luminance = (colour) => { const [r, g, b] = colour.slice(0, 3).map((v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const found = [];
  for (const element of document.querySelectorAll("body *")) {
    if (element.closest(".kami-canvas") || element.tagName === "CANVAS" || element.closest("[aria-hidden='true']")) continue;
    const rect = element.getBoundingClientRect();
    if (rect.width < 60 || rect.height < 28) continue;
    const style = getComputedStyle(element);
    const colour = parse(style.backgroundColor);
    if (!colour || (colour[3] ?? 1) < 0.6 || luminance(colour) > 0.12) continue;
    found.push({ className: (element.getAttribute("class") || "").split(" ").slice(0, 2).join(" "), colour: style.backgroundColor, text: (element.textContent || "").trim().slice(0, 34) });
  }
  return JSON.stringify(found);
})()`;

const chrome = spawn(chromePath, [
  "--headless=new", "--no-first-run", "--no-default-browser-check", "--disable-gpu",
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${process.env.CHROME_PROFILE || "/tmp/kami-theme-profile"}`,
  "about:blank",
], { stdio: "ignore" });

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

async function inspect(theme, route) {
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

  try {
    await send("Page.enable");
    await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: theme }] });
    // The choice is stored under the same key the Settings menu writes.
    await send("Page.addScriptToEvaluateOnNewDocument", {
      source: `try { localStorage.setItem("kami-theme", "${theme}"); } catch {}`,
    });
    await send("Page.navigate", { url: baseUrl + route });
    await sleep(Number(process.env.SETTLE_MS || 2500));

    const applied = await send("Runtime.evaluate", { expression: "document.documentElement.className.split(' ').pop()", returnByValue: true });
    const contrast = await send("Runtime.evaluate", { expression: CONTRAST_PROBE, returnByValue: true });
    const problems = JSON.parse(contrast.result.value);
    const dark = theme === "light" ? JSON.parse((await send("Runtime.evaluate", { expression: DARK_SURFACE_PROBE, returnByValue: true })).result.value) : [];

    return { route, theme, applied: applied.result.value, problems, dark };
  } finally {
    socket.close();
  }
}

try {
  await devtoolsReady();
  let failures = 0;

  for (const theme of themes) {
    for (const route of routes) {
      const result = await inspect(theme, route);
      if (result.applied !== theme) {
        console.log(`  ! ${route}: asked for ${theme}, <html> says ${result.applied}`);
        failures += 1;
      }
      failures += result.problems.length + result.dark.length;

      if (!result.problems.length && !result.dark.length) {
        console.log(`ok   ${theme.padEnd(5)} ${route}`);
        continue;
      }

      console.log(`FAIL ${theme.padEnd(5)} ${route}`);
      for (const problem of result.problems.slice(0, 10)) {
        console.log(`       ${String(problem.ratio).padStart(5)}:1 (needs ${problem.required}) ${problem.tag}.${problem.className.split(" ")[0] || "-"} "${problem.text}" — ${problem.foreground} on ${problem.background}`);
      }
      for (const panel of result.dark.slice(0, 10)) {
        console.log(`       dark surface in light mode: ${panel.colour} ${panel.className} "${panel.text}"`);
      }
    }
  }

  console.log(failures === 0 ? "\nAll themes pass." : `\n${failures} problem(s).`);
  process.exit(failures === 0 ? 0 : 1);
} finally {
  chrome.kill("SIGKILL");
}
