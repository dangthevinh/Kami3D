/**
 * Verifies the size-comparison chart for every species in the bundled dataset.
 *
 * Run with: npm run check:size
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import { ANIMALS } from "../data/animals.ts";
import { REFERENCE_FIGURES, figureFromAnimal, layoutFigures } from "../lib/size-comparison.ts";

const EPSILON = 0.02;

test("every species renders at its real dominant dimension", () => {
  const failures = [];

  for (const animal of ANIMALS) {
    const figure = figureFromAnimal(animal);
    const { figures } = layoutFigures([figure, ...REFERENCE_FIGURES]);
    const placed = figures[0];

    const dominantIsLength = figure.lengthM >= figure.heightM;
    const want = dominantIsLength ? figure.lengthM : figure.heightM;
    const got = dominantIsLength ? placed.renderedLength : placed.renderedHeight;

    if (Math.abs(got - want) > EPSILON) {
      failures.push(`${animal.slug}: want ${want} m, got ${got.toFixed(3)} m`);
    }
  }

  assert.deepEqual(failures, [], `${failures.length} species rendered off-scale: ${failures.slice(0, 5).join(" | ")}`);
});

test("reference figures render at their advertised measurements", () => {
  const { figures } = layoutFigures(REFERENCE_FIGURES);
  const byId = Object.fromEntries(figures.map((figure) => [figure.id, figure]));

  assert.ok(Math.abs(byId.human.renderedHeight - 1.75) < EPSILON, "human height");
  assert.ok(Math.abs(byId.whale.renderedLength - 27) < EPSILON, "whale length");
  assert.ok(Math.abs(byId.whale.renderedHeight - 4.5) < EPSILON, "whale height");
  assert.ok(Math.abs(byId.trex.renderedLength - 12) < EPSILON, "t-rex length");
  assert.ok(Math.abs(byId.trex.renderedHeight - 4.2) < EPSILON, "t-rex height");
});

test("figures never overlap along the chart axis", () => {
  const failures = [];

  for (const animal of ANIMALS) {
    const { figures } = layoutFigures([figureFromAnimal(animal), ...REFERENCE_FIGURES]);

    for (let i = 1; i < figures.length; i += 1) {
      const previous = figures[i - 1];
      const current = figures[i];
      const previousRight = previous.rightEdge;
      const currentLeft = current.leftEdge;

      if (currentLeft < previousRight - EPSILON) {
        failures.push(
          `${animal.slug}: ${previous.label} overlaps ${current.label} by ${(previousRight - currentLeft).toFixed(2)} m`,
        );
      }
    }
  }

  assert.deepEqual(failures, [], failures.slice(0, 5).join(" | "));
});

test("the row is centred on the origin", () => {
  const { figures, totalWidth } = layoutFigures([figureFromAnimal(ANIMALS[0]), ...REFERENCE_FIGURES]);
  const left = figures[0].leftEdge;
  const right = figures[figures.length - 1].rightEdge;

  assert.ok(Math.abs(left + right) < EPSILON, `row not centred: left=${left}, right=${right}`);
  assert.ok(Math.abs(right - left - totalWidth) < EPSILON, "totalWidth must span the row");
});

test("no figure has a degenerate scale", () => {
  for (const animal of ANIMALS) {
    const { figures } = layoutFigures([figureFromAnimal(animal)]);
    for (const axis of figures[0].scale) {
      assert.ok(Number.isFinite(axis) && axis > 0, `${animal.slug} has scale ${axis}`);
    }
  }
});
