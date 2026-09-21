/**
 * Checks for the potential score.
 *
 * A number that helps someone decide whether to buy land has to be pinned, and this suite pins
 * the two things that make it usable: that every input moves the score in the direction the UI
 * claims, and that a missing input is reported rather than counted as zero.
 *
 * Run with: npm run check:score
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import {
  POTENTIAL_BANDS,
  POTENTIAL_WEIGHTS,
  amenityScore,
  assessPotential,
  bandForPotential,
  floodScore,
  medianPrice,
  priceScore,
  zoningScore,
} from "../lib/data2map/score.ts";

test("the weights add up to the 0-100 scale", () => {
  assert.equal(Object.values(POTENTIAL_WEIGHTS).reduce((sum, value) => sum + value, 0), 100);
});

test("the bands are ordered, start at zero, and carry a text colour for both themes", () => {
  const froms = POTENTIAL_BANDS.map((band) => band.from);
  assert.deepEqual([...froms].sort((a, b) => b - a), froms);
  assert.equal(Math.min(...froms), 0);

  assert.equal(bandForPotential(0).id, "weak");
  assert.equal(bandForPotential(39.9).id, "weak");
  assert.equal(bandForPotential(40).id, "fair");
  assert.equal(bandForPotential(55).id, "good");
  assert.equal(bandForPotential(70).id, "strong");
  assert.equal(bandForPotential(100).id, "strong");

  // Below half the weight available the honest answer is "too little data", not "weak".
  assert.equal(bandForPotential(90, 0.4).id, "unknown");
  assert.equal(bandForPotential(90, 0.5).id, "strong");

  for (const band of [...POTENTIAL_BANDS, bandForPotential(0, 0)]) {
    assert.ok(band.textClass.startsWith("text-"), `${band.id} has no text utility`);
    assert.ok(band.color.startsWith("#"));
  }
});

test("cheaper than the median scores higher, and the scale is a ratio", () => {
  const median = 100_000_000;

  assert.equal(priceScore(50_000_000, median), 1);
  assert.equal(priceScore(100_000_000, median), 0.5);
  assert.equal(priceScore(200_000_000, median), 0);

  // Clamped, not inverted, outside that range.
  assert.equal(priceScore(10_000_000, median), 1);
  assert.equal(priceScore(900_000_000, median), 0);

  assert.equal(priceScore(null, median), null);
  assert.equal(priceScore(100_000_000, null), null);
  assert.equal(priceScore(0, median), null);
  assert.equal(priceScore(Number.NaN, median), null);
});

test("amenities count, with a cap so four schools are not four times one", () => {
  assert.equal(amenityScore(null), null);
  assert.equal(amenityScore({}), null);

  // Zero is a real answer: the layer says there is nothing there, and that scores 0.
  assert.equal(amenityScore({ school: 0, hospital: 0, market: 0, park: 0 }), 0);

  const one = amenityScore({ school: 1, hospital: 1, market: 1, park: 1 });
  const two = amenityScore({ school: 2, hospital: 2, market: 2, park: 2 });
  const many = amenityScore({ school: 40, hospital: 40, market: 40, park: 40 });

  assert.equal(one, 0.5);
  assert.equal(two, 1);
  assert.equal(many, 1, "capped at two per kind");
  assert.ok(one < two);

  // Only the kinds present are counted, so a partial answer is still an answer.
  assert.equal(amenityScore({ school: 2 }), 1);
  assert.ok(amenityScore({ school: 1 }) > 0);
});

test("flood risk is inverted: lower hazard scores higher", () => {
  assert.ok(floodScore("low") > floodScore("medium"));
  assert.ok(floodScore("medium") > floodScore("high"));
  assert.equal(floodScore("none"), 1);
  assert.equal(floodScore("HIGH"), 0.1, "case does not matter");
  assert.equal(floodScore(null), null);
  assert.equal(floodScore("catastrophic"), null, "an unknown band is missing, not zero");
});

test("the designation matters, and the floor-area ratio adjusts it", () => {
  assert.ok(zoningScore("commercial") > zoningScore("residential"));
  assert.ok(zoningScore("residential") > zoningScore("industrial"));
  assert.equal(zoningScore("nonsense"), null);
  assert.equal(zoningScore(null), null);

  assert.ok(zoningScore("residential", 5) > zoningScore("residential", 1));
  assert.ok(zoningScore("industrial", 5) < zoningScore("commercial", 1), "the ratio adjusts, it does not replace");
  assert.equal(zoningScore(null, 3), 0.6, "a floor-area ratio alone is still something");
});

test("a full set of inputs scores in range, with full coverage", () => {
  const breakdown = assessPotential({
    priceVndM2: 80_000_000,
    medianVndM2: 120_000_000,
    amenities: { school: 2, hospital: 1, market: 2, park: 1 },
    floodLevel: "low",
    zone: "mixed",
    far: 3.5,
  });

  assert.deepEqual(breakdown.missing, []);
  assert.equal(breakdown.coverage, 1);
  assert.ok(breakdown.score !== null && breakdown.score > 0 && breakdown.score <= 100);
  assert.equal(breakdown.band.id, bandForPotential(breakdown.score).id);
});

test("every input moves the score the way the UI says it does", () => {
  const base = {
    priceVndM2: 100_000_000,
    medianVndM2: 100_000_000,
    amenities: { school: 1, hospital: 1, market: 1, park: 1 },
    floodLevel: "medium",
    zone: "residential",
    far: 2,
  };

  const scoreOf = (patch) => assessPotential({ ...base, ...patch }).score ?? 0;
  const baseline = scoreOf({});

  assert.ok(scoreOf({ priceVndM2: 40_000_000 }) > baseline, "cheaper is better");
  assert.ok(scoreOf({ priceVndM2: 250_000_000 }) < baseline, "dearer is worse");
  assert.ok(scoreOf({ amenities: { school: 2, hospital: 2, market: 2, park: 2 } }) > baseline, "more amenities");
  assert.ok(scoreOf({ amenities: { school: 0, hospital: 0, market: 0, park: 0 } }) < baseline, "fewer amenities");
  assert.ok(scoreOf({ floodLevel: "low" }) > baseline, "less flood risk");
  assert.ok(scoreOf({ floodLevel: "high" }) < baseline, "more flood risk");
  assert.ok(scoreOf({ zone: "commercial" }) > baseline, "commercial beats residential");
  assert.ok(scoreOf({ zone: "industrial" }) < baseline, "industrial loses to residential");
});

test("missing inputs are dropped and reported, never counted as zero", () => {
  const partial = assessPotential({ priceVndM2: 60_000_000, medianVndM2: 100_000_000, floodLevel: "low" });

  assert.deepEqual(partial.missing.sort(), ["amenity", "zoning"]);
  assert.equal(Math.round(partial.coverage * 100), 55, "30 + 25 of 100");
  assert.ok(partial.score !== null);

  // Scoring a missing amenity layer as "no amenities" would be a different, wrong answer.
  const withNone = assessPotential({
    priceVndM2: 60_000_000,
    medianVndM2: 100_000_000,
    floodLevel: "low",
    amenities: { school: 0, hospital: 0, market: 0, park: 0 },
  });
  assert.notEqual(partial.score, withNone.score);
  assert.ok(withNone.score < partial.score);
});

test("nothing at all is null, not a confident zero", () => {
  const nothing = assessPotential({});
  assert.equal(nothing.score, null);
  assert.equal(nothing.coverage, 0);
  assert.equal(nothing.band.id, "unknown");
  assert.equal(nothing.missing.length, 4);
});

test("the score stays in range for absurd input", () => {
  for (const price of [-1, 0, 1, 1e12, Number.POSITIVE_INFINITY]) {
    for (const far of [-5, 0, 100, Number.NaN]) {
      const breakdown = assessPotential({
        priceVndM2: price,
        medianVndM2: 100_000_000,
        amenities: { school: -3, hospital: 1e9 },
        floodLevel: "medium",
        zone: "mixed",
        far,
      });

      if (breakdown.score === null) continue;
      assert.ok(breakdown.score >= 0 && breakdown.score <= 100, `out of range: ${breakdown.score}`);
    }
  }
});

test("the median is the middle value, and nothing else", () => {
  assert.equal(medianPrice([]), null);
  assert.equal(medianPrice([0, -4, Number.NaN]), null);
  assert.equal(medianPrice([10]), 10);
  assert.equal(medianPrice([10, 20, 30]), 20);
  assert.equal(medianPrice([10, 20, 30, 40]), 25);
  assert.equal(medianPrice([40, 10, 30, 20]), 25, "order does not matter");
});
