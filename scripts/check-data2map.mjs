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
  DATA2MAP_API_PREFIX,
  DATA2MAP_PREFIX,
  data2mapIsPublic,
  identityListed,
  isData2MapPath,
  parseIdentityList,
} from "../lib/data2map-access.ts";
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

/**
 * The module is built but not launched, and that is a rule with two halves: the middleware hides it
 * from visitors, and the navigation does not advertise it. Neither half can be checked by opening a
 * page, so they are pinned here - the path matcher as a pure function, the middleware and the sitemap
 * as text, because the alternative is discovering the gate was removed by finding the module in a
 * search result.
 */

test("the module is hidden unless it is public, a development build, or an admin", () => {
  // The suite runs without .env.local, so this is the default a fresh clone gets: hidden.
  const previousPublic = process.env.NEXT_PUBLIC_DATA2MAP_PUBLIC;
  const previousNodeEnv = process.env.NODE_ENV;

  try {
    delete process.env.NEXT_PUBLIC_DATA2MAP_PUBLIC;
    process.env.NODE_ENV = "production";
    assert.equal(data2mapIsPublic(), false, "the module must not be public by accident");

    process.env.NEXT_PUBLIC_DATA2MAP_PUBLIC = "1";
    assert.equal(data2mapIsPublic(), true, "the launch switch turns it on");

    delete process.env.NEXT_PUBLIC_DATA2MAP_PUBLIC;
    process.env.NODE_ENV = "development";
    assert.equal(data2mapIsPublic(), true, "npm run dev is where the module is written");
  } finally {
    if (previousPublic === undefined) delete process.env.NEXT_PUBLIC_DATA2MAP_PUBLIC;
    else process.env.NEXT_PUBLIC_DATA2MAP_PUBLIC = previousPublic;
    process.env.NODE_ENV = previousNodeEnv;
  }
});

test("the gate matches the module and its API, and nothing that merely looks like them", () => {
  for (const path of [DATA2MAP_PREFIX, "/data2map", "/data2map/", "/data2map/twin", "/api/data2map/pois"]) {
    assert.equal(isData2MapPath(path), true, path + " must be inside the gate");
  }

  for (const path of ["/", "/map", "/data2mapx", "/api/data2map-access", "/api/data2mapish", "/maps/data2map"]) {
    assert.equal(isData2MapPath(path), false, path + " must not be gated by string luck");
  }

  assert.equal(DATA2MAP_API_PREFIX, "/api/data2map");
});

test("the allow-lists are parsed, and compared without case or spaces", () => {
  assert.deepEqual(parseIdentityList(" a@B.com , user_1 ,, "), ["a@b.com", "user_1"]);
  assert.deepEqual(parseIdentityList(undefined), []);
  assert.deepEqual(parseIdentityList(""), []);

  const previousIds = process.env.DATA2MAP_ADMIN_IDS;
  const previousEmails = process.env.DATA2MAP_ADMIN_EMAILS;

  try {
    process.env.DATA2MAP_ADMIN_IDS = "user_3Ja1siqFIUisqvpNzeflv0tkkA6";
    process.env.DATA2MAP_ADMIN_EMAILS = "Kaiovinh@Gmail.com";

    assert.equal(identityListed({ userId: "user_3Ja1siqFIUisqvpNzeflv0tkkA6" }), true);
    assert.equal(identityListed({ email: "kaiovinh@gmail.com" }), true, "email comparison is case-blind");
    assert.equal(identityListed({ userId: "user_somebody_else" }), false);
    assert.equal(identityListed({}), false, "an empty session is not an admin");

    delete process.env.DATA2MAP_ADMIN_IDS;
    delete process.env.DATA2MAP_ADMIN_EMAILS;
    assert.equal(identityListed({ userId: "user_3Ja1siqFIUisqvpNzeflv0tkkA6" }), false, "no list, no admins");
  } finally {
    if (previousIds === undefined) delete process.env.DATA2MAP_ADMIN_IDS;
    else process.env.DATA2MAP_ADMIN_IDS = previousIds;
    if (previousEmails === undefined) delete process.env.DATA2MAP_ADMIN_EMAILS;
    else process.env.DATA2MAP_ADMIN_EMAILS = previousEmails;
  }
});

test("the gate lives in the middleware, because the module's pages are static", () => {
  const middleware = readFileSync(join(root, "middleware.ts"), "utf8");

  assert.ok(middleware.includes("isData2MapPath"), "the middleware does not know about the module");
  assert.ok(middleware.includes("canSeeData2Map"), "and does not ask who may see it");
  assert.ok(middleware.includes("isDatabaseAdmin"), "nor checks the admin table");
  assert.ok(/status: 404/.test(middleware), "a hidden section answers 404, not 403");
  assert.ok(middleware.includes("x-robots-tag"), "and tells crawlers to stay out");

  // Every branch of the provider switch must apply the gate: Supabase, Clerk and Demo Mode.
  assert.equal((middleware.match(/hiddenResponse\(\)/g) ?? []).length >= 3, true, "each provider path needs the gate");

  // And no page in the module reads a session: that would make all seven dynamic and cost the
  // prerendered HTML that check:bundle measures.
  for (const page of ["page.tsx", "real-estate/page.tsx", "trends/page.tsx", "logistics/page.tsx", "agriculture/page.tsx", "twin/page.tsx"]) {
    const source = readFileSync(join(root, "app", "data2map", page), "utf8");
    assert.ok(!source.includes("getCurrentUserId"), page + " reads a session; the gate belongs in the middleware");
    assert.ok(!source.includes("data2MapAccess"), page + " asks who may see it; the middleware already answered");
  }
});

test("the sitemap and the navbar do not advertise an unpublished module", () => {
  const sitemap = readFileSync(join(root, "app", "sitemap.ts"), "utf8");
  assert.ok(sitemap.includes("data2mapIsPublic()"), "the sitemap must ask before listing the module");
  assert.ok(/data2mapIsPublic\(\)\s*\n?\s*\?/.test(sitemap), "and list the routes only when it is public");

  const navbar = readFileSync(join(root, "components", "layout", "Navbar.tsx"), "utf8");
  assert.ok(navbar.includes("/api/data2map-access"), "the navbar must ask before drawing the entry");
  assert.ok(navbar.includes("data2mapIsPublic()"), "and draw it unconditionally when the module is public");
  // The entry may exist as its own constant - what it must not do is sit inside the list that is
  // rendered for everyone.
  const listStart = navbar.indexOf("const NAV_LINKS");
  const listEnd = navbar.indexOf("] as const;", listStart);
  assert.ok(listStart >= 0 && listEnd > listStart, "NAV_LINKS is not where it used to be");
  assert.ok(!navbar.slice(listStart, listEnd).includes("/data2map"), "the entry sits in the unconditional list");
});
