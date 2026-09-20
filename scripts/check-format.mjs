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

import { dataUrlToBytes, formatCount, formatLength, formatWeight, isPngBytes, pngFileName } from "../lib/utils.ts";

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

test("a captured frame survives the trip through a blob", () => {
  // A one-pixel PNG, base64, exactly as `canvas.toDataURL` returns it.
  const onePixel =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8AARAAE/wH/9QAAAABJRU5ErkJggg==";

  const bytes = dataUrlToBytes(onePixel);
  assert.ok(bytes.length > 60, "the decode must produce real bytes");
  assert.equal(isPngBytes(bytes), true, "the PNG signature must survive");
  assert.equal(dataUrlToBytes("data:image/png;base64,AA==")[0], 0);
});

test("decoding refuses anything that is not a base64 data URL", () => {
  // A silent empty download would look like a broken button.
  assert.throws(() => dataUrlToBytes("https://example.com/model.png"), /base64/);
  assert.throws(() => dataUrlToBytes("data:image/png,notbase64"), /base64/);
  assert.throws(() => dataUrlToBytes(""), /base64/);
});

test("non-PNG bytes are detected as non-PNG", () => {
  assert.equal(isPngBytes(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9])), false);
  assert.equal(isPngBytes(new Uint8Array(0)), false);
});

test("saved pictures get a usable filename for any slug", () => {
  assert.equal(pngFileName("lion"), "kami3d-lion.png");
  assert.equal(pngFileName("Tyrannosaurus Rex"), "kami3d-tyrannosaurus-rex.png");
  assert.equal(pngFileName("../../etc/passwd"), "kami3d-etc-passwd.png");
  assert.equal(pngFileName(""), "kami3d-model.png");
  assert.equal(pngFileName("---"), "kami3d-model.png");
});

test("the measurement helpers keep their units straight", () => {
  assert.equal(formatWeight(190), "190 kg");
  assert.equal(formatWeight(130_000), "130 t");
  assert.equal(formatLength(2.5), "2.5 m");
});
