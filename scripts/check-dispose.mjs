/**
 * Checks for the GLB disposal walk.
 *
 * The leak it fixes was measured once with `renderer.info.memory` and would be expensive to measure
 * again in CI, so the property is pinned directly instead: every geometry, material and texture
 * reachable from a clone is released **exactly once**, shared objects are not released twice, and a
 * scene that is only half-built does not throw on the way out.
 *
 * The fakes below carry the same flags three's own classes do (`isBufferGeometry`, `isMaterial`,
 * `isTexture`), which is how the walk recognises them without importing three.
 *
 * Run with: npm run check:dispose
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import { disposeClone } from "../lib/three-dispose.ts";

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");


function geometry() {
  const state = { disposed: 0 };
  return { isBufferGeometry: true, state, dispose() { state.disposed += 1; } };
}

function texture() {
  const state = { disposed: 0 };
  return { isTexture: true, state, dispose() { state.disposed += 1; } };
}

function material(maps = {}) {
  const state = { disposed: 0 };
  return { isMaterial: true, state, ...maps, dispose() { state.disposed += 1; } };
}

function mesh({ geometry: geo, material: mat, children = [] } = {}) {
  return { type: "Mesh", geometry: geo, material: mat, children };
}

test("a clone gives back every geometry, material and texture", () => {
  const map = texture();
  const normalMap = texture();
  const geo = geometry();
  const mat = material({ map, normalMap, roughness: 0.4 });

  const report = disposeClone({ type: "Group", children: [mesh({ geometry: geo, material: mat })] });

  assert.deepEqual(report, { geometries: 1, materials: 1, textures: 2 });
  assert.equal(geo.state.disposed, 1);
  assert.equal(mat.state.disposed, 1);
  assert.equal(map.state.disposed, 1);
  assert.equal(normalMap.state.disposed, 1);
});

test("objects shared by several meshes are released once, not once per mesh", () => {
  const sharedGeometry = geometry();
  const sharedMaterial = material({ map: texture() });

  const report = disposeClone({
    type: "Group",
    children: [
      mesh({ geometry: sharedGeometry, material: sharedMaterial }),
      mesh({ geometry: sharedGeometry, material: sharedMaterial }),
      mesh({ geometry: sharedGeometry, material: [sharedMaterial] }),
    ],
  });

  assert.equal(report.geometries, 1, "a clone shares geometry by reference");
  assert.equal(report.materials, 1);
  assert.equal(report.textures, 1);
  assert.equal(sharedGeometry.state.disposed, 1);
  assert.equal(sharedMaterial.state.disposed, 1);
});

test("an array of materials is walked, and one already disposed is skipped", () => {
  const first = material();
  const second = material({ emissiveMap: texture() });

  const report = disposeClone(mesh({ geometry: geometry(), material: [first, second, null, undefined, "not a material"] }));
  assert.deepEqual(report, { geometries: 1, materials: 2, textures: 1 });

  // Running it twice is safe: the second pass finds nothing left to release.
  const again = disposeClone(mesh({ geometry: geometry(), material: first }));
  assert.deepEqual(again, { geometries: 1, materials: 1, textures: 0 });
});

test("a half-built scene does not throw on the way out", () => {
  assert.deepEqual(disposeClone(null), { geometries: 0, materials: 0, textures: 0 });
  assert.deepEqual(disposeClone(undefined), { geometries: 0, materials: 0, textures: 0 });
  assert.deepEqual(disposeClone("not a scene"), { geometries: 0, materials: 0, textures: 0 });
  assert.deepEqual(disposeClone({ children: [null, 4, {}] }), { geometries: 0, materials: 0, textures: 0 });

  // A geometry without a dispose method is skipped rather than fatal.
  assert.deepEqual(disposeClone({ isBufferGeometry: true }), { geometries: 0, materials: 0, textures: 0 });

  // A deep hierarchy is walked without recursion, so a long chain cannot overflow the stack.
  let chain = { type: "Mesh", geometry: geometry(), material: material() };
  for (let index = 0; index < 5000; index += 1) chain = { type: "Group", children: [chain] };
  assert.deepEqual(disposeClone(chain), { geometries: 1, materials: 1, textures: 0 });
});

test("a cycle does not loop for ever", () => {
  const node = { type: "Group", geometry: geometry(), material: material(), children: [] };
  node.children.push(node, { type: "Group", children: [node] });

  assert.deepEqual(disposeClone(node), { geometries: 1, materials: 1, textures: 0 });
});

test("the two viewers that clone a GLB actually call it", () => {
  const viewers = ["components/3d/ModelScene.tsx", "components/quiz/SilhouetteStage.tsx"];

  for (const viewer of viewers) {
    const source = readFileSync(join(root, viewer), "utf8");
    assert.ok(source.includes("disposeClone"), viewer + " clones a GLB but never gives it back");
    assert.ok(/clone\(true\)/.test(source), viewer + " no longer clones, so the disposal may be dead code");
  }
});
