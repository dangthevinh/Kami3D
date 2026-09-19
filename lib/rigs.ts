import * as THREE from "three";

import type { SilhouetteKind } from "@/types/animal";

/**
 * Parametric creature rigs.
 *
 * Kami3D shows every species in 3D even before a modeller uploads a `.glb`: each
 * `silhouette` kind is assembled from primitives, so the encyclopedia is complete
 * on day one and the quiz can render true rotating silhouettes without shipping
 * 24 model files. As soon as `animal.model_url` is set, ModelViewer swaps this rig
 * out for the real mesh.
 *
 * Deliberately free of React and JSX: `rigBounds` is pure geometry math that is
 * unit-tested in Node, which is what keeps the size comparison honest about
 * real-world metres.
 */

export type MaterialKey = "body" | "accent" | "dark" | "eye" | "secondary";

/**
 * Every species silhouette, plus `human` — the reference figure used by
 * SizeComparison. `human` is not a species kind, so it never appears in animal
 * data; it exists only so the size chart has an honest 1.75 m yardstick.
 */
export type RigKind = SilhouetteKind | "human";

export interface PartSpec {
  shape: "sphere" | "capsule" | "cone" | "cylinder" | "box";
  args: number[];
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  material: MaterialKey;
}

const P = (
  shape: PartSpec["shape"],
  args: number[],
  position: [number, number, number],
  material: MaterialKey,
  extra: Partial<Omit<PartSpec, "shape" | "args" | "position" | "material">> = {},
): PartSpec => ({ shape, args, position, material, ...extra });

/** Rotate a capsule/cylinder so its long axis follows X. */
const ALONG_X: [number, number, number] = [0, 0, Math.PI / 2];
/** Rotate a capsule/cylinder so its long axis follows Z. */
const ALONG_Z: [number, number, number] = [Math.PI / 2, 0, 0];

function legs(count: number, spreadX: number, spreadZ: number, height: number, radius: number): PartSpec[] {
  const parts: PartSpec[] = [];
  const pairs = count / 2;
  for (let i = 0; i < pairs; i += 1) {
    const x = pairs === 1 ? 0 : spreadX * (i / (pairs - 1) - 0.5) * 2;
    for (const z of [-spreadZ, spreadZ]) {
      parts.push(
        P("capsule", [radius, height * 0.72, 6, 12], [x, height / 2, z], "dark"),
        P("sphere", [radius * 1.15, 10, 10], [x, height * 0.02, z], "dark"),
      );
    }
  }
  return parts;
}

