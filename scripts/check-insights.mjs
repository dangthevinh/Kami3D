/**
 * Assertions for the personal analytics.
 *
 * A dashboard is the easiest place in a product to start inventing numbers, and the easiest place
 * for a wrong one to look fine: a percentage derived from an empty list is "0%", and a chart of
 * nothing renders exactly like a chart of something. So the rules are pinned here:
 *
 *   no invented numbers   nothing played means null rates and empty series, never 0%
 *   stated definitions    a run counts rounds at or above ROUND_GOOD_PERCENT, and the bands have
 *                         edges that belong to exactly one band
 *   deterministic         the same rows always produce the same lists, in the same order
 *
 * Run with: npm run check:insights
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import {
  ACCURACY_BANDS,
  ROUND_GOOD_PERCENT,
  WEEK_WINDOW_COUNT,
  bandIndex,
  chronological,
  roundAccuracy,
  shareOf,
  summariseFavourites,
  summariseQuiz,
} from "../lib/insights.ts";

const round = (score, total, at, mode = "silhouette") => ({
  score,
  total_questions: total,
  mode,
  created_at: at,
});

const day = (offset) => new Date(Date.UTC(2026, 0, 1) + offset * 86_400_000).toISOString();

const species = (name, category, region, diet, status) => ({
  name,
  category,
  region,
  diet,
  conservation_status: status,
});

test("nothing played is null, not zero", () => {
  const empty = summariseQuiz([]);

  assert.equal(empty.rounds, 0);
  assert.equal(empty.accuracy, null, "0% accuracy for a visitor who never played is a false statement");
  assert.equal(empty.averageQuestions, null);
  assert.equal(empty.best, null);
  assert.equal(empty.latest, null);
  assert.deepEqual(empty.series, []);
  assert.deepEqual(empty.byMode, []);
  assert.deepEqual(empty.byWeek, []);
  assert.equal(empty.bestRun, 0);
  assert.equal(empty.currentRun, 0);
  assert.equal(empty.bands.length, ACCURACY_BANDS.length, "the bands are the axis, so they stay");
  assert.ok(empty.bands.every((band) => band.count === 0));
});

test("one round is clamped, rounded and never NaN", () => {
  assert.equal(roundAccuracy(round(10, 10, day(0))), 100);
  assert.equal(roundAccuracy(round(1, 3, day(0))), 33.3, "one decimal, not 33.33333333333333");
  assert.equal(roundAccuracy(round(0, 10, day(0))), 0);
  assert.equal(roundAccuracy(round(20, 10, day(0))), 100, "a score above its own total is clamped");
  assert.equal(roundAccuracy(round(-5, 10, day(0))), 0);
  assert.equal(roundAccuracy(round(5, 0, day(0))), null, "a round that asked nothing has no accuracy");
  assert.equal(roundAccuracy({ score: 5, total_questions: Number.NaN }), null);
});

test("rounds are ordered oldest first whatever order they arrive in", () => {
  const rows = [round(5, 10, day(4)), round(9, 10, day(0)), round(7, 10, day(2))];
  const ordered = chronological(rows).map((entry) => entry.created_at);
  assert.deepEqual(ordered, [day(0), day(2), day(4)]);

  const summary = summariseQuiz(rows);
  assert.deepEqual(
    summary.series.map((point) => point.accuracy),
    [90, 70, 50],
    "the series is a timeline, so its order is the point",
  );
  assert.equal(summary.latest.accuracy, 50, "the latest round is the newest one, not the last in the array");
});

test("every percentage lands in exactly one band", () => {
  assert.equal(bandIndex(0), 0);
  assert.equal(bandIndex(19.9), 0);
  assert.equal(bandIndex(20), 1, "the edge belongs to the upper band, once");
  assert.equal(bandIndex(99), 4);
  assert.equal(bandIndex(100), 4, "100% must not fall off the end of the axis");
  assert.equal(bandIndex(140), 4);

  const summary = summariseQuiz([
    round(0, 10, day(0)), // 0
    round(19, 100, day(1)), // 19
    round(2, 10, day(2)), // 20
    round(5, 10, day(3)), // 50
    round(79, 100, day(4)), // 79
    round(8, 10, day(5)), // 80
    round(10, 10, day(6)), // 100
  ]);

  assert.deepEqual(
    summary.bands.map((band) => band.count),
    [2, 1, 1, 1, 2],
  );
  assert.equal(
    summary.bands.reduce((total, band) => total + band.count, 0),
    summary.rounds,
    "every round is in a band, and none is counted twice",
  );
});

test("a run is rounds in a row at or above the stated percentage", () => {
  const good = ROUND_GOOD_PERCENT;

  const summary = summariseQuiz([
    round(good, 100, day(0)), // 60 -> run
    round(70, 100, day(1)), // run
    round(50, 100, day(2)), // break
    round(90, 100, day(3)), // run
    round(100, 100, day(4)), // run
  ]);

  assert.equal(summary.bestRun, 2);
  assert.equal(summary.currentRun, 2, "the run the visitor is on now is the tail of the series");

  const broken = summariseQuiz([round(90, 100, day(0)), round(10, 100, day(1))]);
  assert.equal(broken.bestRun, 1);
  assert.equal(broken.currentRun, 0, "a bad last round ends the current run, and says so");
});

test("the mode split accounts for every round", () => {
  const summary = summariseQuiz([
    round(9, 10, day(0), "silhouette"),
    round(8, 10, day(1), "silhouette"),
    round(4, 10, day(2), "sound"),
  ]);

  assert.equal(
    summary.byMode.reduce((total, entry) => total + entry.rounds, 0),
    summary.rounds,
  );
  assert.deepEqual(summary.byMode.map((entry) => entry.label), ["silhouette", "sound"], "sorted by rounds");
  assert.equal(summary.byMode[0].accuracy, 85);
  assert.equal(summary.byMode[1].accuracy, 40);
});

test("the weekly series is a window over the lifetime totals, and says which is which", () => {
  // The window is seven days wide and ends on the last round, so a round exactly a week older is
  // still inside it — a boundary belongs to the window it closes, once.
  const recent = summariseQuiz([round(5, 10, day(0)), round(9, 10, day(7)), round(2, 10, day(14))]);
  assert.equal(recent.byWeek.length, WEEK_WINDOW_COUNT);
  assert.deepEqual(
    recent.byWeek.slice(-3).map((week) => week.rounds),
    [0, 1, 2],
    "days 7 and 14 share the newest window, day 0 sits in the one before it, and every window is counted once",
  );
  assert.equal(
    recent.byWeek.reduce((total, week) => total + week.rounds, 0),
    3,
  );

  // A round older than the window is out of the chart but never out of the totals: the chart is a
  // window, the totals are a lifetime, and confusing the two is how a dashboard starts lying.
  const mixed = summariseQuiz([round(1, 10, day(0)), round(9, 10, day(WEEK_WINDOW_COUNT * 7 + 60))]);
  assert.equal(mixed.rounds, 2);
  assert.equal(
    mixed.byWeek.reduce((total, week) => total + week.rounds, 0),
    1,
    "only the round inside the window is plotted",
  );
  assert.equal(mixed.byWeek[mixed.byWeek.length - 1].rounds, 1, "and it is the newest window that holds it");

  // Counting back from the last round rather than from today keeps that window full.
  const stale = summariseQuiz([round(5, 10, day(0))]);
  assert.equal(stale.byWeek[stale.byWeek.length - 1].rounds, 1);
});

test("favourites break down in a way that adds up", () => {
  const catalogue = [
    species("Lion", "Mammal", "Africa", "Carnivore", "Vulnerable"),
    species("Blue Whale", "Mammal", "Oceans", "Filter Feeder", "Endangered"),
    species("Axolotl", "Amphibian", "North America", "Carnivore", "Critically Endangered"),
    species("Giraffe", "Mammal", "Africa", "Herbivore", "Vulnerable"),
    species("Monarch Butterfly", "Insect", "North America", "Insectivore", "Endangered"),
  ];

  const insights = summariseFavourites([catalogue[0], catalogue[3], catalogue[3]], catalogue);

  assert.equal(insights.favourites, 3);
  assert.equal(insights.catalogue, 5);
  assert.equal(insights.shareOfCatalogue, 0.6);
  assert.equal(
    insights.byCategory.reduce((total, entry) => total + entry.count, 0),
    3,
    "every favourite is in exactly one category",
  );
  assert.deepEqual(insights.byCategory.map((entry) => entry.label), ["Mammal"]);
  assert.equal(insights.byCategory[0].share, 1);
  assert.deepEqual(insights.byRegion.map((entry) => entry.label), ["Africa"]);
  assert.equal(insights.threatened, 3, "Vulnerable counts as threatened, because IUCN says so");
  assert.deepEqual(
    insights.untouchedRegions,
    ["North America", "Oceans"],
    "the gaps are the regions with nothing in them, alphabetically",
  );
});

test("an empty collection is reported as empty, not as a preference", () => {
  const catalogue = [species("Lion", "Mammal", "Africa", "Carnivore", "Vulnerable")];
  const insights = summariseFavourites([], catalogue);

  assert.equal(insights.favourites, 0);
  assert.equal(insights.shareOfCatalogue, 0, "0 of 1 is a true zero; the page still says so in words");
  assert.deepEqual(insights.byCategory, [], "no favourites means no breakdown, not a breakdown of zeroes");
  assert.equal(insights.threatened, 0);
  assert.deepEqual(insights.untouchedRegions, ["Africa"]);

  assert.equal(shareOf(0, 0), null, "a share of nothing is unknown, not zero");
  assert.equal(summariseFavourites([], []).shareOfCatalogue, null);
});

test("the same rows always produce the same page", () => {
  const rows = [round(7, 10, day(2)), round(3, 10, day(0)), round(10, 10, day(1), "sound")];
  assert.deepEqual(summariseQuiz(rows), summariseQuiz([...rows].reverse()));
  assert.deepEqual(summariseQuiz(rows), summariseQuiz(rows), "no clock, no randomness, no Map iteration order");
});
