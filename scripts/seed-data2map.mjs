#!/usr/bin/env node
/**
 * Seeds the Data2Map registry from `data/data2map-registry.json`.
 *
 *   npm run data2map:seed      # upsert datasets and layers
 *   npm run data2map:status    # what the database holds
 *
 * The file is the source of truth and the tables are a copy of it, like every other dataset
 * in this repository. The two tables exist so five product pages do not each hard-code the
 * same switch five times - and so a layer that has no dataset behind it is visible as such
 * rather than simply absent.
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const REGISTRY_FILE = join(ROOT, "data", "data2map-registry.json");
const PRODUCTS = ["real_estate", "trends", "logistics", "stories", "agriculture"];
const LICENSES = ["CC0", "CC-BY", "ODbL"];

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
    signal: AbortSignal.timeout(30_000),
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

/** Refuses to seed a registry that would put an unattributable layer on a page. */
export function validateRegistry(registry) {
  const problems = [];
  const slugs = new Set();

  for (const dataset of registry.datasets ?? []) {
    if (slugs.has(dataset.slug)) problems.push(`duplicate dataset ${dataset.slug}`);
    slugs.add(dataset.slug);
    if (!PRODUCTS.includes(dataset.product)) problems.push(`${dataset.slug}: unknown product ${dataset.product}`);
    if (!LICENSES.includes(dataset.license)) problems.push(`${dataset.slug}: licence ${dataset.license} is not allow-listed`);
    if (!dataset.attribution || dataset.attribution.length < 8) problems.push(`${dataset.slug}: no attribution`);
    if (dataset.synthetic && !dataset.note) problems.push(`${dataset.slug}: simulated data must carry a note explaining what it is`);
  }

  const ids = new Set();
  for (const layer of registry.layers ?? []) {
    if (ids.has(layer.id)) problems.push(`duplicate layer ${layer.id}`);
    ids.add(layer.id);
    if (!PRODUCTS.includes(layer.product)) problems.push(`${layer.id}: unknown product ${layer.product}`);
    if (layer.datasetSlug && !slugs.has(layer.datasetSlug)) problems.push(`${layer.id}: dataset ${layer.datasetSlug} is not in the registry`);
    if (layer.defaultOpacity < 0.05 || layer.defaultOpacity > 1) problems.push(`${layer.id}: opacity out of range`);
  }

  return problems;
}

async function main() {
  await loadEnvFiles();
  const registry = JSON.parse(readFileSync(REGISTRY_FILE, "utf8"));

  const problems = validateRegistry(registry);
  if (problems.length > 0) {
    console.error(`Refusing to seed:\n  ${problems.join("\n  ")}`);
    process.exitCode = 1;
    return;
  }

  const supabase = supabaseConfig();
  if (!supabase.ready) {
    console.error("Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (see README).");
    process.exitCode = 2;
    return;
  }

  if (process.argv.includes("--status")) {
    const rows = await rest(supabase, "data2map_datasets?select=product,status,synthetic");
    console.log(`${rows.length} dataset(s) in public.data2map_datasets`);
    for (const product of PRODUCTS) {
      const own = rows.filter((row) => row.product === product);
      if (own.length === 0) continue;
      const live = own.filter((row) => row.status === "live").length;
      const synthetic = own.filter((row) => row.synthetic).length;
      console.log(`  ${product.padEnd(12)} ${own.length} dataset(s), ${live} live, ${synthetic} simulated`);
    }
    const layers = await rest(supabase, "data2map_layers?select=id");
    console.log(`${layers.length} layer(s) in public.data2map_layers`);
    return;
  }

  // The file is camelCase and Postgres is snake_case; this map is the only translation, so
  // a renamed column fails here rather than silently inserting nulls.
  const datasetRows = registry.datasets.map((dataset) => ({
    slug: dataset.slug,
    name: dataset.name,
    product: dataset.product,
    kind: dataset.kind,
    source: dataset.source,
    source_url: dataset.sourceUrl ?? null,
    license: dataset.license,
    license_label: dataset.licenseLabel ?? null,
    attribution: dataset.attribution,
    year: dataset.year ?? null,
    geometry_kind: dataset.geometryKind ?? null,
    record_count: dataset.recordCount ?? null,
    synthetic: dataset.synthetic === true,
    note: dataset.note ?? null,
    status: dataset.status,
  }));

  await rest(supabase, "data2map_datasets?on_conflict=slug", { method: "POST", body: JSON.stringify(datasetRows) });
  console.log(`Wrote ${registry.datasets.length} dataset(s).`);

  const layerRows = registry.layers.map((layer) => ({
    id: layer.id,
    label: layer.label,
    hint: layer.hint,
    product: layer.product,
    dataset_slug: layer.datasetSlug ?? null,
    default_visible: layer.defaultVisible === true,
    default_opacity: layer.defaultOpacity,
    sort_order: layer.sortOrder ?? 0,
  }));

  await rest(supabase, "data2map_layers?on_conflict=id", { method: "POST", body: JSON.stringify(layerRows) });
  console.log(`Wrote ${registry.layers.length} layer(s).`);

  // Upserting is not enough: a layer or dataset that leaves the file would otherwise stay in the
  // table for ever and keep being served to a page that no longer knows about it. The file is the
  // source of truth, so anything the file does not mention is removed - and said out loud.
  for (const [table, key, keep] of [
    ["data2map_datasets", "slug", registry.datasets.map((dataset) => dataset.slug)],
    ["data2map_layers", "id", registry.layers.map((layer) => layer.id)],
  ]) {
    const existing = await rest(supabase, `${table}?select=${key}`);
    const stale = existing.map((row) => row[key]).filter((value) => !keep.includes(value));
    if (stale.length === 0) continue;

    await rest(supabase, `${table}?${key}=in.(${stale.join(",")})`, { method: "DELETE" });
    console.log(`Removed ${stale.length} stale ${table.replace("data2map_", "")} row(s): ${stale.join(", ")}`);
  }
}

if (process.argv[1] && process.argv[1].endsWith("seed-data2map.mjs")) {
  await main();
}
