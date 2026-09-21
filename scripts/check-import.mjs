/**
 * Checks for the geodata import gate.
 *
 * Everything here is a way a real upload goes wrong: a CSV with the wrong header, a latitude
 * column full of counts, a polygon that crosses itself, a file with no attribution. The rule
 * the phase sets is that none of it reaches PostGIS - so none of it may pass this module.
 *
 * Run with: npm run check:import
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import {
  IMPORT_KINDS,
  csvHeader,
  detectCoordinateColumns,
  featuresFromCsv,
  featuresFromGeoJson,
  parseImport,
  validateOptions,
} from "../lib/geodata-import.ts";

const options = {
  slug: "lion",
  kind: "habitat_current",
  year: null,
  source: "Test dataset",
  license: "CC0",
  attribution: "Test dataset (public domain)",
};

test("a header is read the way a spreadsheet writes it", () => {
  assert.deepEqual(csvHeader('"DecimalLatitude","DecimalLongitude",Year'), ["decimallatitude", "decimallongitude", "year"]);
  assert.deepEqual(csvHeader("lat, lon ,name"), ["lat", "lon", "name"]);
});

test("coordinate columns are found by name, and a file without them is refused", () => {
  assert.deepEqual(detectCoordinateColumns(["decimallatitude", "decimallongitude"]), {
    lat: "decimallatitude",
    lng: "decimallongitude",
  });
  assert.deepEqual(detectCoordinateColumns(["lat", "lng"]), { lat: "lat", lng: "lng" });
  assert.deepEqual(detectCoordinateColumns(["y", "x"]), { lat: "y", lng: "x" });
  assert.equal(detectCoordinateColumns(["count", "year"]), null);
  assert.equal(detectCoordinateColumns(["latitude"]), null, "both are needed, and guessing is not allowed");
});

test("a CSV becomes one MultiPoint, with the refused rows named", () => {
  const csv = [
    "decimalLatitude,decimalLongitude,note",
    "51.5074,-0.1278,London",
    "48.8566,2.3522,Paris",
    "not-a-number,2.3522,broken",
    "91,0,off the planet",
    "48.8566,2.3522,duplicate",
  ].join("\n");

  const result = featuresFromCsv(csv, options);

  assert.deepEqual(result.errors, []);
  assert.equal(result.features.length, 1);
  assert.equal(result.features[0].geometry.type, "MultiPoint");
  assert.equal(result.summary.points, 2, "the broken row and the off-planet row are dropped");
  // Two warnings, not three: a duplicate coordinate is de-duplicated silently, because a
  // repeated row is not a mistake that needs explaining.
  assert.equal(result.warnings.length, 2);
  assert.match(result.warnings[0], /Line 4/);
  assert.match(result.warnings[1], /outside the world/);
  assert.deepEqual(result.summary.bounds, [-0.1278, 48.8566, 2.3522, 51.5074]);
});

test("a CSV with no coordinates says which header it read", () => {
  const result = featuresFromCsv("count,year\n1,1990", options);
  assert.equal(result.features.length, 0);
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0], /count, year/);
  assert.equal(featuresFromCsv("only,a,header", options).features.length, 0);
});

test("a polygon is checked the way PostGIS will check it", () => {
  const square = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: { name: "Square" },
        geometry: { type: "Polygon", coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] },
      },
    ],
  };

  const ok = featuresFromGeoJson(JSON.stringify(square), options);
  assert.deepEqual(ok.errors, []);
  assert.deepEqual(ok.warnings, []);
  assert.equal(ok.summary.polygons, 1);
  assert.equal(ok.features[0].properties.slug, "lion");
  assert.equal(ok.features[0].properties.source, "Test dataset");

  const bowtie = JSON.parse(JSON.stringify(square));
  bowtie.features[0].geometry.coordinates = [[[0, 0], [2, 2], [2, 0], [0, 2], [0, 0]]];
  const refused = featuresFromGeoJson(JSON.stringify(bowtie), options);
  assert.equal(refused.features.length, 0);
  assert.match(refused.errors.join(" "), /Every feature was refused/);
  assert.match(refused.warnings.join(" "), /crosses itself/);

  const unclosed = JSON.parse(JSON.stringify(square));
  unclosed.features[0].geometry.coordinates = [[[0, 0], [1, 0], [1, 1], [0, 1]]];
  assert.match(featuresFromGeoJson(JSON.stringify(unclosed), options).warnings.join(" "), /not closed/);
});

test("a path is refused here and pointed at the pipeline that handles it", () => {
  const line = {
    type: "Feature",
    properties: {},
    geometry: { type: "LineString", coordinates: [[0, 0], [1, 1]] },
  };

  const result = featuresFromGeoJson(JSON.stringify(line), options);
  assert.equal(result.features.length, 0);
  assert.match(result.warnings.join(" "), /migrations pipeline/);
});

test("invalid JSON is an error, not an exception", () => {
  const result = featuresFromGeoJson("{not json", options);
  assert.equal(result.features.length, 0);
  assert.match(result.errors[0], /Not valid JSON/);
});

test("the format is decided by the first character", () => {
  const csv = parseImport("lat,lng\n10,20", options);
  assert.equal(csv.summary.points, 1);

  const json = parseImport(JSON.stringify({ type: "Point", coordinates: [20, 10] }), options);
  assert.equal(json.summary.points, 1);
  assert.equal(json.features[0].geometry.type, "Point");

  assert.match(parseImport("   ", options).errors[0], /Nothing to import/);
});

test("options are validated before any parsing happens", () => {
  assert.deepEqual(validateOptions(options), []);

  const bad = validateOptions({ ...options, slug: "Lion!", kind: "habitat", year: 12000, license: "CC-BY-NC", attribution: "x", source: "" });
  assert.equal(bad.length, 6, bad.join(" | "));
  assert.ok(bad.some((problem) => problem.includes("slug")));
  assert.ok(bad.some((problem) => problem.includes("kind")));
  assert.ok(bad.some((problem) => problem.includes("year")));
  assert.ok(bad.some((problem) => problem.includes("licence")));
  assert.ok(bad.some((problem) => problem.includes("attribution")));
  assert.ok(bad.some((problem) => problem.includes("source")));

  // A file that fails on options never even gets parsed.
  const refused = parseImport("lat,lng\n10,20", { ...options, license: "CC-BY-NC" });
  assert.equal(refused.features.length, 0);
  assert.equal(refused.errors.length, 1);
});

test("every kind the importer accepts is a kind the database accepts", () => {
  assert.deepEqual([...IMPORT_KINDS].sort(), ["habitat_current", "habitat_historic", "occurrence", "protected_area"]);
  for (const kind of IMPORT_KINDS) assert.deepEqual(validateOptions({ ...options, kind }), []);
});
