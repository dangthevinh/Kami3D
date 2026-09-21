#!/usr/bin/env node
/**
 * Builds the Data2Map footfall sample: `data/data2map-trends.json`.
 *
 *   node scripts/fetch-trends.mjs --report     # what it would fetch, no network writes
 *   node scripts/fetch-trends.mjs --apply      # fetch the missing hexes and write the file
 *   node scripts/fetch-trends.mjs --refresh    # refetch every hex, ignoring the file on disk
 *   node scripts/fetch-trends.mjs --check      # fail if the file is out of date (CI, offline)
 *
 * ## The two halves, and why they are split
 *
 * **Population is real.** WorldPop publishes 100 m gridded population counts under CC BY 4.0,
 * and their statistics service answers a *polygon* with the population inside it - no key, no
 * tile pipeline, no raster in this repository. So every hex in this grid carries a real count
 * from WorldPop for 2020, fetched once here and committed.
 *
 * **Hourly footfall is simulated, and says so.** No open dataset of hourly footfall exists for
 * Vietnam; the people who measure it sell it. So each hex also carries an invented
 * `footfall_index` derived from the real density, a distance-to-centre decay and deterministic
 * noise. The feature carries both provenances separately and the page prints them separately,
 * because a simulated number sitting in the same row as a real one is exactly how a demo starts
 * lying.
 *
 * ## Resumable on purpose
 *
 * The statistics service takes about a second per polygon, so `--apply` reuses the population
 * already in the file for hexes it has seen and fetches only what is missing. Run it again after
 * an interruption and it continues rather than starting over.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { area, hexGrid } from "@turf/turf";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_FILE = join(ROOT, "data", "data2map-trends.json");

/** Ho Chi Minh City, the same window the real-estate sample uses. */
const AREA = { west: 106.62, south: 10.7, east: 106.87, north: 10.86 };
const CENTRE = { lng: 106.703, lat: 10.776 };

/** 1 km cells: fine enough to read a high street, coarse enough to stay a few hundred calls. */
const CELL_SIDE_KM = 1;

const POPULATION = {
  source: "WorldPop",
  license: "CC BY 4.0",
  licenseLabel: "CC BY 4.0",
  url: "https://www.worldpop.org",
  dataset: "wpgppop",
  year: 2020,
  attribution: "WorldPop 2020, 100 m gridded population (CC BY 4.0), summed per hex through the WorldPop statistics API.",
};

const FOOTFALL = {
  source: "Kami3D synthetic",
  license: "CC0",
  note: "Simulated hourly footfall index. No open dataset of hourly footfall exists for Vietnam; this is the shape of a city, not a measurement.",
};

const NOTE =
  "Population is real: WorldPop 2020 (CC BY 4.0), summed per hex. The footfall index on the same " +
  "feature is simulated (CC0) and labelled as such wherever it is drawn.";

const STATS_URL = "https://api.worldpop.org/v1/services/stats";

/** Deterministic noise, so regenerating the file is a no-op in git. */
function noise(seed, index) {
  const value = Math.sin(seed * 12.9898 + index * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function seedFrom(text) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash % 1000);
}

const rad = Math.PI / 180;

function distanceKm(a, b) {
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}

const round = (value, places = 5) => Number(value.toFixed(places));

/** The hex grid, with the centre and area of every cell. Regenerating it is deterministic. */
export function buildGrid() {
  const grid = hexGrid([AREA.west, AREA.south, AREA.east, AREA.north], CELL_SIDE_KM, { units: "kilometers" });

  return grid.features.map((hex, index) => {
    const ring = hex.geometry.coordinates[0];
    const lng = ring.reduce((sum, point) => sum + point[0], 0) / ring.length;
    const lat = ring.reduce((sum, point) => sum + point[1], 0) / ring.length;

    return {
      id: `t${index}`,
      centre: { lng, lat },
      areaKm2: area(hex) / 1_000_000,
      geometry: {
        type: "Polygon",
        coordinates: [ring.map(([x, y]) => [round(x), round(y)])],
      },
    };
  });
}

/**
 * The simulated half: an index, 0-100, built from the real density, the distance to the centre
 * and a deterministic wobble. A logistic curve rather than a straight line, because footfall
 * rises steeply once a place is dense enough to walk between shops and then flattens.
 */
