import type * as THREE from "three";

import { materialFix } from "@/lib/model-materials";

/**
 * The two corrections every downloaded model needs, applied to one three material.
 *
 * See lib/model-materials.ts for the reasoning and the lion's own numbers — this file exists
 * only so that the species viewer and the card preview cannot drift apart on the answer. It is
 * deliberately not in lib/: it imports three, and the rules it applies are pinned as pure
 * functions in `npm run check:materials`, which needs no WebGL context to run.
 */
export function applyMaterialFix(material: THREE.MeshStandardMaterial) {
  const fix = materialFix({
    metalness: material.metalness,
    transparent: material.transparent,
    opacity: material.opacity,
    alphaTest: material.alphaTest,
    hasAlphaMap: Boolean(material.alphaMap),
  });

  if (fix.opaque) {
    // A blend mode on a material nothing can blend: it only costs depth writes, and without
    // those the model's own faces sort against each other and it reads as a ghost.
    material.transparent = false;
    material.depthWrite = true;
    material.needsUpdate = true;
  }

  material.envMapIntensity = fix.envMapIntensity;
}
