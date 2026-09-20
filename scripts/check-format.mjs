/**
 * Assertions for the small formatting helpers the UI leans on.
 *
 * `formatCount` is four lines long and was still wrong: 999,999 rendered as
 * "1000k" because the rounding happened after the unit was picked. A manual probe
 * caught it, and this keeps it caught.
 *
 * Run with: npm run check:format
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import { formatCount, formatLength, formatWeight } from "../lib/utils.ts";

test("formatCount picks the unit after rounding, not before", () => {
  assert.equal(formatCount(0), "0");
  assert.equal(formatCount(7), "7");
  assert.equal(formatCount(999), "999");
  assert.equal(formatCount(1000), "1k");
  assert.equal(formatCount(1240), "1.2k");
  assert.equal(formatCount(9999), "10k");
  assert.equal(formatCount(18400), "18k");
  assert.equal(formatCount(999_499), "999k");
  assert.equal(formatCount(999_999), "1M");
  assert.equal(formatCount(1_200_000), "1.2M");
  assert.equal(formatCount(2_500_000), "2.5M");
  // Rounding up across a unit boundary is the whole point: 999,999,999 is ~1B,
  // not "1000M".
  assert.equal(formatCount(999_999_999), "1B");
  assert.equal(formatCount(1_500_000_000), "1.5B");
});

test("formatCount never emits a value that reads as a smaller unit", () => {
  // The bug this guards: a four-digit "k" figure should never appear.
  for (const value of [999_500, 999_999, 1_000_000, 1_499_999]) {
    const rendered = formatCount(value);
    assert.ok(!/^\d{4,}k$/.test(rendered), `${value} rendered as "${rendered}"`);
  }
});

test("formatCount survives nonsense input", () => {
  assert.equal(formatCount(Number.NaN), "0");
  assert.equal(formatCount(Number.POSITIVE_INFINITY), "0");
});

test("the measurement helpers keep their units straight", () => {
  assert.equal(formatWeight(190), "190 kg");
  assert.equal(formatWeight(130_000), "130 t");
  assert.equal(formatLength(2.5), "2.5 m");
});
