/**
 * Checks for the NDVI palette and the yield model.
 *
 * The two things that go wrong in an agricultural dashboard are painted here as assertions: a
 * missing reading drawn as healthy vegetation, and a yield number presented as if it were official.
 * The palette pins the first, the model pins the second - including that the model saturates rather
 * than extrapolating, and that it says where its coefficients came from.
 *
 * Run with: npm run check:ndvi
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import {
  CROP_MODELS,
  NDVI_CLASSES,
  NDVI_NODATA_COLOR,
  NDVI_RANGE,
  YIELD_COEFFICIENT_SOURCE,
  adviceFor,
  classifyNdvi,
  cropModel,
  estimateYield,
  meanNdvi,
  ndviColor,
  ndviPosition,
} from "../lib/data2map/ndvi.ts";

test("the classes tile the range, low to high, from v1.3 of NASA's palette", () => {
  assert.ok(NDVI_CLASSES.length >= 6 && NDVI_CLASSES.length <= 12, "a legend nobody can hold in their head is not a legend");
  assert.equal(NDVI_CLASSES[0].from, NDVI_RANGE.min);
  assert.equal(NDVI_CLASSES[NDVI_CLASSES.length - 1].to, NDVI_RANGE.max);

  for (const [index, entry] of NDVI_CLASSES.entries()) {
    assert.ok(entry.to > entry.from, entry.id + " has an empty range");
    assert.match(entry.color, /^#[0-9a-f]{6}$/i);
    assert.ok(entry.hint.length > 20, entry.id + " needs a hint, not just a colour");
    if (index > 0) assert.equal(entry.from, NDVI_CLASSES[index - 1].to, "the classes must not leave a gap");
  }

  // NASA's palette breaks from brown to green at 0.3; that break is the agronomic one too.
  const belowThree = classifyNdvi(0.29);
  const aboveThree = classifyNdvi(0.31);
  assert.ok(belowThree && aboveThree && belowThree.id !== aboveThree.id);
});

test("a value outside the index, or no value at all, is null - never a colour", () => {
  assert.equal(classifyNdvi(null), null);
  assert.equal(classifyNdvi(undefined), null);
  assert.equal(classifyNdvi(Number.NaN), null);
  assert.equal(classifyNdvi(Number.POSITIVE_INFINITY), null);
  assert.equal(classifyNdvi(1.4), null, "NDVI stops at 1");
  assert.equal(classifyNdvi(-1.4), null);
  assert.equal(ndviColor(null), NDVI_NODATA_COLOR);
  assert.equal(ndviColor(Number.NaN), NDVI_NODATA_COLOR);
  assert.equal(ndviPosition(null), null);
});

test("water is water, and the highest class is bounded", () => {
  assert.equal(classifyNdvi(-0.4)?.id, "water");
  assert.equal(classifyNdvi(0)?.id, "bare", "zero is the first non-water class");
  assert.equal(classifyNdvi(0.72)?.id, "crop_good");
  assert.equal(classifyNdvi(0.95)?.id, "crop_max");
  assert.equal(classifyNdvi(1)?.id, "crop_max", "the range is inclusive at the top");

  const positions = [-0.5, 0.05, 0.15, 0.25, 0.4, 0.5, 0.7, 0.85, 0.95].map((value) => ndviPosition(value));
  assert.deepEqual(positions, [...positions].sort((a, b) => a - b), "a greener value never paints lower");
  assert.equal(positions[0], 0);
  assert.equal(positions[positions.length - 1], 1);
});

test("each crop model sits inside the range it claims", () => {
  assert.deepEqual(CROP_MODELS.map((model) => model.id), ["rice", "vegetables", "fruit"]);

  const ranges = { rice: [5, 6], vegetables: [12, 20], fruit: [8, 15] };
  for (const model of CROP_MODELS) {
    const [low, high] = ranges[model.id];
    assert.ok(model.baseYieldTPerHa >= low && model.baseYieldTPerHa <= high, model.id + " is outside its published range");
    assert.ok(model.ndviFloor < model.ndviAtBase, model.id + " has a floor above its reference");
    assert.ok(model.ndviAtBase <= 1 && model.ndviFloor > 0);
    assert.ok(model.harvestMonths.length >= 2 && model.harvestMonths.every((month) => month >= 1 && month <= 12));
  }

  assert.equal(cropModel("rice").label, "Rice");
  assert.equal(cropModel("nonsense").id, "rice", "an unknown crop falls back rather than crashing a page");
});

test("the estimate scales with vigour, and refuses input it cannot use", () => {
  assert.equal(estimateYield({ crop: "rice", meanNdvi: null, areaHa: 2 }), null);
  assert.equal(estimateYield({ crop: "rice", meanNdvi: Number.NaN, areaHa: 2 }), null);
  assert.equal(estimateYield({ crop: "rice", meanNdvi: 5, areaHa: 2 }), null);
  assert.equal(estimateYield({ crop: "rice", meanNdvi: 0.6, areaHa: 0 }), null);
  assert.equal(estimateYield({ crop: "rice", meanNdvi: 0.6, areaHa: -3 }), null);

  const floor = estimateYield({ crop: "rice", meanNdvi: 0.3, areaHa: 1 });
  const middle = estimateYield({ crop: "rice", meanNdvi: 0.5, areaHa: 1 });
  const reference = estimateYield({ crop: "rice", meanNdvi: 0.72, areaHa: 1 });
  const saturated = estimateYield({ crop: "rice", meanNdvi: 0.95, areaHa: 1 });

  assert.equal(floor?.tonnesPerHa, 0, "at the floor the model expects nothing");
  assert.ok(middle && reference && middle.tonnesPerHa > 0 && middle.tonnesPerHa < reference.tonnesPerHa);
  assert.equal(reference?.tonnesPerHa, CROP_MODELS[0].baseYieldTPerHa, "the reference NDVI reaches the base yield");
  assert.equal(saturated?.tonnesPerHa, reference?.tonnesPerHa, "above the reference it saturates instead of extrapolating");

  // Area scales it linearly, and the estimate carries the source of its own coefficients.
  const twoHa = estimateYield({ crop: "rice", meanNdvi: 0.72, areaHa: 2 });
  assert.equal(twoHa?.tonnes, (reference?.tonnes ?? 0) * 2);
  assert.equal(reference?.source, YIELD_COEFFICIENT_SOURCE);
  assert.match(YIELD_COEFFICIENT_SOURCE, /Not from a specific study/);
});

test("a mean ignores the gaps rather than counting them as bare soil", () => {
  assert.equal(meanNdvi([0.5, null, 0.7]), 0.6);
  assert.equal(meanNdvi([null, Number.NaN, 4]), null, "nothing usable is not a mean of zero");
  assert.equal(meanNdvi([]), null);
  assert.equal(meanNdvi([0.8]), 0.8);
});

test("advice is about looking, not about acting", () => {
  assert.match(adviceFor("rice", null), /No usable reading/);
  assert.match(adviceFor("rice", 0.2), /Below the floor/);
  assert.match(adviceFor("rice", 0.45), /field check/);
  assert.match(adviceFor("rice", 0.95), /Saturated/);
  assert.match(adviceFor("rice", 0.7), /Nothing here says a decision is needed/);

  // The one thing it must never do: appear to prescribe a chemical.
  for (const value of [null, 0.1, 0.3, 0.5, 0.7, 0.95]) {
    for (const crop of ["rice", "vegetables", "fruit"]) {
      assert.ok(!/spray|pesticide|herbicide|fertilis|fertiliz|dose|apply/i.test(adviceFor(crop, value)), "advice crossed into prescription");
    }
  }
});
