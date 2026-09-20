/**
 * Drives `/settings` in a real browser and measures whether the preferences do
 * anything.
 *
 * `scripts/check-settings.mjs` proves the model, the CSS and the database agree.
 * What it cannot prove is the part in between: that `SettingsProvider` puts the
 * attributes on `<html>`, that the stylesheet then re-tints and de-animates the
 * page, and that a choice survives a reload. That is a browser question, so this
 * asks a browser — the same reason `audit-theme.mjs` exists.
 *
 * It needs Chrome and a running production server, so it is not part of `npm run check`:
 *
 *   npm run build && npx next start -p 9000 &
 *   npm run audit:settings
 *
 * Environment:
 *   CHROME_PATH  override the browser binary
 *   BASE_URL     origin to test (default: NEXT_PUBLIC_SITE_URL or :9000)
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
const settleMs = Number(process.env.SETTLE_MS || 2500);

/**
 * Everything this audit asserts, read from the live page.
 *
 * The animation duration comes from a throwaway element rather than a real one:
 * `html[data-motion="reduced"] *` sets `animation-duration` on every element, so a
 * probe with a known animation class measures the rule itself instead of whatever
 * happens to be on screen.
 */
const STATE_PROBE = `(() => {
  const root = document.documentElement;
  const probe = document.createElement("div");
  probe.className = "animate-rise";
  probe.style.position = "fixed";
  probe.style.left = "-9999px";
  document.body.appendChild(probe);
  const animationDuration = getComputedStyle(probe).animationDuration;
  probe.remove();

  const card = document.querySelector(".glass");
  const accent = document.querySelector(".text-neon");
  const cardStyle = card ? getComputedStyle(card) : null;
  return JSON.stringify({
    accent: root.dataset.accent ?? null,
    glass: root.dataset.glass ?? null,
    motion: root.dataset.motion ?? null,
    lang: root.lang,
    light: root.classList.contains("light"),
    htmlClass: root.className,
    storedTheme: (() => { try { return localStorage.getItem("kami-theme"); } catch { return null; } })(),
    neon: getComputedStyle(root).getPropertyValue("--color-neon").trim(),
    accentText: accent ? getComputedStyle(accent).color : null,
    blur: cardStyle ? cardStyle.backdropFilter : null,
    // The blur radius a panel inherits. Measured through the variable rather than
    // through backdrop-filter: a headless Chrome without a GPU drops that
    // declaration, which would make a working setting look broken.
    glassBlur: cardStyle ? cardStyle.getPropertyValue("--kami-glass-blur").trim() : null,
    // Seconds, because a browser may report 0.001ms as 1e-06s.
    animationSeconds: (() => { const value = animationDuration.trim();
      const number = parseFloat(value) || 0;
      return value.endsWith("ms") ? number / 1000 : number; })(),
    stored: (() => { try { return JSON.parse(localStorage.getItem("kami-settings") || "null"); } catch { return null; } })(),
  });
})()`;

const click = (selector) => `(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return "missing"; el.click(); return "clicked"; })()`;

const profileDir = process.env.CHROME_PROFILE || "/tmp/kami-settings-profile";

// A previous run that was killed leaves a headless Chrome holding the debug port,
// and the next run would then talk to that stale browser. Clear the way first, and
// again on the way out, so this stays re-runnable.
function reap() {
  try {
    spawn("pkill", ["-f", profileDir], { stdio: "ignore" });
  } catch {
    // No pkill (or nothing to kill): the launch below will report the port clash.
  }
}

reap();
await sleep(700);

