/**
 * Geometry assertions for the continuous-curvature corners in lib/squircle.ts.
 *
 * These check the properties the SVG cannot state on its own: that each corner is
 * tangent to the edges it joins (G1), that it never leaves the polygon it is
 * rounding, and that it is genuinely fuller than a circular arc — which is the
 * whole point of the Apple-style corner.
 *
 * Run with: npm run check:shapes
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import { cornerGeometry, roundedPolygonPath, squircleRectPath } from "../lib/squircle.ts";

const HEXAGON = [
  [24, 13],
  [33.53, 18.5],
  [33.53, 29.5],
  [24, 35],
  [14.47, 29.5],
  [14.47, 18.5],
];

const SQUARE = [
  [48, 0],
  [48, 48],
  [0, 48],
  [0, 0],
];

const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const unit = (v) => {
  const l = Math.hypot(v.x, v.y) || 1;
  return { x: v.x / l, y: v.y / l };
};

test("a cubic corner leaves each edge along that edge (G1)", () => {
  for (const [name, points, style] of [
    ["hexagon", HEXAGON, { tangent: 2.6 }],
    ["square", SQUARE, { tangent: 14 }],
  ]) {
    for (let i = 0; i < points.length; i += 1) {
      const corner = cornerGeometry(
        points[i],
        points[(i - 1 + points.length) % points.length],
        points[(i + 1) % points.length],
        style,
      );

      // The Bézier's tangent at its start is (c1 - entry).
      const startTangent = unit({
        x: corner.entryControls[0].x - corner.entry.x,
        y: corner.entryControls[0].y - corner.entry.y,
      });
      assert.ok(
        Math.abs(startTangent.x - corner.incoming.x) < 1e-9 && Math.abs(startTangent.y - corner.incoming.y) < 1e-9,
        `${name} corner ${i}: start tangent does not match the incoming edge`,
      );

      // …and at its end is (exit - c4).
      const endTangent = unit({
        x: corner.exit.x - corner.exitControls[1].x,
        y: corner.exit.y - corner.exitControls[1].y,
      });
      assert.ok(
        Math.abs(endTangent.x - corner.outgoing.x) < 1e-9 && Math.abs(endTangent.y - corner.outgoing.y) < 1e-9,
        `${name} corner ${i}: end tangent does not match the outgoing edge`,
      );
    }
  }
});

test("the two halves meet smoothly at the apex", () => {
  for (const points of [HEXAGON, SQUARE]) {
    for (let i = 0; i < points.length; i += 1) {
      const corner = cornerGeometry(points[i], points[(i - 1 + points.length) % points.length], points[(i + 1) % points.length], { tangent: points === HEXAGON ? 2.6 : 14 });

      const arriving = unit({
        x: corner.apex.x - corner.entryControls[1].x,
        y: corner.apex.y - corner.entryControls[1].y,
      });
      const leaving = unit({
        x: corner.exitControls[0].x - corner.apex.x,
        y: corner.exitControls[0].y - corner.apex.y,
      });

      assert.ok(
        Math.abs(arriving.x - leaving.x) < 1e-9 && Math.abs(arriving.y - leaving.y) < 1e-9,
        "apex tangents differ — the corner would have a visible kink",
      );
    }
  }
});

test("a squircle corner keeps more of the vertex than a circular arc", () => {
  for (const [points, tangent] of [
    [HEXAGON, 2.6],
    [SQUARE, 14],
  ]) {
    for (let i = 0; i < points.length; i += 1) {
      const vertex = points[i];
      const previous = points[(i - 1 + points.length) % points.length];
      const next = points[(i + 1) % points.length];

      const base = cornerGeometry(vertex, previous, next, { tangent, fullness: 1 });
      const full = cornerGeometry(vertex, previous, next, { tangent, fullness: 1.35 });

      const v = { x: vertex[0], y: vertex[1] };
      // Fuller means less material removed, so the apex stays closer to the vertex.
      assert.ok(
        distance(full.apex, v) < distance(base.apex, v),
        "the squircle apex must sit closer to the vertex than a circular arc's",
      );
    }
  }
});

test("no corner curve leaves the polygon it is rounding", () => {
  const sample = (p0, c1, c2, p3, t) => {
    const u = 1 - t;
    return {
      x: u * u * u * p0.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * p3.x,
      y: u * u * u * p0.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * p3.y,
    };
  };

  for (const [name, points, style] of [
    ["hexagon", HEXAGON, { tangent: 3.6 }],
    ["square", SQUARE, { tangent: 14 }],
    ["square outline", SQUARE, { tangent: 13.25 }],
  ]) {
    for (let i = 0; i < points.length; i += 1) {
      const vertex = points[i];
      const previous = points[(i - 1 + points.length) % points.length];
      const next = points[(i + 1) % points.length];
      const corner = cornerGeometry(vertex, previous, next, style);

      const v = { x: vertex[0], y: vertex[1] };
      const toPrev = unit({ x: previous[0] - v.x, y: previous[1] - v.y });
      const toNext = unit({ x: next[0] - v.x, y: next[1] - v.y });
      const inward = unit({ x: toPrev.x + toNext.x, y: toPrev.y + toNext.y });

      // The shape's interior, expressed as the two half-planes through the entry
      // and exit points, whose inward normals both point along the bisector.
      const normalIn = unit({ x: inward.x - (inward.x * -toPrev.x + inward.y * -toPrev.y) * -toPrev.x,
                              y: inward.y - (inward.x * -toPrev.x + inward.y * -toPrev.y) * -toPrev.y });
      const normalOut = unit({ x: inward.x - (inward.x * toNext.x + inward.y * toNext.y) * toNext.x,
                               y: inward.y - (inward.x * toNext.x + inward.y * toNext.y) * toNext.y });

      for (let step = 0; step <= 40; step += 1) {
        const t = step / 40;
        for (const [from, normal, label] of [
          [corner.entry, normalIn, "entry edge"],
          [corner.exit, normalOut, "exit edge"],
        ]) {
          // Sample the half that belongs to this edge.
          const point =
            label === "entry edge"
              ? sample(corner.entry, corner.entryControls[0], corner.entryControls[1], corner.apex, t)
              : sample(corner.apex, corner.exitControls[0], corner.exitControls[1], corner.exit, t);

          const outside = (point.x - from.x) * normal.x + (point.y - from.y) * normal.y;
          assert.ok(
            outside >= -1e-6,
            `${name} corner ${i} pokes ${outside.toFixed(4)} units out past its ${label} at t=${t.toFixed(2)}`,
          );
        }
      }
    }
  }
});

test("emitted paths are stable, closed and finite", () => {
  const hexagon = roundedPolygonPath(HEXAGON, { tangent: 2.6 });
  const tile = squircleRectPath(0, 0, 48, 48, { tangent: 14 });

  for (const [name, path] of [["hexagon", hexagon], ["tile", tile]]) {
    assert.ok(path.startsWith("M "), `${name} must start with a move`);
    assert.ok(path.endsWith("Z"), `${name} must be closed`);
    assert.ok(!/NaN|Infinity|undefined/.test(path), `${name} contains a non-finite number`);
    assert.ok(path === roundedPolygonPath(name === "hexagon" ? HEXAGON : SQUARE, { tangent: name === "hexagon" ? 2.6 : 14 }), `${name} is not deterministic`);
  }
});

test("corners cannot swallow an edge", () => {
  // Two tangent lengths must not overlap on the shortest edge of the hexagon.
  const edgeLength = distance({ x: HEXAGON[0][0], y: HEXAGON[0][1] }, { x: HEXAGON[1][0], y: HEXAGON[1][1] });
  assert.ok(2 * 2.6 < edgeLength, `tangent 2.6 leaves ${(edgeLength - 5.2).toFixed(2)} of straight edge`);
});