export function footfallIndex(densityPerKm2, kmFromCentre, id) {
  const densityTerm = 100 / (1 + Math.exp(-(Math.log10(Math.max(densityPerKm2, 0) + 1) - 3.35) * 1.7));
  const centreTerm = 16 * Math.exp(-kmFromCentre / 3.5);
  const wobble = (noise(seedFrom(id), id.length) - 0.5) * 14;

  return Math.max(0, Math.min(100, Math.round(densityTerm * 0.8 + centreTerm + wobble)));
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * One hex's population, through the **asynchronous** path.
 *
 * The synchronous form of this service (`runasync=false`) answers inline, and it took about a
 * hundred seconds per polygon once a few dozen were in flight - a four-hour run. Submitting the
 * job and polling its task is roughly twenty-five seconds for four hexes, and it is what the
 * service was built for.
 *
 * Throws on anything that is not a finished, numeric answer; the caller retries the whole cycle.
 */
export async function fetchPopulation(polygon, year = POPULATION.year) {
  const submit = await fetch(
    `${STATS_URL}?dataset=${POPULATION.dataset}&year=${year}&geojson=${encodeURIComponent(JSON.stringify(polygon))}`,
    { signal: AbortSignal.timeout(120_000) },
  );
  if (!submit.ok) throw new Error(`HTTP ${submit.status}`);

  const created = await submit.json();
  if (created.error) throw new Error(created.message ?? "the service refused the polygon");

  // The synchronous answer is accepted too: a small polygon sometimes comes back finished.
  const answer = created.status === "finished" ? created : await pollTask(created.taskid);
  const total = Number(answer.data?.total_population);
  if (!Number.isFinite(total)) throw new Error("no total_population in the answer");
  return total;
}

async function pollTask(taskid, attempts = 100) {
  if (typeof taskid !== "string") throw new Error("the service did not return a task id");

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    await sleep(3000);

    const response = await fetch(`https://api.worldpop.org/v1/tasks/${taskid}`, { signal: AbortSignal.timeout(30_000) });
    if (!response.ok) throw new Error(`task HTTP ${response.status}`);

    const task = await response.json();
    if (task.status === "finished") return task;
    if (task.status === "failed" || task.error) throw new Error(task.error_message ?? "the task failed");
  }

  throw new Error(`task ${taskid} did not finish in five minutes`);
}

async function fetchWithRetry(polygon, attempts = 4) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await fetchPopulation(polygon);
    } catch (error) {
      if (attempt >= attempts) throw error;
      await sleep(2000 * attempt);
    }
  }
}

/** One hex as a feature: the real count and the simulated index, each with its own provenance. */
function featureFor(hex, population) {
  const densityPerKm2 = population / hex.areaKm2;
  const km = distanceKm(hex.centre, CENTRE);

  return {
    type: "Feature",
    properties: {
      layer: "trends",
      hex_id: hex.id,
      lng: round(hex.centre.lng),
      lat: round(hex.centre.lat),
      area_km2: Math.round(hex.areaKm2 * 1000) / 1000,
      population: Math.round(population),
      population_source: POPULATION.source,
      population_license: POPULATION.license,
      population_year: POPULATION.year,
      density_per_km2: Math.round(densityPerKm2),
      distance_km: Math.round(km * 100) / 100,
      footfall_index: footfallIndex(densityPerKm2, km, hex.id),
      footfall_source: FOOTFALL.source,
      footfall_license: FOOTFALL.license,
      synthetic: true,
      note: FOOTFALL.note,
    },
    geometry: hex.geometry,
  };
}

/** The file's envelope: where it came from, and what each half of it is. */
function collectionFor(features) {
  return {
    type: "FeatureCollection",
    properties: {
      area: AREA,
      centre: CENTRE,
      cellSideKm: CELL_SIDE_KM,
      note: NOTE,
      attribution: `${POPULATION.attribution} Simulated footfall index by Kami3D (CC0).`,
      provenance: {
        population: {
          source: POPULATION.source,
          license: POPULATION.license,
          licenseLabel: POPULATION.licenseLabel,
          url: POPULATION.url,
          year: POPULATION.year,
          method: `${POPULATION.dataset} per hex through api.worldpop.org/v1/services/stats`,
        },
        footfall: {
          source: FOOTFALL.source,
          license: FOOTFALL.license,
          licenseLabel: "CC0 1.0",
          synthetic: true,
          note: FOOTFALL.note,
        },
      },
    },
    features,
  };
}

function readExisting() {
  if (!existsSync(OUT_FILE)) return new Map();
  try {
    const parsed = JSON.parse(readFileSync(OUT_FILE, "utf8"));
    const year = parsed?.properties?.provenance?.population?.year ?? POPULATION.year;
    return new Map(
      (parsed.features ?? [])
        .filter((feature) => typeof feature.properties?.population === "number" && year === POPULATION.year)
        .map((feature) => [feature.properties.hex_id, feature.properties.population]),
    );
  } catch {
    return new Map();
  }
}

