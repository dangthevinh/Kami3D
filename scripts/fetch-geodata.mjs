#!/usr/bin/env node
/**
 * Real observation data, from GBIF, with the licence checked before anything is stored.
 *
 *   npm run geo:report                      # what is available per species, nothing written
 *   npm run geo:fetch -- --species=lion --apply
 *   npm run geo:fetch -- --all --apply      # every species with a usable match
 *
 * ## Why this is not a bulk download
 *
 * GBIF holds 16 654 lion records and only **3 500** of them may be used here: the rest are
 * CC BY-NC, and this site carries advertising. The same is true across the catalogue, so the
 * search is filtered by licence at the source (`license=CC0_1_0&license=CC_BY_4_0`) *and*
 * every record is checked again before it is kept. That is the Phase 9 lesson applied to
 * geography: check the licence per record, record it with the data, and report what was
 * refused rather than finding out later.
 *
 * What is stored is not the raw record set but a **MultiPoint per species**: the map draws a
 * density heatmap, and 16 000 individual points would cost more than it shows. The properties
 * keep the honest counts - how many records were available, how many were usable, over which
 * years, from how many datasets - so the UI can say what the layer actually is.
 *
 * GBIF asks to be cited. `attribution` carries the query URL and the date it was run, which is
 * what makes the credit reproducible rather than decorative.
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { ANIMALS } from "../data/animals.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const USER_AGENT = "Kami3D-geodata-fetcher/1.0 (+https://github.com/dangthevinh/Kami3D)";
const REQUEST_DELAY_MS = 250;
const PAGE_SIZE = 300;

/** The two licences `animal_geodata.license` accepts, in GBIF's enum spelling. */
const GBIF_LICENSES = {
  CC0_1_0: { column: "CC0", label: "CC0 1.0" },
  CC_BY_4_0: { column: "CC-BY", label: "CC BY 4.0" },
};

/** Record-level licence URLs, which are what actually arrive in the payload. */
function licenseFromUrl(url) {
  if (typeof url !== "string") return null;
  if (url.includes("publicdomain/zero") || url.includes("/zero/")) return GBIF_LICENSES.CC0_1_0;
  if (url.includes("/by/4.0") || url.includes("/licenses/by/")) return GBIF_LICENSES.CC_BY_4_0;
  return null;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchJson(url) {
  const response = await fetch(url, { headers: { accept: "application/json", "user-agent": USER_AGENT }, signal: AbortSignal.timeout(45_000) });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText} for ${url}`);
  return response.json();
}

/** Resolves a species to a GBIF taxon key, or null with the reason. */
export async function gbifMatch(animal) {
  for (const term of [animal.latin_name, animal.name]) {
    const match = await fetchJson(`https://api.gbif.org/v1/species/match?name=${encodeURIComponent(term)}`);
    if (match?.usageKey) return { usageKey: match.usageKey, scientificName: match.scientificName, matchedOn: term, confidence: match.confidence ?? null };
  }
  return null;
}

function searchUrl(usageKey, { limit, offset = 0, years, licensedOnly = true }) {
  const url = new URL("https://api.gbif.org/v1/occurrence/search");
  url.searchParams.set("taxonKey", String(usageKey));
  url.searchParams.set("hasCoordinate", "true");
  url.searchParams.set("hasGeospatialIssue", "false");
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("offset", String(offset));
  if (years) url.searchParams.set("year", years);
  // The filter is the point: GBIF will not hand back a record this site may not use.
  if (licensedOnly) for (const key of Object.keys(GBIF_LICENSES)) url.searchParams.append("license", key);
  return url;
}

async function counts(usageKey, years) {
  const [all, usable] = await Promise.all([
    fetchJson(searchUrl(usageKey, { limit: 0, years, licensedOnly: false })),
    fetchJson(searchUrl(usageKey, { limit: 0, years, licensedOnly: true })),
  ]);
  return { all: all.count ?? 0, usable: usable.count ?? 0 };
}

