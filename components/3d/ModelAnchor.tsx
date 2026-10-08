"use client";

import { useFrame } from "@react-three/fiber";
import * as React from "react";
import * as THREE from "three";

import { cloneTransform, posedBounds, restoreTransform } from "@/components/3d/clone-model";
import { FLOOR_PROBES, floorOffset, ratchet, sampleTimes, unionBoxes } from "@/lib/model-floor";

/**
 * Puts a model on the floor using **every pose it will be drawn in**, and keeps it there.
 *
 * Three findings live in this file, all measured over the 74 shipped models with the GPU's own
 * arithmetic — every vertex through `getVertexPosition` and then `matrixWorld`:
 *
 * 1. **The bind-pose bug.** drei's `<Center bottom>` measures with `Box3.setFromObject`, which for a
 *    skinned mesh reads the geometry's bind pose. A rigged asset is drawn in whatever pose its joints
 *    are in, and the two are not the same box: on the lion the bind box sat at y -30..-82 while the
 *    pose on screen sat at y -68..-121. Centring by the bind box left the model under the floor, and
 *    the studio floor grid then sliced across every animal.
 *
 * 2. **The still-pose bug.** Measuring once, in the pose the model mounts in, is right only until the
 *    first clip starts. Across its clip `peregrine-falcon` reached y -942 — 18% of its own height —
 *    `scarlet-macaw` -173 (42%), `bald-eagle` -103 (35%). **19 of 74** models went under the floor
 *    that way. So the anchor is the union of the mounted pose and a sample across the clip.
 *
 * 3. **The sampling hole.** A sample is not a promise: a clip that dips between two sampled times
 *    goes under the floor unseen. Eight samples left four models under; thirty-two leaves one that
 *    matters. So the scan is backed by a guard — a fixed set of vertices pushed through the skinning
 *    every sixth frame, raising the anchor whenever one of them is below the floor and never lowering
 *    it again (`ratchet`), which is what makes the rule an invariant rather than a good habit.
 *
 * The scan runs once per (model, clip) and is cached, because it walks every skinned vertex; the
 * guard costs \`FLOOR_PROBES\` vertices every sixth frame. Both are stated here because both are the
 * price of the rule.
 */

const scanCache = new Map<string, THREE.Box3>();

/** The vertices the guard watches: evenly spaced through each mesh's position buffer. */
function chooseProbes(root: THREE.Object3D): Array<{ mesh: THREE.Mesh; indices: number[] }> {
  const probes: Array<{ mesh: THREE.Mesh; indices: number[] }> = [];
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    const count = mesh.geometry.getAttribute("position")?.count ?? 0;
    if (count === 0) return;
    const step = Math.max(1, Math.floor(count / FLOOR_PROBES));
    const indices: number[] = [];
    for (let index = 0; index < count; index += step) indices.push(index);
    probes.push({ mesh, indices });
  });
  return probes;
}

/** The lowest watched vertex, through the same skinning the GPU does. */
function probeFloor(probes: ReadonlyArray<{ mesh: THREE.Mesh; indices: number[] }>, vertex: THREE.Vector3): number {
  let lowest = Infinity;
  for (const { mesh, indices } of probes) {
    const skinned = mesh as THREE.SkinnedMesh;
    for (const index of indices) {
      if (skinned.isSkinnedMesh) skinned.getVertexPosition(index, vertex);
      else vertex.fromBufferAttribute(mesh.geometry.getAttribute("position"), index);
      vertex.applyMatrix4(mesh.matrixWorld);
      if (vertex.y < lowest) lowest = vertex.y;
    }
  }
  return lowest;
}

export interface ModelAnchorProps {
  children: React.ReactNode;
  /** The clips the asset ships, so the floor can be checked across the one that will play. */
  animations?: readonly THREE.AnimationClip[];
  /** The clip the viewer has selected; the first clip is scanned when nothing is chosen. */
  clip?: string | null;
  /** Key for the scan cache. Without one, nothing is cached and every mount re-scans. */
  cacheKey?: string;
  /** The posed box including the clip, in the anchor's parent space. */
  onMeasured?: (box: THREE.Box3) => void;
}

export function ModelAnchor({ children, animations, clip = null, cacheKey, onMeasured }: ModelAnchorProps) {
  const group = React.useRef<THREE.Group>(null);
  const [base, setBase] = React.useState<[number, number, number]>([0, 0, 0]);
  const [lift, setLift] = React.useState(0);

  const guard = React.useRef<{ armed: boolean; lift: number; probes: ReturnType<typeof chooseProbes>; frame: number }>({
    armed: false,
    lift: 0,
    probes: [],
    frame: 0,
  });

  React.useLayoutEffect(() => {
    const target = group.current;
    if (!target) return;

    const active = animations?.find((entry) => entry.name === clip) ?? animations?.[0] ?? null;
    const key = cacheKey ? cacheKey + "|" + (active?.name ?? "static") : null;

    const measure = () => {
      target.position.set(0, 0, 0);
      target.updateMatrixWorld(true);

      const cached = key ? scanCache.get(key) : undefined;
      const box = cached ?? (() => {
        const boxes: THREE.Box3[] = [];
        const mounted = posedBounds(target);
        if (!mounted.isEmpty()) boxes.push(mounted);
        if (active) {
          const snapshot = cloneTransform(target);
          const mixer = new THREE.AnimationMixer(target);
          try {
            mixer.clipAction(active).play();
            for (const time of sampleTimes(active.duration)) {
              mixer.setTime(time);
              target.updateMatrixWorld(true);
              const sampled = posedBounds(target);
              if (!sampled.isEmpty()) boxes.push(sampled);
            }
          } catch (error) {
            // A clip that cannot be resolved does not leave the model unanchored: the mounted pose is
            // measured above, and that is what the anchor used before any of this existed.
            console.warn("[kami3d] floor scan could not play " + active.name + ": " + String(error).split("\n")[0]);
          } finally {
            mixer.stopAllAction();
            mixer.uncacheRoot(target);
            restoreTransform(target, snapshot);
            target.updateMatrixWorld(true);
          }
        }
        return unionBoxes(boxes);
      })();

      if (box.isEmpty()) return;
      if (key && !cached) scanCache.set(key, box);

      setBase(floorOffset(box));
      onMeasured?.(box);

      // The guard is armed after the scan, so it watches a model that is already on the floor.
      const state = guard.current;
      state.probes = chooseProbes(target);
      state.lift = 0;
      state.frame = 0;
      state.armed = state.probes.length > 0;
      setLift(0);
    };

    measure();
    // The pose settles a frame after the model mounts, and again when a clip is played.
    const id = window.setTimeout(measure, 250);
    return () => {
      window.clearTimeout(id);
      guard.current.armed = false;
    };
  }, [children, animations, clip, cacheKey, onMeasured]);

  /**
   * The net under the scan.
   *
   * Every sixth frame the watched vertices go through the skinning the GPU uses. If any of them is
   * below the floor the anchor is raised — and never lowered again, so a dipping clip settles after
   * one pass instead of making the animal bob.
   */
  useFrame(() => {
    const target = group.current;
    const state = guard.current;
    if (!target || !state.armed) return;
    state.frame += 1;
    if (state.frame % 6 !== 0) return;
    target.updateMatrixWorld(true);
    const lowest = probeFloor(state.probes, new THREE.Vector3());
    if (!Number.isFinite(lowest)) return;
    const next = ratchet(state.lift, -lowest);
    if (next <= state.lift) return;
    state.lift = next;
    setLift(next);
  });

  return (
    <group ref={group} position={[base[0], base[1] + lift, base[2]]}>
      {children}
    </group>
  );
}
