/**
 * The Data2Map samples, served at runtime instead of bundled at build time.
 *
 *   node --test scripts/check-data2map-samples.mjs
 *
 * ## What this file is guarding
 *
 * Every product page used to \`import\` its GeoJSON. A page module is part of the build's module
 * graph, so each \`next build\` parsed 430 kB of data that only a browser ever draws - it went into the
 * server chunk, into the webpack persistent cache, and whole into the prerendered HTML. The samples
 * are now read from disk by \`/api/data2map/sample/[dataset]\` and fetched by the client.
 *
 * Three things can silently undo that, and each one is a test below:
 *
 *   1. **A page importing the JSON again.** Nothing would fail - the page would simply get slower and
 *      the build heavier again, which is exactly the kind of regression no compiler catches. The
 *      pages are read as text and asserted to be free of the import.
 *   2. **A dataset name reaching a filesystem path.** The id is a key into a typed record; no request
 *      value is ever joined onto \`data/\`. \`../\` and a case variant are both refused.
 *   3. **The readers being bypassed.** Moving a file out of the build must not move it out of the
 *      rules that were written for it, so each sample is re-parsed here with the same reader the
 *      route uses, and each reader is shown still refusing a tampered file.
 *
 * The route itself is asserted from its source: it belongs to Next, not to this process, and its
 * cache header is a deployment decision worth pinning (Data2Map is admin-only until launch, so the
 * only cache it may allow is the visitor's own browser).
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import {
  DATA2MAP_SAMPLE_FILES,
  DATA2MAP_SAMPLE_IDS,
  isData2MapSampleId,
  parseData2MapSample,
} from "../lib/data2map/sample-files.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(join(ROOT, path), "utf8");
const rawOf = (id) => JSON.parse(read(join("data", DATA2MAP_SAMPLE_FILES[id])));

/** The pages that used to import a sample, and the loader each one now renders instead. */
const MIGRATED_PAGES = [
  ["app/data2map/agriculture/page.tsx", "AgricultureExperienceLoader"],
  ["app/data2map/trends/page.tsx", "TrendsExperienceLoader"],
  ["app/data2map/logistics/page.tsx", "LogisticsExperienceLoader"],
  ["app/data2map/twin/page.tsx", "TwinExperienceLoader"],
  ["app/data2map/real-estate/page.tsx", "RealEstateExperienceLoader"],
];

test("every dataset has a file on disk that its own reader accepts", () => {
  assert.deepEqual(
    [...DATA2MAP_SAMPLE_IDS].sort(),
    ["agriculture", "logistics", "real-estate", "trends"],
    "the four products D2, D3, D4 and D6 draw are the four files there are",
  );
  assert.deepEqual(Object.keys(DATA2MAP_SAMPLE_FILES).sort(), [...DATA2MAP_SAMPLE_IDS].sort());

  for (const id of DATA2MAP_SAMPLE_IDS) {
    const file = join(ROOT, "data", DATA2MAP_SAMPLE_FILES[id]);
    assert.ok(existsSync(file), id + " names a file that is not in data/");
    const sample = parseData2MapSample(id, rawOf(id));
    assert.ok(sample && typeof sample === "object", id + " parsed into nothing");
  }
});

test("a parsed sample is the sample, not a wrapper around it", () => {
  const agriculture = parseData2MapSample("agriculture", rawOf("agriculture"));
  assert.ok(agriculture.fields.length > 0);
  assert.equal(agriculture.collection.type, "FeatureCollection");

  const logistics = parseData2MapSample("logistics", rawOf("logistics"));
  assert.ok(logistics.depots.length > 0 && logistics.stops.length > 0);

  const trends = parseData2MapSample("trends", rawOf("trends"));
  assert.ok(trends.collection.features.length >= 100);

  const realEstate = parseData2MapSample("real-estate", rawOf("real-estate"));
  assert.equal(realEstate.collection.features.length, rawOf("real-estate").features.length);
  assert.ok(Number.isFinite(realEstate.area.west));
  assert.ok(realEstate.attribution.length > 20, "the file must say who to credit");
});

test("a dataset name is a key, never a path", () => {
  for (const value of ["..", "../secrets", "agriculture/../trends", "AGRICULTURE", "agriculture ", "", "/etc/passwd", null, 7, {}]) {
    assert.equal(isData2MapSampleId(value), false, JSON.stringify(value) + " must not name a dataset");
  }
  for (const id of DATA2MAP_SAMPLE_IDS) assert.equal(isData2MapSampleId(id), true);

  // And the names themselves are plain files in data/, with no separators to escape with.
  for (const id of DATA2MAP_SAMPLE_IDS) {
    const file = DATA2MAP_SAMPLE_FILES[id];
    assert.match(file, /^[a-z0-9-]+\.json$/, file + " is not a plain file name");
  }
});

test("moving the read out of the build did not move it out of the readers", () => {
  const tampered = {
    agriculture: (raw) => {
      delete raw.properties.rasterSources;
      return raw;
    },
    trends: (raw) => {
      delete raw.features[0].properties.synthetic;
      return raw;
    },
    logistics: (raw) => {
      delete raw.features[0].properties.synthetic;
      return raw;
    },
    "real-estate": (raw) => {
      delete raw.properties.area;
      return raw;
    },
  };

  for (const id of DATA2MAP_SAMPLE_IDS) {
    const broken = tampered[id](rawOf(id));
    assert.throws(
      () => parseData2MapSample(id, broken),
      (error) => error instanceof Error && error.message.length > 20,
      id + ": a file that has lost the thing that made it honest was accepted",
    );
  }
});

test("the real-estate sample is finally read, not cast", () => {
  const raw = rawOf("real-estate");
  const sample = parseData2MapSample("real-estate", raw);
  assert.deepEqual(sample.area, raw.properties.area);

  const notANumber = JSON.parse(JSON.stringify(raw));
  notANumber.properties.area.west = "somewhere west";
  assert.throws(() => parseData2MapSample("real-estate", notANumber), /area\.west is not a number/);

  assert.throws(() => parseData2MapSample("real-estate", { type: "FeatureCollection", features: [] }), /no features/);
  assert.throws(() => parseData2MapSample("real-estate", []), /not a FeatureCollection/);
});

test("no page imports a sample any more, and every page renders its loader", () => {
  for (const [page, loader] of MIGRATED_PAGES) {
    const source = read(page);
    assert.ok(
      !/from "@\/data\/data2map-[a-z-]+\.json"/.test(source),
      page + " imports its dataset again: the build pays for that file a second time",
    );
    assert.ok(source.includes(loader), page + " does not render " + loader);
    assert.ok(/export const dynamic = "force-static"/.test(source), page + " stopped being a static route");
  }
});

test("the samples are served dynamically, and only to the visitor who asked", () => {
  const route = read("app/api/data2map/sample/[dataset]/route.ts");
  assert.match(route, /export const dynamic = "force-dynamic"/, "a build must not bake the sample in again");
  assert.match(route, /export const runtime = "nodejs"/, "reading a file needs the Node runtime");
  assert.match(route, /isData2MapSampleId\(dataset\)/, "the route must recognise its own ids");
  assert.match(route, /"cache-control": "private, max-age=/, "a shared cache could hand an admin-only sample to a stranger");
  assert.ok(!/path\.join\([^)]*dataset/.test(route), "the request must not reach the filesystem path");
  assert.ok(!/readFile/.test(route), "the route reads through sample-source.ts, which memoises and validates");
});