const chrome = spawn(chromePath, [
  "--headless=new", "--no-first-run", "--no-default-browser-check", "--disable-gpu",
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${profileDir}`,
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

async function openPage() {
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

  return {
    send,
    close: () => socket.close(),
    async evaluate(expression) {
      const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
      return result?.result?.value;
    },
    async visit(path) {
      await send("Page.navigate", { url: baseUrl + path });
      await sleep(settleMs);
    },
    async state() {
      return JSON.parse(await this.evaluate(STATE_PROBE));
    },
    /**
     * Polls until the page is actually interactive.
     *
     * A fixed sleep is not enough: on a cold profile the settings chunk can take
     * longer than the sleep to parse, and a click that lands before React hydrates
     * is a click that never happened — which reads as "the setting does nothing".
     * The provider writes its attributes in an effect, so their presence is proof
     * that hydration finished.
     */
    async waitForInteractive(timeoutMs = 30000) {
      const deadline = Date.now() + timeoutMs;
      while (Date.now() < deadline) {
        const ready = await this.evaluate('typeof document.documentElement.dataset.accent === "string"');
        if (ready) return true;
        await sleep(250);
      }
      return false;
    },
  };
}

let failures = 0;
function check(label, condition, detail) {
  if (condition) {
    console.log(`ok   ${label}${detail ? ` — ${detail}` : ""}`);
    return;
  }
  failures += 1;
  console.log(`FAIL ${label}${detail ? ` — ${detail}` : ""}`);
}

try {
  await devtoolsReady();
  const page = await openPage();

  try {
    await page.send("Page.enable");
    await page.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
    // A fresh visitor, so the first state is the shipped default rather than
    // whatever the last run left in this profile.
    const clearOnce = await page.send("Page.addScriptToEvaluateOnNewDocument", {
      // Both keys: the theme has its own storage key (next-themes writes it), and a
      // leftover from a previous run would make the first state of this run a lie.
      source:
        'try { localStorage.removeItem("kami-settings"); localStorage.removeItem("kami-theme"); } catch {}',
    });

    await page.visit("/settings");
    // Removed immediately: the reload below has to find the stored choices, so only
    // the first load of this run starts from nothing.
    await page.send("Page.removeScriptToEvaluateOnNewDocument", { identifier: clearOnce.identifier });

    check("the settings provider hydrates and writes the attributes", await page.waitForInteractive());

    const first = await page.state();
    check("the provider writes the three CSS attributes", first.accent === "emerald" && first.glass === "medium" && first.motion === "full", JSON.stringify({ accent: first.accent, glass: first.glass, motion: first.motion }));
    check("the default accent is the mint the product ships", first.neon.toLowerCase() === "#35f0c0", first.neon);
    check("an accent utility resolves through the token", /53, ?240, ?192/.test(first.accentText ?? ""), first.accentText ?? "no .text-neon element");
    check("glass starts at the shipped blur", first.glassBlur === "16px", `${first.glassBlur} (backdrop-filter: ${first.blur})`);
    check("motion starts animated", first.animationSeconds > 0.1, first.animationDuration);

    // What the visitor does: pick violet, flatten the glass, ask for calm, go light,
    // and switch the panel to English.
    await page.evaluate(click('[data-setting="accentColor"] input[value="violet"]'));
    await page.evaluate(click('[data-setting="glassIntensity"] input[value="low"]'));
    await page.evaluate(click('[data-setting="reduceMotion"]'));
    await sleep(900);

    const dark = await page.state();
    check("the accent switch re-tints every accent surface", dark.neon.toLowerCase() === "#a97bff" && /169, ?123, ?255/.test(dark.accentText ?? ""), `${dark.neon} · ${dark.accentText}`);
    check("the glass switch flattens the panels", dark.glassBlur === "6px", `${dark.glassBlur} (backdrop-filter: ${dark.blur})`);
    check("reduce motion really stops CSS animation", dark.animationSeconds <= 0.001, dark.animationDuration);

    // Theme and language last, because the accent has a different value per theme.
    await page.evaluate(click('[data-setting="theme"] input[value="light"]'));
    await page.evaluate(click('[data-setting="language"] input[value="en"]'));
    await sleep(1200);

    const chosen = await page.state();
    check("the light theme uses the light accent, not the night one", chosen.neon.toLowerCase() === "#6a4ad4", chosen.neon);
    check("the theme switch flips the document class", chosen.light === true, `class="${chosen.htmlClass}" kami-theme=${chosen.storedTheme}`);
    check("the language switch sets the document language", chosen.lang === "en", chosen.lang);
    check("the choices are stored in this browser", chosen.stored?.accentColor === "violet" && chosen.stored?.measurementUnit === "metric", JSON.stringify(chosen.stored));

    await page.visit("/settings");
    await page.waitForInteractive();
    const reloaded = await page.state();
    check("a reload keeps the accent", reloaded.accent === "violet" && reloaded.neon.toLowerCase() === "#6a4ad4", `${reloaded.accent} · ${reloaded.neon}`);
    check("a reload keeps the flattened glass and the calm motion", reloaded.glass === "low" && reloaded.motion === "reduced", `${reloaded.glass}/${reloaded.motion}`);
    check("a reload keeps the theme", reloaded.light === true);

    // And the same attributes are on a page that is not the settings panel: the
    // preferences are for the product, not for the page that sets them.
    await page.visit("/");
    await page.waitForInteractive();
    const home = await page.state();
    check("the choices apply to every other route too", home.accent === "violet" && home.glass === "low" && home.motion === "reduced", `${home.accent}/${home.glass}/${home.motion}`);

    // A visitor from before this feature: next-themes' own key holds their choice
    // and there is no settings object yet. The migration has to adopt that theme,
    // not overwrite it with the default.
    await page.evaluate('try { localStorage.removeItem("kami-settings"); localStorage.setItem("kami-theme", "light"); } catch {}');
    await page.visit("/settings");
    await page.waitForInteractive();
    const legacy = await page.state();
    check("a visitor who chose a theme before this feature keeps it", legacy.light === true && legacy.stored?.theme === "light", `class light: ${legacy.light}, stored: ${legacy.stored?.theme}`);
    check("and their next-themes key is not rewritten", legacy.storedTheme === "light", legacy.storedTheme);
  } finally {
    page.close();
  }

  console.log(failures === 0 ? "\nSettings pass." : `\n${failures} problem(s).`);
  process.exit(failures === 0 ? 0 : 1);
} finally {
  chrome.kill("SIGKILL");
  reap();
}
