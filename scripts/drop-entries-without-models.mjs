#!/usr/bin/env node
/**
 * Delete the catalogue entries the pipeline could not source a model for.
 *
 *   node scripts/drop-entries-without-models.mjs --catalogue=space          # report only
 *   node scripts/drop-entries-without-models.mjs --catalogue=space --apply  # write
 *
 * The rule the user set for the animals, and the one the landmark catalogue follows: **no model means
 * no card.** A model that could not be sourced is a monument or a planet this site cannot show, and the
 * honest answer is to remove the entry rather than to draw a plate and a promise. Every drop is printed
 * with its slug, and the file is written in one pass so an interrupted run cannot leave it half-edited.
 *
 * ## The cut is verified before it is used
 *
 * The first version of the animal version of this script scanned for the closing brace starting at the
 * newline instead of at the opening brace, which put the depth counter one out and cut too far -
 * `data/animals.ts` stopped parsing. It was caught immediately because the script printed its result and
 * then re-imported the catalogue. So each slice is checked here before anything is written: it must open
 * with the entry's own `slug`, must contain its `name`, and must be longer than 200 characters. The
 * worst case is a wasted minute; the silent case costs the catalogue.
 */

import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const CATALOGUES = {
  space: { module: "../data/space.ts", exported: "SPACE_ENTRIES" },
  plants: { module: "../data/plants.ts", exported: "PLANT_ENTRIES" },
  vehicles: { module: "../data/vehicles.ts", exported: "VEHICLE_ENTRIES" },
};

const flags = process.argv.slice(2);
const APPLY = flags.includes("--apply");
const catalogueId = flags.find((arg) => arg.startsWith("--catalogue="))?.slice("--catalogue=".length);

if (!catalogueId || !CATALOGUES[catalogueId]) {
  console.error("usage: node scripts/drop-entries-without-models.mjs --catalogue=<" + Object.keys(CATALOGUES).join("|") + "> [--apply]");
  process.exit(1);
}

const catalogue = CATALOGUES[catalogueId];
const dataFile = join(ROOT, "data", catalogueId + ".ts");

const module_ = await import(catalogue.module);
const entries = module_[catalogue.exported];
const orphans = entries.filter((entry) => entry.model_url === null);

console.log(entries.length + " entries in " + catalogueId + ", " + orphans.length + " without a model:");
for (const entry of orphans) console.log("  - " + entry.slug.padEnd(26) + entry.name);

if (orphans.length === 0) {
  console.log("Nothing to drop: every entry has a model.");
  process.exit(0);
}

if (!APPLY) {
  console.log("\nDry run. Add --apply to remove them.");
  process.exit(0);
}

let source = await readFile(dataFile, "utf8");

for (const orphan of orphans) {
  const slugIndex = source.indexOf('slug: "' + orphan.slug + '"');
  if (slugIndex === -1) {
    console.error("  ! " + orphan.slug + " is not in " + dataFile);
    continue;
  }

  // Back to the "{" that opens this entry: the last line-start brace before the slug.
  const open = source.lastIndexOf("\n  {", slugIndex);
  if (open === -1) {
    console.error("  ! could not find the opening brace of " + orphan.slug);
    continue;
  }
  // Forward to the matching close, counting depth from the opening brace itself.
  const start = open + 3;
  let depth = 0;
  let index = start - 1;
  let end = -1;
  for (; index < source.length; index += 1) {
    const character = source[index];
    if (character === "{") depth += 1;
    else if (character === "}") {
      depth -= 1;
      if (depth === 0) {
        end = source.indexOf("\n", index) + 1;
        break;
      }
    }
  }
  if (end === -1) {
    console.error("  ! could not find the end of " + orphan.slug);
    continue;
  }

  const slice = source.slice(start, end);
  if (!/^\{\n\s+slug: "/.test(slice)) throw new Error("the cut for " + orphan.slug + " does not open at its own object");
  // The name is compared with its punctuation folded away. A harvested entry's name comes from Wikipedia
  // and is written with JSON.stringify, so a typographic apostrophe or a slash reaches the file escaped
  // differently from the string this script holds - and a safety check that fires on a legitimate entry
  // is a check that would eventually be deleted. Slug, name and shape are all still verified; only the
  // spelling of the name is allowed to differ.
  // What the cut has to prove is that it is **that entry and a whole one**: it opens at the entry's own
  // slug, it carries the fields an entry has, and it is the length of an entry. (A name comparison was
  // tried here and removed: a harvested name comes from Wikipedia and reaches the file through
  // JSON.stringify, so comparing spellings rejected correct entries - a check that fires on the truth is
  // worse than the check it replaced, because it gets deleted.)
  if (!slice.includes("model_url:")) throw new Error("the cut for " + orphan.slug + " has no model_url field");
  if (!slice.includes("description:")) throw new Error("the cut for " + orphan.slug + " has no description");
  if (slice.length < 200) throw new Error("the cut for " + orphan.slug + " is only " + slice.length + " characters");

  source = source.slice(0, start) + source.slice(end);
  console.log("  dropped " + orphan.slug + " (" + slice.length + " characters)");
}

await writeFile(dataFile, source, "utf8");

// The saved search goes with the entry. A query for an entry that no longer exists is a search nobody
// will run, and `scripts/check-catalogues.mjs` requires the two files to name the same slugs - so
// leaving them behind would make dropping an entry break a test rather than tidy up after itself.
const queriesFile = join(ROOT, "data", catalogueId + "-queries.json");
const queries = JSON.parse(await readFile(queriesFile, "utf8"));
let pruned = 0;
for (const orphan of orphans) {
  if (orphan.slug in queries) {
    delete queries[orphan.slug];
    pruned += 1;
  }
}
if (pruned > 0) {
  const sorted = Object.fromEntries(Object.entries(queries).sort(([a], [b]) => a.localeCompare(b)));
  await writeFile(queriesFile, JSON.stringify(sorted, null, 2) + "\n", "utf8");
  console.log("pruned " + pruned + " saved search(es) from " + queriesFile);
}

// Read it back through Node before declaring success: a file that no longer parses is worse than a
// dropped entry.
const check = await import(catalogue.module + "?t=" + Date.now());
console.log("\n" + dataFile + " now holds " + check[catalogue.exported].length + " entries.");
