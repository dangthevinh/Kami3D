/**
 * Camera presets for the species viewer, as arithmetic.
 *
 * The viewer needs to answer three questions without a scene graph: where should
 * the camera sit to look at a model from the front, where does one arrow-key press
 * move it, and has the flight arrived. All three are pure functions of vectors, so
 * they live here — testable in Node, and reviewable without a GPU.
 *
 * The conventions:
 *
 *   - a preset is a **unit direction** from the focus point, never a position: the
 *     distance is whatever the current framing is (`<Bounds>` fits the camera to
 *     the model), so switching preset never zooms the visitor in or out;
 *   - "top" is clamped away from straight up (`MAX_ELEVATION`), because an exactly
 *     vertical view makes the up-vector degenerate and the model spins sideways;
 *   - flights are exponentially damped, so they are frame-rate independent and
 *     always ease out rather than stopping dead.
 */

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export type CameraPresetId = "threeQuarter" | "front" | "side" | "top";

export interface CameraPreset {
  id: CameraPresetId;
  label: string;
  /** Unit direction from the focus point towards the camera. */
  direction: Vec3;
}

/** Above this, the view is too close to vertical for OrbitControls to behave. */
export const MAX_ELEVATION = 0.94;

/** Below this, a "rotation" would be indistinguishable from noise. */
export const MIN_DISTANCE = 0.05;

export const CAMERA_PRESETS: CameraPreset[] = [
  { id: "threeQuarter", label: "3/4", direction: { x: 0.62, y: 0.42, z: 0.66 } },
  { id: "front", label: "Front", direction: { x: 0, y: 0.12, z: 1 } },
  { id: "side", label: "Side", direction: { x: 1, y: 0.16, z: 0.05 } },
  { id: "top", label: "Top", direction: { x: 0.12, y: 1, z: 0.12 } },
];

export const CAMERA_PRESET_IDS = CAMERA_PRESETS.map((preset) => preset.id);

const length = (v: Vec3) => Math.hypot(v.x, v.y, v.z);

/** Unit vector, with the elevation clamped so a view is never exactly vertical. */
export function normalizeDirection(direction: Vec3): Vec3 {
  const size = length(direction);
  if (!Number.isFinite(size) || size < 1e-6) return { x: 0, y: 0, z: 1 };

  let { x, y, z } = { x: direction.x / size, y: direction.y / size, z: direction.z / size };
  if (Math.abs(y) > MAX_ELEVATION) {
    y = Math.sign(y) * MAX_ELEVATION;
    const horizontal = Math.hypot(x, z);
    const budget = Math.sqrt(1 - y * y);
    if (horizontal < 1e-6) {
      // Straight up or straight down: there is no heading to keep, so pick one.
      x = 0;
      z = budget;
    } else {
      // Keep the heading, spend the remaining length budget on x/z.
      x = (x / horizontal) * budget;
      z = (z / horizontal) * budget;
    }
  }
  return { x, y, z };
}

/**
 * The position a camera should fly to: same distance from the focus, new heading.
 * `minDistance` keeps a degenerate current position (camera exactly on the focus)
 * from producing a zero-length flight.
 */
export function orbitFromFocus(focus: Vec3, current: Vec3, direction: Vec3, minDistance = MIN_DISTANCE): Vec3 {
  const unit = normalizeDirection(direction);
  const distance = Math.max(length({ x: current.x - focus.x, y: current.y - focus.y, z: current.z - focus.z }), minDistance);
  return {
    x: focus.x + unit.x * distance,
    y: focus.y + unit.y * distance,
    z: focus.z + unit.z * distance,
  };
}

/** One damped step towards a target. Frame-rate independent by construction. */
export function approach(current: Vec3, target: Vec3, delta: number, responsiveness = 6): Vec3 {
  const t = 1 - Math.exp(-Math.max(0, responsiveness) * Math.max(0, delta));
  return {
    x: current.x + (target.x - current.x) * t,
    y: current.y + (target.y - current.y) * t,
    z: current.z + (target.z - current.z) * t,
  };
}

export function hasArrived(current: Vec3, target: Vec3, epsilon = 0.01): boolean {
  return length({ x: target.x - current.x, y: target.y - current.y, z: target.z - current.z }) <= epsilon;
}

/** Rotate the camera around the focus: yaw in radians, pitch clamped to the poles. */
export function orbitBy(focus: Vec3, position: Vec3, yaw: number, pitch: number): Vec3 {
  const offset = { x: position.x - focus.x, y: position.y - focus.y, z: position.z - focus.z };
  const radius = length(offset);
  if (radius < 1e-6) return { ...position };

  // Spherical: theta is the heading in the XZ plane, phi the elevation.
  let theta = Math.atan2(offset.x, offset.z) + yaw;
  let phi = Math.acos(clamp(offset.y / radius, -1, 1)) - pitch;
  phi = clamp(phi, 0.08, Math.PI - 0.08);

  const sinPhi = Math.sin(phi);
  return {
    x: focus.x + radius * sinPhi * Math.sin(theta),
    y: focus.y + radius * Math.cos(phi),
    z: focus.z + radius * sinPhi * Math.cos(theta),
  };
}

/** Zoom by a factor (< 1 moves closer), with the distance clamped. */
export function dolly(focus: Vec3, position: Vec3, factor: number, minDistance = 0.6, maxDistance = 26): Vec3 {
  const offset = { x: position.x - focus.x, y: position.y - focus.y, z: position.z - focus.z };
  const radius = length(offset);
  if (radius < 1e-6) return { ...position };

  const next = clamp(radius * factor, minDistance, maxDistance);
  const scale = next / radius;
  return { x: focus.x + offset.x * scale, y: focus.y + offset.y * scale, z: focus.z + offset.z * scale };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
