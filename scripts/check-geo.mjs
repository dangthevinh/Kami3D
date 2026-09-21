/**
 * Assertions for the world geography behind the globe.
 *
 * The risky part is not the data — it is the projection and the point-in-polygon
 * test. If either is wrong, Africa lands in the Pacific and nobody notices until a
 * human looks at the sphere. So the real continents are checked against real
 * coordinates: cities that must be on land, ocean points that must not be.
 *
 * Run with: npm run check:geo
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { ANIMALS } from "../data/animals.ts";
import { isLandAt, landBounds, projectLand, projectPoint, unprojectPoint } from "../lib/earth-map.ts";
import {
  boundsOf,
  envelopeRing,
  expandBounds,
  fromLngLat,
  fromLngLatRing,
  isValidLngLat,
  ringAreaKm2,
  ringIsClosed,
  ringIsSimple,
  toLngLat,
  toLngLatRing,
} from "../lib/geo.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const data = JSON.parse(readFileSync(join(root, "public", "geo", "land-110m.json"), "utf8"));

test("the dataset is present, public domain and non-trivial", () => {
  assert.ok(data.polygons.length > 100, `expected >100 rings, found ${data.polygons.length}`);
  assert.match(data.license, /public domain/i);
  const points = data.polygons.reduce((sum, ring) => sum + ring.length, 0);
  assert.ok(points > 4000, `expected >4000 coordinates, found ${points}`);
});

test("every ring is closed and within valid coordinates", () => {
  for (const [index, ring] of data.polygons.entries()) {
    assert.ok(ring.length >= 4, `ring ${index} has only ${ring.length} points`);
    const [firstLon, firstLat] = ring[0];
    const [lastLon, lastLat] = ring[ring.length - 1];
    assert.ok(
      Math.abs(firstLon - lastLon) < 0.02 && Math.abs(firstLat - lastLat) < 0.02,
      `ring ${index} is not closed`,
    );
    for (const [lon, lat] of ring) {
      assert.ok(lon >= -180.001 && lon <= 180.001, `ring ${index} longitude out of range: ${lon}`);
      assert.ok(lat >= -90.001 && lat <= 90.001, `ring ${index} latitude out of range: ${lat}`);
    }
  }
});

test("the data spans the whole world", () => {
  const bounds = landBounds(data);
  assert.ok(bounds.west <= -179 && bounds.east >= 179, `longitude span is ${bounds.west}..${bounds.east}`);
  assert.ok(bounds.south <= -85, `southern extent is only ${bounds.south}`);
  assert.ok(bounds.north >= 83, `northern extent is only ${bounds.north}`);
});

test("projection round-trips exactly", () => {
  for (const [lon, lat] of [
    [-180, 90],
    [0, 0],
    [13.4, 52.5],
    [151.2, -33.9],
    [180, -90],
  ]) {
    const [x, y] = projectPoint(lon, lat, 2048, 1024);
    const [backLon, backLat] = unprojectPoint(x, y, 2048, 1024);
    assert.ok(Math.abs(backLon - lon) < 1e-9, `longitude drifted: ${lon} -> ${backLon}`);
    assert.ok(Math.abs(backLat - lat) < 1e-9, `latitude drifted: ${lat} -> ${backLat}`);
  }
});

test("projection puts the cardinal points where a texture needs them", () => {
  const [x0, y0] = projectPoint(-180, 90, 2048, 1024);
  assert.deepEqual([x0, y0], [0, 0], "north-west corner must be the texture origin");
  const [x1, y1] = projectPoint(180, -90, 2048, 1024);
  assert.deepEqual([x1, y1], [2048, 1024], "south-east corner must be the texture end");
  const [xc] = projectPoint(0, 0, 2048, 1024);
  assert.equal(xc, 1024, "the prime meridian must sit at the texture centre");
});

test("real cities are on land", () => {
  const cities = {
    Paris: [2.35, 48.86],
    Cairo: [31.24, 30.04],
    "New York": [-74.01, 40.71],
    "São Paulo": [-46.63, -23.55],
    Nairobi: [36.82, -1.29],
    Sydney: [151.21, -33.87],
    Tokyo: [139.69, 35.69],
    Delhi: [77.21, 28.61],
    Beijing: [116.4, 39.9],
    Moscow: [37.62, 55.75],
    Lima: [-77.04, -12.05],
    Anchorage: [-149.9, 61.22],
  };

  const missing = Object.entries(cities)
    .filter(([, [lon, lat]]) => !isLandAt(data, lon, lat))
    .map(([name]) => name);

  assert.deepEqual(missing, [], `these cities fell in the sea: ${missing.join(", ")}`);
});

test("open ocean is not land", () => {
  const ocean = {
    "mid-Pacific": [-140, 0],
    "mid-Atlantic": [-30, 20],
    "Indian Ocean": [75, -30],
    "Southern Ocean": [0, -60],
    "Arctic Ocean": [0, 88],
    "North Atlantic": [-40, 50],
    "South Pacific": [-120, -40],
  };

  const wrong = Object.entries(ocean)
    .filter(([, [lon, lat]]) => isLandAt(data, lon, lat))
    .map(([name]) => name);

  assert.deepEqual(wrong, [], `these ocean points were treated as land: ${wrong.join(", ")}`);
});

test("land covers roughly three tenths of the surface", () => {
  // Sample an equal-area grid: longitude steps shrink with the cosine of latitude,
  // otherwise the poles dominate and the figure is meaningless.
  let land = 0;
  let total = 0;

  for (let lat = -88; lat <= 88; lat += 2) {
    for (let lon = -180; lon < 180; lon += 2) {
      total += 1;
      if (isLandAt(data, lon, lat)) land += 1;
    }
  }

  const fraction = land / total;
  assert.ok(fraction > 0.25 && fraction < 0.36, `land fraction is ${(fraction * 100).toFixed(1)}%, expected ~29%`);
});

test("the texture renderer covers the canvas and traces every landmass", async () => {
  // A recording stub stands in for a real canvas, so the drawing *code* is
  // exercised here too — the data being right is not the same as the renderer
  // using it.
  const calls = { fillRect: [], moveTo: 0, lineTo: 0, closePath: 0, fill: 0, stroke: 0, gradients: 0, clip: 0, filters: 0 };

  const stubContext = {
    // Depth tiers blur their strokes and the relief pass is clipped to the land;
    // both are recorded so the test can prove the renderer actually used them.
    clip: () => {
      calls.clip += 1;
    },
    set filter(value) {
      if (typeof value === "string" && value !== "none") calls.filters += 1;
    },
    get filter() {
      return "none";
    },
    createLinearGradient: () => {
      calls.gradients += 1;
      return { addColorStop: () => {} };
    },
    fillRect: (...args) => calls.fillRect.push(args),
    beginPath: () => {},
    moveTo: () => {
      calls.moveTo += 1;
    },
    lineTo: () => {
      calls.lineTo += 1;
    },
    closePath: () => {
      calls.closePath += 1;
    },
    fill: () => {
      calls.fill += 1;
    },
    stroke: () => {
      calls.stroke += 1;
    },
    save: () => {},
    restore: () => {},
  };

  globalThis.document = {
    createElement: (tag) => {
      if (tag !== "canvas") throw new Error(`unexpected element: ${tag}`);
      return { width: 0, height: 0, getContext: () => stubContext };
    },
  };

  const { createEarthCanvas } = await import("../lib/earth-texture.ts");

  // Without the graticule, every subpath belongs to land, so the counts are exact.
  const landOnly = createEarthCanvas(data, { width: 2048, graticule: false });
  assert.equal(landOnly.width, 2048, "texture width");
  assert.equal(landOnly.height, 1024, "equirectangular textures are always half as tall");

  assert.equal(calls.fillRect.length, 1, "the ocean should fill the canvas exactly once");
  assert.deepEqual(calls.fillRect[0], [0, 0, 2048, 1024], "the ocean must cover the whole texture");
  assert.equal(calls.moveTo, data.polygons.length, "every ring should start exactly one subpath");
  assert.ok(calls.lineTo > 4000, `expected every coordinate to be traced, got ${calls.lineTo}`);
  assert.equal(calls.closePath, data.polygons.length, "every ring should be closed");
  assert.ok(calls.fill >= 1, "land must be filled");
  assert.ok(calls.gradients >= 2, "ocean and land should use gradients");
  assert.equal(calls.clip, 1, "the relief pass is clipped to the land so it cannot darken the ocean");
  // One blur for the depth tiers (shared by both strokes) and one for the relief.
  assert.ok(calls.filters >= 2, `depth tiers and relief should blur, got ${calls.filters} filter passes`);

  const strokesWithoutGrid = calls.stroke;
  const subpathsWithoutGrid = calls.moveTo;

  // A second render starts from scratch on its own canvas, so it traces the whole
  // land again plus the lattice: 25 meridians (-180..180 step 15), 11 parallels
  // (-75..75 step 15) and the equator.
  const GRATICULE_LINES = 37;
  createEarthCanvas(data, { width: 2048, graticule: true });
  assert.equal(
    calls.moveTo - subpathsWithoutGrid,
    data.polygons.length + GRATICULE_LINES,
    "the second render traces its own land plus the graticule",
  );
  assert.ok(calls.stroke > strokesWithoutGrid, "the graticule should add strokes");
  assert.equal(calls.fillRect.length, 2, "each render fills its own ocean exactly once");

  // A ceiling-tier render skips both expensive passes, which is the whole point of
  // having them as options: the cheap texture has to stay cheap.
  const before = { stroke: calls.stroke, clip: calls.clip, filters: calls.filters, fillRect: calls.fillRect.length };
  createEarthCanvas(data, { width: 512, graticule: false, depth: false, relief: false, coastlineGlow: false });
  assert.equal(calls.clip, before.clip, "no clipping without relief");
  assert.equal(calls.filters, before.filters, "no blur passes without depth or relief");
  // One stroke only: the coastline itself. No shelf, no slope, no glow.
  assert.equal(calls.stroke, before.stroke + 1, "the cheap tier draws the coastline and nothing else");
  assert.equal(calls.fillRect.length, before.fillRect + 1, "the ocean still fills");

  delete globalThis.document;
});

test("projected rings stay inside the texture", () => {
  const width = 2048;
  const height = 1024;
  for (const [index, ring] of projectLand(data, width, height).entries()) {
    for (const [x, y] of ring) {
      assert.ok(x >= -0.01 && x <= width + 0.01, `ring ${index} x out of texture: ${x}`);
      assert.ok(y >= -0.01 && y <= height + 0.01, `ring ${index} y out of texture: ${y}`);
    }
  }
});

/* -------------------------------------------------------------------------- */
/* Phase 13: coordinate order, ring validity, and the bundled geodata          */
/* -------------------------------------------------------------------------- */

