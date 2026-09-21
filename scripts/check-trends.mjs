/**
 * Checks for the trends sample: `data/data2map-trends.json`.
 *
 * The file mixes two provenances on one geometry, which is the arrangement most likely to go
 * wrong quietly: a real WorldPop count and an invented footfall index sitting in the same row. So
 * the suite checks the arithmetic between them (density really is population over area), the
 * labelling (both halves carry their source and licence), and that `readTrendsSample` **refuses** a
 * file whose provenance has been stripped rather than drawing it with a warning.
 *
 * Run with: npm run check:trends
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import {
  formatCount,
  heatExpression,
  intensityFor,
  legendStops,
  maxIntensity,
  metricDefinition,
  readTrendsSample,
  valuedCollection,
} from "../lib/data2map/trends.ts";
import { TREND_CATEGORIES, hourlyFactor } from "../lib/data2map/footfall.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const raw = JSON.parse(readFileSync(join(root, "data", "data2map-trends.json"), "utf8"));
const sample = readTrendsSample(raw);

test("the sample loads, and every hex is fully attributed", () => {
  assert.ok(sample.collection.features.length >= 100, "a hot-spot map with 20 cells is a sketch");
  assert.ok(sample.cellSideKm > 0);
  assert.ok(sample.attribution.length > 20, "the file must say who to credit");
  assert.ok(sample.note.includes("WorldPop"), "the note must name the real half");

  const ids = new Set();
  for (const feature of sample.collection.features) {
    const properties = feature.properties;
    assert.ok(properties.hex_id.length > 0);
    assert.equal(ids.has(properties.hex_id), false, `duplicate hex ${properties.hex_id}`);
    ids.add(properties.hex_id);

    assert.ok(properties.population > 0, `${properties.hex_id} has nobody in it`);
    assert.ok(properties.density_per_km2 > 0);
    assert.ok(properties.footfall_index >= 0 && properties.footfall_index <= 100);
    assert.equal(properties.population_source, "WorldPop");
    assert.equal(properties.population_license, "CC BY 4.0");
    assert.equal(properties.footfall_source, "Kami3D synthetic");
    assert.equal(properties.footfall_license, "CC0");
    assert.equal(properties.synthetic, true, "the simulated half has to be declared");
  }
});

test("density is population over the hex's own area, and the numbers agree", () => {
  for (const feature of sample.collection.features) {
    const properties = feature.properties;
    const computed = properties.population / properties.area_km2;
    assert.ok(
      Math.abs(computed - properties.density_per_km2) <= Math.max(2, computed * 0.02),
      `${properties.hex_id}: ${properties.density_per_km2}/km2 does not match ${properties.population} over ${properties.area_km2}`,
    );
    assert.ok(properties.area_km2 > 1 && properties.area_km2 < 6, "a 1 km hex is about 2.6 km2");
  }
});

test("the grid covers the same city window as the real-estate sample", () => {
  const realEstate = JSON.parse(readFileSync(join(root, "data", "data2map-real-estate.json"), "utf8"));
  assert.deepEqual(sample.area, realEstate.properties.area, "two products drawing one city must agree on the window");
});

test("the file records both halves' provenance, and the loader refuses one that does not", () => {
  assert.equal(sample.provenance.population.source, "WorldPop");
  assert.equal(sample.provenance.population.year, 2020);
  assert.equal(sample.provenance.population.license, "CC BY 4.0");
  assert.equal(sample.provenance.footfall.synthetic, true);
  assert.ok(sample.provenance.footfall.note.length > 40, "the simulation has to explain itself");

  const stripped = JSON.parse(JSON.stringify(raw));
  delete stripped.properties.provenance;
  assert.throws(() => readTrendsSample(stripped), /provenance|where they came from/);

  const unflagged = JSON.parse(JSON.stringify(raw));
  delete unflagged.features[0].properties.synthetic;
  assert.throws(() => readTrendsSample(unflagged), /does not declare its simulated half/);
});

test("density ignores the clock and the category; footfall follows both", () => {
  const hex = sample.collection.features[0].properties;

  for (const hour of [0, 8, 16, 23]) {
    assert.equal(intensityFor(hex, "density", "cafe", hour), hex.density_per_km2);
  }

  const morning = intensityFor(hex, "footfall", "cafe", 8);
  const night = intensityFor(hex, "footfall", "cafe", 3);
  assert.ok(morning > night, "a cafe is busier at 8am than at 3am");
  assert.equal(morning, hex.footfall_index * hourlyFactor("cafe", 8));

  const teaEvening = intensityFor(hex, "footfall", "bubble_tea", 20);
  assert.ok(teaEvening > intensityFor(hex, "footfall", "bubble_tea", 8), "bubble tea is an evening trade");
});

test("the rendered collection carries a value the ramp can read", () => {
  for (const category of TREND_CATEGORIES) {
    const collection = valuedCollection(sample, "footfall", category, 12);
    assert.equal(collection.features.length, sample.collection.features.length);
    for (const feature of collection.features) {
      assert.equal(typeof feature.properties.value, "number");
      assert.ok(Number.isFinite(feature.properties.value));
    }
  }

  const peak = maxIntensity(sample, "footfall", "cafe", 8);
  assert.ok(peak > 0 && peak <= 100);
  assert.equal(maxIntensity(sample, "density", "cafe", 8), sample.maxima.density);
});

test("the colour ramp is scaled to what is on screen", () => {
  for (const max of [0, 1, 500, 42_000]) {
    const expression = heatExpression(max);
    assert.equal(expression[0], "interpolate");
    assert.deepEqual(expression[2], ["get", "value"]);

    // Pairs of (value, colour) after the three-word preamble, and the values must rise.
    const stops = expression.filter((entry, index) => index >= 3 && index % 2 === 1);
    assert.ok(stops.length >= 5, "a two-stop ramp is not a heat ramp");
    assert.equal(expression.length, 3 + stops.length * 2);
    assert.deepEqual(stops, [...stops].sort((a, b) => a - b), "stops must rise");
    assert.equal(stops[stops.length - 1], Math.max(max, 1), "the ramp tops out at what is on screen");
  }

  const stops = legendStops(1000);
  assert.equal(stops.length, 5);
  assert.equal(stops[stops.length - 1].label, "1,000");
});

test("counts are written the way a person reads them", () => {
  assert.equal(formatCount(0), "0");
  assert.equal(formatCount(9.4), "9.4");
  assert.equal(formatCount(42.6), "43");
  assert.equal(formatCount(12_428), "12,428");
  assert.equal(formatCount(Number.NaN), "—");
});

test("each metric names its own source, and says whether it is simulated", () => {
  const density = metricDefinition("density");
  const footfall = metricDefinition("footfall");

  assert.equal(density.synthetic, false);
  assert.equal(density.source, "WorldPop 2020");
  assert.equal(footfall.synthetic, true);
  assert.ok(footfall.license === "CC0");
  assert.equal(density.layer, "population");
  assert.equal(footfall.layer, "footfall");
  assert.equal(metricDefinition("nonsense").id, "density", "an unknown metric falls back to the real one");
});
