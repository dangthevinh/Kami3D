/**
 * Checks for the Data2Map foundation.
 *
 * The module promises five things on a landing page, and the failure mode of a promise like
 * that is a card that links nowhere. So the checks read the catalogue, look at the filesystem,
 * read the registry, and compare all three: a product that says it is live must have a route,
 * a layer must name a dataset that exists, and every dataset must carry a source, a licence and
 * - if it is simulated - the note saying so.
 *
 * Run with: npm run check:data2map
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { validateRegistry } from "../scripts/seed-data2map.mjs";
import {
  DATA2MAP_BASE,
  DATA2MAP_PRODUCTS,
  isProductId,
  liveProducts,
  plannedProducts,
  productForHref,
} from "../lib/data2map-products.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const registry = JSON.parse(readFileSync(join(root, "data", "data2map-registry.json"), "utf8"));
const schema = readFileSync(join(root, "supabase", "schema.sql"), "utf8");

test("every product has a unique id, a route under /data2map and a phase", () => {
  assert.equal(new Set(DATA2MAP_PRODUCTS.map((product) => product.id)).size, DATA2MAP_PRODUCTS.length);
  assert.equal(DATA2MAP_PRODUCTS.length, 5);

  for (const product of DATA2MAP_PRODUCTS) {
    assert.ok(isProductId(product.id));
    assert.equal(productForHref(product.href)?.id, product.id);
    assert.match(product.href, new RegExp(`^${DATA2MAP_BASE}/[a-z-]+$`), `${product.href} is not under the module`);
    assert.ok(product.name.length > 4 && product.tagline.length > 10 && product.detail.length > 40, `${product.id} is under-described`);
    assert.match(product.phase, /^D[2-6]$/);
  }

  assert.equal(productForHref("/data2map/nope"), null);
});

test("a product that claims to be live has a route, and one that does not, does not", () => {
  for (const product of DATA2MAP_PRODUCTS) {
    const route = join(root, "app", product.href.slice(1), "page.tsx");
    if (product.status === "live") {
      assert.ok(existsSync(route), `${product.id} is marked live but ${product.href} has no page`);
    } else {
      assert.equal(existsSync(route), false, `${product.id} is planned but ${product.href} already exists - flip its status`);
    }
  }

  assert.equal(liveProducts().length + plannedProducts().length, DATA2MAP_PRODUCTS.length);
});

test("the module landing page exists and does not load the map renderer", () => {
  const page = readFileSync(join(root, "app", "data2map", "page.tsx"), "utf8");
  const layout = readFileSync(join(root, "app", "data2map", "layout.tsx"), "utf8");

  for (const source of [page, layout]) {
    assert.ok(!source.includes("maplibre"), "the Data2Map landing must not import MapLibre");
    assert.ok(!source.includes("components/map/"), "nor any map component");
  }
});

test("the registry is valid, and every layer is attributable", () => {
  assert.deepEqual(validateRegistry(registry), []);

  assert.ok(registry.datasets.length >= 5, "a module with fewer datasets than products is not a data product");
  assert.ok(registry.layers.length >= 5);

  const productsWithLayers = new Set(registry.layers.map((layer) => layer.product));
  for (const product of DATA2MAP_PRODUCTS) {
    assert.ok(productsWithLayers.has(product.id), `${product.id} has no layer registered`);
  }
});

test("simulated data says so, everywhere it appears", () => {
  const simulated = registry.datasets.filter((dataset) => dataset.synthetic);
  assert.ok(simulated.length > 0, "this module has no open source for footfall or land price - the simulation is the honest part");

  for (const dataset of simulated) {
    assert.ok(dataset.note && dataset.note.length > 30, `${dataset.slug} is simulated without explaining what it is`);
  }

  // The page renders the note, not just the flag.
  const page = readFileSync(join(root, "app", "data2map", "page.tsx"), "utf8");
  assert.ok(page.includes("simulated"), "the landing page must show which datasets are simulated");
});

test("every licence in the registry is one the table accepts", () => {
  const table = schema.slice(schema.indexOf("create table if not exists public.data2map_datasets"));
  const allowed = (table.match(/license\s+text not null check \(license in \(([^)]*)\)\)/)?.[1] ?? "")
    .match(/'[^']+'/g)
    ?.map((entry) => entry.replace(/'/g, "")) ?? [];

  assert.deepEqual(allowed.sort(), ["CC0", "CC-BY", "ODbL"].sort());

  for (const dataset of registry.datasets) {
    assert.ok(allowed.includes(dataset.license), `${dataset.slug}: ${dataset.license} is not accepted by the table`);
  }

  // And the tables the module needs are the tables the schema creates.
  for (const name of ["data2map_datasets", "data2map_layers", "data2map_user_prefs"]) {
    assert.ok(schema.includes(`create table if not exists public.${name}`), `${name} is missing from schema.sql`);
  }
});

test("the registry tables follow the two RLS patterns this project already has", () => {
  for (const name of ["data2map_datasets", "data2map_layers"]) {
    assert.ok(new RegExp(`alter table public\\.${name} enable row level security`).test(schema), `${name} has no RLS`);
    assert.ok(new RegExp(`on public\\.${name} for select to anon, authenticated using \\(true\\)`).test(schema), `${name} is not publicly readable`);
    assert.ok(new RegExp(`revoke all on public\\.${name} from anon, authenticated`).test(schema), `${name} keeps the platform default grants`);
  }

  const prefs = schema.slice(schema.indexOf("create table if not exists public.data2map_user_prefs"));
  for (const verb of ["select", "insert", "update", "delete"]) {
    assert.ok(new RegExp(`on public\\.data2map_user_prefs for ${verb}[\\s\\S]{0,200}?current_user_id`).test(prefs), `prefs lack a ${verb} policy`);
  }
  assert.ok(/revoke all on public\.data2map_user_prefs from anon/.test(schema));
});

test("the module has a documentation file, because six months from now someone will add deck.gl", () => {
  const doc = join(root, "docs", "DATA2MAP.md");
  assert.ok(existsSync(doc), "docs/DATA2MAP.md is missing");
  const text = readFileSync(doc, "utf8");
  assert.ok(text.includes("deck.gl"), "the doc must record the renderer decision");
  assert.ok(text.includes("ODbL"), "and the licence decisions");
});

test("the sitemap lists the module and every live product", () => {
  const sitemap = readFileSync(join(root, "app", "sitemap.ts"), "utf8");

  assert.ok(sitemap.includes("DATA2MAP_BASE"), "the module landing must be in the sitemap");
  assert.ok(
    sitemap.includes("liveProducts()"),
    "a product that goes live must appear in the sitemap without anyone remembering to add it",
  );

  // `/map` was missing from the sitemap until this phase; the check keeps it there.
  assert.ok(sitemap.includes("${siteUrl}/map"), "the animal map belongs in the sitemap too");
});

