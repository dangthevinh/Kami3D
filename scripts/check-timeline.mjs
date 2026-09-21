/**
 * Checks for the timeline arithmetic and the migration path maths.
 *
 * The timeline rules come from the phase brief and are the kind that quietly break: an
 * annotation must never be mistaken for a published range, and a year with no polygon must
 * say so instead of interpolating one. The migration rules are the animation - a dot that
 * moves by distance rather than by vertex index, and that never divides by zero on a route
 * with two identical points.
 *
 * Run with: npm run check:timeline
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import { advanceProgress, distanceKm, pointAlongLine, progressPerSecond, routeLengthKm } from "../lib/migration.ts";
import {
  describeGap,
  eventsForYear,
  formatYear,
  frameForYear,
  nearestYearsWithData,
  timelineTicks,
  yearsWithRanges,
} from "../lib/timeline.ts";

const feature = (slug, kind, year) => ({
  type: "Feature",
  properties: { slug, name: slug, kind, year, source: "test", license: "CC0" },
  geometry: { type: "Polygon", coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] },
});

const event = (year, title) => ({
  id: `${year}-${title}`,
  year,
  title,
  summary: "A summary of the cited source, written for the timeline.",
  kind: "event",
  slug: null,
  source: "A source",
  sourceUrl: "https://example.invalid",
  attribution: "Kami3D summaries",
});

const features = [
  feature("lion", "habitat_current", null),
  feature("smilodon", "habitat_current", null),
  feature("smilodon", "habitat_historic", -10000),
  feature("lion", "occurrence", null),
];

test("only range kinds count as years with a range", () => {
  const years = yearsWithRanges(features, 2026);

  assert.deepEqual(years, [-10000, 2026], "occurrence rows must not create a range year");
  assert.deepEqual(yearsWithRanges([], 2026), []);
  assert.deepEqual(yearsWithRanges([feature("lion", "occurrence", null)], 2026), []);
});

test("a year with a polygon returns it, and a year without says so", () => {
  const present = frameForYear({ features, events: [], year: 2026, presentYear: 2026 });
  assert.equal(present.hasRange, true);
  assert.equal(present.ranges.length, 2);
  assert.deepEqual(present.nearestYears, []);
  assert.equal(describeGap(present), "", "no gap, no message");

  const gap = frameForYear({ features, events: [], year: 1900, presentYear: 2026 });
  assert.equal(gap.hasRange, false);
  assert.deepEqual(gap.ranges, []);
  assert.deepEqual(gap.nearestYears, [2026, -10000], "closest years first");

  const message = describeGap(gap);
  assert.match(message, /No range data for 1900/);
  assert.match(message, /2026/, "the message has to name the years that do have data");
});

test("nothing at all is a message too, not an empty string", () => {
  const empty = frameForYear({ features: [], events: [], year: 1900 });
  assert.equal(empty.hasRange, false);
  assert.equal(describeGap(empty), "No range data has been published for 1900.");
});

test("a frame never mixes an annotation into the ranges", () => {
  const frame = frameForYear({
    features,
    events: [event(2026, "Something happened")],
    year: 2026,
    presentYear: 2026,
  });

  assert.equal(frame.ranges.length, 2);
  assert.equal(frame.events.length, 1);
  // The event is an annotation with a citation, and carries no geometry at all.
  assert.equal("geometry" in frame.events[0], false);
  assert.equal(frame.events[0].sourceUrl.length > 0, true);
});

test("events are found around a year, newest first", () => {
  const events = [event(1973, "CITES"), event(1982, "Moratorium"), event(2022, "Monarch")];

  assert.deepEqual(eventsForYear(events, 1980, 0).map((entry) => entry.year), []);
  assert.deepEqual(eventsForYear(events, 1980, 5).map((entry) => entry.year), [1982]);
  assert.deepEqual(eventsForYear(events, 1990, 100).map((entry) => entry.year), [2022, 1982, 1973]);
  assert.equal(eventsForYear(events, 1980, 5)[0].year, 1982, "the event keeps its real year");
});

test("ticks cover the scale without repeating", () => {
  assert.deepEqual(timelineTicks(1900, 2000, 5), [1900, 1925, 1950, 1975, 2000]);
  assert.deepEqual(timelineTicks(1900, 1900, 5), [1900]);
  assert.equal(new Set(timelineTicks(-10000, 2026, 6)).size, 6);
});

test("years read the way a person writes them", () => {
  assert.equal(formatYear(2020), "2020");
  assert.equal(formatYear(0), "0");
  assert.equal(formatYear(-800), "800 BCE");
  assert.equal(formatYear(-10000), "10,000 BCE");
});

test("closest years are ordered by distance, then by year", () => {
  assert.deepEqual(nearestYearsWithData([1900, 1950, 2000], 1960, 2), [1950, 2000]);
  assert.deepEqual(nearestYearsWithData([2000, 1900], 1950, 2), [1900, 2000], "a tie breaks by year");
  assert.deepEqual(nearestYearsWithData([], 1950), []);
});

test("distance and route length match the globe", () => {
  const london = [-0.1278, 51.5074];
  const paris = [2.3522, 48.8566];
  const km = distanceKm(london, paris);

  assert.ok(Math.abs(km - 344) < 12, `London to Paris measured ${Math.round(km)} km`);
  assert.equal(distanceKm(london, london), 0);
  assert.equal(routeLengthKm([london]), 0);
  assert.equal(routeLengthKm([]), 0);

  const there = routeLengthKm([london, paris]);
  const andBack = routeLengthKm([london, paris, london]);
  assert.ok(Math.abs(andBack - there * 2) < 0.001, "a there-and-back route is twice as long");
});

test("the dot moves by distance, not by vertex index", () => {
  // Three points: a long first leg and a short second one. Moving by index would put the
  // half-way mark at the middle vertex, which is 90% of the way along.
  const route = [[0, 0], [0, 10], [0, 11]];
  const half = pointAlongLine(route, 0.5);

  assert.ok(half);
  assert.ok(half.point[1] > 4.4 && half.point[1] < 5.6, `half way was at latitude ${half.point[1]}`);
  assert.equal(half.stopIndex, 0, "the middle vertex has not been reached yet");

  const end = pointAlongLine(route, 1);
  assert.deepEqual(end.point, [0, 11]);
  assert.equal(end.stopIndex, 2);
  assert.ok(Math.abs(end.travelledKm - routeLengthKm(route)) < 0.001);
});

test("progress is clamped, and a degenerate route does not divide by zero", () => {
  const route = [[0, 0], [1, 1]];

  assert.deepEqual(pointAlongLine(route, -5).point, [0, 0]);
  assert.deepEqual(pointAlongLine(route, 12).point, [1, 1]);
  assert.equal(pointAlongLine(route, Number.NaN).progress, 0);
  assert.equal(pointAlongLine([], 0.5), null);

  const single = pointAlongLine([[3, 4]], 0.5);
  assert.deepEqual(single.point, [3, 4]);
  assert.equal(single.progress, 0);

  // Two identical points: no length to travel, and no NaN.
  const stuck = pointAlongLine([[3, 4], [3, 4]], 0.7);
  assert.deepEqual(stuck.point, [3, 4]);
  assert.equal(stuck.progress, 0);
  assert.equal(Number.isFinite(stuck.travelledKm), true);
});

test("progress advances at a constant rate and wraps", () => {
  assert.equal(progressPerSecond(10), 0.1);
  assert.equal(progressPerSecond(0), 0);
  assert.equal(progressPerSecond(-1), 0);

  assert.ok(Math.abs(advanceProgress(0, 0.1, 5) - 0.5) < 1e-9);
  assert.ok(Math.abs(advanceProgress(0.9, 0.1, 5) - 0.4) < 1e-9, "wraps rather than running past the end");
  assert.equal(advanceProgress(0.5, 0.1, -3), 0.5, "a negative delta does not run the clock backwards");
  assert.equal(advanceProgress(0.5, Number.NaN, 1), 0);
});
