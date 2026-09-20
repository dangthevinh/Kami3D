/**
 * Verifies the size-comparison chart for every species in the bundled dataset.
 *
 * Run with: npm run check:size
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import { ANIMALS } from "../data/animals.ts";
import {
  REFERENCE_FIGURES,
  VIEWER_HEIGHT_CM,
  compareToViewer,
  describeComparison,
  figureFromAnimal,
  layoutFigures,
  viewerFigure,
} from "../lib/size-comparison.ts";

const REFERENCE_WITHOUT_HUMAN = REFERENCE_FIGURES.filter((figure) => figure.id !== "human");

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

/* -------------------------------------------------------------------------- */
/* The visitor's own size                                                     */
/* -------------------------------------------------------------------------- */

test("the visitor's figure is them, not a default adult", () => {
  const child = viewerFigure(1.2);
  assert.ok(Math.abs(child.heightM - 1.2) < 1e-9);
  assert.equal(child.label, "You");
  assert.equal(child.kind, "human");
  // Depth follows height, so a shorter human is not a stretched cardboard cut-out.
  assert.ok(Math.abs(child.lengthM - 1.2 * (0.6 / 1.75)) < 1e-9);

  const { figures } = layoutFigures([viewerFigure(1.2), ...REFERENCE_WITHOUT_HUMAN]);
  assert.ok(Math.abs(figures[0].renderedHeight - 1.2) < EPSILON, "the human renders at the height given");
});

test("a viewer height outside the slider's range is clamped, not obeyed", () => {
  assert.equal(viewerFigure(4).heightM, VIEWER_HEIGHT_CM.max / 100);
  assert.equal(viewerFigure(0.2).heightM, VIEWER_HEIGHT_CM.min / 100);
});

test("the comparison uses the dimension the chart renders exactly", () => {
  // A whale is compared on its length, a giraffe on its height: the same choice
  // `computeFigureScale` makes, so the sentence and the picture cannot disagree.
  const whale = compareToViewer({ lengthM: 27, heightM: 4.5 }, 1.75);
  assert.equal(whale.dimension, "length");
  assert.equal(whale.animalM, 27);
  assert.ok(Math.abs(whale.ratio - 27 / 1.75) < 1e-9);

  const giraffe = compareToViewer({ lengthM: 2.4, heightM: 5.5 }, 1.75);
  assert.equal(giraffe.dimension, "height");
  assert.equal(giraffe.animalM, 5.5);
});

test("taller, shorter and 'about the same' are bands, not equalities", () => {
  assert.equal(compareToViewer({ lengthM: 2.5, heightM: 1.2 }, 1.75).direction, "taller");
  assert.equal(compareToViewer({ lengthM: 0.75, heightM: 0.25 }, 1.75).direction, "shorter");
  // 1.76 m against 1.75 m is the same size to anyone reading it.
  assert.equal(compareToViewer({ lengthM: 1.76, heightM: 1.76 }, 1.75).direction, "same");
  assert.equal(compareToViewer({ lengthM: 1.66, heightM: 1.66 }, 1.75).direction, "shorter");
});

test("the sentence says what a reader needs, in both directions", () => {
  const metric = (metres) => `${metres} m`;

  assert.equal(
    describeComparison(compareToViewer({ lengthM: 2.5, heightM: 1.2 }, 1.75), metric),
    "2.5 m long — 1.4x your height",
  );
  assert.equal(
    describeComparison(compareToViewer({ lengthM: 1.75, heightM: 1.75 }, 1.75), metric),
    "1.75 m long — about your height",
  );
  // Smaller reads forwards: "7.1x smaller", never "0.14x your height".
  assert.equal(
    describeComparison(compareToViewer({ lengthM: 0.75, heightM: 0.25 }, 1.7), (metres) => `${metres} m`),
    "0.75 m long — 2.3x smaller than you",
  );
  // A whale against a child needs no decimal point.
  assert.match(describeComparison(compareToViewer({ lengthM: 27, heightM: 4.5 }, 1.75), metric), /^27 m long — 15x your height$/);
});

test("every yardstick offered in the UI lays out cleanly", () => {
  const ids = REFERENCE_FIGURES.map((figure) => figure.id);
  assert.deepEqual([...ids].sort(), ["cat", "elephant", "giraffe", "human", "trex", "whale"]);

  for (const animal of ANIMALS) {
    const { figures } = layoutFigures([figureFromAnimal(animal), viewerFigure(1.75), ...REFERENCE_FIGURES]);
    for (let index = 1; index < figures.length; index += 1) {
      assert.ok(
        figures[index].leftEdge >= figures[index - 1].rightEdge - EPSILON,
        `${animal.slug}: ${figures[index - 1].label} overlaps ${figures[index].label}`,
      );
    }
  }
});

test("no figure has a degenerate scale", () => {
  for (const animal of ANIMALS) {
    const { figures } = layoutFigures([figureFromAnimal(animal)]);
    for (const axis of figures[0].scale) {
      assert.ok(Number.isFinite(axis) && axis > 0, `${animal.slug} has scale ${axis}`);
    }
  }
});
