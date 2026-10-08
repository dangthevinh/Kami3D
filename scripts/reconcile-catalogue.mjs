#!/usr/bin/env node
/**
 * Make a catalogue, its model files, its credit manifest and its saved searches describe the same set.
 *
 *   node scripts/reconcile-catalogue.mjs plants [--apply]
 *
 * Four files have to agree about which entries exist and which of them have a model:
 *
 *   data/<id>.ts                    the entries themselves
 *   public/models/<id>/*.glb        the files
 *   data/<id>-attribution.json      the credit for each file
 *   data/<id>-queries.json          the saved search per entry
 *
 * They are written by four different steps, and a step that fails halfway leaves them disagreeing - which
 * is not a cosmetic problem: an entry pointing at a file that is not there draws an empty viewer, and a
 * query for an entry that does not exist is a search nobody will run. \`scripts/check-catalogues.mjs\`
 * refuses both, and this is the tool that puts them back in step.
 *
 * The rules, in one place:
 *
 *   - an entry whose file **or** credit is missing goes back to \`model_url: null\`, so the pipeline can
 *     fetch it again rather than the page lying about what it has;
 *   - a credit or a hover-index row with no entry is deleted (an orphan credit is a licence record for
 *     something this site does not show);
 *   - the queries file names exactly the entries that exist, keeping each entry's own query.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
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
const id = flags.find((arg) => !arg.startsWith("--"));

if (!id || !CATALOGUES[id]) {
  console.error("usage: node scripts/reconcile-catalogue.mjs <" + Object.keys(CATALOGUES).join("|") + "> [--apply]");
  process.exit(1);
}

const catalogue = CATALOGUES[id];
const module_ = await import(catalogue.module);
const entries = module_[catalogue.exported];

const dir = join(ROOT, "public", "models", id);
const dataPath = join(ROOT, "data", id + ".ts");
const manifestPath = join(ROOT, "data", id + "-attribution.json");
const previewPath = join(ROOT, "data", id + "-preview.json");
const queriesPath = join(ROOT, "data", id + "-queries.json");

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const preview = JSON.parse(readFileSync(previewPath, "utf8"));
const queries = JSON.parse(readFileSync(queriesPath, "utf8"));

const slugs = new Set(entries.map((entry) => entry.slug));
let source = readFileSync(dataPath, "utf8");
let cleared = 0;
let creditOrphans = 0;

for (const entry of entries) {
  const hasFile = existsSync(join(dir, entry.slug + ".glb"));
  if (hasFile && manifest[entry.slug]) continue;

  if (entry.model_url) {
    source = source.replace('model_url: "' + entry.model_url + '"', "model_url: null");
    cleared += 1;
  }
  if (manifest[entry.slug]) creditOrphans += 1;
  delete manifest[entry.slug];
  delete preview.models?.[entry.slug];
}

for (const key of Object.keys(manifest)) {
  if (!slugs.has(key)) {
    delete manifest[key];
    creditOrphans += 1;
  }
}
for (const key of Object.keys(preview.models ?? {})) if (!slugs.has(key)) delete preview.models[key];

const nextQueries = {};
let renamedQueries = 0;
for (const entry of entries) {
  if (queries[entry.slug]) nextQueries[entry.slug] = queries[entry.slug];
  else {
    nextQueries[entry.slug] = entry.name;
    renamedQueries += 1;
  }
}

console.log(
  id + ": " + entries.length + " entries · " + Object.keys(manifest).length + " credited · " +
    cleared + " model_url cleared · " + creditOrphans + " orphan credit row(s) · " +
    renamedQueries + " query/queries rebuilt",
);

if (!APPLY) {
  console.log("Dry run. Add --apply to write the four files.");
  process.exit(0);
}

writeFileSync(dataPath, source, "utf8");
writeFileSync(manifestPath, JSON.stringify(Object.fromEntries(Object.entries(manifest).sort()), null, 2) + "\n", "utf8");
writeFileSync(previewPath, JSON.stringify(preview, null, 2) + "\n", "utf8");
writeFileSync(queriesPath, JSON.stringify(Object.fromEntries(Object.entries(nextQueries).sort()), null, 2) + "\n", "utf8");
console.log("written.");
