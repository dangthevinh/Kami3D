#!/usr/bin/env node
/**
 * Point the catalogue at the models that are already sitting in the repository.
 *
 *   node scripts/wire-local-models.mjs            # dry run: what would change, and what would not
 *   node scripts/wire-local-models.mjs --apply    # write model_url into the catalogue files
 *
 * ## Why this exists
 *
 * A species with no `model_url` does not render nothing: `components/3d/ModelScene.tsx` falls back to
 * the procedural rig, a body assembled from spheres, capsules, cones and boxes. A visitor reads that
 * as "a fake model", and they are right.
 *
 * Phase 23 downloaded a file for almost every species and recorded its provenance in
 * `data/model-attribution.json` - but only `data/animals.ts` had its `model_url` written. The 84
 * species in `data/species/batch-*.ts` were left at `null`, so 84 real, licensed, attributed models
 * were in the repository and invisible at the same time.
 *
 * ## The gate, and why it is not "wire everything"
 *
 * A file existing is not evidence that it depicts the animal. `npm run models:audit` already reports
 * what is really there, and the list is not pretty: `three-toed-sloth` is an 18th-century musket,
 * `leatherback-turtle` is a leather bag, `reticulated-python` is a cervical vertebra. So this wires
 * only the models the project's own rule trusts - a title that **names the species**, which is the
 * 24-point title term `lib/model-quality.ts` scores and the audit reports as `matched`. Everything
 * else is left at `null` on purpose, and `models:audit` is where that list lives.
 *
 * It edits the source of truth (`data/animals.ts`, `data/species/batch-*.ts`), never the database, so
 * the next `npm run seed:generate` and `npm run db:seed` carry the same answer to Supabase.
 */

import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { ANIMALS } from "../data/animals.ts";
import { evidenceLine, isVerified, rejectionReason } from "../lib/model-verification.ts";
import { scoreModelQuality } from "../lib/model-quality.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const APPLY = process.argv.includes("--apply");

/** The title term of the quality score, out of the weights in lib/model-quality.ts. */
const TITLE_MATCH_POINTS = 24;

/**
 * Models the title rule refuses but the **file itself** names, checked by reading each GLB's own node
 * names. The rule looks at the title because that is all a search result gives you; once the file is
 * on disk there is better evidence inside it, and leaving a correct model unwired because a seller
 * typed "ZEBRA_L.3DS" instead of "Plains Zebra" would be obeying the letter and not the point.
 *
 * Every entry was read out of the GLB with `node -e` over the JSON chunk: node names, mesh names and
 * material names. The reason column is that evidence, so the next person can check it rather than
 * trust it.
 */
const EVIDENCE = {
  "plains-zebra": 'mesh names "ZEBRA_L.3DS" and "ZEBTAIL"',
  "common-ostrich": 'node "ostrich_60"',
  "saltwater-crocodile": 'mesh "Crocodile_Swim_01" on a rig',
  "gila-monster": 'node "Gila monster…" (the title only says "Low-Poly")',
};

/**
 * Two entries were removed from this map after the vision review, and the reason is worth keeping.
 *
 * `serval` was admitted on `node "servaltest.fbx", 28 meshes, rigged` and `hellbender` on
 * `"DitchDoggy.fbx" - ditch dog is a vernacular name for the hellbender`. Both files were read correctly:
 * there really are 28 meshes in a rig, and "ditch dog" really is a vernacular name for the hellbender.
 * What neither note could say is what the files **look like**, and the reviewer's answer was "an upright
 * anime-style humanoid girl with tall animal ears" and "a spiny multi-eyed monster toad".
 *
 * That is the limit of every text gate this file has, stated by two of its own rows, and it is why
 * `data/model-verification.json` exists. Evidence someone typed is evidence about a file name; evidence
 * someone *saw* is evidence about the model.
 */

/**
 * The vision ledger: the one gate here that looked at a picture.
 *
 * A species may be wired on a ledger row that says `matches` **and** whose recorded image md5 is still
 * the md5 of the preview on disk - see `lib/model-verification.ts`, which is where that rule lives and
 * where it is tested. An animal with no preview yet has no ledger row and falls back to the title rule,
 * which is the behaviour this script had before.
 */
const verification = JSON.parse(await readFile(join(ROOT, "data", "model-verification.json"), "utf8"));

