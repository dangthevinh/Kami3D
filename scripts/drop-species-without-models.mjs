#!/usr/bin/env node
/**
 * Remove every species that has no model.
 *
 *   node scripts/drop-species-without-models.mjs            # dry run: who would go, and from where
 *   node scripts/drop-species-without-models.mjs --apply    # do it, and rewrite the derived files
 *   node scripts/drop-species-without-models.mjs --apply --db   # ...and delete the rows in Supabase
 *
 * ## The decision this encodes
 *
 * A species card promises a 3D model. When the catalogue has none - and none of the sources this
 * project accepts has one either - the card is a promise the site cannot keep, and the encyclopedia
 * is better off without it than with a placeholder. That is a content decision, made by the owner of
 * the project, not a rule this script invented: it takes "no `model_url`" as the whole test.
 *
 * The 34 species it removes were measured first (`npm run models:audit`, plus the node names inside
 * each shipped `.glb`), which is how the ones with a real model were separated from the ones whose
 * only candidate was a musket, a leather bag or a sphere on a plane. See PLAN.md, "Model giả".
 *
 * ## What has to move together
 *
 * Removing a species from the catalogue is not one edit. Five files describe the same species, and a
 * stale entry in any of them fails a check rather than being ignored:
 *
 *   data/animals.ts, data/species/batch-*.ts   the catalogue itself
 *   data/model-attribution.json                credits; check:preview refuses a slug with no species
 *   data/model-preview.json                    derived from the file above, regenerated here
 *   data/animal-geodata.json                   regenerate with `npm run geo:generate` afterwards
 *   data/range-events.json                     timeline annotations
 *   data/model-queries.json, sound-queries.json   the pipeline's saved search terms
 *   supabase/seed.sql                          regenerate with `npm run seed:generate`
 *
 * The database is `--db` on purpose: `npm run db:seed` upserts, and an upsert never deletes.
 */

