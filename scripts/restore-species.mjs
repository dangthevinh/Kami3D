#!/usr/bin/env node
/**
 * Put a species back into the catalogue - the inverse of `drop-species-without-models.mjs`.
 *
 *   node scripts/restore-species.mjs --species=walrus,reindeer        # dry run
 *   node scripts/restore-species.mjs --species=walrus,reindeer --apply
 *
 * ## Why this exists
 *
 * The 34 species that had no model were deleted from the catalogue, the seed and the database rather
 * than left standing with a placeholder. Their data was never wrong - the facts, the habitat, the
 * conservation status and the geodata were all real and sourced - and it is still in git. Bringing a
 * species back should not mean retyping it, and retyping it is how a fact quietly changes.
 *
 * So this reads the object literal out of `git show HEAD:<file>`, which is the version before the
 * deletion, and appends it to the array in the same file it came from. The restored entry keeps
 * `model_url: null`: a species comes back when it has a model, and `scripts/generate-models.mjs`
 * plus `scripts/wire-local-models.mjs` are what give it one.
 *
 * Ordering note: a restored species lands at the end of its batch array, not in its original
 * position. Array order is not read anywhere - `getAllAnimals()` sorts by popularity - so this is
 * cosmetic, and it is said here rather than discovered later in a diff.
 */

import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const APPLY = process.argv.includes("--apply");
const requested = (process.argv.find((arg) => arg.startsWith("--species=")) ?? "").slice("--species=".length)
  .split(",").map((slug) => slug.trim()).filter(Boolean);

if (requested.length === 0) {
  console.error("Pass --species=a,b,c. These are the species the catalogue no longer has but git does:");
  console.error("  node scripts/drop-species-without-models.mjs   # prints the list it would remove");
  process.exit(2);
}

const files = [
  "data/animals.ts",
  ...readdirSync(join(ROOT, "data", "species"))
    .filter((name) => name.startsWith("batch-") && name.endsWith(".ts"))
    .sort()
    .map((name) => "data/species/" + name),
];

/** The object literal for one slug, from a file's text. The same brace walk the drop script uses. */
function objectFor(source, slug, where) {
  const at = source.indexOf('slug: "' + slug + '",');
  if (at === -1) return null;

  const open = source.lastIndexOf("\n  {\n", at);
  if (open === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;
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
  if (depth !== 0) throw new Error("could not find the end of " + slug + " in " + where);

  const text = source.slice(open + 3, index + 1);
  if (!/^\{\n\s+id: "/.test(text) || !text.includes('slug: "' + slug + '",')) {
    throw new Error("the entry for " + slug + " in " + where + " does not look like a species object");
  }
  return text;
}

const head = (file) => execFileSync("git", ["show", "HEAD:" + file], { cwd: ROOT, encoding: "utf8" });
const current = new Map();
const original = new Map();
for (const file of files) {
  if (!existsSync(join(ROOT, file))) continue;
  current.set(file, await readFile(join(ROOT, file), "utf8"));
  try {
    original.set(file, head(file));
  } catch {
    // A file that did not exist at HEAD simply has nothing to restore from.
  }
}

const work = [];
for (const slug of requested) {
  if (files.some((file) => current.get(file)?.includes('slug: "' + slug + '"'))) {
    console.log("  = " + slug.padEnd(28) + "already in the catalogue");
    continue;
  }

  let found = null;
  for (const file of files) {
    const source = original.get(file);
    if (!source || !source.includes('slug: "' + slug + '"')) continue;
    found = { file, text: objectFor(source, slug, file) };
    break;
  }
  if (!found) {
    console.log("  ! " + slug.padEnd(28) + "not in git HEAD either - it has to be written from scratch");
    continue;
  }
  work.push({ slug, ...found });
  console.log("  + " + slug.padEnd(28) + found.file);
}

if (work.length === 0) {
  console.log("\nNothing to restore.");
  process.exit(0);
}

if (!APPLY) {
  console.log("\nDry run. Add --apply to append " + work.length + " species back to their files.");
  process.exit(0);
}

for (const [file, source] of current) {
  const forThisFile = work.filter((entry) => entry.file === file);
  if (forThisFile.length === 0) continue;

  const close = source.lastIndexOf("\n];");
  if (close === -1) throw new Error("could not find the end of the array in " + file);

  const block = forThisFile.map((entry) => "  " + entry.text.replace(/\n/g, "\n  ") + ",\n").join("");
  await writeFile(file, source.slice(0, close + 1) + "\n" + block + source.slice(close + 1), "utf8");
  console.log(file + ": +" + forThisFile.length);
}

console.log("\nRestored " + work.length + " species with model_url: null. Next:");
console.log("  node scripts/generate-models.mjs --species=" + work.map((entry) => entry.slug).join(",") + " --apply");
