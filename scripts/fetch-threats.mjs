#!/usr/bin/env node
/**
 * Threat layers, from sources this site is allowed to use.
 *
 *   npm run threats:report                # what each source offers, nothing written
 *   npm run threats:fetch                 # download, score and store (--apply)
 *
 * ## What is here, and what was refused
 *
 * | Source | Licence | Decision |
 * | --- | --- | --- |
 * | Natural Earth urban areas | Public domain | imported - coarse human pressure at world scale |
 * | WDPA / Protected Planet | Non-commercial | refused - this site carries advertising |
 * | IUCN Red List range and threats | Restricted, commercial use limited | refused |
 * | Hansen Global Forest Change | CC BY 4.0 | not yet - a 30 m raster; it needs an aggregation pipeline |
 * | Poaching / illegal trade hotspots | No open dataset at species resolution | refused - the layer is absent rather than inferred |
 *
 * The project rule is that a threat layer nobody can source honestly does not get drawn: the
 * panel shows the layer as unavailable with the reason, instead of shading the world with a
 * guess. `--report` prints this table with the live counts, so the claim is checkable.
 *
 * Severity is computed from the dataset own numbers by `severityForUrbanArea` in
 * `lib/risk.ts`, which is where the 1-5 scale and its reasoning live.
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { severityForUrbanArea } from "../lib/risk.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const USER_AGENT = "Kami3D-threat-fetcher/1.0 (+https://github.com/dangthevinh/Kami3D)";

const SOURCES = {
  "natural-earth-urban": {
    kind: "urban_expansion",
    label: "Natural Earth - urban areas (50m)",
    url: "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_urban_areas.geojson",
    homepage: "https://www.naturalearthdata.com",
    license: "CC0",
    licenseLabel: "Public domain",
    licenseUrl: "https://www.naturalearthdata.com/about/terms-of-use/",
    attribution: "Natural Earth urban areas (public domain) - a coarse proxy for human presence, not a deforestation dataset.",
  },
};

/** Printed by --report and after every run: refusals are part of the record. */
const REFUSED = [
  { source: "WDPA / Protected Planet", licence: "Non-commercial", why: "this site carries advertising" },
  { source: "IUCN Red List (range, threats)", licence: "Restricted", why: "commercial use limited by the terms" },
  { source: "Hansen Global Forest Change", licence: "CC BY 4.0", why: "a 30 m raster - needs an aggregation pipeline, not a download" },
  { source: "Poaching / illegal trade hotspots", licence: "None open", why: "no dataset at species resolution; the layer is absent rather than inferred" },
];

/**
 * A stable id for a Natural Earth feature.
 *
 * The dataset carries no id, and `dedupe_key` has to survive a re-download, so the id is
 * derived from what will not change: the rounded area and the rounded centroid.
 */
export function featureId(feature) {
  const ring = feature.geometry.coordinates[0];
  const lng = ring.reduce((sum, point) => sum + point[0], 0) / ring.length;
  const lat = ring.reduce((sum, point) => sum + point[1], 0) / ring.length;
  const area = Math.round(Number(feature.properties.area_sqkm ?? 0));
  // Two decimals of centroid plus the vertex count: rounding coarser than that collided
  // on neighbouring outskirts, and PostgREST refuses a batch that updates one row twice.
  return `ne50u-${area}-${Math.round(lng * 100)}-${Math.round(lat * 100)}-${ring.length}`;
}