/**
 * Models that are **already wired** and should not be, each with the evidence that condemns it.
 *
 * These are the species a visitor is looking at right now when they say the site shows toys: a tiger
 * made of voxels, a penguin chick standing in for the adult, and - the worst of them - a "common
 * octopus" whose entire geometry is `Sphere_Color_0` and `Plane_Color_0`. Un-wiring is not a
 * downgrade: the species page stops claiming a model it does not have, and `models:audit` keeps the
 * row so the gap stays visible instead of being papered over.
 */
const REJECTED = {
  "common-octopus": 'nodes "Sphere_Color_0" and "Plane_Color_0": the model is a sphere on a plane',
  "green-anaconda": 'a MagicaVoxel export ("Scene_-_Root"): a voxel toy',
  "bengal-tiger": 'title "Bengal Tiger Voxel"',
  "red-kangaroo": 'title "Red Kangaroo Voxel"',
  "emperor-penguin": 'title "Walking Emperor Penguin Chick": a chick, not the species',
  "gooty-tarantula": 'title "Mexican Red Knee Tarantula": a different tarantula',
  // Found while colouring the catalogue: this one is not white because it is unpainted, it is white
  // because it is a **skull**. Its nodes are `Skull_2`, its only material is called `Skull`, and it
  // carries no image at all - so there is no colour to restore and no meerkat to show.
  meerkat: 'nodes "Skull_2", material "Skull", no textures: a skull, not a meerkat',
};

const attribution = JSON.parse(await readFile(join(ROOT, "data", "model-attribution.json"), "utf8"));
const preview = JSON.parse(await readFile(join(ROOT, "data", "model-preview.json"), "utf8")).models;

/** The catalogue files, so a species is edited wherever it was written. */
async function catalogueFiles() {
  const species = await readdir(join(ROOT, "data", "species"));
  return [
    join(ROOT, "data", "animals.ts"),
    ...species.filter((name) => name.endsWith(".ts") && name.startsWith("batch-")).sort().map((name) => join(ROOT, "data", "species", name)),
  ];
}

const FILES = await catalogueFiles();

/** Which file holds this slug, read fresh each time so two edits to one file cannot race. */
async function fileWithSlug(slug) {
  for (const file of FILES) {
    const source = await readFile(file, "utf8");
    if (source.includes(`slug: "${slug}"`)) return { file, source };
  }
  return null;
}

/** The same scoped, verified edit `scripts/fetch-models.mjs --wire` makes. */
async function wire(file, source, slug, url) {
  const slugIndex = source.indexOf(`slug: "${slug}"`);
  if (slugIndex === -1) throw new Error(`could not find slug "${slug}" in ${file}`);

  const fieldIndex = source.indexOf("model_url:", slugIndex);
  if (fieldIndex === -1) throw new Error(`could not find model_url for "${slug}"`);
  if (fieldIndex - slugIndex > 4000) throw new Error(`the model_url after "${slug}" belongs to another species`);

  const lineEnd = source.indexOf("\n", fieldIndex);
  const current = source.slice(fieldIndex, lineEnd);
  if (current.includes(url)) return null;

  const spacing = current.match(/^model_url:\s*/)?.[0] ?? "model_url: ";
  const next = source.slice(0, fieldIndex) + `${spacing}"${url}",` + source.slice(lineEnd);
  if (!next.includes(`model_url: "${url}"`)) throw new Error("the edit produced no change; aborting");
  return next;
}

const wireable = [];
const refused = [];