const geodata = JSON.parse(readFileSync(join(root, "data", "animal-geodata.json"), "utf8"));
const geodataAttribution = JSON.parse(readFileSync(join(root, "data", "geodata-attribution.json"), "utf8"));
const schema = readFileSync(join(root, "supabase", "schema.sql"), "utf8");

test("the two coordinate orders convert both ways, and the order matters", () => {
  // London. Written as a LatLng object, read as a tuple: if either converter ever
  // swapped its arguments the map would still render - in Kazakhstan.
  const london = { lat: 51.5074, lng: -0.1278 };
  assert.deepEqual(toLngLat(london), [-0.1278, 51.5074]);
  assert.deepEqual(fromLngLat([-0.1278, 51.5074]), london);
  assert.deepEqual(fromLngLat(toLngLat(london)), london);

  // A point in the wrong order is NOT the same point: the trap this module exists for.
  assert.notDeepEqual(toLngLat(london), [51.5074, -0.1278]);
  assert.ok(isValidLngLat(toLngLat(london)));
  assert.equal(isValidLngLat([200, 10]), false);
  assert.equal(isValidLngLat([10, 91]), false);
  assert.equal(isValidLngLat([Number.NaN, 10]), false);
  assert.equal(isValidLngLat([10]), false);
});

test("ring conversion keeps every vertex, including the closing one", () => {
  const ring = [
    { lat: 0, lng: 0 },
    { lat: 0, lng: 1 },
    { lat: 1, lng: 1 },
    { lat: 1, lng: 0 },
    { lat: 0, lng: 0 },
  ];

  const converted = toLngLatRing(ring);
  assert.equal(converted.length, ring.length);
  assert.deepEqual(converted[0], [0, 0]);
  assert.deepEqual(converted[2], [1, 1]);
  assert.deepEqual(fromLngLatRing(converted), ring);
  assert.ok(ringIsClosed(converted));
});

