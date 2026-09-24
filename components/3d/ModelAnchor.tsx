"use client";

import * as React from "react";
import * as THREE from "three";

import { anchorOffset, posedBounds } from "@/components/3d/clone-model";

/**
 * Puts a model on the floor using the box it is **drawn** with.
 *
 * drei's `<Center bottom>` measures with `Box3.setFromObject`, which for a skinned mesh reads the
 * geometry's **bind pose**. A rigged asset is drawn in whatever pose its joints are in, and the two
 * are not the same box: measured on the lion, its bind box sat at y -30..-82 while the pose it is
 * actually drawn in sat at y -68..-121 — about 38 units lower. Centring by the bind box therefore
 * left the model **under the floor**, and what a visitor sees then is the studio floor and its grid
 * slicing across the animal. That is the "plane cutting through every model" report, and it is why it
 * was every model: almost everything in the catalogue is rigged.
 *
 * The offset is measured once, after the model is in the scene, from the posed box — and measured
 * with the group's own offset cleared, so a re-measure cannot accumulate.
 */
export function ModelAnchor({
  children,
  onMeasured,
}: {
  children: React.ReactNode;
  /** The posed box, in the anchor's parent space, for callers that frame the model themselves. */
  onMeasured?: (box: THREE.Box3) => void;
}) {
  const group = React.useRef<THREE.Group>(null);
  const [offset, setOffset] = React.useState<[number, number, number]>([0, 0, 0]);

  React.useLayoutEffect(() => {
    const target = group.current;
    if (!target) return;

    const measure = () => {
      target.position.set(0, 0, 0);
      target.updateWorldMatrix(true, true);
      const box = posedBounds(target);
      if (box.isEmpty()) return;
      setOffset(anchorOffset(box));
      onMeasured?.(box);
    };

    measure();
    // The pose settles a frame after the model mounts, and again when a clip is played.
    const id = window.setTimeout(measure, 250);
    return () => window.clearTimeout(id);
  }, [children, onMeasured]);

  return (
    <group ref={group} position={offset}>
      {children}
    </group>
  );
}
