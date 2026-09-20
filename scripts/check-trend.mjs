/**
 * Assertions for the leaderboard trend maths.
 *
 * Dates are the easy thing to get silently wrong: off-by-one at a month boundary,
 * a gap-filled day landing in the wrong place, or a chart that disagrees with the
 * table because one side used local time and the other UTC. Every case here pins
 * `today` so the suite cannot fail on a particular calendar day.
 *
 * Run with: npm run check:trend
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import { bars, dayRange, fillDays, sparkline, summarise, toDayKey } from "../lib/trend.ts";

test("dayRange counts back from today and stays in order", () => {
  const today = new Date("2026-03-01T12:00:00Z");
  assert.deepEqual(dayRange(3, today), ["2026-02-27", "2026-02-28", "2026-03-01"]);
  assert.deepEqual(dayRange(1, today), ["2026-03-01"]);
  assert.equal(dayRange(30, today).length, 30);
});

test("dayRange crosses months, years and a leap day correctly", () => {
  assert.deepEqual(dayRange(4, new Date("2026-01-02T00:30:00Z")), [
    "2025-12-30",
    "2025-12-31",
    "2026-01-01",
    "2026-01-02",
  ]);
  // 2024 was a leap year: 28 February plus one day is 29 February.
  assert.deepEqual(dayRange(3, new Date("2024-03-01T00:00:00Z")), ["2024-02-28", "2024-02-29", "2024-03-01"]);
});

test("dayRange is UTC, so a late-evening instant does not slip a day", () => {
  // 23:30 in UTC is already the next day in UTC+2; the series must follow the
  // database's current_date, which is UTC.
  const late = new Date("2026-05-10T23:30:00Z");
  assert.equal(toDayKey(late), "2026-05-10");
  assert.equal(dayRange(2, late).at(-1), "2026-05-10");
});

test("fillDays turns missing days into real zeros", () => {
  const today = new Date("2026-05-10T00:00:00Z");
  const series = fillDays(
    [
      { day: "2026-05-10", views: 4 },
      { day: "2026-05-08", views: 1 },
    ],
    4,
    today,
  );

  assert.deepEqual(series, [
    { day: "2026-05-07", views: 0 },
    { day: "2026-05-08", views: 1 },
    { day: "2026-05-09", views: 0 },
    { day: "2026-05-10", views: 4 },
  ]);
});

test("fillDays sums duplicate days and ignores anything outside the window", () => {
  const today = new Date("2026-05-10T00:00:00Z");
  const series = fillDays(
    [
      { day: "2026-05-10", views: 2 },
      { day: "2026-05-10", views: 3 },
      { day: "2020-01-01", views: 999 },
    ],
    2,
    today,
  );

  assert.deepEqual(series, [
    { day: "2026-05-09", views: 0 },
    { day: "2026-05-10", views: 5 },
  ]);
});

test("a flat series is drawn through the middle, not along the top", () => {
  const flat = [{ day: "2026-05-10", views: 0 }, { day: "2026-05-09", views: 0 }];
  const { line } = sparkline(flat, 100, 20, 0);
  assert.equal(line, "M 0 10 L 100 10", "no views should read as a flat line, not a full chart");
});

test("sparkline scales the peak to the top of the box and closes its area", () => {
  const series = [
    { day: "2026-05-09", views: 5 },
    { day: "2026-05-10", views: 10 },
  ];
  const { line, area, max, total } = sparkline(series, 100, 20, 0);

  assert.equal(max, 10);
  assert.equal(total, 15);
  assert.equal(line, "M 0 10 L 100 0", "the busiest day must reach the top edge");
  assert.ok(area.startsWith(line), "the area follows the line");
  assert.ok(area.endsWith("Z"), "the area must be closed");
});

test("sparkline survives a single point and an empty series", () => {
  assert.equal(sparkline([{ day: "2026-05-10", views: 3 }], 100, 20).line, "M 2 2");
  assert.deepEqual(sparkline([], 100, 20), { line: "", area: "", max: 0, total: 0 });
});

test("bars are proportional and start from the oldest day", () => {
  const series = [
    { day: "2026-05-09", views: 0 },
    { day: "2026-05-10", views: 4 },
  ];
  const geometry = bars(series, 100, 40, 0);

  assert.equal(geometry.length, 2);
  assert.equal(geometry[0].day, "2026-05-09");
  assert.equal(geometry[0].height, 0, "a day with no views has no bar");
  assert.equal(geometry[1].height, 40, "the peak fills the chart height");
  assert.equal(geometry[1].y, 0);
  assert.equal(geometry[0].x, 0);
  assert.equal(geometry[1].x, 50, "two bars split the width");
});

test("bars with an all-zero series stay flat rather than dividing by zero", () => {
  const geometry = bars([{ day: "2026-05-10", views: 0 }], 100, 40);
  assert.equal(geometry[0].height, 0);
  assert.ok(Number.isFinite(geometry[0].y));
});

test("summarise reports total, peak and the change between halves", () => {
  const series = [
    { day: "2026-05-01", views: 1 },
    { day: "2026-05-02", views: 1 },
    { day: "2026-05-03", views: 4 },
    { day: "2026-05-04", views: 6 },
  ];
  const summary = summarise(series);

  assert.equal(summary.total, 12);
  assert.equal(summary.peak, 6);
  assert.equal(summary.peakDay, "2026-05-04");
  assert.equal(summary.average, 3);
  // First half 2, second half 10 -> +400%.
  assert.equal(summary.changePct, 400);
});

test("summarise declines to invent a percentage with nothing to compare", () => {
  assert.equal(summarise([{ day: "2026-05-09", views: 0 }, { day: "2026-05-10", views: 5 }]).changePct, null);
  assert.deepEqual(summarise([]), { total: 0, peak: 0, peakDay: null, average: 0, changePct: null });
});
