import { rigExtents, type RigKind } from "./rigs.ts";

/**
 * Size-comparison layout math.
 *
 * Pure functions, no React and no three.js scene access, so the numbers behind
 * "how big is this animal really?" can be unit-tested in Node
 * (`npm run check:size`) instead of being eyeballed in a viewport.
 *
 * Two guarantees the tests enforce:
 *   1. each figure's *dominant* real dimension (length for long animals, height
 *      for tall ones) is rendered exactly;
 *   2. the secondary dimension is pulled toward reality by a bounded correction
 *      factor, so a stylised rig never renders as a cartoon.
 */

export interface FigureSpec {
  id: string;
  label: string;
  /** Human-readable measurement shown under the label. */
  sublabel: string;
  kind: RigKind;
  lengthM: number;
  heightM: number;
  accent: [string, string];
  emoji: string;
  /** Reference figures cannot be removed from the chart. */
  locked?: boolean;
}

export interface PlacedFigure extends FigureSpec {
  scale: [number, number, number];
  position: [number, number, number];
  /** World-space height of the rendered figure, in metres. */
  renderedHeight: number;
  /** World-space length (X or Z extent) of the rendered figure, in metres. */
  renderedLength: number;
  /** Rendered width along the chart's X axis, in metres. */
  footprintX: number;
  /** World-space X edges of the rendered geometry (rig boxes are not symmetric). */
  leftEdge: number;
  rightEdge: number;
  /** Top of the figure, for placing its label. */
  top: number;
}

const MIN_CORRECTION = 0.6;
const MAX_CORRECTION = 1.4;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Per-axis scale that maps a rig onto a real animal's measurements.
 *
 * Non-uniform on purpose: rigs are stylised proxies, so we lock the dominant
 * axis exactly and nudge the other one, clamped to ±40% so nothing distorts
 * beyond recognition.
 */
export function computeFigureScale(kind: RigKind, lengthM: number, heightM: number): [number, number, number] {
  const rig = rigExtents(kind);
  const longAxisIsX = rig.width >= rig.depth;
  const rigLong = longAxisIsX ? rig.width : rig.depth;

  const length = Math.max(lengthM, 0.01);
  const height = Math.max(heightM, 0.01);
  const dominantIsLength = length >= height;

  const uniform = dominantIsLength ? length / rigLong : height / rig.height;
  const wantOther = dominantIsLength ? height : length;
  const rigOther = dominantIsLength ? rig.height : rigLong;
  const corrected = uniform * clamp(wantOther / (rigOther * uniform), MIN_CORRECTION, MAX_CORRECTION);

  const scaleY = dominantIsLength ? corrected : uniform;
  const scaleLong = dominantIsLength ? uniform : corrected;

  return [
    longAxisIsX ? scaleLong : uniform,
    scaleY,
    longAxisIsX ? uniform : scaleLong,
  ];
}

/**
 * Lay figures out along the X axis, left to right, with a fixed gap.
 *
 * Uses each rig's true bounding box, so figures are separated by real rendered
 * geometry rather than by guessed footprints, then centres the whole row on the
 * origin so the camera rig can frame it symmetrically.
 */
export function layoutFigures(figures: FigureSpec[], gap = 1.6): { figures: PlacedFigure[]; totalWidth: number } {
  let cursor = 0;

  const placed: PlacedFigure[] = figures.map((figure) => {
    const rig = rigExtents(figure.kind);
    const scale = computeFigureScale(figure.kind, figure.lengthM, figure.heightM);

    const minX = rig.box.min.x * scale[0];
    const maxX = rig.box.max.x * scale[0];
    const centerZ = ((rig.box.min.z + rig.box.max.z) / 2) * scale[2];

    const x = cursor - minX;
    cursor = x + maxX + gap;

    const longAxisIsX = rig.width >= rig.depth;
    const rigLong = longAxisIsX ? rig.width : rig.depth;

    return {
      ...figure,
      scale,
      position: [x, 0, -centerZ],
      renderedHeight: rig.height * scale[1],
      renderedLength: rigLong * (longAxisIsX ? scale[0] : scale[2]),
      footprintX: maxX - minX,
      leftEdge: x + minX,
      rightEdge: x + maxX,
      top: rig.box.max.y * scale[1],
    };
  });

  // Centre the row on the origin without re-deriving the geometry.
  const totalWidth = Math.max(cursor - gap, 0.01);
  const offset = totalWidth / 2;
  for (const figure of placed) {
    figure.position[0] -= offset;
    figure.leftEdge -= offset;
    figure.rightEdge -= offset;
  }

  return { figures: placed, totalWidth };
}

/** The yardsticks offered on every species page. */
export const REFERENCE_FIGURES: FigureSpec[] = [
  {
    id: "human",
    label: "Human",
    sublabel: "1.75 m tall",
    kind: "human",
    lengthM: 0.6,
    heightM: 1.75,
    accent: ["#2f6fd0", "#e8b48c"],
    emoji: "🧍",
  },
  {
    id: "whale",
    label: "Blue whale",
    sublabel: "27 m long",
    kind: "whale",
    lengthM: 27,
    heightM: 4.5,
    accent: ["#3f6fb5", "#1b2a48"],
    emoji: "🐋",
  },
  {
    id: "trex",
    label: "Tyrannosaurus",
    sublabel: "12 m long",
    kind: "theropod",
    lengthM: 12,
    heightM: 4.2,
    accent: ["#6b8f3a", "#2f4418"],
    emoji: "🦖",
  },
];

/** Turn a species into a chart figure. */
export function figureFromAnimal(animal: {
  id: string;
  name: string;
  silhouette: RigKind;
  length_m: number;
  height_m: number;
  scale_ratio: number;
  accent: [string, string];
  emoji: string;
}): FigureSpec {
  const lengthM = animal.length_m > 0 ? animal.length_m : animal.scale_ratio;
  const heightM = animal.height_m > 0 ? animal.height_m : animal.scale_ratio;

  return {
    id: animal.id,
    label: animal.name,
    sublabel: `${lengthM} m long · ${heightM} m tall`,
    kind: animal.silhouette,
    lengthM,
    heightM,
    accent: animal.accent,
    emoji: animal.emoji,
    locked: true,
  };
}