test("bounds cover every point and ignore nonsense", () => {
  const bounds = boundsOf([[-0.1278, 51.5074], [2.3522, 48.8566], [999, 5]]);
  assert.deepEqual(bounds, { west: -0.1278, east: 2.3522, south: 48.8566, north: 51.5074 });
  assert.equal(boundsOf([]), null);
  assert.equal(boundsOf([[999, 999]]), null);

  const wider = expandBounds(bounds, 0.5);
  assert.ok(wider.west < bounds.west && wider.east > bounds.east);
  assert.ok(wider.south < bounds.south && wider.north > bounds.north);
  assert.deepEqual(expandBounds(bounds, 0), bounds);
});

test("a ring is only closed when it returns to its first vertex", () => {
  const square = [[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]];
  assert.ok(ringIsClosed(square));
  assert.equal(ringIsClosed([[0, 0], [1, 0], [1, 1], [0, 1]]), false, "unclosed");
  assert.equal(ringIsClosed([[0, 0], [1, 1], [0, 0]]), false, "too few vertices");
});

test("a self-intersecting ring is caught, not drawn", () => {
  const square = [[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]];
  // A bow tie: the two diagonals cross, and PostGIS ST_IsValid would refuse it.
  const bowtie = [[0, 0], [2, 2], [2, 0], [0, 2], [0, 0]];

  assert.ok(ringIsSimple(square));
  assert.equal(ringIsSimple(bowtie), false);
});

