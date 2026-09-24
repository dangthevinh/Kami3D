/**
 * Assertions for the two things that decide whether a downloaded model is visible.
 *
 * The complaint that started this was "the model is dark and I cannot see anything", and the
 * answer was not one bug but three, stacked:
 *
 *   1. **no environment.** The lion's own material is `metalness 0.52, roughness 0` — a mirror —
 *      and a mirror shows what surrounds it. The scene had lamps and no environment, so the
 *      `envMapIntensity` the viewer had always set applied to nothing.
 *   2. **a fog that was fixed in world units.** The fog started at 9 units, and the lion is
 *      **81 units** across, so `<Bounds fit>` put the camera ~100 units out — past the fog's far
 *      plane. The model was drawn through fog at full strength and came out the colour of the
 *      background. Measured after tying the fog to the camera distance: 4,727 distinct colours
 *      on the species canvas became **about 50,000**, and pixels above luminance 60 went from 1.1% to
 *      13.8% - the model auto-rotates, so repeated runs land between 13.8% and 14.4%.
 *   3. **a blend mode on a material nothing can blend.** `alphaMode: "BLEND"` with no alpha map
 *      and an opacity of 1 costs depth writes and nothing else, so the model's own faces sorted
 *      against each other and it read as a ghost.
 *
 * Run with: npm run check:materials
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import {
  DIELECTRIC_ENV_INTENSITY,
  METAL_ENV_INTENSITY_PER_METALNESS,
  envIntensityFor,
  materialFix,
} from "../lib/model-materials.ts";

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), "utf8");

const scene = read("components/3d/ModelScene.tsx");
const preview = read("components/3d/AnimalModelPreview.tsx");
const studio = read("components/3d/StudioEnvironment.tsx");
const apply = read("components/3d/apply-model-materials.ts");

const opaqueMaterial = { metalness: 0, transparent: false, opacity: 1, alphaTest: 0, hasAlphaMap: false };

test("a metal gets enough environment to be visible, a dielectric is left alone", () => {
  assert.equal(envIntensityFor(0), DIELECTRIC_ENV_INTENSITY);
  assert.equal(envIntensityFor(1), DIELECTRIC_ENV_INTENSITY + METAL_ENV_INTENSITY_PER_METALNESS);

  // The lion's own numbers, taken from its .glb.
  const lion = envIntensityFor(0.5219751671489173);
  assert.ok(lion > 3, "the lion is 52% metallic and needs a real boost, got " + lion);
  assert.ok(lion < envIntensityFor(1), "and less than a pure metal");

  // Monotonic, and clamped to the properties three actually has.
  assert.ok(envIntensityFor(0.25) < envIntensityFor(0.5));
  assert.equal(envIntensityFor(-1), DIELECTRIC_ENV_INTENSITY);
  assert.equal(envIntensityFor(4), envIntensityFor(1));
  assert.equal(envIntensityFor(Number.NaN), DIELECTRIC_ENV_INTENSITY, "junk must not produce a NaN intensity");
});

test("blending is only removed when nothing can be blended", () => {
  const blend = { ...opaqueMaterial, transparent: true };
  assert.equal(materialFix(blend).opaque, true, "BLEND with an opacity of 1 and no alpha map is an artefact");
  assert.equal(materialFix({ ...blend, hasAlphaMap: true }).opaque, false, "an alpha map is a reason to blend");
  assert.equal(materialFix({ ...blend, opacity: 0.5 }).opaque, false, "so is a real opacity");
  assert.equal(materialFix({ ...blend, alphaTest: 0.5 }).opaque, false, "and so is an alpha test");
  assert.equal(materialFix(opaqueMaterial).opaque, false, "an opaque material is already right");
});

test("both surfaces apply the same fix, from one place", () => {
  assert.ok(apply.includes("materialFix("), "the shared applier calls the pure rule");
  assert.ok(apply.includes("material.transparent = false") && apply.includes("material.depthWrite = true"));
  assert.ok(apply.includes("material.envMapIntensity = fix.envMapIntensity"));

  for (const [name, source] of [["the species viewer", scene], ["the card preview", preview]]) {
    assert.ok(source.includes("applyMaterialFix"), name + " must apply the shared fix");
    assert.ok(!source.includes("envMapIntensity = 1.15"), name + " must not keep its own copy of the number");
  }
});

test("both surfaces are lit by the studio, and it is bright", () => {
  for (const [name, source] of [["the species viewer", scene], ["the card preview", preview]]) {
    assert.ok(source.includes("<StudioEnvironment"), name + " must mount the studio environment");
  }

  // The env's own base colour is the thing a mirror shows: a dark room made the lion black.
  const base = /attach="background" args=\{?\["#([0-9a-f]{6})"\]\}?/.exec(studio);
  assert.ok(base, "the studio must set its own base colour");
  const channel = Number.parseInt(base[1].slice(0, 2), 16);
  assert.ok(channel > 200, "the studio base must be bright, got #" + base[1]);
  assert.ok(studio.includes("frames={1}"), "and baked once, since the rig never moves");
  assert.ok(!studio.includes("preset="), "no drei preset: those fetch an HDRI from a CDN");
});

test("fog is measured against the framing, not fixed in world units", () => {
  assert.match(scene, /const FOG_NEAR_RATIO = [\d.]+/, "the near plane is a ratio");
  assert.match(scene, /const FOG_FAR_RATIO = [\d.]+/, "so is the far plane");
  assert.ok(
    scene.includes("camera.position.distanceTo"),
    "and both are derived from how far the camera actually is",
  );

  // The bug, specifically: a hard-coded near plane the model could be behind.
  const args = /<fog attach="fog" args=\{\[([^\]]+)\]\}/.exec(scene);
  assert.ok(args, "the initial fog arguments must be visible");
  assert.ok(!/,\s*9\s*,\s*34\s*$/.test(args[1]), "9 and 34 were the fixed values that hid the lion");
});
