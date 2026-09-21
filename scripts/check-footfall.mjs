/**
 * Checks for the footfall model and the site-selection score.
 *
 * Half of this phase's data is simulated, which makes the tests more important rather than less:
 * the only thing standing between an invented number and a business decision is that the
 * arithmetic is pinned, and that the page is told which half it is looking at. So the suite checks
 * the shape of a day, the direction of every term in the score, the OpenStreetMap tags each
 * category is built from, and - the part that matters most - that a missing input is reported
 * rather than counted as zero.
 *
 * Run with: npm run check:footfall
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import {
  HOURLY_PROFILE,
  SITE_BANDS,
  SITE_WEIGHTS,
  TREND_CATEGORIES,
  TREND_CATEGORY_LABEL,
  assessSiteGap,
  competitorsWithin,
  dayCurve,
  densityScore,
  footfallScore,
  hourTicks,
  hourlyFactor,
  isTrendCategory,
  peakHour,
  siteBandFor,
  supplyScore,
  trendCategoryForPoi,
} from "../lib/data2map/footfall.ts";

test("every category has a full day, and the profile peaks somewhere sensible", () => {
  for (const category of TREND_CATEGORIES) {
    const profile = HOURLY_PROFILE[category];
    assert.equal(profile.length, 24, `${category} does not cover 24 hours`);
    assert.ok(profile.every((value) => value >= 0), `${category} has a negative weight`);
    assert.ok(Math.max(...profile) > 0, `${category} never has any footfall`);
    assert.ok(TREND_CATEGORY_LABEL[category].length > 2, `${category} has no label`);
  }

  assert.ok(peakHour("cafe") >= 6 && peakHour("cafe") <= 10, "a cafe peaks in the morning");
  assert.ok(peakHour("restaurant") >= 11 && peakHour("restaurant") <= 21, "a restaurant peaks around a meal");
  assert.ok(peakHour("bakery") <= 10, "a bakery is a morning business");
  assert.ok(peakHour("bubble_tea") >= 15, "bubble tea runs into the evening");

  // The early hours are quiet for everything, which is the sanity check a reader would make.
  for (const category of TREND_CATEGORIES) {
    assert.ok(hourlyFactor(category, 3) < 0.2, `${category} is busy at 3am`);
  }
});

test("a category is normalised against its own peak", () => {
  for (const category of TREND_CATEGORIES) {
    assert.equal(hourlyFactor(category, peakHour(category)), 1);
    assert.ok(hourlyFactor(category, 12) <= 1 && hourlyFactor(category, 12) >= 0);
  }

  assert.equal(hourlyFactor("cafe", -1), 0);
  assert.equal(hourlyFactor("cafe", 24), 0);
  assert.equal(hourlyFactor("cafe", 7.5), 0);
});

test("a day curve scales with the baseline and never goes negative", () => {
  const peak = peakHour("cafe");

  assert.equal(dayCurve("cafe", 0, peak), 0);
  assert.equal(dayCurve("cafe", -5, peak), 0);
  assert.equal(dayCurve("cafe", Number.NaN, peak), 0);
  assert.ok(dayCurve("cafe", 100, peak) > dayCurve("cafe", 50, peak));
  assert.ok(dayCurve("cafe", 100, 3) < dayCurve("cafe", 100, peak));
});

test("the clock has 24 steps, midnight to 11pm", () => {
  const ticks = hourTicks();
  assert.equal(ticks.length, 24);
  assert.equal(ticks[0], 0);
  assert.equal(ticks[23], 23);
  assert.deepEqual(ticks, [...ticks].sort((a, b) => a - b));
});

test("the bands are ordered, start at zero, and carry text colours", () => {
  const froms = SITE_BANDS.map((band) => band.from);
  assert.deepEqual([...froms].sort((a, b) => b - a), froms);
  assert.equal(Math.min(...froms), 0);

  assert.equal(siteBandFor(0).id, "crowded");
  assert.equal(siteBandFor(34.9).id, "crowded");
  assert.equal(siteBandFor(35).id, "thin");
  assert.equal(siteBandFor(55).id, "good");
  assert.equal(siteBandFor(70).id, "excellent");
  assert.equal(siteBandFor(90, 0.4).id, "unknown");

  for (const band of [...SITE_BANDS, siteBandFor(0, 0)]) {
    assert.ok(band.textClass.startsWith("text-"));
    assert.ok(band.color.startsWith("#"));
  }
});

test("the weights add up to 100", () => {
  assert.equal(Object.values(SITE_WEIGHTS).reduce((sum, value) => sum + value, 0), 100);
});

test("density rises with population, logarithmically, and refuses nonsense", () => {
  assert.equal(densityScore(0), 0);
  assert.equal(densityScore(30_000), 1);
  assert.equal(densityScore(60_000), 1, "clamped");
  assert.ok(densityScore(20_000) > densityScore(5_000), "denser is better");
  assert.ok(densityScore(5_000) > densityScore(1_000));

  // Logarithmic rather than linear: the step from 5k to 10k people per km2 is worth more than the
  // step from 45k to 50k, which is what stops the score being a population ranking.
  assert.ok(densityScore(10_000) - densityScore(5_000) > densityScore(50_000) - densityScore(45_000));

  assert.equal(densityScore(null), null);
  assert.equal(densityScore(-1), null);
  assert.equal(densityScore(Number.NaN), null);
  assert.equal(densityScore(1000, 0), null, "a saturation point has to be a real number");
});

test("the simulated footfall index scores 0 to 1 and refuses nonsense", () => {
  assert.equal(footfallScore(0), 0);
  assert.equal(footfallScore(50), 0.5);
  assert.equal(footfallScore(100), 1);
  assert.equal(footfallScore(250), 1, "clamped");
  assert.equal(footfallScore(null), null);
  assert.equal(footfallScore(Number.NaN), null);
});

test("demand prefers the real population, and says so when it fell back", () => {
  const withPopulation = assessSiteGap({ populationDensity: 24_000, footfallIndex: 40, competitors: 3 });
  assert.equal(withPopulation.demandSource, "population");
  assert.equal(withPopulation.parts.demand, densityScore(24_000));

  const withoutPopulation = assessSiteGap({ footfallIndex: 40, competitors: 3 });
  assert.equal(withoutPopulation.demandSource, "footfall", "the fallback is the simulated layer, and it must be named");
  assert.equal(withoutPopulation.parts.demand, 0.4);

  const neither = assessSiteGap({ competitors: 3 });
  assert.equal(neither.demandSource, null);
  assert.ok(neither.missing.includes("demand"));
});

test("supply rewards a gap, not a desert", () => {
  const empty = supplyScore(0);
  const few = supplyScore(3);
  const saturated = supplyScore(12);

  assert.ok(few > empty, "some competition is a sign the location works");
  assert.ok(empty < 1, "an empty block may be empty for a reason");
  assert.equal(saturated, 0, "at saturation there is no gap left");
  assert.equal(supplyScore(30), 0);
  assert.equal(supplyScore(4, 4), 0, "the saturation point is configurable");
  assert.ok(supplyScore(8, 20) > supplyScore(8, 12), "the same competition hurts less in a bigger market");

  assert.equal(supplyScore(null), null);
  assert.equal(supplyScore(-1), null);
  assert.equal(supplyScore(3, 0), null);
});

test("a full assessment scores in range with full coverage", () => {
  const breakdown = assessSiteGap({ populationDensity: 18_000, competitors: 3, walkableFraction: 0.8 });

  assert.deepEqual(breakdown.missing, []);
  assert.equal(breakdown.coverage, 1);
  assert.ok(breakdown.score !== null && breakdown.score > 0 && breakdown.score <= 100);
  assert.equal(breakdown.band.id, siteBandFor(breakdown.score).id);
});

test("every input moves the score the way the UI says", () => {
  const base = { populationDensity: 20_000, competitors: 4, walkableFraction: 0.7 };
  const scoreOf = (patch) => assessSiteGap({ ...base, ...patch }).score ?? 0;
  const baseline = scoreOf({});

  assert.ok(scoreOf({ populationDensity: 45_000 }) > baseline, "more people is better");
  assert.ok(scoreOf({ populationDensity: 2_000 }) < baseline, "fewer people is worse");
  assert.ok(scoreOf({ competitors: 0 }) < baseline, "an empty block is not automatically the best");
  assert.ok(scoreOf({ competitors: 20 }) < baseline, "a crowded block is worse");
  assert.ok(scoreOf({ walkableFraction: 1 }) > baseline, "better access is better");
});

test("the access term is reported as missing, not silently scored as zero", () => {
  // Nobody publishes a walkability polygon for Vietnamese cities, so the honest thing is to say the
  // term is absent rather than to let a site score look complete.
  const noAccess = assessSiteGap({ populationDensity: 22_000, competitors: 4 });

  assert.deepEqual(noAccess.missing, ["access"]);
  assert.equal(Math.round(noAccess.coverage * 100), 85, "45 + 40 of 100");

  const nothing = assessSiteGap({});
  assert.equal(nothing.score, null);
  assert.equal(nothing.coverage, 0);
  assert.equal(nothing.band.id, "unknown");
  assert.equal(nothing.missing.length, 3);
});

test("the score stays in range for absurd input", () => {
  for (const populationDensity of [-100, 0, 1e9, Number.POSITIVE_INFINITY, Number.NaN]) {
    for (const competitors of [-5, 0, 1e6, Number.NaN]) {
      for (const walkableFraction of [-2, 0, 5, Number.NaN]) {
        const breakdown = assessSiteGap({ populationDensity, competitors, walkableFraction });
        if (breakdown.score === null) continue;
        assert.ok(breakdown.score >= 0 && breakdown.score <= 100, `out of range: ${breakdown.score}`);
      }
    }
  }
});

test("competitors are counted inside a radius, and only inside", () => {
  const centre = [106.7, 10.78];
  const points = [
    [106.7, 10.78], // the centre itself
    [106.71, 10.78], // about 1 km
    [106.75, 10.78], // about 5 km
    [107.7, 10.78], // another city
  ];

  assert.equal(competitorsWithin(centre, points, 0.01), 1);
  assert.equal(competitorsWithin(centre, points, 1.2), 2);
  assert.equal(competitorsWithin(centre, points, 6), 3);
  assert.equal(competitorsWithin(centre, points, 200), 4);
  assert.equal(competitorsWithin(centre, []), 0);
});

test("OpenStreetMap tags map onto the four categories, and nothing else", () => {
  assert.equal(trendCategoryForPoi({ amenity: "cafe" }), "cafe");
  assert.equal(trendCategoryForPoi({ amenity: "cafe", cuisine: "coffee_shop" }), "cafe");
  assert.equal(trendCategoryForPoi({ amenity: "cafe", cuisine: "bubble_tea" }), "bubble_tea");
  assert.equal(trendCategoryForPoi({ amenity: "cafe", cuisine: "milk_tea" }), "bubble_tea");
  assert.equal(trendCategoryForPoi({ amenity: "cafe", cuisine: "Tea" }), "bubble_tea");
  assert.equal(trendCategoryForPoi({ shop: "coffee" }), "cafe");
  assert.equal(trendCategoryForPoi({ shop: "tea" }), "cafe");
  assert.equal(trendCategoryForPoi({ shop: "bakery" }), "bakery");
  assert.equal(trendCategoryForPoi({ amenity: "restaurant" }), "restaurant");
  assert.equal(trendCategoryForPoi({ amenity: "food_court" }), "restaurant");

  // Anything else is dropped rather than drawn as an unlabelled dot.
  assert.equal(trendCategoryForPoi({ amenity: "nightclub" }), null);
  assert.equal(trendCategoryForPoi({ shop: "butcher" }), null);
  assert.equal(trendCategoryForPoi({}), null);
  assert.equal(trendCategoryForPoi(null), null);
  assert.equal(trendCategoryForPoi(undefined), null);
});

test("only the four categories the Overpass query can supply are accepted", () => {
  assert.deepEqual([...TREND_CATEGORIES], ["cafe", "bubble_tea", "restaurant", "bakery"]);
  for (const category of TREND_CATEGORIES) assert.ok(isTrendCategory(category));
  assert.equal(isTrendCategory("nightclub"), false);
  assert.equal(isTrendCategory("fast_food"), false, "fast food was dropped for bubble tea, which the brief asks for");
  assert.equal(isTrendCategory(""), false);
});
