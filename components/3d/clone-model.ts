import * as THREE from "three";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";

/**
 * Drawing a downloaded model without breaking the ones that have a skeleton.
 *
 * `gltf.scene.clone(true)` is the obvious way to draw a cached model more than once, and it is
 * wrong for anything skinned. `Object3D.clone()` copies a `SkinnedMesh` by reference to its
 * **skeleton**, so the copy keeps deforming itself with the *original* bones — and those bones
 * live in the cached scene, which is never rendered, so their world matrices are never updated.
 * The vertices are then transformed by stale matrices instead of the pose: the mesh collapses
 * into flat, sliced shapes. That is what "there is a plane cutting across the blue whale" was.
 *
 * The whale is 9,960 triangles driven by **49 joints**, and it ships an animation, so it is
 * exactly the asset this breaks. drei ships a `<Clone>` component that reaches for
 * `SkeletonUtils.clone` as soon as an object contains a skinned mesh, for the same reason.
 *
 * `SkeletonUtils.clone` re-binds every cloned mesh to the cloned bones, so the pose, the
 * animation clips and the dispose walk all keep working.
 */
export function cloneModel(source: THREE.Object3D): THREE.Object3D {
  return cloneSkinned(source);
}

/**
 * The box a model actually occupies **once posed**, in world space.
 *
 * `Box3.setFromObject` measures the geometry's bind pose, which for a skinned asset is not the
 * shape on screen: a whale with its tail curved has a bounding box the model is not inside.
 * Framing a card from the wrong box is how a model ends up half outside its own tile.
 */
/**
 * Where to move a model so that it stands on the floor and sits over the origin.
 *
 * Extracted so `npm run check:materials` can pin it without a WebGL context: the bug it fixes was
 * invisible in every screenshot until you knew to compare two boxes, and it is one line of arithmetic
 * that a later refactor could quietly invert.
 */
export function anchorOffset(box: THREE.Box3): [number, number, number] {
  if (box.isEmpty()) return [0, 0, 0];
  const centre = box.getCenter(new THREE.Vector3());
  return [-centre.x, -box.min.y, -centre.z];
}

export function posedBounds(root: THREE.Object3D): THREE.Box3 {
  root.updateWorldMatrix(true, true);
  const box = new THREE.Box3();
  const local = new THREE.Box3();

  root.traverse((object) => {
    const skinned = object as THREE.SkinnedMesh;
    if (skinned.isSkinnedMesh) {
      skinned.computeBoundingBox();
      if (skinned.boundingBox) {
        local.copy(skinned.boundingBox).applyMatrix4(skinned.matrixWorld);
        box.union(local);
      }
      return;
    }

    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
    if (mesh.geometry.boundingBox) {
      local.copy(mesh.geometry.boundingBox).applyMatrix4(mesh.matrixWorld);
      box.union(local);
    }
  });

  return box;
}
