#!/usr/bin/env node
/**
 * Mirrors the bundled geospatial sample into PostGIS.
 *
 *   npm run geo:seed      # upsert every feature into public.animal_geodata
 *   npm run geo:status    # what the database currently holds
 *
 * `data/animal-geodata.json` is the source of truth and the database is a copy of
 * it, exactly as `data/animals.ts` relates to the `animals` table. That is what keeps a
 * fresh clone (Demo Mode, no keys, no database) able to draw the map.
 *
 * It writes with the **service role** through PostgREST, which is also how
 * `seed-database.mjs` writes once a Management API token is available. GeoJSON goes
 * straight in: PostgREST maps a `geometry` column to and from GeoJSON, so the pipeline
 * never has to build EWKT strings by hand. Every ring is validated with the same
 * helpers the check suite uses before it is sent - the database refuses invalid
 * geometry anyway (`ST_IsValid`), and finding out locally is a better error message.
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { ringIsClosed, ringIsSimple } from "../lib/geo.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const GEOJSON_FILE = join(ROOT, "data", "animal-geodata.json");
const ATTRIBUTION_FILE = join(ROOT, "data", "geodata-attribution.json");

/** The two values `animal_geodata.license` accepts, from an SPDX identifier. */
function licenseColumnValue(spdx) {
  if (spdx === "CC0-1.0" || spdx === "PDM-1.0") return "CC0";
  if (spdx === "CC-BY-4.0") return "CC-BY";
  return null;
}

async function loadEnvFiles() {
  for (const name of [".env.local", ".env"]) {
    const file = join(ROOT, name);
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const separator = trimmed.indexOf("=");
      if (separator === -1) continue;
      const key = trimmed.slice(0, separator).trim();
      let value = trimmed.slice(separator + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  }
}

function config() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "";
  return { url, key, ready: Boolean(url && key) };
}

async function rest(supabase, path, init = {}) {
  const response = await fetch(`${supabase.url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: supabase.key,
      authorization: `Bearer ${supabase.key}`,
      "content-type": "application/json",
      prefer: "resolution=merge-duplicates,return=minimal",
      ...(init.headers ?? {}),
    },
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) throw new Error(`${init.method ?? "GET"} ${path} failed: ${response.status} ${await response.text()}`);
  return response.status === 204 ? null : response.json().catch(() => null);
}

function readBundled() {
  if (!existsSync(GEOJSON_FILE)) throw new Error("data/animal-geodata.json is missing - run: npm run geo:generate");

  const collection = JSON.parse(readFileSync(GEOJSON_FILE, "utf8"));
  const attribution = JSON.parse(readFileSync(ATTRIBUTION_FILE, "utf8"));

  const problems = [];
  for (const feature of collection.features) {
    const ring = feature.geometry.coordinates[0];
    if (!ringIsClosed(ring) || !ringIsSimple(ring)) problems.push(`${feature.properties.slug} (${feature.properties.kind})`);
    if (!attribution[feature.properties.source]) problems.push(`${feature.properties.slug}: no credit for ${feature.properties.source}`);
  }

  if (problems.length > 0) {
    throw new Error(`refusing to upload invalid geometry: ${problems.slice(0, 5).join(", ")}`);
  }

  return { collection, attribution };
}

async function status(supabase) {
  const rows = await rest(supabase, "animal_geodata?select=kind,year,license,source");
  if (!rows || rows.length === 0) {
    console.log("animal_geodata is empty. Run: npm run geo:seed");
    return;
  }

  const byKind = rows.reduce((counts, row) => {
    counts[row.kind] = (counts[row.kind] ?? 0) + 1;
    return counts;
  }, {});

  console.log(`${rows.length} row(s) in public.animal_geodata`);
  for (const [kind, count] of Object.entries(byKind).sort()) console.log(`  ${kind.padEnd(18)} ${count}`);
  console.log(`  licences: ${[...new Set(rows.map((row) => row.license))].sort().join(", ")}`);
  console.log(`  sources:  ${[...new Set(rows.map((row) => row.source))].sort().join(", ")}`);
}

async function seed(supabase) {
  const { collection, attribution } = readBundled();

  const animals = await rest(supabase, "animals?select=id,slug");
  const idBySlug = new Map(animals.map((animal) => [animal.slug, animal.id]));
  const missing = [...new Set(collection.features.map((f) => f.properties.slug))].filter((slug) => !idBySlug.has(slug));

  if (missing.length > 0) {
    throw new Error(`no animals row for: ${missing.join(", ")} - run "npm run db:seed" first`);
  }

  const rows = collection.features.map((feature) => {
    const props = feature.properties;
    const credit = attribution[props.source];
    const license = licenseColumnValue(credit.license);
    if (!license) throw new Error(`${props.source} declares ${credit.license}, which animal_geodata does not accept`);

    return {
      animal_id: idBySlug.get(props.slug),
      kind: props.kind,
      year: props.year,
      // PostgREST maps this straight onto the PostGIS column.
      geometry: feature.geometry,
      source: props.source,
      source_url: props.source_url ?? null,
      license,
      attribution: credit.attribution,
      properties: {
        synthetic: props.synthetic === true,
        note: props.note,
        radius_km: props.radius_km ?? null,
        area_km2: props.area_km2 ?? null,
        region: props.region,
      },
    };
  });

  // One request per batch: PostgREST upserts the whole array, and
  // `on_conflict=animal_id,dedupe_key` makes a re-run an update.
  const batchSize = 50;
  let written = 0;
  for (let index = 0; index < rows.length; index += batchSize) {
    const batch = rows.slice(index, index + batchSize);
    await rest(supabase, "animal_geodata?on_conflict=animal_id,dedupe_key", { method: "POST", body: JSON.stringify(batch) });
    written += batch.length;
  }

  console.log(`Wrote ${written} row(s) to public.animal_geodata.`);
  await status(supabase);
}

async function main() {
  await loadEnvFiles();
  const supabase = config();

  if (!supabase.ready) {
    console.error("Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (see README).");
    process.exitCode = 2;
    return;
  }

  if (process.argv.includes("--status")) await status(supabase);
  else await seed(supabase);
}

await main();
