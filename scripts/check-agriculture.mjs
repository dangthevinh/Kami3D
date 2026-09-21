/**
 * Checks for the agriculture sample.
 *
 * The file mixes two provenances the way the trends sample does, so the suite checks the seams: that
 * every parcel is labelled simulated, that the season's periods line up with the series lengths, that
 * the cloud gaps the page is built to show are actually in the data, and - the cross-check that
 * matters most - that the yield stored in the file is the yield the model computes from the stored
 * NDVI, recomputed here from scratch.
 *
 * Run with: npm run check:agriculture
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import {
  fieldAtPeriod,
  fieldSeasonMean,
  harvestByMonth,
  productionByProvince,
  readAgricultureSample,
} from "../lib/data2map/agriculture.ts";
import { classifyNdvi, estimateYield } from "../lib/data2map/ndvi.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const raw = JSON.parse(readFileSync(join(root, "data", "data2map-agriculture.json"), "utf8"));
const sample = readAgricultureSample(raw);

test("the sample loads with provinces, parcels, a season and provenance for both rasters", () => {
  assert.equal(sample.provinces.length, 6);
  assert.ok(sample.fields.length >= 100, "a sample of a rice delta should be a sample, not a token field");
  assert.ok(sample.periods.length >= 12, "a season needs enough composites to show a crop cycle");
  assert.equal(sample.rasterSources.ndvi.source, "NASA EOSDIS GIBS");
  assert.equal(sample.rasterSources.ndvi.license, "Public domain");
  assert.equal(sample.rasterSources.rain.source, "NASA EOSDIS GIBS (GPM IMERG)");
  assert.match(sample.rasterSources.ndvi.palette, /colormaps\/v1\.3\/MODIS_NDVI\.xml$/);

  // The dates the page builds tile URLs from must be real GIBS dates, in order, eight days apart.
  const dates = sample.periods.map((period) => period.date);
  assert.deepEqual(dates, [...dates].sort(), "the season runs forwards");
  for (let index = 1; index < dates.length; index += 1) {
    const gap = (Date.parse(dates[index]) - Date.parse(dates[index - 1])) / 86_400_000;
    assert.equal(gap, 8, "an 8-day composite stepped by anything else is not the layer's own cadence");
  }
  assert.ok(dates[0] >= "2025-02-12", "outside GIBS's own window the tile would 404");
});

test("every parcel and envelope says it is simulated, and why", () => {
  for (const feature of sample.collection.features) {
    const properties = feature.properties;
    assert.equal(properties.synthetic, true);
    assert.ok(properties.note.length > 30);
    assert.equal(properties.license, "CC0");
  }

  const tampered = JSON.parse(JSON.stringify(raw));
  delete tampered.features[10].properties.note;
  assert.throws(() => readAgricultureSample(tampered), /does not explain what it is/);

  const headerless = JSON.parse(JSON.stringify(raw));
  delete headerless.properties.rasterSources;
  assert.throws(() => readAgricultureSample(headerless), /rasters have no provenance/);
});

test("each parcel sits in its province's envelope and has a believable area", () => {
  const byId = new Map(sample.provinces.map((province) => [province.properties.province_id, province]));

  for (const field of sample.fields) {
    const province = byId.get(field.properties.province_id);
    assert.ok(province, field.properties.field_id + " points at a province that is not there");
    assert.ok(field.properties.area_ha > 1 && field.properties.area_ha < 400, field.properties.field_id + " has an implausible area");
    assert.ok(field.properties.sowing_month >= 1 && field.properties.sowing_month <= 12);

    const [lng, lat] = field.geometry.coordinates[0][0];
    assert.ok(lng >= sample.area.west && lng <= sample.area.east, field.properties.field_id + " is outside the delta");
    assert.ok(lat >= sample.area.south && lat <= sample.area.north);
  }
});

test("the season has gaps in it, which is the point of the null rule", () => {
  let gaps = 0;
  let readings = 0;

  for (const field of sample.fields) {
    assert.equal(field.properties.ndvi_series.length, sample.periods.length, field.properties.field_id + " does not cover the season");

    for (const value of field.properties.ndvi_series) {
      if (value === null) { gaps += 1; continue; }
      readings += 1;
      assert.ok(classifyNdvi(value) !== null, field.properties.field_id + " has a reading outside the index");
      assert.ok(value >= 0.05 && value <= 0.97);
    }

    assert.ok(field.properties.ndvi_series.some((value) => value === null), "a season with no cloud over the Delta is not a season");
  }

  assert.ok(gaps / (gaps + readings) < 0.3, "cloud should be the exception, not the story");
  assert.equal(fieldAtPeriod(sample.fields[0], -1), null);
  assert.equal(fieldAtPeriod(sample.fields[0], 999), null);
  assert.equal(fieldAtPeriod(sample.fields[0], 0), sample.fields[0].properties.ndvi_series[0]);
  assert.equal(fieldSeasonMean(sample.fields[0]), sample.fields[0].properties.ndvi_mean);
});

test("the stored yield is the yield the model computes", () => {
  for (const field of sample.fields) {
    const properties = field.properties;
    const recomputed = estimateYield({
      crop: properties.crop,
      meanNdvi: properties.ndvi_mean,
      areaHa: properties.area_ha,
    });

    assert.ok(recomputed, properties.field_id + " has a mean but no estimate");
    assert.equal(properties.yield_t_per_ha, recomputed.tonnesPerHa, properties.field_id + " disagrees with the model");
    assert.equal(properties.yield_tonnes, recomputed.tonnes);
    assert.equal(properties.yield_source, recomputed.source, "every estimate carries the source of its coefficients");
  }
});

test("the dashboard aggregates add up, and say what they are a sample of", () => {
  const production = productionByProvince(sample);
  assert.equal(production.length, sample.provinces.length);

  const sampled = production.reduce((sum, entry) => sum + entry.sampledTonnes, 0);
  const stored = Math.round(sample.fields.reduce((sum, field) => sum + (field.properties.yield_tonnes ?? 0), 0) * 10) / 10;
  assert.ok(Math.abs(sampled - stored) < 1, "the dashboard and the parcels must agree");

  for (const entry of production) {
    assert.ok(entry.sampledAreaHa > 0 && entry.simulatedShare > 0 && entry.simulatedShare <= 1);
  }

  const shares = sample.provinces.reduce((sum, province) => sum + province.properties.supply_share, 0);
  assert.ok(Math.abs(shares - 1) < 0.01, "the simulated supply shares should add up to a whole delta");

  const months = harvestByMonth(sample);
  assert.equal(months.length, 12);
  assert.ok(months.every((month) => month.value >= 0));
  assert.ok(months.some((month) => month.value > 0), "something is harvested somewhere");
  assert.ok(months.reduce((sum, month) => sum + month.value, 0) > 0);
});
