/**
 * Phase 25: the multi-category catalogue, and the promise it makes to the animals.
 *
 *   node --test scripts/check-catalog.mjs
 *
 * The whole design of this phase is one decision, and this file is where it is held to it: **the
 * animals are not moved.** They keep their table, their columns and their foreign keys, and the
 * general catalogue is a view over them rather than a copy. The obvious migration - insert every
 * animal into `items`, repoint six foreign keys, drop the old table - buys tidiness with the one
 * thing this project cannot replace: 73 species whose geodata, favourites, quiz scores and view
 * counts are all correct today.
 *
 * So the tests below are of two kinds: that the new tables and their policies are what they claim,
 * and that the animal catalogue is still exactly where it was.
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const root = process.cwd();
const schema = readFileSync(join(root, "supabase", "schema.sql"), "utf8");

/** The Phase 25 block, and only it - the schema goes on to other phases with other conventions. */
const start = schema.indexOf("Phase 25 - Multi-category catalogue");
const next = schema.indexOf("/* ======", start);
const block = schema.slice(start, next === -1 ? undefined : next);

test("the block is where it says it is", () => {
  assert.ok(start > 0, "the Phase 25 block is missing from supabase/schema.sql");
  assert.ok(block.length > 2000, "the Phase 25 block looks truncated");
  // It is the last block today, so `next` is -1 and the slice runs to the end of the file. A phase
  // appended after it moves the boundary, which is fine - the assertions below read this block only,
  // so they do not depend on where it ends.
  assert.ok(next === -1 || next > start, "the block boundary was computed wrong");
});

test("a category and an item are tables, and both are behind RLS", () => {
  for (const table of ["categories", "items"]) {
    assert.ok(schema.includes("create table if not exists public." + table + " ("), table + " is missing");
    assert.ok(
      new RegExp("alter table public\\." + table + "\\s+enable row level security").test(schema),
      table + " has no RLS, so it is readable and writable by anyone holding the anon key",
    );
  }
});

test("everybody reads, only an admin writes", () => {
  // The same `public.is_admin()` the rest of the admin surfaces use. A second definition of "admin"
  // is a second thing to keep in step, and the two would disagree eventually.
  for (const table of ["categories", "items"]) {
    const readable = new RegExp('create policy "[^"]+"\\s+on public\\.' + table + " for select\\s+to anon, authenticated");
    assert.ok(readable.test(block), table + ": no public read policy");
    assert.ok(
      new RegExp('on public\\.' + table + " for all\\s+to authenticated\\s+using \\(public\\.is_admin\\(\\)\\)").test(block),
      table + ": writes are not gated on is_admin()",
    );
  }

  // And the grants, in the order that works: the revoke first, or it takes back the select.
  const revoke = block.indexOf("revoke all on public.categories, public.items");
  const grantSelect = block.indexOf("grant select on public.categories, public.items to anon, authenticated");
  assert.ok(revoke > 0 && grantSelect > 0, "the grants are missing");
  assert.ok(revoke < grantSelect, "the revoke must come before the grant, or anon loses the read it was just given");
});

test("the view reads with the caller's permissions, not the definer's", () => {
  assert.ok(schema.includes("create or replace view public.catalog_items"), "the catalogue view is missing");
  assert.ok(
    /create or replace view public\.catalog_items\s+with \(security_invoker = true\)/.test(schema),
    "a view that reads with the definer's rights is a way around every policy on the tables underneath it",
  );
});

test("the view is the animals, projected - and it carries what the animals have", () => {
  assert.ok(/from public\.animals a\s+union all/.test(block), "the view must union the animal catalogue with items");
  assert.ok(block.includes("'animals'::text                     as category_id"), "the animal rows must be labelled as the animals category");

  // The animal-only columns travel in metadata rather than being dropped: a reader that wants the
  // common shape should not have to know about them, and a reader that wants them should not lose them.
  for (const field of ["conservation_status", "habitat", "weight_kg", "fun_facts"]) {
    assert.ok(block.includes("'" + field + "'"), "the view drops " + field + ", which the animal pages still show");
  }
});

test("the six categories ship before their items do", () => {
  for (const id of ["animals", "space", "plants", "vehicles", "buildings", "architecture"]) {
    assert.ok(
      new RegExp("\\('" + id + "'").test(block),
      id + " is not seeded: a category with no rows is a section the site cannot draw",
    );
  }
  assert.ok(block.includes("on conflict (id) do update"), "re-running the schema must not fail on the seed");
});