test("area is spherical, so a degree is not a fixed number of kilometres", () => {
  const atEquator = ringAreaKm2([[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]);
  const nearPole = ringAreaKm2([[0, 70], [1, 70], [1, 71], [0, 71], [0, 70]]);

  // 1 degree x 1 degree at the equator is about 12 300 km2 (111.32 x 110.57).
  assert.ok(Math.abs(atEquator - 12308) / 12308 < 0.01, `equatorial square was ${Math.round(atEquator)} km2`);
  assert.ok(nearPole < atEquator, "the same degree span is a smaller area nearer the pole");
  assert.equal(ringAreaKm2([[0, 0], [1, 1]]), 0, "a line encloses nothing");
});

test("the envelope generator is deterministic and always produces a valid ring", () => {
  const anchor = { lat: -12, lng: -60 };
  const first = envelopeRing(anchor, { radiusKm: 400, points: 18, seed: 7 });
  const again = envelopeRing(anchor, { radiusKm: 400, points: 18, seed: 7 });
  const different = envelopeRing(anchor, { radiusKm: 400, points: 18, seed: 8 });

  assert.deepEqual(first, again, "the same seed must produce the same ring: the file is committed");
  assert.notDeepEqual(first, different, "a different seed must move at least one vertex");
  assert.equal(first.length, 19, "18 vertices plus the closing one");
  assert.ok(ringIsClosed(first) && ringIsSimple(first));
  for (const point of first) assert.ok(isValidLngLat(point), `invalid point ${point}`);

  // A wider envelope must cover a wider area.
  const small = ringAreaKm2(envelopeRing(anchor, { radiusKm: 200, points: 18, seed: 7 }));
  const large = ringAreaKm2(envelopeRing(anchor, { radiusKm: 800, points: 18, seed: 7 }));
  assert.ok(large > small * 10, `800 km should cover far more than 200 km: ${Math.round(small)} vs ${Math.round(large)}`);

  // The poles clamp instead of wrapping past 90 degrees.
  const polar = envelopeRing({ lat: 89, lng: 0 }, { radiusKm: 600, points: 12, seed: 3 });
  assert.ok(polar.every((point) => Math.abs(point[1]) <= 90));
});

test("the bundled geodata is valid, labelled as synthetic, and fits its own kinds", () => {
  const kinds = new Set(["habitat_current", "habitat_historic", "protected_area", "occurrence"]);
  const slugs = new Set(ANIMALS.map((animal) => animal.slug));
  const problems = [];

  assert.equal(geodata.type, "FeatureCollection");
  assert.ok(geodata.features.length >= ANIMALS.length, "every species needs at least one envelope");

  for (const feature of geodata.features) {
    const props = feature.properties;
    const ring = feature.geometry.coordinates[0];

    if (feature.geometry.type !== "Polygon") problems.push(`${props.slug}: not a Polygon`);
    if (!kinds.has(props.kind)) problems.push(`${props.slug}: unknown kind ${props.kind}`);
    if (!slugs.has(props.slug)) problems.push(`${props.slug}: not in the catalogue`);
    if (props.synthetic !== true) problems.push(`${props.slug}: not labelled synthetic`);
    if (typeof props.note !== "string" || props.note.length < 20) problems.push(`${props.slug}: no note`);
    if (!geodataAttribution[props.source]) problems.push(`${props.slug}: source ${props.source} has no credit`);
    if (props.license !== "CC0") problems.push(`${props.slug}: unexpected licence ${props.license}`);
    if (!ringIsClosed(ring) || !ringIsSimple(ring)) problems.push(`${props.slug}: invalid ring`);
    if (!ring.every(isValidLngLat)) problems.push(`${props.slug}: out-of-range coordinate`);
    if (props.year !== null && !Number.isInteger(props.year)) problems.push(`${props.slug}: bad year`);
  }

  assert.deepEqual(problems, [], problems.slice(0, 6).join(" | "));

  // The file ships inside the map route, so its size is part of the budget.
  const bytes = readFileSync(join(root, "data", "animal-geodata.json")).length;
  assert.ok(bytes < 48 * 1024, `bundled geodata is ${(bytes / 1024).toFixed(0)} KB - trim it before it ships`);
});

test("the geodata kinds and licences match the CHECK constraints in schema.sql", () => {
  const table = schema.slice(schema.indexOf("create table if not exists public.animal_geodata"));
  const kindCheck = table.match(/kind\s+text not null check \(kind in \(([^)]*)\)\)/i)?.[1] ?? "";
  const declaredKinds = [...kindCheck.matchAll(/'([a-z_]+)'/g)].map((entry) => entry[1]).sort();

  assert.deepEqual(declaredKinds, ["habitat_current", "habitat_historic", "occurrence", "protected_area"]);
  assert.ok(/license\s+text not null check \(license in \('CC0', 'CC-BY'\)\)/.test(table), "geodata licence CHECK drifted");

  // Every kind the bundled data uses must be one the database accepts.
  const used = [...new Set(geodata.features.map((feature) => feature.properties.kind))];
  for (const kind of used) assert.ok(declaredKinds.includes(kind), `bundled data uses ${kind}, which the CHECK rejects`);
});

