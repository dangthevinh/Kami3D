/**
 * Continuous-curvature ("squircle") corners, the way iOS rounds things.
 *
 * A plain `rx` rounded rectangle joins a straight edge to a circular arc, which
 * makes the curvature jump from 0 to 1/r at the seam — the eye reads that as a
 * slightly "cog-like" corner. Apple's icon shape instead ramps the curvature in
 * smoothly, and the corner ends up fuller: for the same tangent length it cuts
 * less off the corner than a circular arc would.
 *
 * This module builds that corner as two mirrored cubic Béziers per vertex:
 *
 *   edge ──► P0 ══bezier══ apex ══bezier══ P3 ──► edge
 *
 * - the tangent at P0 is the incoming edge direction, so it joins G1-smooth;
 * - the tangent at P3 is the outgoing edge direction, likewise;
 * - by symmetry the apex tangent is parallel to the chord, so the two halves meet
 *   smoothly there too.
 *
 * Two knobs, both relative so they work at any corner angle:
 *   fullness  — how much shallower the cut is than a circular arc (1 = circular,
 *               above 1 keeps more of the corner, the way iOS does)
 *   control   — how hard the Bézier pulls toward the corner (bigger = fuller)
 *
 * Pure maths, no dependencies: it is unit-tested in Node (`npm run check:shapes`)
 * against the geometry it claims to produce.
 */

export type Point = readonly [number, number];

export interface CornerStyle {
  /** How far along each edge the straight section ends before the vertex. */
  tangent: number;
  /** 1 reproduces a circular arc; above 1 keeps more of the corner (iOS-like). */
  fullness?: number;
  /** Bézier control length as a fraction of the half-corner chord. */
  control?: number;
  /** Decimal places kept in the emitted path. */
  precision?: number;
}

const DEFAULT_FULLNESS = 1.35;
/**
 * Bézier pull toward the corner, as a fraction of the half-corner chord. The
 * value is a request, not a promise: `cornerGeometry` clamps it so the curve can
 * never leave the polygon.
 */
const DEFAULT_CONTROL = 0.52;

interface Vec {
  x: number;
  y: number;
}

/** Points arrive as tuples; everything internal works on Vec objects. */
const toVec = (point: Point): Vec => ({ x: point[0], y: point[1] });
const sub = (a: Vec, b: Vec): Vec => ({ x: a.x - b.x, y: a.y - b.y });
const norm = (v: Vec): Vec => {
  const length = Math.hypot(v.x, v.y) || 1;
  return { x: v.x / length, y: v.y / length };
};
const mul = (v: Vec, k: number): Vec => ({ x: v.x * k, y: v.y * k });
const add = (a: Vec, b: Vec): Vec => ({ x: a.x + b.x, y: a.y + b.y });

/**
 * Geometry of one rounded vertex, exposed so it can be asserted in tests rather
 * than only appearing inside a path string.
 */
export interface CornerGeometry {
  vertex: Point;
  /** Where the incoming straight edge ends. */
  entry: Vec;
  /** Where the outgoing straight edge resumes. */
  exit: Vec;
  apex: Vec;
  /** Control points of the entry half: [c1, c2]. */
  entryControls: [Vec, Vec];
  /** Control points of the exit half: [c3, c4]. */
  exitControls: [Vec, Vec];
  /** Unit direction of travel on the incoming edge, at the entry point. */
  incoming: Vec;
  /** Unit direction of travel on the outgoing edge, at the exit point. */
  outgoing: Vec;
}

