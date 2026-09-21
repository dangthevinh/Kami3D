#!/usr/bin/env node
/**
 * Migration routes, derived from the observation record.
 *
 *   npm run migrations:report                 # what each species would produce
 *   npm run migrations:fetch -- --apply       # store the ones that look like migration
 *
 * ## What this is, and what it is not
 *
 * There is no open dataset of tracked migration paths for these species. There *is* an open
 * record of where they have been seen, with dates: GBIF. So the route here is the **monthly
 * centroid of the usable observations** - the mean position of the species in January, in
 * February, and so on - joined into a line.
 *
 * That is a real, reproducible derivation with a citable source, and it is not a flight path:
 * it is where observers were, averaged. The attribution says exactly that, and the UI repeats
 * it, because a pretty animated arc is very easy to mistake for telemetry.
 *
 * A species is only stored when the derivation actually looks like movement: at least four
 * months with enough records, and a route longer than the threshold below. A resident species
 * with a wandering centroid is reported as such and skipped.
 *
 * The licence filter is the same as `fetch-geodata.mjs`: CC0 and CC BY only, per record.
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { ANIMALS } from "../data/animals.ts";
import { distanceKm, routeLengthKm } from "../lib/migration.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const USER_AGENT = "Kami3D-migration-fetcher/1.0 (+https://github.com/dangthevinh/Kami3D)";
const REQUEST_DELAY_MS = 250;

/** The species this pipeline is worth running for: they move, and the catalogue has them. */
const MIGRATORY = ["blue-whale", "bald-eagle", "monarch-butterfly", "great-white-shark", "emperor-penguin", "gray-wolf", "green-anaconda"];

/** Below this, the centroid is wandering rather than migrating. */
const MIN_ROUTE_KM = 400;
const MIN_STOPS = 4;
const MIN_RECORDS_PER_MONTH = 5;

