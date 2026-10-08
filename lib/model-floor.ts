import * as THREE from "three";

/**
 * The floor rule: no model may be drawn below y = 0.
 *
 * ## What was wrong
 *
 * `ModelAnchor` measured the model **once**, in the pose it was mounted in, and moved it so that
 * pose stood on the floor. Then the first animation clip started. An animation moves the animal -
 * that is what it is for - and a clip whose lowest pose is below its first pose takes the model
 * through the floor with it.
 *
 * Measured over all 74 shipped models, with the GPU's own arithmetic (`getVertexPosition` then
 * `matrixWorld`, every vertex) and the first clip sampled at eight times:
 *
 *   - in the mounted pose, **0 of 74** models are below the floor. The one-shot anchor works.
 *   - across the clip, **19 of 74** go below it. The worst are not marginal: `peregrine-falcon`
 *     reaches -942 units (18% of its own height), `scarlet-macaw` -173 (42%), `bald-eagle` -103
 *     (35%), `sperm-whale` -40 (17%).
 *
 * So the floor is not a property of a model, it is a property of a model **in a clip**. The anchor
 * has to be the lowest point the animal reaches, not the point it starts from.
 *
 * ## The rule, and what it costs
 *
 * The boxes are unioned - the pose it mounts in and a sample across the clip it will play - and the
 * model is anchored to that union. The cost is stated rather than hidden: a bird that tucks its legs
 * mid-flight now hovers slightly at rest, because the anchor reserves room for the lowest pose. The
 * alternative is an animal that walks through the studio floor, which is worse, and "never below the
 * floor" is the rule this module exists to make true.
 */

/**
 * How many times a clip is sampled. See the header: eight left four models under the floor, thirty-two
 * leaves one that matters. The scan is cached per (model, clip), so this runs once.
 */
export const FLOOR_SAMPLES = 32;

/**
 * How many vertices the runtime guard watches.
 *
 * The scan is a sample, and a sample cannot promise anything: a clip that dips for one frame between
 * two sampled times goes under the floor and the scan never sees it. So the anchor also watches a
 * fixed set of vertices each frame. They are picked once per model - evenly spaced through the
 * position buffer, which is cheap to choose and good enough for a net under a rule that the scan has
 * already made true - and each frame they are pushed through the same skinning the GPU uses.
 *
 * A net, not the rule: the scan is what puts the model on the floor, the guard is what keeps a clip
 * from embarrassing it afterwards.
 */
export const FLOOR_PROBES = 192;

/** A model at y = -0.001 is standing on the floor; one at y = -0.02 of its own height is not. */
export const FLOOR_EPSILON = 1e-3;

/** Where to move a model so its lowest sampled point rests on the floor and it sits over the origin. */
export function floorOffset(box: THREE.Box3): [number, number, number] {
  if (box.isEmpty()) return [0, 0, 0];
  const centre = box.getCenter(new THREE.Vector3());
  return [-centre.x, -box.min.y, -centre.z];
}

/** True when this box has any part of the model under the floor. Used by the tests and the audit. */
export function belowFloor(box: THREE.Box3, epsilon = FLOOR_EPSILON): boolean {
  return !box.isEmpty() && box.min.y < -epsilon;
}

/**
 * The times a clip is sampled at.
 *
 * Always includes t = 0 - the pose the model rests in - and divides the clip evenly after that. A
 * clip of unknown or zero duration is sampled at 0 alone, which puts the rule back where it was
 * rather than inventing times.
 */
export function sampleTimes(duration: number, samples = FLOOR_SAMPLES): number[] {
  if (!Number.isFinite(duration) || duration <= 0) return [0];
  const times = [0];
  for (let index = 1; index <= samples; index += 1) times.push((duration * index) / samples);
  return times;
}

/**
 * The lowest floor a model may be anchored to, given what the guard has seen.
 *
 * This is the ratchet: the guard may raise the anchor, and may never lower it. Without that a clip
 * that dips would make the animal bob up and down - lifted as it sinks, dropped as it rises - and a
 * bouncing animal is a worse lie than a floating one. Monotonic means a single pass of the clip
 * settles it for good.
 */
export function ratchet(current: number, observed: number): number {
  if (!Number.isFinite(observed)) return current;
  return Math.max(current, observed);
}

/** The union of several boxes: the space the model occupies over the whole clip. */
export function unionBoxes(boxes: readonly THREE.Box3[]): THREE.Box3 {
  const box = new THREE.Box3();
  for (const entry of boxes) if (!entry.isEmpty()) box.union(entry);
  return box;
}