/** Rounds coordinates to about 110 m: a city outline drawn at world scale does not need more. */
export function simplifyRing(ring, precision = 3) {
  const factor = 10 ** precision;
  const out = [];
  const seen = new Set();

  for (const point of ring) {
    const lng = Math.round(point[0] * factor) / factor;
    const lat = Math.round(point[1] * factor) / factor;
    const key = `${lng},${lat}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push([lng, lat]);
  }

  if (out.length > 0) {
    const first = out[0];
    const last = out[out.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) out.push([first[0], first[1]]);
  }

  return out;
}

/** Keeps a polygon only if it still has enough shape to be worth drawing. */
export function simplifyPolygon(rings, precision = 3) {
  return rings.map((ring) => simplifyRing(ring, precision)).filter((ring) => ring.length >= 4);
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: { accept: "application/geo+json, application/json", "user-agent": USER_AGENT }, signal: AbortSignal.timeout(120_000) });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText} for ${url}`);
  return response.json();
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
  const flags = { apply: false, minAreaKm2: 100, minZoom: 5, year: null };
  for (const arg of argv) {
    if (arg === "--apply") flags.apply = true;
    else if (arg.startsWith("--min-area=")) flags.minAreaKm2 = Math.max(0, Number(arg.slice("--min-area=".length)) || 0);
    else if (arg.startsWith("--min-zoom=")) flags.minZoom = Math.max(0, Number(arg.slice("--min-zoom=".length)) || 0);
    else if (arg.startsWith("--year=")) flags.year = Number(arg.slice("--year=".length));
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

function refusedTable() {
  console.log("\nRefused sources (recorded, not silently dropped):");
  for (const entry of REFUSED) console.log(`  x ${entry.source.padEnd(34)} ${entry.licence.padEnd(14)} ${entry.why}`);
}

async function main() {
  await loadEnvFiles();
  const flags = parseArgs(process.argv.slice(2));
  const source = SOURCES["natural-earth-urban"];

  console.log(`Fetching ${source.label} ...`);
  const collection = await fetchJson(source.url);
  const raw = collection.features ?? [];
  console.log(`${raw.length} features in the source dataset`);

  const kept = [];
  const seen = new Set();
  let dropped = 0;
  let duplicates = 0;
  const histogram = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  for (const feature of raw) {
    const area = Number(feature.properties?.area_sqkm ?? 0);
    const minZoom = Number(feature.properties?.min_zoom ?? 99);
    if (!(area >= flags.minAreaKm2) || minZoom > flags.minZoom) {
      dropped += 1;
      continue;
    }

    const rings = feature.geometry.type === "Polygon" ? [feature.geometry.coordinates] : feature.geometry.coordinates;
    const polygon = rings.map((ring) => simplifyPolygon(ring)).filter((parts) => parts.length > 0);
    if (polygon.length === 0) {
      dropped += 1;
      continue;
    }

    const id = featureId(feature);
    if (seen.has(id)) {
      duplicates += 1;
      continue;
    }
    seen.add(id);

    const severity = severityForUrbanArea(area, minZoom);
    histogram[severity] += 1;

    kept.push({
      kind: source.kind,
      name: "Urban area",
      severity,
      year: flags.year,
      geometry: { type: "Polygon", coordinates: polygon[0] },
      source: "natural-earth-urban",
      source_url: source.homepage,
      license: source.license,
      attribution: source.attribution,
      properties: {
        feature_id: id,
        area_sqkm: Math.round(area),
        min_zoom: minZoom,
        license_label: source.licenseLabel,
        license_url: source.licenseUrl,
        note: "Urban extent, used as a coarse stand-in for human pressure on a range. It is not a deforestation or population dataset.",
      },
    });
  }

  const totalArea = kept.reduce((sum, row) => sum + row.properties.area_sqkm, 0);
  console.log(
    `kept ${kept.length} (>= ${flags.minAreaKm2} km2, min_zoom <= ${flags.minZoom}), ` +
      `dropped ${dropped} by filter, ${duplicates} duplicate id(s)`,
  );
  console.log(`severity histogram: ${Object.entries(histogram).map(([band, count]) => `${band}:${count}`).join(" ")}`);
  console.log(`total urban area ${totalArea.toLocaleString("en-US")} km2`);
  refusedTable();

  if (!flags.apply) {
    console.log("\nDry run - pass --apply to store these in public.threat_layers.");
    return;
  }

  const supabase = supabaseConfig();
  if (!supabase.ready) {
    console.error("--apply needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (see README).");
    process.exitCode = 2;
    return;
  }

  const batchSize = 200;
  let written = 0;
  for (let index = 0; index < kept.length; index += batchSize) {
    const batch = kept.slice(index, index + batchSize);
    await rest(supabase, "threat_layers?on_conflict=dedupe_key", { method: "POST", body: JSON.stringify(batch) });
    written += batch.length;
    process.stdout.write(`\r  stored ${written}/${kept.length}`);
  }

  console.log(`\nWrote ${written} threat row(s) to public.threat_layers.`);
}

await main();