export function cornerGeometry(
  vertex: Point,
  previous: Point,
  next: Point,
  style: CornerStyle,
): CornerGeometry {
  const { tangent } = style;
  const fullness = style.fullness ?? DEFAULT_FULLNESS;
  const control = style.control ?? DEFAULT_CONTROL;

  const origin = toVec(vertex);
  const toPrevious = norm(sub(toVec(previous), origin));
  const toNext = norm(sub(toVec(next), origin));
  const bisector = norm(add(toPrevious, toNext));

  const entry = add(origin, mul(toPrevious, tangent));
  const exit = add(origin, mul(toNext, tangent));

  // Interior half-angle: the angle between the two edges at the vertex.
  const dot = Math.min(1, Math.max(-1, toPrevious.x * toNext.x + toPrevious.y * toNext.y));
  const halfAngle = Math.acos(dot) / 2;

  // A circular corner's apex sits this far from the vertex. A continuous corner is
  // *fuller*: it keeps more of the original corner, so the apex moves closer to the
  // vertex — hence dividing. (Multiplying would round it off harder than a circle,
  // which is the opposite of what Apple's shape does.)
  const circularApex = (tangent * (1 - Math.sin(halfAngle))) / Math.cos(halfAngle);
  const apexDistance = circularApex / fullness;
  const apex = add(origin, mul(bisector, apexDistance));

  const chord = norm(sub(exit, entry));
  const incoming = { x: -toPrevious.x, y: -toPrevious.y };
  const outgoing = toNext;

  // Inward normals of the two edges: the directions the shape continues in.
  const inwardFrom = (along: Vec) => norm(sub(bisector, mul(along, bisector.x * along.x + bisector.y * along.y)));
  const normalIn = inwardFrom(incoming);
  const normalOut = inwardFrom(outgoing);

  const chordLength = Math.hypot(apex.x - entry.x, apex.y - entry.y);

  /**
   * Keep every control point inside the corner.
   *
   * A cubic Bézier never leaves the convex hull of its control points, so holding
   * the controls on the interior side of both edges guarantees the curve cannot
   * bulge back out past a straight edge — which is exactly what a naive "pull hard
   * toward the apex" control does (it lifts the curve above the flat side of a
   * rounded rectangle). Returns how far the controls may travel.
   */
  const limitFor = (from: Vec, normal: Vec, toward: Vec) => {
    const height = (apex.x - from.x) * normal.x + (apex.y - from.y) * normal.y;
    const slope = Math.abs(toward.x * normal.x + toward.y * normal.y);
    if (slope < 1e-9) return Number.POSITIVE_INFINITY;
    return height / slope;
  };

  const limits = [
    limitFor(entry, normalIn, chord),
    limitFor(exit, normalOut, chord),
  ];
  const maxControl = Math.min(...limits);
  // 0.98 keeps a hair of margin for floating-point error.
  const half = Math.max(0, Math.min(chordLength * control, maxControl * 0.98));

  return {
    vertex,
    entry,
    exit,
    apex,
    entryControls: [add(entry, mul(incoming, half)), sub(apex, mul(chord, half))],
    exitControls: [add(apex, mul(chord, half)), add(exit, mul(outgoing, -half))],
    incoming,
    outgoing,
  };
}

const round = (value: number, precision: number) => {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
};

const fmt = (point: Vec, precision: number) => `${round(point.x, precision)} ${round(point.y, precision)}`;

/**
 * A closed path through `points`, with every vertex rounded.
 *
 * Kept deliberately simple: straight line to each entry point, then the two
 * Béziers, then on to the next edge.
 */
export function roundedPolygonPath(points: readonly Point[], style: CornerStyle): string {
  if (points.length < 3) throw new Error("a polygon needs at least 3 points");

  const precision = style.precision ?? 3;
  const corners = points.map((vertex, index) =>
    cornerGeometry(
      vertex,
      points[(index - 1 + points.length) % points.length],
      points[(index + 1) % points.length],
      style,
    ),
  );

  const parts: string[] = [`M ${fmt(corners[0].entry, precision)}`];

  for (const corner of corners) {
    parts.push(
      `C ${fmt(corner.entryControls[0], precision)} ${fmt(corner.entryControls[1], precision)} ${fmt(corner.apex, precision)}`,
      `C ${fmt(corner.exitControls[0], precision)} ${fmt(corner.exitControls[1], precision)} ${fmt(corner.exit, precision)}`,
      `L ${fmt(corner.exit, precision)}`,
    );
  }

  parts.push("Z");
  return parts.join(" ");
}

/** Convenience: a squircle rounded rectangle, the iOS icon shape. */
export function squircleRectPath(x: number, y: number, width: number, height: number, style: CornerStyle): string {
  return roundedPolygonPath(
    [
      [x + width, y],
      [x + width, y + height],
      [x, y + height],
      [x, y],
    ],
    style,
  );
}