export function buildRig(kind: RigKind): PartSpec[] {
  switch (kind) {
    // Reference figure for the size comparison: ~7.5 heads tall, no tail.
    case "human":
      return [
        // legs + feet
        P("capsule", [0.075, 0.78, 8, 14], [0.1, 0.5, 0], "dark"),
        P("capsule", [0.075, 0.78, 8, 14], [-0.1, 0.5, 0], "dark"),
        P("box", [0.11, 0.06, 0.22], [0.1, 0.03, 0.04], "dark"),
        P("box", [0.11, 0.06, 0.22], [-0.1, 0.03, 0.04], "dark"),
        // pelvis + torso
        P("sphere", [0.14, 16, 16], [0, 0.98, 0], "body", { scale: [1.25, 0.8, 0.9] }),
        P("capsule", [0.16, 0.42, 12, 18], [0, 1.28, 0], "body"),
        // shoulders + arms + hands
        P("capsule", [0.06, 0.62, 8, 12], [0.24, 1.3, 0], "body"),
        P("capsule", [0.06, 0.62, 8, 12], [-0.24, 1.3, 0], "body"),
        P("sphere", [0.06, 10, 10], [0.24, 0.94, 0], "accent"),
        P("sphere", [0.06, 10, 10], [-0.24, 0.94, 0], "accent"),
        // neck + head
        P("cylinder", [0.055, 0.055, 0.14, 10], [0, 1.64, 0], "accent"),
        P("sphere", [0.13, 18, 18], [0, 1.78, 0], "accent", { scale: [0.92, 1.12, 1] }),
        P("sphere", [0.022, 8, 8], [0.05, 1.8, 0.11], "eye"),
        P("sphere", [0.022, 8, 8], [-0.05, 1.8, 0.11], "eye"),
      ];

    case "quadruped":
      return [
        // torso + chest
        P("capsule", [0.33, 0.78, 12, 20], [0, 0.78, 0], "body", { rotation: ALONG_X }),
        P("sphere", [0.36, 20, 20], [0.4, 0.8, 0], "body", { scale: [1, 0.95, 0.95] }),
        P("sphere", [0.3, 18, 18], [-0.48, 0.82, 0], "body", { scale: [1, 0.9, 0.95] }),
        // neck + head
        P("capsule", [0.17, 0.34, 8, 14], [0.62, 1.02, 0], "body", { rotation: [0, 0, Math.PI / 3] }),
        P("sphere", [0.26, 20, 20], [0.82, 1.16, 0], "body", { scale: [1.1, 0.95, 0.98] }),
        P("cone", [0.14, 0.26, 16], [1.05, 1.1, 0], "accent", { rotation: [0, 0, -Math.PI / 2] }),
        P("sphere", [0.05, 10, 10], [0.94, 1.24, 0.14], "eye"),
        P("sphere", [0.05, 10, 10], [0.94, 1.24, -0.14], "eye"),
        // ears
        P("cone", [0.09, 0.18, 12], [0.74, 1.36, 0.15], "accent"),
        P("cone", [0.09, 0.18, 12], [0.74, 1.36, -0.15], "accent"),
        // legs + tail
        ...legs(4, 0.42, 0.24, 0.78, 0.1),
        P("cone", [0.07, 0.62, 12], [-0.82, 0.92, 0], "accent", { rotation: [0, 0, -Math.PI / 2.4] }),
      ];

    case "biped":
      return [
        P("capsule", [0.27, 0.66, 12, 20], [0, 1.05, 0], "body"),
        P("sphere", [0.3, 18, 18], [0, 0.78, 0], "body", { scale: [1.05, 0.85, 0.9] }),
        P("capsule", [0.13, 0.3, 8, 12], [0, 1.44, 0], "body"),
        P("sphere", [0.23, 20, 20], [0, 1.68, 0.02], "body", { scale: [0.95, 1.1, 1] }),
        P("cone", [0.1, 0.2, 14], [0, 1.62, 0.22], "accent", { rotation: [Math.PI / 2, 0, 0] }),
        P("sphere", [0.045, 10, 10], [0.1, 1.74, 0.16], "eye"),
        P("sphere", [0.045, 10, 10], [-0.1, 1.74, 0.16], "eye"),
        P("capsule", [0.09, 0.5, 8, 12], [0, 0.38, 0.16], "dark"),
        P("capsule", [0.09, 0.5, 8, 12], [0, 0.38, -0.16], "dark"),
        P("capsule", [0.07, 0.4, 8, 12], [0, 1.12, 0.3], "body", { rotation: [0, 0, Math.PI / 2.6] }),
        P("capsule", [0.07, 0.4, 8, 12], [0, 1.12, -0.3], "body", { rotation: [0, 0, Math.PI / 2.6] }),
        // heavy tail (kangaroo-like balance)
        P("capsule", [0.14, 0.7, 10, 14], [0, 0.52, -0.52], "accent", { rotation: [Math.PI / 2.6, 0, 0] }),
      ];

    // Deep-chested bipedal dinosaur: long counterbalancing tail, tiny arms.
    case "theropod":
      return [
        P("sphere", [0.42, 22, 22], [0, 0.78, 0], "body", { scale: [0.52, 0.52, 1.5] }),
        P("sphere", [0.34, 18, 18], [0, 0.8, -0.52], "body", { scale: [0.75, 0.8, 0.9] }),
        P("capsule", [0.15, 0.44, 10, 14], [0, 0.96, 0.55], "body", { rotation: [0.85, 0, 0] }),
        P("sphere", [0.2, 18, 18], [0, 1.08, 0.92], "body", { scale: [0.85, 0.9, 1.3] }),
        P("box", [0.22, 0.16, 0.3], [0, 1.02, 1.2], "accent"),
        P("sphere", [0.045, 10, 10], [0.13, 1.15, 1.08], "eye"),
        P("sphere", [0.045, 10, 10], [-0.13, 1.15, 1.08], "eye"),
        // tapering tail
        P("capsule", [0.16, 0.5, 10, 14], [0, 0.78, -0.95], "body", { rotation: [Math.PI / 2, 0, 0] }),
        P("capsule", [0.11, 0.46, 10, 14], [0, 0.8, -1.5], "accent", { rotation: [Math.PI / 2, 0, 0] }),
        P("capsule", [0.07, 0.4, 8, 12], [0, 0.82, -1.95], "accent", { rotation: [Math.PI / 2, 0, 0] }),
        // powerful legs + small arms
        P("capsule", [0.14, 0.5, 10, 14], [0.2, 0.44, -0.12], "dark"),
        P("capsule", [0.14, 0.5, 10, 14], [-0.2, 0.44, -0.12], "dark"),
        P("box", [0.26, 0.1, 0.36], [0.2, 0.05, 0.02], "dark"),
        P("box", [0.26, 0.1, 0.36], [-0.2, 0.05, 0.02], "dark"),
        P("capsule", [0.05, 0.24, 6, 10], [0.21, 0.92, 0.5], "accent", { rotation: [0.6, 0, 0.2] }),
        P("capsule", [0.05, 0.24, 6, 10], [-0.21, 0.92, 0.5], "accent", { rotation: [0.6, 0, -0.2] }),
      ];

    case "bird":
      return [
        P("sphere", [0.36, 22, 22], [0, 0.86, 0], "body", { scale: [0.85, 0.95, 1.15] }),
        P("sphere", [0.22, 18, 18], [0, 1.24, 0.16], "body"),
        P("cone", [0.11, 0.3, 14], [0, 1.22, 0.42], "accent", { rotation: [Math.PI / 2, 0, 0] }),
        P("sphere", [0.05, 10, 10], [0.1, 1.32, 0.3], "eye"),
        P("sphere", [0.05, 10, 10], [-0.1, 1.32, 0.3], "eye"),
        // folded wings
        P("sphere", [0.26, 16, 16], [0.34, 0.9, -0.02], "accent", { scale: [0.35, 0.9, 1.5] }),
        P("sphere", [0.26, 16, 16], [-0.34, 0.9, -0.02], "accent", { scale: [0.35, 0.9, 1.5] }),
        // tail fan
        P("box", [0.34, 0.06, 0.44], [0, 0.86, -0.52], "accent", { rotation: [-0.25, 0, 0] }),
        P("cylinder", [0.035, 0.035, 0.34, 8], [0, 0.34, 0.06], "dark"),
        P("cylinder", [0.035, 0.035, 0.34, 8], [0, 0.34, -0.06], "dark"),
        P("box", [0.16, 0.05, 0.2], [0, 0.02, 0.09], "dark"),
        P("box", [0.16, 0.05, 0.2], [0, 0.02, -0.09], "dark"),
      ];

    case "marine":
      return [
        P("sphere", [0.34, 24, 24], [0, 0.62, 0], "body", { scale: [0.82, 0.9, 1.85] }),
        P("cone", [0.2, 0.42, 16], [0, 0.6, 0.75], "body", { rotation: [Math.PI / 2, 0, 0] }),
        P("sphere", [0.05, 10, 10], [0.16, 0.72, 0.52], "eye"),
        P("sphere", [0.05, 10, 10], [-0.16, 0.72, 0.52], "eye"),
        // dorsal fin
        P("cone", [0.11, 0.4, 12], [0, 0.94, -0.06], "accent", { scale: [0.55, 1, 1] }),
        // pectoral fins
        P("cone", [0.1, 0.42, 12], [0.28, 0.52, 0.2], "accent", { rotation: [0, 0, -1.9] }),
        P("cone", [0.1, 0.42, 12], [-0.28, 0.52, 0.2], "accent", { rotation: [0, 0, 1.9] }),
        // forked tail
        P("cone", [0.09, 0.46, 12], [0.16, 0.72, -0.72], "accent", { rotation: [0.5, 0, -0.3] }),
        P("cone", [0.09, 0.46, 12], [-0.16, 0.6, -0.72], "accent", { rotation: [0.5, 0, 0.3] }),
      ];

    case "whale":
      // Deliberately long and low: a blue whale is ~27 m long but only ~4 m deep,
      // and SizeComparison scales this rig against those real numbers.
      return [
        P("sphere", [0.5, 24, 24], [0, 0.52, 0], "body", { scale: [0.62, 0.42, 3.1] }),
        P("sphere", [0.42, 20, 20], [0, 0.52, 0.82], "body", { scale: [0.7, 0.44, 0.9] }),
        P("cone", [0.16, 0.34, 14], [0, 0.5, 1.2], "body", { rotation: [Math.PI / 2, 0, 0] }),
        P("sphere", [0.05, 10, 10], [0.23, 0.56, 1.05], "eye"),
        P("sphere", [0.05, 10, 10], [-0.23, 0.56, 1.05], "eye"),
        // small hooked dorsal fin, set well back
        P("cone", [0.1, 0.24, 12], [0, 0.72, -0.62], "accent", { scale: [0.45, 1, 1] }),
        // long pectoral flippers
        P("sphere", [0.22, 16, 16], [0.34, 0.36, 0.52], "accent", { scale: [0.42, 0.22, 1.15] }),
        P("sphere", [0.22, 16, 16], [-0.34, 0.36, 0.52], "accent", { scale: [0.42, 0.22, 1.15] }),
        // horizontal fluke
        P("sphere", [0.3, 18, 18], [0, 0.5, -1.58], "accent", { scale: [1.6, 0.14, 0.6] }),
      ];

    case "serpent": {
      const segments: PartSpec[] = [];
      const count = 16;
      for (let i = 0; i < count; i += 1) {
        const t = i / (count - 1);
        const radius = 0.16 * (1 - t * 0.55);
        segments.push(
          P(
            "sphere",
            [radius, 14, 14],
            [Math.sin(t * Math.PI * 1.6) * 0.42, 0.3 + t * 0.28, 0.9 - t * 2.0],
            i % 3 === 0 ? "accent" : "body",
            { scale: [1, 0.9, 1.25] },
          ),
        );
      }
      segments.push(
        P("sphere", [0.2, 18, 18], [0.06, 0.62, 1.02], "body", { scale: [1, 0.9, 1.3] }),
        P("sphere", [0.05, 10, 10], [0.17, 0.72, 1.16], "eye"),
        P("sphere", [0.05, 10, 10], [-0.05, 0.72, 1.16], "eye"),
        P("box", [0.03, 0.03, 0.24], [0.06, 0.56, 1.28], "accent"),
      );
      return segments;
    }

    case "insect":
    default:
      return [
        P("sphere", [0.2, 18, 18], [0, 0.5, 0.14], "body", { scale: [1, 0.95, 1.05] }),
        P("sphere", [0.24, 18, 18], [0, 0.5, -0.24], "accent", { scale: [1, 0.95, 1.4] }),
        P("sphere", [0.15, 16, 16], [0, 0.54, 0.44], "dark"),
        P("sphere", [0.06, 10, 10], [0.1, 0.56, 0.55], "eye"),
        P("sphere", [0.06, 10, 10], [-0.1, 0.56, 0.55], "eye"),
        P("cylinder", [0.015, 0.015, 0.34, 6], [0.08, 0.72, 0.6], "dark", { rotation: [1.1, 0, 0.25] }),
        P("cylinder", [0.015, 0.015, 0.34, 6], [-0.08, 0.72, 0.6], "dark", { rotation: [1.1, 0, -0.25] }),
        // translucent wings
        P("sphere", [0.3, 14, 14], [0.26, 0.62, -0.16], "secondary", { scale: [0.7, 0.06, 1.5], rotation: [0, 0.25, 0.12] }),
        P("sphere", [0.3, 14, 14], [-0.26, 0.62, -0.16], "secondary", { scale: [0.7, 0.06, 1.5], rotation: [0, -0.25, -0.12] }),
        ...legs(6, 0.3, 0.16, 0.5, 0.022),
      ];
  }
}