import { readFile, writeFile } from "node:fs/promises";
import { existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { ANIMALS } from "../data/animals.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const APPLY = process.argv.includes("--apply");
const DB = process.argv.includes("--db");

const going = ANIMALS.filter((animal) => !animal.model_url);
const staying = ANIMALS.filter((animal) => animal.model_url);
const slugs = new Set(going.map((animal) => animal.slug));

console.log(going.length + " species have no model, and " + staying.length + " do:");
for (const animal of going) console.log("  - " + animal.slug.padEnd(28) + animal.name);

/** The catalogue files, in the order a species may live in them. */
function catalogueFiles() {
  return [
    join(ROOT, "data", "animals.ts"),
    ...readdirSync(join(ROOT, "data", "species"))
      .filter((name) => name.startsWith("batch-") && name.endsWith(".ts"))
      .sort()
      .map((name) => join(ROOT, "data", "species", name)),
  ];
}

/**
 * Cut one species object out of a catalogue file.
 *
 * The files are hand-written TypeScript with comments and nested arrays, so this walks the object
 * literal rather than matching a regex: from `slug: "x",` back to the `{` that opens its entry, then
 * forward to the brace that closes it, tracking strings so a brace inside a description cannot end the
 * object early. Returns null when the slug is not in this file.
 */
function cutSpecies(source, slug) {
  const at = source.indexOf('slug: "' + slug + '",');
  if (at === -1) return null;

  const open = source.lastIndexOf("\n  {\n", at);
  if (open === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;
  // `open` is the newline before the entry, so the opening brace is three characters along:
  // "\n" + " " + " " + "{". Starting at the newline instead leaves the brace uncounted and the
  // scan runs past the end of the object - measured once, by corrupting data/animals.ts with it.
  let index = open + 3;

  for (; index < source.length; index += 1) {
    const char = source[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === "{" || char === "[") depth += 1;
    else if (char === "}" || char === "]") {
      depth -= 1;
      if (depth === 0) break;
    }
  }

  if (depth !== 0) throw new Error("could not find the end of the object for " + slug);

  const cut = source.slice(open + 3, index + 1);
  // The slice is checked before it is used: a species object opens with its id and closes with a
  // brace, and anything else means the scan latched onto the wrong brackets. Failing here costs a
  // minute; failing silently costs a corrupted catalogue.
  if (!/^\{\n\s+id: "/.test(cut) || cut.length < 200) {
    throw new Error("the slice for " + slug + " does not look like a species object: " + JSON.stringify(cut.slice(0, 60)));
  }
  if (!cut.includes('slug: "' + slug + '",')) throw new Error("the slice for " + slug + " is the wrong entry");

  let end = index + 1;
  if (source[end] === ",") end += 1;
  if (source[end] === "\n") end += 1;

  return source.slice(0, open + 1) + source.slice(end);
}

/* ------------------------------------------------------------------ report */

const edits = [];
for (const file of catalogueFiles()) {
  const source = await readFile(file, "utf8");
  let next = source;
  const cut = [];
  for (const slug of slugs) {
    const after = cutSpecies(next, slug);
    if (after === null) continue;
    next = after;
    cut.push(slug);
  }
  if (cut.length) edits.push({ file, next, cut });
}

for (const edit of edits) {
  console.log("\n" + edit.file.replace(ROOT + "/", "") + ": " + edit.cut.length + " species");
  console.log("  " + edit.cut.join(", "));
}

const attributionFile = join(ROOT, "data", "model-attribution.json");
const attribution = JSON.parse(await readFile(attributionFile, "utf8"));
const droppedCredits = Object.keys(attribution).filter((slug) => slugs.has(slug));

const eventsFile = join(ROOT, "data", "range-events.json");
const eventsRaw = JSON.parse(await readFile(eventsFile, "utf8"));
const droppedEvents = eventsRaw.events.filter((event) => slugs.has(event.slug));
const keptEvents = eventsRaw.events.filter((event) => !slugs.has(event.slug));

/** The pipeline's saved search terms, keyed by slug. Stale terms are how a wrong model gets found twice. */
const queryFiles = ["model-queries.json", "sound-queries.json"];
const queryEdits = [];
for (const name of queryFiles) {
  const file = join(ROOT, "data", name);
  if (!existsSync(file)) continue;
  const parsed = JSON.parse(await readFile(file, "utf8"));
  const kept = Object.fromEntries(Object.entries(parsed).filter(([slug]) => !slugs.has(slug)));
  const removed = Object.keys(parsed).length - Object.keys(kept).length;
  if (removed) queryEdits.push({ file, kept, removed });
}

console.log("\ndata/model-attribution.json: " + droppedCredits.length + " credits removed");
console.log("data/range-events.json: " + droppedEvents.length + " of " + eventsRaw.events.length + " annotations removed");
for (const edit of queryEdits) console.log(edit.file.replace(ROOT + "/", "") + ": " + edit.removed + " saved search terms removed");
console.log("data/animal-geodata.json: regenerate with npm run geo:generate after this");

if (!APPLY) {
  console.log("\nDry run. Add --apply to write.");
  process.exit(0);
}

/* ------------------------------------------------------------------ write */

for (const edit of edits) await writeFile(edit.file, edit.next, "utf8");

const sortedCredits = Object.fromEntries(
  Object.entries(attribution)
    .filter(([slug]) => !slugs.has(slug))
    .sort(([a], [b]) => a.localeCompare(b)),
);
await writeFile(attributionFile, JSON.stringify(sortedCredits, null, 2) + "\n", "utf8");

// The preview index is derived, and written exactly the way scripts/fetch-models.mjs writes it, so
// the two never disagree about which numbers a card is allowed to read.
const preview = Object.fromEntries(
  Object.entries(sortedCredits).map(([slug, entry]) => [slug, [entry.bytes ?? 0, entry.faceCount ?? null]]),
);
await writeFile(
  join(ROOT, "data", "model-preview.json"),
  JSON.stringify({
    note: "Generated by scripts/fetch-models.mjs from data/model-attribution.json. Compact on purpose: a species card imports this on hover, so it carries only the size and triangle count the preview budget needs. Edit the manifest, not this file; check:preview fails if they disagree.",
    models: preview,
  }) + "\n",
  "utf8",
);

await writeFile(eventsFile, JSON.stringify({ ...eventsRaw, events: keptEvents }, null, 2) + "\n", "utf8");
for (const edit of queryEdits) await writeFile(edit.file, JSON.stringify(edit.kept, null, 2) + "\n", "utf8");

console.log("\nWrote the catalogue, the credits and the timeline annotations.");
console.log("Now run: npm run geo:generate && npm run seed:generate");

if (!DB) {
  console.log("Then:   npm run db:seed  (upserts)  — and this script's --db flag to delete the rows.");
  process.exit(0);
}

/* ------------------------------------------------------------------ the database */

for (const name of [".env.local", ".env"]) {
  const path = join(ROOT, name);
  if (!existsSync(path)) continue;
  for (const line of (await readFile(path, "utf8")).split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const separator = trimmed.indexOf("=");
    const key = trimmed.slice(0, separator).trim();
    if (!process.env[key]) process.env[key] = trimmed.slice(separator + 1).trim().replace(/^["']|["']$/g, "");
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to delete the rows.");
  process.exit(2);
}

const list = [...slugs].join(",");
const response = await fetch(url + "/rest/v1/animals?slug=in.(" + encodeURIComponent(list) + ")", {
  method: "DELETE",
  headers: { apikey: key, authorization: "Bearer " + key, prefer: "return=representation" },
});
if (!response.ok) {
  console.error("The database refused the delete: HTTP " + response.status + " " + (await response.text()).slice(0, 200));
  process.exit(1);
}
const removed = await response.json();
console.log("Deleted " + removed.length + " rows from animals (their animal_geodata and other children cascade).");