async function apply({ refresh, report }) {
  const grid = buildGrid();
  const cached = refresh ? new Map() : readExisting();
  const todo = grid.filter((hex) => !cached.has(hex.id));

  console.log(`${grid.length} hex(es) over ${(AREA.east - AREA.west).toFixed(2)}x${(AREA.north - AREA.south).toFixed(2)} degrees`);
  console.log(`${cached.size} population value(s) reused from ${OUT_FILE.replace(ROOT + "/", "")}, ${todo.length} to fetch`);

  if (report) {
    const sample = grid[0];
    console.log(`first hex ${sample.id} at ${sample.centre.lng.toFixed(4)},${sample.centre.lat.toFixed(4)} — ${sample.areaKm2.toFixed(2)} km2`);
    console.log("Nothing fetched: --report only describes the work.");
    return;
  }

  const populations = new Map(cached);
  const failures = [];
  let done = 0;

  /** The grid as it stands, written to disk as the run goes: an interrupted run resumes from here. */
  const writeNow = (partial) => {
    const features = grid
      .filter((hex) => typeof populations.get(hex.id) === "number")
      .map((hex) => featureFor(hex, populations.get(hex.id)));

    writeFileSync(
      OUT_FILE,
      `${JSON.stringify({ ...collectionFor(features), properties: { ...collectionFor(features).properties, partial } })}\n`,
    );
  };

  // Four at a time.
  //
  // Sixteen submissions produced 22 answers and 48 failures in twenty minutes: the tasks queue
  // server-side, a sixteen-deep queue outlives this script's poll window, and a timed-out task
  // looks exactly like a failed one. Four is slower per round and finishes, which is the trade this
  // run wants - and it stays resumable, so a second pass only asks for what is still missing.
  const queue = [...todo];
  const workers = Array.from({ length: 4 }, async () => {
    for (;;) {
      const hex = queue.shift();
      if (!hex) return;

      try {
        const population = await fetchWithRetry(hex.geometry);
        populations.set(hex.id, population);
      } catch (error) {
        failures.push(`${hex.id}: ${error.message}`);
        if (failures.length <= 20) process.stdout.write(`\n  failed ${hex.id}: ${error.message}\n`);
      }

      done += 1;
      if (done % 10 === 0) {
        writeNow(true);
        process.stdout.write(`  ${done}/${todo.length}\r`);
      }
    }
  });

  await Promise.all(workers);
  process.stdout.write("\n");

  // A file that is 90% real and 10% missing is worse than no file: it would render as if the
  // empty hexes had nobody in them.
  if (failures.length > todo.length * 0.1) {
    console.error(`${failures.length} of ${todo.length} hex(es) could not be fetched:`);
    for (const failure of failures.slice(0, 10)) console.error(`  ${failure}`);
    throw new Error("too many failures to write an honest population layer");
  }

  const features = grid.map((hex) => {
    const population = populations.get(hex.id);
    if (typeof population !== "number") throw new Error(`${hex.id} has no population after the run`);
    return featureFor(hex, population);
  });

  const collection = { ...collectionFor(features), properties: { ...collectionFor(features).properties, partial: false } };
  writeFileSync(OUT_FILE, `${JSON.stringify(collection)}\n`);
  const total = features.reduce((sum, feature) => sum + feature.properties.population, 0);
  console.log(`Wrote ${features.length} hex(es) to ${OUT_FILE.replace(ROOT + "/", "")}`);
  console.log(`Population in the window: ${total.toLocaleString("en-US")} (WorldPop ${POPULATION.year})`);
}

/** Offline structural check for CI: the grid is regenerable and every hex is fully attributed. */
async function check() {
  const grid = buildGrid();
  const parsed = JSON.parse(readFileSync(OUT_FILE, "utf8"));
  const problems = [];

  if (parsed.features?.length !== grid.length) {
    problems.push(`the file has ${parsed.features?.length} hex(es), the grid has ${grid.length} - rerun npm run trends:fetch`);
  }

  for (const [index, hex] of grid.entries()) {
    const feature = parsed.features?.[index];
    if (!feature) break;
    if (feature.properties?.hex_id !== hex.id) problems.push(`hex ${index} is ${feature.properties?.hex_id}, expected ${hex.id}`);
    const [lng, lat] = feature.geometry.coordinates[0][0];
    const [wantLng, wantLat] = hex.geometry.coordinates[0][0];
    if (Math.abs(lng - wantLng) > 1e-5 || Math.abs(lat - wantLat) > 1e-5) problems.push(`${hex.id} geometry does not match the grid`);
    if (!Number.isFinite(feature.properties?.population)) problems.push(`${hex.id} has no population`);
    if (!Number.isFinite(feature.properties?.footfall_index)) problems.push(`${hex.id} has no footfall index`);
    if (feature.properties?.synthetic !== true) problems.push(`${hex.id} does not declare its simulated half`);
  }

  if (parsed.properties?.partial !== false) {
    problems.push("the file is a partial checkpoint - rerun npm run trends:fetch to finish it");
  }

  for (const key of ["population", "footfall"]) {
    if (!parsed.properties?.provenance?.[key]) problems.push(`the file does not record the ${key} provenance`);
  }

  if (problems.length > 0) throw new Error(problems.join("\n"));

  const populations = parsed.features.map((feature) => feature.properties.population);
  console.log(`${parsed.features.length} hex(es), population ${Math.min(...populations).toLocaleString("en-US")} - ${Math.max(...populations).toLocaleString("en-US")}, all attributed`);
}

const argv = process.argv.slice(2);
const mode = argv.includes("--check") ? "check" : argv.includes("--report") ? "report" : "apply";

try {
  if (mode === "check") await check();
  else await apply({ refresh: argv.includes("--refresh"), report: mode === "report" });
} catch (error) {
  console.error(`fetch-trends: ${error.message}`);
  process.exitCode = 1;
}
