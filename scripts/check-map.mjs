/**
 * Checks for the map query codec and the map layer catalogue.
 *
 * The map is the one screen whose state is *shared*: the URL is the API. A parser that
 * accepts garbage, or a serialiser that drops a filter, produces a link that opens
 * something other than what the sender saw - and unlike a broken layout, nobody notices
 * until someone else opens the link.
 *
 * Run with: npm run check:map
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import {
  DEFAULT_LAYER_OPACITY,
  DEFAULT_LAYER_VISIBILITY,
  EMPTY_MAP_QUERY,
  MAP_LAYERS,
  MAP_LAYER_IDS,
  isDefaultMapQuery,
  parseMapQuery,
  serializeMapQuery,
  visibilityFor,
} from "../lib/map-query.ts";
import { DEFAULT_MAP_STYLE_URL, MAP_ATTRIBUTION, mapStyleUrl } from "../lib/map-style.ts";
import { REGIONS } from "../types/animal.ts";

test("every layer has a unique id, a label and a hint", () => {
  assert.ok(MAP_LAYERS.length >= 4);
  assert.equal(new Set(MAP_LAYER_IDS).size, MAP_LAYERS.length, "two layers share an id");

  for (const layer of MAP_LAYERS) {
    assert.match(layer.id, /^[a-z]+$/, `${layer.id} is not URL-safe`);
    assert.ok(layer.label.length > 2, `${layer.id} has no label`);
    assert.ok(layer.hint.length > 10, `${layer.id} has no hint - a toggle nobody can interpret is a guess`);
    // Provenance is not decoration: a layer drawn without a source and a licence is a claim
    // without a citation, and the panel prints both.
    assert.ok(layer.source.length > 3, `${layer.id} does not say where its data comes from`);
    assert.ok(layer.license.length > 2, `${layer.id} does not state a licence`);
    if (layer.unavailable) {
      assert.ok(layer.unavailable.length > 20, `${layer.id} is unavailable without saying why`);
    }
  }

  // The two layers with no usable source are present and explained, not hidden.
  const unavailable = MAP_LAYERS.filter((layer) => layer.unavailable).map((layer) => layer.id);
  assert.deepEqual(unavailable, ["protected"]);
});

test("defaults exist for every layer, and only habitat starts on", () => {
  for (const id of MAP_LAYER_IDS) {
    assert.equal(typeof DEFAULT_LAYER_VISIBILITY[id], "boolean");
    assert.ok(DEFAULT_LAYER_OPACITY[id] > 0 && DEFAULT_LAYER_OPACITY[id] <= 1, `${id} opacity out of range`);
  }

  const on = MAP_LAYER_IDS.filter((id) => DEFAULT_LAYER_VISIBILITY[id]);
  assert.deepEqual(on, ["habitat"]);
});

test("a query round-trips through the URL unchanged", () => {
  const query = { layers: ["habitat", "occurrence"], region: "Africa", species: "lion" };
  const search = serializeMapQuery(query);

  assert.match(search, /^\?/);
  assert.deepEqual(parseMapQuery(search), query);
  assert.deepEqual(parseMapQuery(serializeMapQuery(EMPTY_MAP_QUERY)), EMPTY_MAP_QUERY);
});

test("the default view is an empty query, so a plain link stays plain", () => {
  assert.equal(serializeMapQuery(EMPTY_MAP_QUERY), "");
  assert.equal(isDefaultMapQuery(EMPTY_MAP_QUERY), true);
  assert.equal(isDefaultMapQuery({ layers: [], region: "Asia", species: null }), false);
  assert.equal(parseMapQuery("").layers.length, 0);
  assert.equal(parseMapQuery("?").region, null);
});

test("nonsense in the URL is dropped, not thrown", () => {
  const parsed = parseMapQuery("?layers=habitat,../../etc/passwd,HABITAT,habitat&region=Narnia&species=");

  assert.deepEqual(parsed.layers, ["habitat"], "only known layers, and only once");
  assert.equal(parsed.region, null, "an unknown region is not a filter");
  assert.equal(parsed.species, null, "an empty species is not a species");

  // A species id longer than any slug is dropped rather than rendered.
  assert.equal(parseMapQuery(`?species=${"x".repeat(80)}`).species, null);
  assert.equal(parseMapQuery("?species=lion").species, "lion");
});

test("every region the catalogue uses is a region the URL accepts", () => {
  for (const region of REGIONS) {
    const query = { layers: [], region, species: null };
    assert.equal(parseMapQuery(serializeMapQuery(query)).region, region);
  }
});

test("layer order in the URL is preserved, so a shared link is stable", () => {
  const query = { layers: ["occurrence", "habitat"], region: null, species: null };
  const search = serializeMapQuery(query);
  assert.match(search, /layers=occurrence%2Chabitat|layers=occurrence,habitat/);
  assert.deepEqual(parseMapQuery(search).layers, ["occurrence", "habitat"]);
});

test("a query implies visibility: naming layers replaces the defaults", () => {
  assert.deepEqual(visibilityFor(EMPTY_MAP_QUERY), DEFAULT_LAYER_VISIBILITY);

  const onlyOccurrence = visibilityFor({ layers: ["occurrence"], region: null, species: null });
  assert.equal(onlyOccurrence.occurrence, true);
  assert.equal(onlyOccurrence.habitat, false, "a query that names a layer means *only* that layer");
  assert.equal(Object.keys(onlyOccurrence).length, MAP_LAYER_IDS.length);
});

test("the map style needs no key, and can be overridden", () => {
  assert.match(DEFAULT_MAP_STYLE_URL, /^https:\/\//);
  assert.equal(mapStyleUrl(), DEFAULT_MAP_STYLE_URL, "with no env var, the keyless default is used");

  // Mapbox is the option this rules out: a token in the URL would break Demo Mode.
  assert.ok(!DEFAULT_MAP_STYLE_URL.includes("mapbox"), "the default style must not need an account");
  assert.ok(!/access_token=/.test(DEFAULT_MAP_STYLE_URL));
});

test("the attribution names the tile provider and the data licence", () => {
  assert.ok(MAP_ATTRIBUTION.name.length > 2);
  assert.match(MAP_ATTRIBUTION.data, /OpenStreetMap/);
  assert.ok(MAP_ATTRIBUTION.license.length > 2, "a tile source without its licence stated is not credited");
});