/**
 * Axis-aligned bounding box of a rig, in rig units.
 *
 * Each primitive's local half-extents are rotated by that part's own rotation and
 * accumulated as 8 corners into a `THREE.Box3`. That is exact for boxes and a tight
 * bound for ellipsoids/cones, which is what SizeComparison needs to convert a rig
 * into real-world metres: exact geometry measurement, no measuring pass in the
 * scene, and therefore no one-frame scale pop-in.
 *
 * The rigs are built standing on the ground plane (feet at y ≈ 0), so the box's
 * `min.y` is the floor and `size.y` is a true height — not a diameter.
 */
export function rigBounds(kind: RigKind): THREE.Box3 {
  const box = new THREE.Box3();
  const corner = new THREE.Vector3();
  const half = new THREE.Vector3();
  const offset = new THREE.Vector3();
  const euler = new THREE.Euler();
  const quaternion = new THREE.Quaternion();

  for (const spec of buildRig(kind)) {
    const [a = 0, b = 0, c = 0] = spec.args;

    // Local half-extents before rotation (primitives are Y-aligned in three.js).
    switch (spec.shape) {
      case "sphere":
        half.set(a, a, a);
        break;
      case "capsule":
        half.set(a, b / 2 + a, a);
        break;
      case "cone":
      case "cylinder":
        half.set(a, b / 2, a);
        break;
      case "box":
      default:
        half.set(a / 2, b / 2, c / 2);
        break;
    }

    if (spec.scale) half.set(half.x * spec.scale[0], half.y * spec.scale[1], half.z * spec.scale[2]);

    euler.set(...(spec.rotation ?? [0, 0, 0]));
    quaternion.setFromEuler(euler);
    offset.set(...spec.position);

    for (const sx of [-1, 1]) {
      for (const sy of [-1, 1]) {
        for (const sz of [-1, 1]) {
          corner.set(half.x * sx, half.y * sy, half.z * sz).applyQuaternion(quaternion).add(offset);
          box.expandByPoint(corner);
        }
      }
    }
  }

  return box;
}

/** Convenience wrapper: rig size in rig units plus the box itself. */
export function rigExtents(kind: RigKind) {
  const box = rigBounds(kind);
  const size = box.getSize(new THREE.Vector3());
  return { box, width: size.x, height: size.y, depth: size.z };
}