test("the animals are exactly where they were", () => {
  // The compatibility promise, stated as a test. Nothing in this phase may rename, drop or rewrite
  // the animal catalogue - if a later change does, this fails and the six foreign keys pointing at
  // it get a chance to be noticed before a migration runs.
  assert.ok(schema.includes("create table if not exists public.animals"), "the animals table is gone");
  assert.ok(!/drop table[^;]*public\.animals/i.test(schema), "something drops the animals table");
  assert.ok(!/alter table public\.animals\s+rename/i.test(schema), "something renames the animals table");
  assert.ok(!/insert into public\.items[^;]*from public\.animals/i.test(schema), "the migration copies the animals instead of projecting them");

  const animalColumns = readFileSync(join(root, "lib", "supabase.ts"), "utf8").match(/ANIMAL_COLUMNS =\s*"([^"]+)"/)?.[1] ?? "";
  for (const column of ["conservation_status", "fun_facts", "premium", "silhouette"]) {
    assert.ok(animalColumns.includes(column), "ANIMAL_COLUMNS lost " + column + ": the animal pages read it");
  }
});

test("the app knows the new tables by name", () => {
  // One place declares table names, so a rename is one edit rather than a search.
  const supabase = readFileSync(join(root, "lib", "supabase.ts"), "utf8");
  assert.match(supabase, /categories:\s*"categories"/, "TABLES does not declare categories");
  assert.match(supabase, /items:\s*"items"/, "TABLES does not declare items");
  assert.match(supabase, /catalogItems:\s*"catalog_items"/, "TABLES does not declare the view");
});

/* ------------------------------------------------------ the read path Phase 25's UI was built on */

/**
 * The seed in `supabase/schema.sql` and the bundled list in `data/categories.ts` are the same five
 * categories, and this is the test that keeps them so.
 *
 * The two exist for one reason: a page must render on a fresh clone with no `.env.local` at all, and
 * the same page must show what an operator actually configured when there is a database. Drift between
 * them is silent and ugly - an id in one and not the other means a category page that 404s in demo mode
 * and works in production, or the reverse.
 */
const seedRows = [...block.matchAll(
  /\('([a-z][a-z0-9-]+)',\s*'([^']+)',\s*'([^']*)',\s*'([^']+)',\s*'\{([^}]+)\}',\s*(\d+),\s*(true|false),\s*(true|false)\)/g,
)].map((match) => ({
  id: match[1],
  name: match[2],
  tagline: match[3],
  icon: match[4],
  accent: match[5],
  sort_order: Number(match[6]),
  is_public: match[7] === "true",
  has_models: match[8] === "true",
}));

test("the bundled categories and the SQL seed are the same list, row for row", async () => {
  const { CATEGORIES } = await import("../data/categories.ts");

  assert.ok(seedRows.length >= 6, "the seed parse found " + seedRows.length + " rows: the insert changed shape");
  assert.deepEqual(
    CATEGORIES.map((category) => category.id),
    seedRows.map((row) => row.id),
    "the bundled list and the seed disagree about which categories exist, or about their order",
  );

  for (const [index, row] of seedRows.entries()) {
    const bundled = CATEGORIES[index];
    assert.equal(bundled.name, row.name, row.id + ": different name");
    assert.equal(bundled.tagline ?? "", row.tagline, row.id + ": different tagline");
    assert.equal(bundled.icon, row.icon, row.id + ": different icon");
    assert.equal(bundled.accent.join(","), row.accent, row.id + ": different accent");
    assert.equal(bundled.sort_order, row.sort_order, row.id + ": different sort_order");
    assert.equal(bundled.is_public, row.is_public, row.id + ": the two disagree about being public");
    assert.equal(bundled.has_models, row.has_models, row.id + ": the two disagree about having models");
  }

  // The order the site shows them in is the sort_order, so the seeded rows have to be written in it.
  const orders = seedRows.map((row) => row.sort_order);
  assert.deepEqual(orders, [...orders].sort((a, b) => a - b), "the seed is not in sort_order order");
});