/**
 * Up to `limit` usable records, as one MultiPoint plus the counts the UI needs.
 *
 * Coordinates are rounded to four decimals (~11 m) before de-duplication: two records from
 * the same reserve are the same dot on a heatmap, and thinning them keeps the payload small
 * without pretending there is more precision than a heatmap can show.
 */
/**
 * Splits a year window into equal buckets.
 *
 * GBIF returns the newest records first, so asking for "the first 400 since 1980" returns
 * four hundred records from the last two years - which would draw a heatmap of recent
 * birdwatching, not of where a species lives. Sampling each bucket instead spreads the
 * points across the archive, and the year range stored with them then tells the truth
 * about what is on screen.
 */
export function yearBuckets(years, count = 4) {
  const [from, to] = String(years).split(",").map(Number);
  if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from || count < 1) return [years];

  const span = Math.ceil((to - from + 1) / count);
  const buckets = [];
  for (let start = from; start <= to; start += span) {
    buckets.push(`${start},${Math.min(to, start + span - 1)}`);
  }
  return buckets;
}

export async function collectOccurrences(usageKey, { limit, years, buckets = 4 }) {
  const points = [];
  const seen = new Set();
  const datasets = new Map();
  const countries = new Set();
  const licenceCounts = { CC0: 0, "CC-BY": 0 };
  let yearMin = null;
  let yearMax = null;
  let refused = 0;
  let examined = 0;

  const windows = yearBuckets(years, buckets);
  const perWindow = Math.max(20, Math.ceil(limit / windows.length));
  /** Records kept per year window - the only honest source of a trend from a sample. */
  const perBucket = [];

  for (const window of windows) {
    for (let offset = 0; offset < perWindow; offset += PAGE_SIZE) {
      const page = await fetchJson(
        searchUrl(usageKey, { limit: Math.min(PAGE_SIZE, perWindow - offset), offset, years: window }),
      );
      const results = page.results ?? [];
      if (results.length === 0) break;
      const before = points.length;

      for (const record of results) {
      examined += 1;
      const licence = licenseFromUrl(record.license);
      if (!licence) {
        refused += 1;
        continue;
      }

      const lng = Math.round(Number(record.decimalLongitude) * 1e4) / 1e4;
      const lat = Math.round(Number(record.decimalLatitude) * 1e4) / 1e4;
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
        refused += 1;
        continue;
      }

      const key = `${lng},${lat}`;
      if (seen.has(key)) continue;
      seen.add(key);
      points.push([lng, lat]);

      licenceCounts[licence.column] += 1;
      if (record.datasetKey) datasets.set(record.datasetKey, (datasets.get(record.datasetKey) ?? 0) + 1);
      if (record.countryCode) countries.add(record.countryCode);
        if (Number.isInteger(record.year)) {
          yearMin = yearMin === null ? record.year : Math.min(yearMin, record.year);
          yearMax = yearMax === null ? record.year : Math.max(yearMax, record.year);
        }
      }

      perBucket.push({
        from: Number(window.split(",")[0]),
        to: Number(window.split(",")[1]),
        records: points.length - before,
      });

      if (page.endOfRecords) break;
      await sleep(REQUEST_DELAY_MS);
    }
  }

  // Mixed licences are stored as the stricter of the two: CC BY obliges attribution and
  // CC0 does not, so a row that contains both is a row that has to be credited.
  const license = licenceCounts["CC-BY"] > 0 ? "CC-BY" : "CC0";

  return {
    points,
    perBucket,
    examined,
    refused,
    license,
    licenceCounts,
    datasets: [...datasets.entries()].sort((a, b) => b[1] - a[1]),
    countryCount: countries.size,
    yearMin,
    yearMax,
    queryUrl: searchUrl(usageKey, { limit, years }).toString(),
  };
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