const GBIF_LICENSES = ["CC0_1_0", "CC_BY_4_0"];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchJson(url) {
  const response = await fetch(url, { headers: { accept: "application/json", "user-agent": USER_AGENT }, signal: AbortSignal.timeout(45_000) });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText} for ${url}`);
  return response.json();
}

function licenseOk(url) {
  if (typeof url !== "string") return false;
  return url.includes("publicdomain/zero") || url.includes("/by/4.0") || url.includes("/licenses/by/");
}

/**
 * The mean position of a set of points, on the sphere.
 *
 * Longitude is averaged as a vector, not as a number: a blue whale that spends one month at
 * 170°E and the next at 170°W is not in the Atlantic.
 */
export function centroid(points) {
  if (points.length === 0) return null;

  let x = 0;
  let y = 0;
  let lat = 0;

  for (const [lng, pointLat] of points) {
    const radians = (lng * Math.PI) / 180;
    x += Math.cos(radians);
    y += Math.sin(radians);
    lat += pointLat;
  }

  return [Math.round(((Math.atan2(y, x) * 180) / Math.PI) * 1e4) / 1e4, Math.round((lat / points.length) * 1e4) / 1e4];
}

/**
 * How scattered a month was, in kilometres, averaged over the months that are kept.
 *
 * This is the honesty metric. A monarch butterfly's monthly cluster is tight and moves,
 * so the spread is small next to the route; a blue whale is everywhere at once, so its
 * "route" is the centroid of a global distribution walking around. The number is stored
 * with the route and shown in the UI, because a reader who sees route 26 000 km and spread
 * 4 000 km can tell which of the two they are looking at.
 */
export function meanSpreadKm(byMonth, stops) {
  if (stops.length === 0) return 0;

  let total = 0;
  let counted = 0;

  for (const stop of stops) {
    const points = byMonth.get(stop.month) ?? [];
    if (points.length === 0) continue;

    let sum = 0;
    for (const point of points) sum += distanceKm(point, stop.coordinates);
    total += sum / points.length;
    counted += 1;
  }

  return counted === 0 ? 0 : Math.round(total / counted);
}

/**
 * The route from monthly groups.
 *
 * Months are ordered January to December and thin months are dropped, so a gap in the record
 * becomes a gap in the line rather than a straight jump through the middle of a continent.
 */
export function buildRoute(byMonth, { minRecords = MIN_RECORDS_PER_MONTH } = {}) {
  const stops = [];

  for (let month = 1; month <= 12; month += 1) {
    const points = byMonth.get(month) ?? [];
    if (points.length < minRecords) continue;

    const centre = centroid(points);
    if (!centre) continue;
    stops.push({ month, records: points.length, coordinates: centre });
  }

  if (stops.length < MIN_STOPS) return { stops, route: null, reason: `only ${stops.length} month(s) with enough records` };

  const route = stops.map((stop) => stop.coordinates);
  const km = routeLengthKm(route);
  if (km < MIN_ROUTE_KM) return { stops, route: null, reason: `a ${Math.round(km)} km path - that is wandering, not migration` };

  return { stops, route, km };
}

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
  const flags = { apply: process.argv.includes("--apply"), limit: 2000 };
  const animals = ANIMALS.filter((animal) => MIGRATORY.includes(animal.slug));
  const supabase = flags.apply ? supabaseConfig() : null;

  if (flags.apply && !supabase.ready) {
    console.error("--apply needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (see README).");
    process.exitCode = 2;
    return;
  }

  let stored = 0;

  for (const animal of animals) {
    try {
      const match = await fetchJson(`https://api.gbif.org/v1/species/match?name=${encodeURIComponent(animal.latin_name)}`);
      if (!match?.usageKey) {
        console.log(`? ${animal.slug}: no GBIF match`);
        continue;
      }

      const byMonth = new Map();
      let refused = 0;

      for (let offset = 0; offset < flags.limit; offset += 300) {
        const url = new URL("https://api.gbif.org/v1/occurrence/search");
        url.searchParams.set("taxonKey", String(match.usageKey));
        url.searchParams.set("hasCoordinate", "true");
        url.searchParams.set("hasGeospatialIssue", "false");
        url.searchParams.set("limit", "300");
        url.searchParams.set("offset", String(offset));
        for (const licence of GBIF_LICENSES) url.searchParams.append("license", licence);

        const page = await fetchJson(url);
        const results = page.results ?? [];
        if (results.length === 0) break;

        for (const record of results) {
          if (!licenseOk(record.license) || !Number.isInteger(record.month)) {
            refused += 1;
            continue;
          }
          if (!byMonth.has(record.month)) byMonth.set(record.month, []);
          byMonth.get(record.month).push([Number(record.decimalLongitude), Number(record.decimalLatitude)]);
        }

        if (page.endOfRecords) break;
        await sleep(REQUEST_DELAY_MS);
      }

      const { stops, route, km, reason } = buildRoute(byMonth);
      const spreadKm = route ? meanSpreadKm(byMonth, stops) : 0;

      if (!route) {
        console.log(`- ${animal.slug}: no route (${reason})`);
        continue;
      }

      const coherence = spreadKm > 0 ? km / spreadKm : Number.POSITIVE_INFINITY;
      console.log(
        `→ ${animal.slug}: ${stops.length} monthly stops, ${Math.round(km).toLocaleString("en-US")} km route, ` +
          `${spreadKm.toLocaleString("en-US")} km spread (${coherence.toFixed(1)}x), ` +
          `${stops.reduce((sum, stop) => sum + stop.records, 0)} records, ${refused} refused on licence or date`,
      );

      if (!flags.apply) {
        console.log("   (dry run - add --apply to store it)");
        continue;
      }

      const rows = await rest(supabase, `animals?slug=eq.${encodeURIComponent(animal.slug)}&select=id`);
      const animalId = rows?.[0]?.id;
      if (!animalId) throw new Error(`no animals row for ${animal.slug} - run "npm run db:seed" first`);

      await rest(supabase, "migration_routes?on_conflict=animal_id,dedupe_key", {
        method: "POST",
        body: JSON.stringify([
          {
            animal_id: animalId,
            // The derivation has no season to speak of: it is the whole year, month by month.
            season: "year-round",
            geometry: { type: "LineString", coordinates: route },
            stops,
            source: "gbif-monthly-centroids",
            source_url: `https://www.gbif.org/occurrence/search?taxon_key=${match.usageKey}`,
            license: "CC-BY",
            attribution:
              `Monthly centroids of GBIF observations (${new Date().toISOString().slice(0, 10)}) - CC0 / CC BY 4.0 - ` +
              "a derived path, not a tracked migration route.",
            properties: {
              method: "Mean position of the usable records in each calendar month, joined in order. Longitude is averaged as a vector.",
              taxon_key: match.usageKey,
              months: stops.map((stop) => stop.month),
              records: stops.reduce((sum, stop) => sum + stop.records, 0),
              length_km: Math.round(km),
              mean_spread_km: spreadKm,
              // Route length over spread: a tight cluster that moves scores high, a global
              note: "Where observers were, averaged by month. Not telemetry, and not a published route.",
            },
          },
        ]),
      });

      stored += 1;
    } catch (error) {
      console.error(`   ${animal.slug}: ${error.message}`);
    }

    await sleep(REQUEST_DELAY_MS);
  }

  console.log(`\n${stored} route(s) stored.`);
  if (!flags.apply) console.log("Run with --apply to store them in public.migration_routes.");
}

if (process.argv[1] && process.argv[1].endsWith("fetch-migrations.mjs")) {
  await main();
}
