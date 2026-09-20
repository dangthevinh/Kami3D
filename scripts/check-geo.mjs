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

import { isLandAt, landBounds, projectLand, projectPoint, unprojectPoint } from "../lib/earth-map.ts";

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
  const calls = { fillRect: [], moveTo: 0, lineTo: 0, closePath: 0, fill: 0, stroke: 0, gradients: 0 };

  const stubContext = {
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
