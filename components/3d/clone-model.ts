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
 * A snapshot of every transform in a subtree, so a scan can move the model and put it back.
 *
 * Sampling an animation writes to every bone it touches. Without this the model would be left in
 * whichever sampled pose happened to be last - visible on any asset whose clip the viewer is not
 * playing, which is every asset until a visitor presses play.
 */
export interface TransformSnapshot {
  object: THREE.Object3D;
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  scale: THREE.Vector3;
}

export function cloneTransform(root: THREE.Object3D): TransformSnapshot[] {
  const snapshot: TransformSnapshot[] = [];
  root.traverse((object) => {
    snapshot.push({
      object,
      position: object.position.clone(),
      quaternion: object.quaternion.clone(),
      scale: object.scale.clone(),
    });
  });
  return snapshot;
}

export function restoreTransform(root: THREE.Object3D, snapshot: readonly TransformSnapshot[]): void {
  for (const entry of snapshot) {
    entry.object.position.copy(entry.position);
    entry.object.quaternion.copy(entry.quaternion);
    entry.object.scale.copy(entry.scale);
  }
  root.updateMatrixWorld(true);
}

export function posedBounds(root: THREE.Object3D): THREE.Box3 {
  // `updateMatrixWorld`, not `updateWorldMatrix`: a SkinnedMesh refreshes `bindMatrixInverse` inside
  // the former, and `getVertexPosition` divides by it. Measuring with a stale one double-counts the
  // object's own transform — measured: a group moved up 10 reported a box moved up 20 — and the
  // anchor then lifts the model by the wrong amount. The renderer uses this method every frame.
  root.updateMatrixWorld(true);
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