function parseArgs(argv) {
  const flags = { species: [], all: false, apply: false, limit: 400, years: "1980,2026" };
  for (const arg of argv) {
    if (arg === "--all") flags.all = true;
    else if (arg === "--apply") flags.apply = true;
    else if (arg.startsWith("--species=")) flags.species.push(arg.slice("--species=".length));
    else if (arg.startsWith("--limit=")) flags.limit = Math.min(3000, Math.max(50, Number(arg.slice("--limit=".length)) || 400));
    else if (arg.startsWith("--years=")) flags.years = arg.slice("--years=".length);
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
  const animals = flags.all ? ANIMALS : ANIMALS.filter((animal) => flags.species.includes(animal.slug));

  if (animals.length === 0) {
    console.error("Nothing to do: pass --all or --species=<slug>.");
    process.exitCode = 2;
    return;
  }

  const supabase = flags.apply ? supabaseConfig() : null;
  if (flags.apply && !supabase.ready) {
    console.error("--apply needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (see README).");
    process.exitCode = 2;
    return;
  }

  let stored = 0;
  let skipped = 0;

  for (const animal of animals) {
    try {
      const match = await gbifMatch(animal);
      if (!match) {
        console.log(`? ${animal.slug}: no GBIF taxon match`);
        skipped += 1;
        continue;
      }

      const availability = await counts(match.usageKey, flags.years);
      if (availability.usable === 0) {
        console.log(`✘ ${animal.slug}: ${availability.all} records, none this site may use (all NC/ND/unknown)`);
        skipped += 1;
        continue;
      }

      const collected = await collectOccurrences(match.usageKey, { limit: flags.limit, years: flags.years });
      const ratio = availability.all > 0 ? Math.round((availability.usable / availability.all) * 100) : 0;

      console.log(
        `→ ${animal.slug}: ${collected.points.length} points from ${collected.examined} examined ` +
          `(${availability.usable}/${availability.all} usable, ${ratio}%) · ${collected.datasets.length} dataset(s) · ` +
          `${collected.license} · ${collected.yearMin ?? "?"}-${collected.yearMax ?? "?"}`,
      );

      if (!flags.apply) {
        console.log("   (dry run - add --apply to store it)");
        continue;
      }

      const animals_ = await rest(supabase, `animals?slug=eq.${encodeURIComponent(animal.slug)}&select=id`);
      const animalId = animals_?.[0]?.id;
      if (!animalId) throw new Error(`no animals row for ${animal.slug} - run "npm run db:seed" first`);

      const top = collected.datasets.slice(0, 5).map(([key]) => `https://www.gbif.org/dataset/${key}`);
      await rest(supabase, "animal_geodata?on_conflict=animal_id,dedupe_key", {
        method: "POST",
        body: JSON.stringify([
          {
            animal_id: animalId,
            kind: "occurrence",
            year: null,
            geometry: { type: "MultiPoint", coordinates: collected.points },
            source: "gbif-occurrence-search",
            source_url: collected.queryUrl,
            license: collected.license,
            attribution:
              `GBIF.org occurrence search (${new Date().toISOString().slice(0, 10)}) - ` +
              `${collected.datasets.length} dataset(s), ${collected.license} - ${top.join(" ")}`,
            properties: {
              records: collected.points.length,
              available: availability.all,
              usable: availability.usable,
              refused: collected.refused,
              datasets: collected.datasets.slice(0, 5).map(([key, count]) => ({ key, records: count })),
              countries: collected.countryCount,
              year_min: collected.yearMin,
              year_max: collected.yearMax,
              licence_counts: collected.licenceCounts,
              // The risk index reads this: how many records each year window contributed.
              buckets: collected.perBucket,
              note:
                "Individual observation records, filtered to CC0 / CC BY and thinned to one point per ~11 m, " +
                "sampled evenly across the year range rather than from the most recent records only. " +
                "It is where the species has been recorded - not how many there are.",
            },
          },
        ]),
      });

      stored += 1;
    } catch (error) {
      console.error(`   ${animal.slug}: ${error.message}`);
      skipped += 1;
    }

    await sleep(REQUEST_DELAY_MS);
  }

  console.log(`\n${stored} stored, ${skipped} skipped.`);
  if (!flags.apply) console.log("Run with --apply to store the usable records in public.animal_geodata.");
}

// Only run when invoked directly: the check suite imports `yearBuckets`. 
if (process.argv[1] && process.argv[1].endsWith("fetch-geodata.mjs")) {
  await main();
}
