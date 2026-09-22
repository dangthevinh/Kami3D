/**
 * Checks for the hybrid 3D view on `/map`.
 *
 * The rule this feature lives or dies by is not visual: a map is a WebGL context, a model viewer is a
 * second one, and a phone cannot hold two. So the pure half is tested directly, and the rest is
 * pinned as text - which is the honest way to test a layout decision that only exists at runtime.
 *
 * Run with: npm run check:hybrid
 */

import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { HYBRID_BREAKPOINT_PX, hybridPlacement, shouldKeepMapMounted } from "../lib/hybrid-view.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const experience = readFileSync(join(root, "components", "map", "MapExperience.tsx"), "utf8");
const panel = readFileSync(join(root, "components", "map", "HybridModelPanel.tsx"), "utf8");
const shell = readFileSync(join(root, "components", "3d", "CanvasShell.tsx"), "utf8");

test("the map is only kept mounted when both contexts can be shown", () => {
  assert.equal(shouldKeepMapMounted({ hybridOpen: false, wideEnough: false }), true, "a phone shows the map on its own");
  assert.equal(shouldKeepMapMounted({ hybridOpen: false, wideEnough: true }), true);
  assert.equal(shouldKeepMapMounted({ hybridOpen: true, wideEnough: true }), true, "a laptop shows both");
  assert.equal(shouldKeepMapMounted({ hybridOpen: true, wideEnough: false }), false, "a phone shows one at a time");

  assert.equal(HYBRID_BREAKPOINT_PX, 1024, "the breakpoint is the same one the layout switches at");
});

test("the viewer lives in the aside on a laptop and in the map's place on a phone", () => {
  assert.equal(hybridPlacement({ hybridOpen: false, wideEnough: true }), "closed");
  assert.equal(hybridPlacement({ hybridOpen: true, wideEnough: true }), "aside");
  assert.equal(hybridPlacement({ hybridOpen: true, wideEnough: false }), "map");
});

test("the map component is unmounted, not hidden, when the viewer replaces it", () => {
  assert.ok(experience.includes("shouldKeepMapMounted"), "the page must ask the rule, not guess it");
  assert.ok(experience.includes("useMediaQuery"), "which needs the viewport, in JavaScript");

  // The map must be inside a conditional: a `hidden` class would keep the context alive.
  assert.ok(/\{mapMounted \? \(\s*\n\s*<LazyMap/.test(experience), "<LazyMap> is not gated on the rule");
  assert.ok(!/className=\{[^}]*hidden[^}]*\}[^>]*>[\s\S]{0,80}<LazyMap/.test(experience), "the map must not be CSS-hidden");

  // Its overlays go with it: they describe a canvas that is no longer there.
  assert.equal(
    (experience.match(/\{mapMounted [&?]/g) ?? []).length >= 3,
    true,
    "the map, the click hint and the observation card should all follow it",
  );
});

test("the viewer is opened by the visitor, lazily, and closed by unmounting", () => {
  assert.ok(experience.includes("useState(false)") && experience.includes("setHybridOpen"), "there is no open/closed state");
  assert.ok(/onClick=\{\(\) => setHybridOpen/.test(experience), "nothing opens it");
  assert.ok(/aria-expanded=\{hybridOpen\}/.test(experience), "and the control does not say whether it is open");
  assert.ok(/placement === "aside" \?/.test(experience) || /placement === "map" && selected/.test(experience), "placement is not used");

  // Lazy, and never on the server: three.js must stay out of the first paint.
  assert.ok(/dynamic\(\s*\(\) => import\("@\/components\/3d\/ModelViewer"\)/.test(panel), "the viewer is not a dynamic import");
  assert.ok(/ssr: false/.test(panel), "the viewer must not be server-rendered");
});

test("the map route never imports three.js, even now that it can draw one", () => {
  const mapDir = join(root, "components", "map");

  for (const file of readdirSync(mapDir)) {
    if (!file.endsWith(".tsx") && !file.endsWith(".ts")) continue;
    const source = readFileSync(join(mapDir, file), "utf8");
    assert.ok(!/from "three"/.test(source), file + " imports three directly");
    assert.ok(!/from "@react-three\/fiber"/.test(source), file + " imports the renderer directly");
  }

  // The viewer itself reaches three through the scene, and the scene is behind the dynamic import.
  assert.ok(!/from "three"/.test(panel), "the panel must not pull three in itself");
  assert.ok(shell.includes("CanvasFallback"), "the fallback the panel uses should still exist");
});

test("the panel fetches one species rather than carrying the catalogue", () => {
  assert.ok(/fetch\(`\/api\/animals\/\$\{encodeURIComponent\(slug\)\}`/.test(panel), "the panel should ask for the species it needs");
  assert.ok(!/getAllAnimals|animals\.ts/.test(panel), "and not import the catalogue");
  assert.ok(panel.includes("cancelled = true"), "a fetch that outlives the panel must be ignored");
  assert.ok(/status: "failed"/.test(panel), "a failed load needs a state, not a blank canvas");
});

test("the map page sends a light species list, not the catalogue", () => {
  const page = readFileSync(join(root, "app", "map", "page.tsx"), "utf8");

  // The page reads the catalogue (it has to), and maps it down to the five fields the panel uses.
  assert.ok(page.includes("MapSpecies[]"), "the page should narrow the catalogue before sending it");
  assert.ok(/species=\{species\}/.test(page), "and send the narrowed list");
  assert.ok(!/animals=\{animals\}/.test(page), "the full records must not ride along with the map");

  for (const field of ["slug", "name", "region", "conservation_status", "category", "emoji"]) {
    assert.ok(new RegExp(`\\b${field}:`).test(page), `the light record should still carry ${field}`);
  }
  assert.ok(!/model_url:/.test(page), "and must not carry the model URL: the viewer fetches that itself");
});
