#!/usr/bin/env node
/**
 * Imports a geospatial file into PostGIS, the way every other pipeline here works.
 *
 *   npm run geodata:report -- --file=range.geojson --slug=lion --kind=habitat_current --source="IUCN" --license=CC-BY --attribution="IUCN (CC BY 4.0)"
 *   npm run geodata:import -- --file=range.geojson … --apply
 *
 * `--report` is the default and prints exactly what would be written, including every row
 * that was refused and why. That is the project rule for anything that mutates data: a dry run
 * first, and the same validation code in both modes - `lib/geodata-import.ts` is the gate the
 * admin page uses too, so the two cannot disagree about what a valid import is.
 *
 * Shapefiles are not read here. A `.shp` needs GDAL, which this runtime does not have; convert
 * to GeoJSON first (`ogr2ogr -f GeoJSON out.geojson in.shp`) and the geometry arrives already
 * checked. Saying so is better than half-parsing a binary format.
 *
 * What it writes is one row per feature, versioned by `source_version`: a re-import adds a
 * version instead of overwriting, so "before and after" stays answerable.
 */

import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { parseImport, validateOptions } from "../lib/geodata-import.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function supabaseConfig() {
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
    signal: AbortSignal.timeout(60_000),
  });

  if (!response.ok) throw new Error(`${init.method ?? "GET"} ${path} failed: ${response.status} ${await response.text()}`);
  return response.status === 204 ? null : response.json().catch(() => null);
}

function parseArgs(argv) {
  const flags = { apply: false };
  for (const arg of argv) {
    if (arg === "--apply") flags.apply = true;
    else if (arg.startsWith("--file=")) flags.file = arg.slice("--file=".length);
    else if (arg.startsWith("--slug=")) flags.slug = arg.slice("--slug=".length);
    else if (arg.startsWith("--kind=")) flags.kind = arg.slice("--kind=".length);
    else if (arg.startsWith("--year=")) flags.year = Number(arg.slice("--year=".length));
    else if (arg.startsWith("--source=")) flags.source = arg.slice("--source=".length);
    else if (arg.startsWith("--source-url=")) flags.sourceUrl = arg.slice("--source-url=".length);
    else if (arg.startsWith("--license=")) flags.license = arg.slice("--license=".length);
    else if (arg.startsWith("--attribution=")) flags.attribution = arg.slice("--attribution=".length);
    else if (arg !== "--report") console.warn(`ignoring unknown argument: ${arg}`);
  }
  return flags;
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
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
      if (!process.env[key]) process.env[key] = value;
    }
  }
}

async function main() {
  await loadEnvFiles();
  const flags = parseArgs(process.argv.slice(2));

  if (!flags.file) {
    console.error(
      "Usage: node scripts/import-geodata.mjs --file=<geojson|csv> --slug=<slug> --kind=<kind> " +
        "--source=<name> --license=<CC0|CC-BY> --attribution=<credit> [--year=<n>] [--apply]",
    );
    process.exitCode = 2;
    return;
  }

  if (!existsSync(flags.file)) {
    console.error(`No such file: ${flags.file}`);
    process.exitCode = 2;
    return;
  }

  if (flags.file.endsWith(".shp") || flags.file.endsWith(".zip")) {
    console.error("Shapefiles are not read here - convert first: ogr2ogr -f GeoJSON out.geojson in.shp");
    process.exitCode = 2;
    return;
  }

  const options = {
    slug: flags.slug ?? "",
    kind: flags.kind ?? "",
    year: Number.isInteger(flags.year) ? flags.year : null,
    source: flags.source ?? "",
    license: flags.license ?? "",
    attribution: flags.attribution ?? "",
    sourceUrl: flags.sourceUrl ?? null,
  };

  const problems = validateOptions(options);
  if (problems.length > 0) {
    console.error(`Refusing to import: ${problems.join("; ")}`);
    process.exitCode = 2;
    return;
  }

  const result = parseImport(readFileSync(flags.file, "utf8"), options);
  console.log(`${basename(flags.file)}: ${result.summary.features} feature(s), ${result.summary.points} point(s), ${result.summary.polygons} polygon(s)`);
  if (result.summary.bounds) {
    const [west, south, east, north] = result.summary.bounds;
    console.log(`  bounds ${west.toFixed(3)},${south.toFixed(3)} .. ${east.toFixed(3)},${north.toFixed(3)}`);
  }

  for (const warning of result.warnings.slice(0, 10)) console.log(`  ! ${warning}`);
  if (result.warnings.length > 10) console.log(`  ! ...and ${result.warnings.length - 10} more`);
  for (const error of result.errors) console.error(`  x ${error}`);

  if (result.errors.length > 0) {
    process.exitCode = 1;
    return;
  }

  if (!flags.apply) {
    console.log("\nDry run - pass --apply to write these rows.");
    return;
  }

  const supabase = supabaseConfig();
  if (!supabase.ready) {
    console.error("--apply needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (see README).");
    process.exitCode = 2;
    return;
  }

  const animals = await rest(supabase, `animals?slug=eq.${encodeURIComponent(options.slug)}&select=id`);
  const animalId = animals?.[0]?.id;
  if (!animalId) throw new Error(`no animals row for ${options.slug} - run "npm run db:seed" first`);

  // A version per import, so a re-import adds rather than overwrites (constraint 4).
  const version = `${options.source.replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase()}-${new Date().toISOString().slice(0, 10)}`;
  const rows = result.features.map((feature) => ({
    animal_id: animalId,
    kind: options.kind,
    year: options.year,
    geometry: feature.geometry,
    source: options.source,
    source_url: options.sourceUrl,
    license: options.license,
    attribution: options.attribution,
    source_version: version,
    properties: { imported: true, from: basename(flags.file), points: result.summary.points },
  }));

  await rest(supabase, "animal_geodata?on_conflict=animal_id,dedupe_key", { method: "POST", body: JSON.stringify(rows) });
  console.log(`\nWrote ${rows.length} row(s) to public.animal_geodata as version ${version}.`);
}

await main();
