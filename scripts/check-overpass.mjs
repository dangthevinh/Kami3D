/**
 * Checks for the shared Overpass client.
 *
 * Two pages draw real OpenStreetMap data through this module, so the parts worth pinning are the
 * ones a silent bug would turn into a wrong map: the bounding-box guard (a view too large is
 * refused, not clamped), the query string itself, and the element-to-GeoJSON step that drops
 * anything without a coordinate or a known kind.
 *
 * Run with: npm run check:overpass
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import {
  OVERPASS_ATTRIBUTION,
  OVERPASS_ENDPOINTS,
  overpassQuery,
  readBounds,
  toPointFeatures,
} from "../lib/overpass.ts";
import { TREND_CATEGORIES } from "../lib/data2map/footfall.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const bounds = { west: 106.62, south: 10.7, east: 106.87, north: 10.86 };

test("the query is bounded, asks for centres and caps the answer", () => {
  const query = overpassQuery(['node["amenity"="cafe"]'], bounds);

  assert.ok(query.startsWith("[out:json][timeout:20];("));
  assert.ok(query.includes('node["amenity"="cafe"](10.7,106.62,10.86,106.87);'), "Overpass wants south,west,north,east");
  assert.ok(query.endsWith("out center 800;"), "a way has no coordinate of its own");
  assert.ok(overpassQuery(['node["a"="b"]'], bounds, 50).endsWith("out center 50;"));
});

test("a query with no selectors is a mistake, not an empty layer", () => {
  assert.throws(() => overpassQuery([], bounds), /at least one selector/);
});

test("a view too large for somebody else's server is refused, not clamped", () => {
  const params = (values) => new URLSearchParams(values);

  assert.deepEqual(readBounds(params({ west: "106.6", south: "10.7", east: "106.8", north: "10.9" }), 0.25), {
    ok: true,
    bounds: { west: 106.6, south: 10.7, east: 106.8, north: 10.9 },
  });

  assert.equal(readBounds(params({ west: "106.6", south: "10.7", east: "106.8" }), 0.25).status, 400);
  assert.equal(readBounds(params({ west: "106.8", south: "10.7", east: "106.6", north: "10.9" }), 0.25).status, 400);
  assert.equal(readBounds(params({ west: "100", south: "5", east: "110", north: "25" }), 0.25).status, 413);
  assert.equal(readBounds(params({ west: "a", south: "b", east: "c", north: "d" }), 0.25).status, 400);
});

test("elements become points, and unreadable ones are dropped", () => {
  const elements = [
    { id: 1, lat: 10.78, lon: 106.7, tags: { amenity: "cafe", name: "The Workshop" } },
    { id: 2, center: { lat: 10.79, lon: 106.71 }, tags: { amenity: "cafe", cuisine: "bubble_tea" } },
    { id: 3, tags: { amenity: "cafe" } }, // a way with no centre in the answer
    { id: 4, lat: 10.8, lon: 106.72, tags: { amenity: "nightclub" } }, // not a kind we draw
    { id: 5, lat: 10.81, lon: 106.73, tags: {} },
  ];

  const features = toPointFeatures(
    elements,
    (tags) => (tags.amenity === "cafe" ? "cafe" : null),
    (tags) => ({ cuisine: tags.cuisine ?? null }),
  );

  assert.equal(features.length, 2);
  assert.deepEqual(features[0].geometry.coordinates, [106.7, 10.78]);
  assert.equal(features[0].properties.name, "The Workshop");
  assert.equal(features[0].properties.osm_id, 1);
  assert.equal(features[0].properties.kind, "cafe");
  assert.deepEqual(features[1].geometry.coordinates, [106.71, 10.79], "a centre is a coordinate too");
  assert.equal(features[1].properties.cuisine, "bubble_tea");
});

test("a nameless place is null, not the string \"undefined\"", () => {
  const [feature] = toPointFeatures([{ id: 9, lat: 10.78, lon: 106.7, tags: { amenity: "cafe" } }], () => "cafe");
  assert.equal(feature.properties.name, null);
});

test("the mirror list is configuration, and the shared client is the only one", () => {
  assert.ok(OVERPASS_ENDPOINTS.length >= 3, "one endpoint and it is a single point of failure");
  for (const endpoint of OVERPASS_ENDPOINTS) assert.match(endpoint, /^https:\/\//);
  assert.ok(OVERPASS_ATTRIBUTION.includes("OpenStreetMap"));

  for (const route of ["app/api/data2map/amenities/route.ts", "app/api/data2map/pois/route.ts"]) {
    const source = readFileSync(join(root, route), "utf8");
    assert.ok(source.includes("overpassQuery"), `${route} does not use the shared query builder`);
    assert.ok(source.includes("readBounds"), `${route} does not use the shared bounding-box guard`);
    assert.ok(!source.includes("api/interpreter"), `${route} should not keep its own endpoint list`);
  }
});

test("the trends endpoint can ask for every category the page offers", () => {
  const source = readFileSync(join(root, "app/api/data2map/pois/route.ts"), "utf8");
  for (const category of TREND_CATEGORIES) {
    assert.ok(new RegExp(`\\b${category}:`).test(source), `${category} has no Overpass selector`);
  }
  assert.ok(source.includes('shop"="bakery'), "a bakery is a shop, not an amenity");
});