test("the two projected catalogues are projected, not retyped", async () => {
  // The whole design of the phase in one assertion: the animal and landmark entries a category page
  // shows come from the catalogues that already own them, so there is exactly one copy of each.
  const { ALL_LANDMARKS } = await import("../data/landmarks/all.ts");
  const { ANIMALS } = await import("../data/animals.ts");
  const { animalsAsItems, landmarksAsItems } = await import("../lib/catalog-project.ts");

  const landmarks = landmarksAsItems();
  assert.equal(landmarks.length, ALL_LANDMARKS.length, "a landmark was dropped from the projection");
  const animals = animalsAsItems();
  assert.equal(animals.length, ANIMALS.length, "a species was dropped from the projection");

  for (const [index, item] of landmarks.entries()) {
    const landmark = ALL_LANDMARKS[index];
    assert.equal(item.category_id, "architecture");
    assert.equal(item.id, "architecture:" + landmark.slug, "the id must be the prefix plus the slug");
    assert.equal(item.slug, landmark.slug);
    assert.equal(item.metadata.country, landmark.country, "the projection invented a country");
    assert.equal(item.metadata.completed, landmark.completed, "the projection invented a year");
    assert.equal(item.scale_ratio, landmark.height_m, "scale_ratio must be the recorded height, or null");
    assert.equal(item.has_model, Boolean(landmark.model_url), "has_model must follow the model_url");
    assert.equal(
      item.has_model,
      existsSync(join(root, "public", "models", "landmarks", landmark.slug + ".glb")),
      landmark.slug + ": the card would promise a model the repository does not hold",
    );
  }

  for (const [index, item] of animals.entries()) {
    assert.equal(item.category_id, "animals");
    assert.equal(item.id, "animals:" + ANIMALS[index].slug);
    assert.equal(item.has_model, Boolean(ANIMALS[index].model_url));
  }
});


test("the modern buildings are the ones the rule names, and the rule bites", async () => {
  // A subject built by a rule rather than by a list needs the rule checked, or it becomes a list nobody
  // can explain. Every assertion below is a clause of the paragraph at the top of data/buildings.ts.
  const { ALL_LANDMARKS } = await import("../data/landmarks/all.ts");
  const { MODERN_BUILDINGS, isModernBuilding } = await import("../data/buildings.ts");
  const { modernBuildingsAsItems } = await import("../lib/catalog-project.ts");

  const bySlug = new Map(ALL_LANDMARKS.map((landmark) => [landmark.slug, landmark]));
  assert.ok(MODERN_BUILDINGS.length >= 8, "the section is too small to be a section");

  assert.equal(
    new Set(MODERN_BUILDINGS).size,
    MODERN_BUILDINGS.length,
    "a monument is listed twice, so the grid would show it twice",
  );

  for (const slug of MODERN_BUILDINGS) {
    const landmark = bySlug.get(slug);
    assert.ok(landmark, slug + " is not in the landmark catalogue, so the section points at nothing");
    assert.ok(
      landmark.completed >= 1889,
      slug + " was completed in " + landmark.completed + ", before the era the rule names",
    );
    assert.notEqual(landmark.kind, "ruin", slug + " is a ruin: nothing is entered and nothing is carried");
  }

  // The rule has to reject things, or it is a description of whatever happens to be in the list. These
  // are the near misses, and each one fails a different clause.
  for (const [slug, why] of [
    ["christ-the-redeemer", "a statue: the right era, the wrong kind of object"],
    ["mount-rushmore", "a sculpture in a rock"],
    ["uluru", "a rock: nothing was built"],
    ["milan-cathedral", "recent masonry, not a modern structure"],
    ["sagrada-familia", "a stone cathedral finished in 2026"],
    ["chateau-frontenac", "in the era and load-bearing masonry in a revival style"],
  ]) {
    assert.equal(isModernBuilding(slug), false, slug + " must not be in the section: " + why);
  }

  // The subject is two streams in one grid: the eleven monuments this rule names, and the entries
  // harvested into `data/buildings-entries.ts`. The rule's half comes **first**, so the projection is
  // read through the same split the page sees rather than by assuming the whole list is the rule's.
  const { BUILDING_ENTRIES } = await import("../data/buildings-entries.ts");

  const items = modernBuildingsAsItems();
  assert.equal(
    items.length,
    MODERN_BUILDINGS.length + BUILDING_ENTRIES.filter((entry) => !MODERN_BUILDINGS.includes(entry.slug)).length,
    "a listed building is missing from the projection, or a harvested entry was dropped",
  );

  const curated = items.slice(0, MODERN_BUILDINGS.length);
  for (const item of curated) {
    assert.equal(item.category_id, "buildings");
    assert.equal(item.id, "buildings:" + item.slug);
    assert.ok(bySlug.has(item.slug), item.slug + ": the projection invented an entry");
    assert.equal(item.metadata.completed, bySlug.get(item.slug).completed, item.slug + ": the year changed");
  }

  // A curated slug always wins: a search for "suspension bridge" can return the Golden Gate, and an
  // entry for it here would give the site a second page for one bridge. The guard is asserted, not
  // trusted - it is the one rule that keeps the two streams from colliding.
  const seen = new Set();
  for (const item of items) {
    assert.ok(!seen.has(item.slug), item.slug + " appears twice in the buildings subject");
    seen.add(item.slug);
  }
  //
  // Collisions do happen, and are expected: the harvest's subjects come from search-result titles, so
  // "Empire State Building" is a search that can return the Empire State Building, and it did. What must
  // hold is not that the two lists are disjoint but that the **curated entry wins** - the monument keeps
  // its own page, its own year and its own model, and the harvested row with the same slug is dropped.
  const collisions = BUILDING_ENTRIES.filter((entry) => isModernBuilding(entry.slug));
  assert.ok(
    collisions.length < BUILDING_ENTRIES.length,
    "every harvested building collides with the rule, which would mean the harvest is not a harvest",
  );
  const harvestedIds = new Set(items.slice(MODERN_BUILDINGS.length).map((item) => item.slug));
  for (const entry of collisions) {
    assert.ok(!harvestedIds.has(entry.slug), entry.slug + ": the harvested row was not dropped, so the site has two of it");
    assert.ok(seen.has(entry.slug), entry.slug + ": the curated entry must still be the one in the subject");
  }

  const harvested = items.slice(MODERN_BUILDINGS.length);
  assert.equal(harvested.length, BUILDING_ENTRIES.length - BUILDING_ENTRIES.filter((e) => isModernBuilding(e.slug)).length);
  for (const item of harvested) {
    assert.equal(item.category_id, "buildings", item.slug + ": a harvested entry left the subject");
    assert.equal(item.id, "buildings:" + item.slug);
    assert.ok(
      item.model_url === null || item.model_url.includes("/models/buildings/"),
      item.slug + ": a harvested entry points at a model outside its own folder",
    );
  }

  // The same monument appears in two subjects, and that is the design: one catalogue, two questions.
  const architecture = (await import("../lib/catalog-project.ts")).landmarksAsItems();
  assert.equal(architecture.length, ALL_LANDMARKS.length, "the architecture subject must still hold all of them");
  assert.ok(
    architecture.some((item) => item.slug === "eiffel-tower") && items.some((item) => item.slug === "eiffel-tower"),
    "the Eiffel Tower belongs to both subjects",
  );
});