for (const animal of ANIMALS) {
  const entry = attribution[animal.slug];
  const url = entry?.file ?? null;

  if (animal.model_url) continue;
  if (!entry || !url) {
    refused.push({ slug: animal.slug, why: "no entry in data/model-attribution.json" });
    continue;
  }
  if (!existsSync(join(ROOT, "public", url))) {
    refused.push({ slug: animal.slug, why: "the manifest points at " + url + ", which is not in the repository" });
    continue;
  }

  const [bytes, faces] = preview[animal.slug] ?? [entry.bytes ?? 0, null];
  const quality = scoreModelQuality({
    title: entry.title ?? "",
    terms: [animal.name, animal.latin_name ?? "", animal.category ?? ""],
    spdx: entry.license === "CC0" ? "CC0-1.0" : "CC-BY-4.0",
    faceCount: faces,
    downloadCount: null,
    likeCount: null,
    hasThumbnail: true,
  });

  // The ledger first, because it is the only gate here that looked at the file rather than at a name.
  const previewFile = join(ROOT, "public", "previews", animal.slug + ".webp");
  const imageMd5 = existsSync(previewFile) ? createHash("md5").update(readFileSync(previewFile)).digest("hex") : null;
  const record = verification.entries[animal.slug] ?? null;
  const vision = isVerified(record, imageMd5) ? record : null;

  if (quality.title < TITLE_MATCH_POINTS && !EVIDENCE[animal.slug] && !vision) {
    refused.push({
      slug: animal.slug,
      why:
        'the title "' + entry.title + '" does not name the species' +
        (record ? " and the vision review says: " + rejectionReason(record, imageMd5) : " and no vision verdict is recorded"),
    });
    continue;
  }

  wireable.push({
    slug: animal.slug,
    url,
    title: entry.title,
    license: entry.license,
    bytes,
    faces,
    because: vision ? evidenceLine(vision) : (EVIDENCE[animal.slug] ?? null),
  });
}

console.log(wireable.length + " species can be wired to a model whose title names them:");
for (const row of wireable) {
  console.log("  " + row.slug.padEnd(28), String(Math.round(row.bytes / 1024) + "kB").padStart(8), String(row.faces ?? "?").padStart(7) + " faces", " " + row.license, " " + row.title);
}

console.log("\n" + refused.length + " left alone, and this is the list worth reading:");
for (const row of refused) console.log("  " + row.slug.padEnd(28), row.why);

/** The wired models that should not be: see REJECTED. */
const toUnwire = ANIMALS.filter((animal) => animal.model_url && REJECTED[animal.slug]);
console.log("\n" + toUnwire.length + " wired models that should not be:");
for (const animal of toUnwire) console.log("  " + animal.slug.padEnd(28), REJECTED[animal.slug]);

/**
 * The wired models the vision review says are the wrong thing, listed but **not** un-wired here.
 *
 * This list is the reason the ledger was built, and it is printed rather than acted on because
 * un-wiring is a change to the catalogue a reader sees: the species stops claiming a model it does not
 * have and falls back to the procedural rig, and for a monument the entry has to leave
 * `data/<catalogue>-attribution.json` at the same time or `scripts/check-catalogues.mjs` fails on the
 * two disagreeing. That is a decision with a list in front of it, not a side effect of running a gate -
 * see the Phase 35 section of PLAN.md, where all of them are written out with the reviewer's own
 * sentence about what the file actually shows.
 */
const wrongNow = ANIMALS.filter(
  (animal) => animal.model_url && verification.entries[animal.slug]?.verdict === "mismatch",
);
console.log("\n" + wrongNow.length + " wired models the vision review says are the wrong thing (not un-wired here):");
for (const animal of wrongNow) {
  console.log("  " + animal.slug.padEnd(28), verification.entries[animal.slug].subject);
}

if (!APPLY) {
  console.log("\nDry run. Add --apply to write model_url into the catalogue files.");
  process.exit(0);
}

let unwired = 0;
for (const animal of toUnwire) {
  const found = await fileWithSlug(animal.slug);
  if (!found) continue;
  const slugIndex = found.source.indexOf(`slug: "${animal.slug}"`);
  const fieldIndex = found.source.indexOf("model_url:", slugIndex);
  const lineEnd = found.source.indexOf("\n", fieldIndex);
  const spacing = found.source.slice(fieldIndex, lineEnd).match(/^model_url:\s*/)?.[0] ?? "model_url: ";
  const next = found.source.slice(0, fieldIndex) + spacing + "null," + found.source.slice(lineEnd);
  if (!next.includes("model_url: null")) throw new Error("un-wiring produced no change for " + animal.slug);
  await writeFile(found.file, next, "utf8");
  unwired += 1;
}
console.log("\nUn-wired " + unwired + " species back to null.");

let written = 0;
for (const row of wireable) {
  const found = await fileWithSlug(row.slug);
  if (!found) {
    console.error("  !! " + row.slug + " is not in any catalogue file");
    continue;
  }
  const next = await wire(found.file, found.source, row.slug, row.url);
  if (next === null) continue;
  await writeFile(found.file, next, "utf8");
  written += 1;
}
console.log("\nWired " + written + " of " + wireable.length + " species.");
