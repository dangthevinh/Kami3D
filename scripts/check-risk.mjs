/**
 * Checks for the risk index.
 *
 * Two things are being protected here: that the number behaves the way the UI implies
 * (worse status, smaller range, more overlap, thinning records all raise it, and nothing
 * else does), and that a missing input is never quietly counted as zero - a score built from
 * one of four signals has to say so.
 *
 * Run with: npm run check:risk
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import {
  RISK_BANDS,
  RISK_WEIGHTS,
  assessRisk,
  bandFor,
  rangeWeight,
  severityForUrbanArea,
  statusWeight,
  threatWeight,
  trendWeight,
} from "../lib/risk.ts";
import { CONSERVATION_STATUSES } from "../types/animal.ts";

test("the weights add up to the 0-100 scale", () => {
  assert.equal(Object.values(RISK_WEIGHTS).reduce((sum, value) => sum + value, 0), 100);
});

test("the bands are ordered, start at zero and cover the whole scale", () => {
  const froms = RISK_BANDS.map((band) => band.from);
  assert.deepEqual([...froms].sort((a, b) => b - a), froms, "bands must be highest first");
  assert.equal(Math.min(...froms), 0, "the lowest band has to start at zero");
  assert.equal(bandFor(0).id, "low");
  assert.equal(bandFor(29.9).id, "low");
  assert.equal(bandFor(30).id, "moderate");
  assert.equal(bandFor(50).id, "high");
  assert.equal(bandFor(70).id, "critical");
  assert.equal(bandFor(100).id, "critical");
});

test("too little data is its own answer, not a low score", () => {
  // Coverage below half means the number would be describing the inputs we happen to have.
  assert.equal(bandFor(90, 0.4).id, "unknown");
  assert.equal(bandFor(90, 0.5).id, "critical");
  assert.equal(assessRisk({ conservationStatus: null }).band.id, "unknown");
  assert.equal(assessRisk({ conservationStatus: "Endangered" }).band.id, "unknown");
});

test("every IUCN status in the catalogue has a weight, ordered the way the Red List is", () => {
  for (const status of CONSERVATION_STATUSES) {
    const weight = statusWeight(status);
    assert.equal(typeof weight, "number", `${status} has no weight`);
    assert.ok(weight >= 0 && weight <= 1, `${status} is out of range`);
  }

  assert.ok(statusWeight("Critically Endangered") > statusWeight("Endangered"));
  assert.ok(statusWeight("Endangered") > statusWeight("Vulnerable"));
  assert.ok(statusWeight("Vulnerable") > statusWeight("Near Threatened"));
  assert.ok(statusWeight("Near Threatened") > statusWeight("Least Concern"));
  // Extinct is not "less risky" than critically endangered.
  assert.equal(statusWeight("Extinct"), 1);
  assert.equal(statusWeight("nonsense"), null);
  assert.equal(statusWeight(undefined), null);
});

test("range size is log-scaled: a valley is fragile, a continent is not", () => {
  assert.equal(rangeWeight(10_000), 1);
  assert.ok(rangeWeight(100_000) < rangeWeight(10_000));
  assert.ok(rangeWeight(1_000_000) < rangeWeight(100_000));
  assert.equal(rangeWeight(3_200_000), 0);
  assert.equal(rangeWeight(9_000_000), 0, "clamped, not negative");
  assert.equal(rangeWeight(0), null);
  assert.equal(rangeWeight(-5), null);
  assert.equal(rangeWeight(null), null);
  assert.equal(rangeWeight(Number.NaN), null);
});

test("threat overlap scales with severity, and a missing fraction is missing", () => {
  assert.equal(threatWeight(0, 5), 0);
  assert.equal(threatWeight(null, 5), null);
  assert.equal(threatWeight(Number.NaN, 5), null);

  assert.ok(threatWeight(1, 5) > threatWeight(1, 1), "severity 5 must outweigh severity 1");
  assert.ok(threatWeight(0.5, 3) < threatWeight(1, 3));
  assert.ok(threatWeight(1, 5) <= 1, "clamped");

  // An unknown severity is treated as a mild one rather than as no threat at all.
  assert.ok(threatWeight(1, null) > 0);
  assert.ok(threatWeight(1, null) < threatWeight(1, 5));
});

test("the trend term needs a baseline and only rises when records thin out", () => {
  const buckets = (values) => values.map((records, index) => ({ from: 1980 + index * 10, to: 1989 + index * 10, records }));

  assert.equal(trendWeight(null), null);
  assert.equal(trendWeight([]), null);
  assert.equal(trendWeight(buckets([100])), null, "one bucket is not a trend");
  assert.equal(trendWeight(buckets([100, 100])), 0, "flat is not a decline");
  assert.equal(trendWeight(buckets([100, 200])), 0, "growth is not a decline");
  assert.equal(trendWeight(buckets([100, 0])), 1, "nothing recorded in the latest window is the maximum");

  const half = trendWeight(buckets([100, 50]));
  assert.ok(half > 0 && half < 1);
  assert.ok(trendWeight(buckets([100, 90])) < half, "a small fall is a small signal");

  // No earlier records at all: there is no baseline to compare against.
  assert.equal(trendWeight(buckets([0, 50])), null);
});

test("a full set of inputs produces a score in range with full coverage", () => {
  const breakdown = assessRisk({
    conservationStatus: "Endangered",
    rangeAreaKm2: 50_000,
    threatenedFraction: 0.4,
    worstSeverity: 4,
    observationBuckets: [
      { from: 1980, to: 1999, records: 100 },
      { from: 2000, to: 2019, records: 60 },
      { from: 2020, to: 2026, records: 30 },
    ],
  });

  assert.equal(breakdown.missing.length, 0);
  assert.equal(breakdown.coverage, 1);
  assert.ok(breakdown.score !== null && breakdown.score > 0 && breakdown.score <= 100);
  assert.equal(breakdown.band.id, bandFor(breakdown.score).id);
});

test("every input moves the score in the direction the UI claims", () => {
  const base = {
    conservationStatus: "Vulnerable",
    rangeAreaKm2: 200_000,
    threatenedFraction: 0.2,
    worstSeverity: 3,
    observationBuckets: [
      { from: 1980, to: 1999, records: 100 },
      { from: 2020, to: 2026, records: 100 },
    ],
  };

  const scoreOf = (patch) => assessRisk({ ...base, ...patch }).score ?? 0;
  const baseline = scoreOf({});

  assert.ok(scoreOf({ conservationStatus: "Critically Endangered" }) > baseline, "worse status");
  assert.ok(scoreOf({ conservationStatus: "Least Concern" }) < baseline, "better status");
  assert.ok(scoreOf({ rangeAreaKm2: 15_000 }) > baseline, "smaller range");
  assert.ok(scoreOf({ rangeAreaKm2: 2_000_000 }) < baseline, "larger range");
  assert.ok(scoreOf({ threatenedFraction: 0.9 }) > baseline, "more overlap");
  assert.ok(scoreOf({ threatenedFraction: 0 }) < baseline, "no overlap");
  assert.ok(scoreOf({ worstSeverity: 5 }) > baseline, "worse severity");
  assert.ok(
    scoreOf({ observationBuckets: [{ from: 1980, to: 1999, records: 100 }, { from: 2020, to: 2026, records: 5 }] }) >
      baseline,
    "records thinning out",
  );
});

test("missing inputs are dropped and reported, never counted as zero", () => {
  const full = assessRisk({
    conservationStatus: "Endangered",
    rangeAreaKm2: 40_000,
    threatenedFraction: 0.5,
    worstSeverity: 5,
    observationBuckets: [
      { from: 1980, to: 1999, records: 10 },
      { from: 2020, to: 2026, records: 10 },
    ],
  });

  const partial = assessRisk({ conservationStatus: "Endangered", rangeAreaKm2: 40_000 });
  assert.deepEqual(partial.missing.sort(), ["threat", "trend"]);
  assert.equal(Math.round(partial.coverage * 100), 60, "40 + 20 of 100");
  assert.ok(partial.score !== null && partial.score > 0 && partial.score <= 100);
  assert.notEqual(partial.score, full.score, "dropping inputs is not the same as scoring them zero");

  // Dropping the *threat* input must not lower the score as if there were no threat.
  const noThreatRecorded = assessRisk({
    conservationStatus: "Endangered",
    rangeAreaKm2: 40_000,
    threatenedFraction: 0,
    worstSeverity: 0,
  });
  assert.ok(partial.score !== noThreatRecorded.score);
});

test("nothing at all is null, not a confident zero", () => {
  const nothing = assessRisk({});
  assert.equal(nothing.score, null);
  assert.equal(nothing.coverage, 0);
  assert.equal(nothing.band.id, "unknown");
  assert.equal(nothing.missing.length, 4);
});

test("the score stays in range for absurd inputs", () => {
  for (const status of [...CONSERVATION_STATUSES, "nonsense"]) {
    for (const area of [0.0001, 1, 10_000, 1e9, -1]) {
      for (const fraction of [-1, 0, 0.5, 2, Number.POSITIVE_INFINITY]) {
        const breakdown = assessRisk({
          conservationStatus: status,
          rangeAreaKm2: area,
          threatenedFraction: fraction,
          worstSeverity: 99,
        });

        if (breakdown.score === null) continue;
        assert.ok(
          breakdown.score >= 0 && breakdown.score <= 100,
          `score out of range: ${breakdown.score} for ${status}/${area}/${fraction}`,
        );
      }
    }
  }
});

test("urban areas get a severity between 1 and 5 that grows with size", () => {
  const small = severityForUrbanArea(30);
  const city = severityForUrbanArea(600);
  const megacity = severityForUrbanArea(6_000);

  assert.ok(small >= 1 && megacity <= 5);
  assert.ok(small < city && city < megacity, `${small} < ${city} < ${megacity}`);
  assert.equal(severityForUrbanArea(0), 1);
  assert.equal(severityForUrbanArea(-10), 1);
  assert.equal(severityForUrbanArea(Number.NaN), 1);
  assert.ok(severityForUrbanArea(1e9) <= 5, "clamped at 5");

  // A feature Natural Earth marks as significant at world scale gets one band more.
  assert.ok(severityForUrbanArea(600, 2) >= severityForUrbanArea(600, 8));
  assert.ok(severityForUrbanArea(600, 2) <= 5);
});

test("every band carries a text colour that survives the light theme", () => {
  // The hex is the night value and is for fills; text uses a Tailwind token, which the
  // `.light` block re-points. `npm run audit:theme` is what found the difference.
  for (const band of [...RISK_BANDS, bandFor(0, 0)]) {
    assert.ok(band.textClass.startsWith("text-"), `${band.id} has no text utility`);
    assert.ok(band.color.startsWith("#"), `${band.id} has no fill colour`);
    assert.notEqual(band.textClass, band.color, `${band.id} uses a raw hex as a class name`);
  }

  assert.equal(bandFor(0, 0).id, "unknown");
});