test("a card never links to a route that would 404", async () => {
  const { itemHref, itemSubtitle, categoryHref } = await import("../lib/catalog-links.ts");

  // The three detail-route families that exist today. A category an operator adds later links to its
  // own category page, which exists by construction - the alternative is a grid of 404s waiting for a
  // phase that has not happened.
  assert.equal(itemHref({ category_id: "animals", slug: "lion" }), "/animal/lion");
  assert.equal(itemHref({ category_id: "architecture", slug: "eiffel-tower" }), "/landmarks/eiffel-tower");
  // Architecture and Modern Buildings list the same monuments: one monument, one detail page, however
  // many subjects it appears in.
  assert.equal(itemHref({ category_id: "buildings", slug: "burj-khalifa" }), "/landmarks/burj-khalifa");
  // The three `CatalogEntry` catalogues share one detail route, which exists from Phase 30.
  assert.equal(itemHref({ category_id: "space", slug: "mars" }), "/catalog/space/mars");
  assert.equal(itemHref({ category_id: "plants", slug: "oak-tree" }), "/catalog/plants/oak-tree");
  assert.equal(itemHref({ category_id: "vehicles", slug: "formula-1-car" }), "/catalog/vehicles/formula-1-car");
  // A subject an operator adds with no page of its own still links somewhere real.
  assert.equal(itemHref({ category_id: "planets", slug: "whatever" }), "/categories/planets");
  assert.equal(categoryHref("architecture"), "/categories/architecture");
  assert.equal(categoryHref("buildings"), "/categories/buildings");

  for (const category of ["animals", "architecture", "buildings", "space", "plants", "vehicles"]) {
    const href = itemHref({ category_id: category, slug: "example" });
    assert.match(href, /^\/(animal|landmarks|catalog|categories)\//, category + " links outside the routes that exist");
  }

  // The subtitle says nothing when the metadata says nothing: "Unknown" under every empty card is
  // noise dressed as information.
  assert.equal(itemSubtitle({ category_id: "space", metadata: {} }), null);
  assert.equal(itemSubtitle({ category_id: "space" }), null);
  assert.equal(itemSubtitle({ category_id: "architecture", metadata: { kind: "tower", country: "France" } }), "tower · France");
  assert.equal(itemSubtitle({ category_id: "plants", metadata: { kind: "Tree" } }), "Tree");
  assert.equal(
    itemSubtitle({ category_id: "animals", metadata: { kind: "Mammal", region: "Africa" } }),
    "Mammal · Africa",
  );
});
