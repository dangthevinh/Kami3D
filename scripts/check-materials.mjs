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

test("a skinned model is cloned with its own bones", async () => {
  // The blue whale is a SkinnedMesh driven by 49 joints, and it is the asset that showed the
  // symptom: a flat slice across the body. `Object3D.clone(true)` copies a SkinnedMesh by
  // reference to its skeleton, so the copy is deformed by the *original* bones - which live in
  // the cached scene, are never rendered, and therefore never update their world matrices.
  //
  // This builds that situation without a GLB or a WebGL context and asserts both halves: the
  // helper binds the clone to bones inside itself, and the plain clone does not (the control, so
  // this test cannot quietly stop testing anything).
  const THREE = await import("three");
  const { cloneModel } = await import("../components/3d/clone-model.ts");

  const root = new THREE.Bone();
  root.name = "root";
  const child = new THREE.Bone();
  child.position.set(1, 0, 0);
  root.add(child);

  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const perVertex = (values) => new THREE.Float32BufferAttribute(new Array(24 * values).fill(0), values);
  geometry.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(new Array(24).fill(0), 4));
  geometry.setAttribute("skinWeight", perVertex(4).setX(0, 1));

  const mesh = new THREE.SkinnedMesh(geometry, new THREE.MeshStandardMaterial());
  mesh.name = "skinned";
  mesh.add(root);
  mesh.bind(new THREE.Skeleton([root, child]));

  const group = new THREE.Group();
  group.add(mesh);

  const skinnedIn = (node) => {
    let found = null;
    node.traverse((object) => { if (object.isSkinnedMesh) found = object; });
    return found;
  };
  const contains = (node, uuid) => {
    let hit = false;
    node.traverse((object) => { if (object.uuid === uuid) hit = true; });
    return hit;
  };

  const clone = cloneModel(group);
  const copied = skinnedIn(clone);
  assert.ok(copied, "the helper must return the mesh");
  assert.notEqual(copied.skeleton.bones[0], root, "the clone must not skin itself with the original bone");
  assert.ok(
    contains(clone, copied.skeleton.bones[0].uuid),
    "the bones it uses must live inside the clone, which is what gets its matrices updated",
  );
  assert.equal(copied.skeleton.bones.length, 2, "and every joint must come across, not just the root");

  const plain = skinnedIn(group.clone(true));
  assert.equal(plain.skeleton.bones[0], root, "the control: a plain clone keeps the original bone");
});

test("a model is anchored by the box it is drawn with, not its bind pose", async () => {
  const THREE = await import("three");
  const { anchorOffset } = await import("../components/3d/clone-model.ts");

  // The lion, measured in the running viewer: the bind box sits at y -30..-82 while the pose it is
  // drawn in sits at y -68..-121. Centring by the first left the animal about 38 units under the
  // floor, and the floor and its grid then sliced across it — which is what "a plane cutting through
  // every model" was. This is the arithmetic that puts it back on the floor.
  const posed = new THREE.Box3(new THREE.Vector3(-43.56, -120.81, -28.22), new THREE.Vector3(37.86, -68.36, 18.28));
  const [x, y, z] = anchorOffset(posed);
  assert.equal(Number(y.toFixed(2)), 120.81, "the posed bottom must land on y = 0");
  assert.equal(Number(x.toFixed(2)), 2.85, "and its centre over the origin");
  assert.equal(Number(z.toFixed(2)), 4.97, "in every axis");

  const moved = posed.clone().translate(new THREE.Vector3(x, y, z));
  assert.equal(Number(moved.min.y.toFixed(6)), 0, "after the offset the model stands on the floor");
  assert.ok(Math.abs(moved.getCenter(new THREE.Vector3()).x) < 1e-6, "and is centred");

  assert.deepEqual(anchorOffset(new THREE.Box3()), [0, 0, 0], "an empty box must not produce NaN offsets");
});

test("the species viewer no longer centres by the bind pose", () => {
  // The name still appears in the comments that explain why it is not used; the tag is what must be gone.
  assert.ok(
    !/^\s*<Center[\s>]/m.test(scene),
    "drei's Center measures the bind pose; ModelAnchor measures the pose actually drawn",
  );
  assert.ok(scene.includes("<ModelAnchor>"), "so the model is wrapped in the anchor instead");
  const anchor = read("components/3d/ModelAnchor.tsx");
  assert.ok(anchor.includes("posedBounds("), "and the anchor measures the posed box");
  assert.ok(anchor.includes("anchorOffset("), "through the shared, tested arithmetic");

  // Both names appear in the comments that explain the bug, so the assertions read the code only.
  const withoutComments = (source) => source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  assert.ok(!withoutComments(anchor).includes("setFromObject"), "never the bind-pose box");
  assert.ok(!/^\s*<Center[\s>]/m.test(withoutComments(scene)), "and nothing centres by the bind pose any more");
});
