/**
 * Assertions for the theme palettes.
 *
 * Light mode is the kind of feature that looks finished in a screenshot and is
 * still broken: a token that reads 3.8:1 on the page background is invisible to
 * everyone except the person who needed it, and nothing in the build complains.
 * This suite reads the two palettes out of `app/globals.css` and does the maths.
 *
 * The rule it enforces is the one the design actually depends on:
 *
 *   - body text and accent text must reach 4.5:1 against the page background;
 *   - the ink that sits **on** a solid accent fill must reach 4.5:1 against it,
 *     in both directions, because buttons use the same accent as a background
 *     that labels use as a foreground.
 *
 * Run with: npm run check:theme
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const CSS = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

/** Every `--name: value;` declaration inside one block of the stylesheet. */
function tokensIn(selector) {
  const start = CSS.indexOf(selector + " {");
  assert.notEqual(start, -1, `${selector} block not found in app/globals.css`);
  const end = CSS.indexOf("\n}", start);
  const block = CSS.slice(start, end === -1 ? undefined : end);

  const tokens = {};
  for (const [, name, value] of block.matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)) tokens[name] = value.trim();
  return tokens;
}

const hexToRgb = (hex) => {
  const value = hex.replace("#", "");
  const full = value.length === 3 ? value.split("").map((c) => c + c).join("") : value;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
};

const luminance = (rgb) => {
  const [r, g, b] = rgb.map((channel) => {
    const v = channel / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrast = (a, b) => {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
};

const THEMES = [
  { name: "dark (default, `@theme`)", tokens: tokensIn("@theme") },
  { name: "light (`.light`)", tokens: tokensIn(".light") },
];

test("both palettes define the tokens the whole UI is written against", () => {
  const required = ["color-void", "color-abyss", "color-surface", "color-hairline", "color-fg", "color-on-accent", "color-neon"];
  for (const theme of THEMES) {
    for (const token of required) {
      assert.ok(theme.tokens[token], `${theme.name} is missing --${token}`);
    }
  }
});

test("body text is readable on the page background", () => {
  for (const { name, tokens } of THEMES) {
    const ratio = contrast(hexToRgb(tokens["color-fg"]), hexToRgb(tokens["color-void"]));
    assert.ok(ratio >= 4.5, `${name}: --color-fg on --color-void is ${ratio.toFixed(2)}:1, needs 4.5:1`);
  }
});

test("every accent works as text *and* as a button fill", () => {
  for (const { name, tokens } of THEMES) {
    // Light mode inherits the accents it does not override, so resolve the same
    // way the cascade does: dark first, then anything the light block replaces.
    const merged = { ...tokensIn("@theme"), ...tokens };
    for (const accent of ["color-neon", "color-glow", "color-iris", "color-solar", "color-coral"]) {
      const fill = hexToRgb(merged[accent]);

      const asText = contrast(fill, hexToRgb(merged["color-void"]));
      assert.ok(asText >= 4.5, `${name}: text-${accent.replace("color-", "")} is ${asText.toFixed(2)}:1 on the page, needs 4.5:1`);

      const asFill = contrast(hexToRgb(merged["color-on-accent"]), fill);
      assert.ok(asFill >= 4.5, `${name}: --color-on-accent on a solid ${accent.replace("color-", "")} fill is ${asFill.toFixed(2)}:1, needs 4.5:1`);
    }
  }
});

test("light mode really does invert the two tokens the design leans on", () => {
  const light = tokensIn(".light");
  // 220-odd utilities are written as `text-white/60`, `bg-white/6`,
  // `ring-white/12`. If `white` ever stops being redefined, light mode turns into
  // a white-on-white page — the one failure this file exists to catch.
  assert.notEqual(light["color-white"], "#ffffff", "--color-white must mean ink in light mode");
  assert.equal(light["color-void"], "#f4f6fc");
  assert.equal(light["color-abyss"], "#ffffff");
});

test("the conservation-status shades are swapped for readable ones", () => {
  const light = tokensIn(".light");
  for (const shade of ["color-red-300", "color-orange-300", "color-amber-300", "color-lime-300", "color-emerald-300", "color-sky-300"]) {
    assert.ok(light[shade], `${shade} needs a light-mode replacement; Tailwind's -300 shades vanish on white`);
    const ratio = contrast(hexToRgb(light[shade]), hexToRgb(light["color-void"]));
    assert.ok(ratio >= 4.5, `${shade} on the light page is ${ratio.toFixed(2)}:1, needs 4.5:1`);
  }
});

test("the 3D stage keeps its own dark surface in both themes", () => {
  // Scenes are lit for a dark room; a light page must not repaint the canvas
  // container, or every model loses its rim light.
  assert.match(CSS, /\.kami-canvas \{[^}]*background: var\(--kami-stage\)/, ".kami-canvas must paint the stage background");
  assert.ok(tokensIn(".light")["kami-stage"] === undefined, "the stage is not a per-theme surface");
});
