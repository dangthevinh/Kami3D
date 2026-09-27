#!/usr/bin/env node
/**
 * Merge the Phase 23 batches into the catalogue.
 *
 *   node scripts/merge-species.mjs            # report
 *   node scripts/merge-species.mjs --apply    # write data/species/index.ts and rewire data/animals.ts
 *
 * The catalogue is one list to everything that reads it (the seed generator, the model pipeline, the
 * pages), and two files to a human: `data/animals.ts` keeps the species the project shipped with, and
 * `data/species/batch-*.ts` hold the hundred added later, grouped by theme. This is the step that
 * turns the second into part of the first, and it is idempotent - running it twice changes nothing.
 */

import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SPECIES_DIR = join(ROOT, "data", "species");
const apply = process.argv.includes("--apply");

const batches = readdirSync(SPECIES_DIR)
  .filter((name) => /^batch-\d+\.ts$/.test(name))
  .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));

if (batches.length === 0) {
  console.error("No batches in data/species/. Nothing to merge.");
  process.exit(1);
}

const slugs = new Map();
const ids = new Map();
const problems = [];

for (const name of ["..", "animals.ts", ...batches.map((batch) => join("species", batch))].filter((entry) => entry !== "..")) {
  const source = readFileSync(join(ROOT, "data", name), "utf8");
  for (const match of source.matchAll(/slug: "([a-z0-9-]+)"/g)) {
    if (slugs.has(match[1])) problems.push(`slug "${match[1]}" appears in both ${slugs.get(match[1])} and ${name}`);
    slugs.set(match[1], name);
  }
  for (const match of source.matchAll(/id: "([0-9a-f-]+)"/g)) {
    if (ids.has(match[1])) problems.push(`id ${match[1]} appears in both ${ids.get(match[1])} and ${name}`);
    ids.set(match[1], name);
  }
}

const perBatch = batches.map((name) => ({ name, count: (readFileSync(join(SPECIES_DIR, name), "utf8").match(/slug: "/g) ?? []).length }));
console.log("catalogue: " + slugs.size + " species across data/animals.ts + " + batches.length + " batch file(s)");
for (const batch of perBatch) console.log("  " + batch.name + ": " + batch.count + " species");

if (problems.length > 0) {
  console.error("\nCollisions:");
  for (const problem of problems) console.error("  " + problem);
  process.exit(1);
}
console.log("\nno slug or id collisions.");

if (!apply) {
  console.log("Run with --apply to write data/species/index.ts and rewire data/animals.ts.");
  process.exit(0);
}

const indexPath = join(SPECIES_DIR, "index.ts");
const indexSource =
  "import type { Animal } from \"../../types/animal\";\n\n" +
  batches.map((name, i) => `import { BATCH_${i + 1} } from "./${name}";`).join("\n") +
  "\n\n/**\n * The catalogue after Phase 23: the hundred species added to the original twenty-four, grouped by\n" +
  " * the batch file each one was written in. `data/animals.ts` is the only thing that imports this, so\n" +
  " * every reader of the catalogue sees one list.\n */\nexport const EXTRA_ANIMALS: Animal[] = [\n" +
  batches.map((_, i) => `  ...BATCH_${i + 1},`).join("\n") +
  "\n];\n";
writeFileSync(indexPath, indexSource);

const animalsPath = join(ROOT, "data", "animals.ts");
let animals = readFileSync(animalsPath, "utf8");
if (!animals.includes("EXTRA_ANIMALS")) {
  animals = animals.replace(
    'import type { Animal } from "../types/animal";',
    'import type { Animal } from "../types/animal";\n\nimport { EXTRA_ANIMALS } from "./species/index.ts";',
  );
  animals = animals.replace(
    "/** Bundled fallback dataset: powers Demo Mode when Supabase is not configured. */\nexport const ANIMALS: Animal[] = [",
    "/**\n * The species the project shipped with. Phase 23 added a hundred more in data/species/batch-*.ts;\n * they are merged below so that everything reading the catalogue reads one list.\n */\nconst CORE_ANIMALS: Animal[] = [",
  );
  animals = animals.trimEnd() + "\n\n/** The whole catalogue: what the seed SQL, the model pipeline and every page see. */\nexport const ANIMALS: Animal[] = [...CORE_ANIMALS, ...EXTRA_ANIMALS];\n";
  writeFileSync(animalsPath, animals);
}

console.log("wrote data/species/index.ts and rewired data/animals.ts");
