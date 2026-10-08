#!/usr/bin/env node
/**
 * Source a 3D model for each historic landmark, under the same rules as the animals.
 *
 *   node scripts/fetch-landmark-models.mjs                      # report what is available, download nothing
 *   node scripts/fetch-landmark-models.mjs --apply              # download, compress and credit
 *   node scripts/fetch-landmark-models.mjs --slug=eiffel-tower --apply
 *
 * ## The rules are the animal rules, because they are not about animals
 *
 * This script owns no policy of its own. It imports the licence allow-list, the title-match ranking
 * and the compressor from `fetch-models.mjs`, so a landmark model is accepted on exactly the terms a
 * species model is:
 *
 *   1. **licence CC0 / public domain / CC BY**, with share-alike, no-derivatives, non-commercial and
 *      all-rights-reserved refused - `evaluateLicense`, the same table the animal pipeline uses;
 *   2. **the title must name the thing** - `rankCandidates`, which scores a candidate by whether its
 *      own title contains the name. "Eiffel Tower Telephone" is not the Eiffel Tower, and the search
 *      result that says so is refused rather than shipped;
 *   3. **inside the polygon budget** - `FACE_BUDGET.max`, 800k. Sketchfab is full of photogrammetry
 *      of a monument at four million triangles, which is a beautiful file and an unusable web asset.
 *      The weight ceiling is the project's 25 MB, applied **after compression**, to the file this
 *      pipeline actually writes: a provider's declared size is a pre-compression number and is only
 *      used, with headroom, to decide whether downloading is worth trying;
 *   4. **DRACO-compressed** by the same `compressGlb` the catalogue already ships with;
 *   5. **no model means no entry.** Nothing is substituted, and the landmark is reported as unsourced
 *      rather than given a stand-in - the rule the whole catalogue follows.
 *
 * ## What is different here
 *
 * Only the shape of the query and where the files land: `data/landmark-queries.json` holds the saved
 * search per landmark (the same idea as `data/model-queries.json`), models go to
 * `public/models/landmarks/`, and credits go to `data/landmark-attribution.json` so the two
 * catalogues cannot overwrite each other's manifest.
 *
 * ## A model chosen by hand: `data/landmark-sources.json`
 *
 *   { "eiffel-tower": { "sketchfabUid": "6830e60d2c1048f2a33e92679664f652" } }
 *
 * A pin replaces the **search** for that slug with exactly one candidate, the model somebody chose. Two
 * rules make it safe to have:
 *
 *   1. **the gates still run.** A pinned model is refused for the same reasons a searched one is -
 *      licence, title, polygon budget, colour, the crude-monument rule, the compressed ceiling. A pin is
 *      a decision about *which* model to try, not a bypass;
 *   2. **there is no fallback.** If the pinned model fails, the landmark is reported unsourced with the
 *      reason and **no other model is tried**, because quietly substituting the second-best result would
 *      undo the decision the pin records.
 */

import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as sleep } from "node:timers/promises";

import { ALL_LANDMARKS } from "../data/landmarks/all.ts";
import { namesTheLandmark } from "../lib/landmark-gate.ts";
import { CRUDE_MONUMENT_FACES, FACE_BUDGET, modelCanShowColour, modelHasNoTexture } from "../lib/model-quality.ts";
import { CONFIG, PROVIDERS, compressGlb, loadEnvFiles, rankCandidates } from "./fetch-models.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const QUERIES_FILE = join(ROOT, "data", "landmark-queries.json");
const SOURCES_FILE = join(ROOT, "data", "landmark-sources.json");
const ATTRIBUTION_FILE = join(ROOT, "data", "landmark-attribution.json");
const MODEL_DIR = join(ROOT, "public", "models", "landmarks");

const flags = process.argv.slice(2);
const APPLY = flags.includes("--apply");
const only = flags.find((arg) => arg.startsWith("--slug="))?.slice("--slug=".length);

await loadEnvFiles();

const queries = JSON.parse(await readFile(QUERIES_FILE, "utf8"));

/** Models named by hand, which skip the search. Empty (or absent) means every slug is searched. */
const pins = existsSync(SOURCES_FILE) ? JSON.parse(await readFile(SOURCES_FILE, "utf8")) : {};

const attribution = existsSync(ATTRIBUTION_FILE)
  ? JSON.parse(await readFile(ATTRIBUTION_FILE, "utf8"))
  : {};

await mkdir(MODEL_DIR, { recursive: true });

/**
 * The terms a candidate's title has to name: the landmark, and its city or country as a bonus.
 *
 * This is only for the **ranking** - the score is a better-is-higher ordering, and the hard gate is
 * `namesTheLandmark` below. The two are not the same question and the ranker's answer to the second
 * one is too generous.
 */
const termsFor = (landmark) => ({
  name: landmark.name,
  latin_name: landmark.city,
  category: landmark.country,
});

/** Accents stripped and lowercased, so "Sagrada Família" matches a title that writes "Familia". */
const sourced = [];
const unsourced = [];

for (const landmark of ALL_LANDMARKS) {
  if (only && landmark.slug !== only) continue;

  const pin = pins[landmark.slug] ?? null;
  const query = queries[landmark.slug];

  if (!query && !pin) {
    unsourced.push({ slug: landmark.slug, why: "no saved search in data/landmark-queries.json" });
    continue;
  }

  try {
    // One candidate when a person named the model, twenty-four when the pipeline has to look. The
    // description comes from the same provider object a search uses, so the shape downstream is identical.
    const candidates = pin
      ? [await PROVIDERS.sketchfab.describe(pin.sketchfabUid)]
      : await PROVIDERS.sketchfab.search(query, { limit: 24 });

    const ranked = rankCandidates(candidates, termsFor(landmark));

    // Refused for a reason, and the reason is worth printing: this is where "Eiffel Tower
    // Telephone" and "Ruins of a generic temple" get filtered out.
    const rejected = [];
    let chosen = null;

    for (const entry of ranked) {
      const named = namesTheLandmark(entry.candidate, landmark);
      if (!named.ok) { rejected.push(entry.candidate.title + " (" + named.reason + ")"); continue; }
      if (!entry.licence.ok) { rejected.push(entry.candidate.title + " (" + entry.licence.reason + ")"); continue; }
      if (!entry.candidate.downloadable) { rejected.push(entry.candidate.title + " (download disabled by the author)"); continue; }
      const faces = entry.candidate.faceCount;
      if (typeof faces === "number" && faces > FACE_BUDGET.max) {
        rejected.push(entry.candidate.title + " (" + faces + " faces, over the " + FACE_BUDGET.max + " budget)");
        continue;
      }
      chosen = entry;
      break;
    }

    if (!chosen) {
      const why = rejected.length ? "every candidate was refused: " + rejected.slice(0, 3).join("; ") : "no search results";
      unsourced.push({ slug: landmark.slug, why: pin ? "the pinned model was refused: " + why : why });
      continue;
    }

    if (!APPLY) {
      const preview = chosen.candidate;
      console.log(
        "  " + landmark.slug.padEnd(24) +
        String(preview.faceCount ?? "?").padStart(9) + " faces  " +
        chosen.licence.spdx.padEnd(9) + " " + preview.title.slice(0, 40),
      );
      sourced.push({ slug: landmark.slug, candidate: preview, licence: chosen.licence });
      continue;
    }

    /*
     * Download, and if that fails on **this** candidate, try the next one rather than giving up on
     * the landmark.
     *
     * The first run stopped at Neuschwanstein because the best-scoring file declared 30.5 MB against
     * the 25 MB ceiling - and the pipeline's answer to "this one is too heavy" should be the next
     * best model of the same building, not no building at all. Every refusal is printed with its
     * reason, so a landmark that ends up unsourced says exactly what was tried.
     *
     * "Too heavy" is now decided twice and in the right order: the declared size only has to clear
     * `declaredHeadroom` to earn a download, and the compressed file has to clear the ceiling itself.
     */
    const target = join(MODEL_DIR, landmark.slug + ".glb");
    let attempt = null;
    let downloaded = null;
    let squashed = null;

    for (const entry of ranked) {
      const named = namesTheLandmark(entry.candidate, landmark);
      if (!named.ok) continue;
      if (!entry.licence.ok) continue;
      if (!entry.candidate.downloadable) continue;
      const faces = entry.candidate.faceCount;
      if (typeof faces === "number" && faces > FACE_BUDGET.max) continue;

      try {
        const result = await PROVIDERS.sketchfab.download(entry.candidate, target);
        if (result.format !== "glb") {
          await rm(result.file, { force: true });
          rejected.push(entry.candidate.title + " (served a " + result.format + " archive, not a glb)");
          continue;
        }
        // Downloaded, and now the one question a search result cannot answer: does the file have any
        // colour in it? A model whose materials declare neither a texture nor a factor renders white,
        // and the first Colosseum this pipeline picked was exactly that - 27 materials carrying
        // nothing but metallicFactor. It is refused here and the next candidate is tried, because a
        // colourless monument is the same failure as a colourless animal.
        const parsed = JSON.parse(
          (await readFile(result.file)).slice(20, 20 + (await readFile(result.file)).readUInt32LE(12)).toString("utf8"),
        );
        if (!modelCanShowColour(parsed)) {
          await rm(result.file, { force: true });
          rejected.push(entry.candidate.title + " (the file declares no colour at all)");
          continue;
        }
        // The second question a search result cannot answer, and the counterpart of the colour gate: a
        // model with almost no geometry and **nothing painted on it** is a diagram of the monument, not
        // a model of it. See CRUDE_MONUMENT_FACES for why both halves are required and what each half
        // misses on its own.
        const faces = entry.candidate.faceCount ?? null;
        if (faces !== null && faces < CRUDE_MONUMENT_FACES && modelHasNoTexture(parsed)) {
          await rm(result.file, { force: true });
          rejected.push(
            entry.candidate.title + " (" + faces + " triangles and no texture: a diagram of the " +
              "building, not a model of it)",
          );
          continue;
        }

        // Compress first, then measure. The ceiling is 25 MB **on the file this project ships**, and
        // the number a provider declares is a pre-compression size: the Milan and Cologne cathedrals
        // and Prambanan were all refused for declaring 33.8, 39.3 and 29.9 MB, while the heaviest
        // model the site actually serves is 12 MB. So the size gate is applied here, where it
        // describes something real, and a file that is still over after DRACO is deleted and the next
        // candidate tried rather than wired into the catalogue.
        const compressed = await compressGlb(result.file);
        const shipped = (await readFile(result.file)).length;
        if (shipped > CONFIG.maxBytes) {
          await rm(result.file, { force: true });
          rejected.push(
            entry.candidate.title +
              " (compressed to " + (shipped / 1048576).toFixed(1) + " MB, over the " +
              (CONFIG.maxBytes / 1048576).toFixed(0) + " MB ceiling)",
          );
          continue;
        }

        attempt = entry;
        downloaded = result;
        squashed = compressed;
        break;
      } catch (error) {
        rejected.push(entry.candidate.title + " (" + String(error.message).split("\n")[0] + ")");
      }
      await sleep(400);
    }

    if (!attempt || !downloaded) {
      const why = "nothing downloadable fitted: " + rejected.slice(-3).join("; ");
      // A pin has exactly one candidate, so this is the end of the road for the slug - which is the
      // point of a pin: the pipeline does not quietly reach for the next-best model instead.
      unsourced.push({ slug: landmark.slug, why: pin ? "the pinned model was refused: " + why : why });
      continue;
    }

    const candidate = attempt.candidate;
    const chosenLicence = attempt.licence;
    console.log(
      "  " + landmark.slug.padEnd(24) +
      String(candidate.faceCount ?? "?").padStart(9) + " faces  " +
      chosenLicence.spdx.padEnd(9) + " " + candidate.title.slice(0, 40),
    );

    const bytes = (await readFile(target)).length;

    attribution[landmark.slug] = {
      title: candidate.title,
      author: candidate.author,
      authorUrl: candidate.authorUrl,
      license: chosenLicence.spdx,
      licenseUrl: candidate.licenseUrl,
      sourceUrl: candidate.sourceUrl,
      provider: candidate.provider,
      file: "/models/landmarks/" + landmark.slug + ".glb",
      format: "glb",
      bytes,
      sha256: createHash("sha256").update(await readFile(target)).digest("hex"),
      attributionRequired: chosenLicence.attributionRequired,
      fetchedAt: new Date().toISOString(),
      faceCount: candidate.faceCount ?? null,
      compressed: squashed.kept,
    };

    sourced.push({ slug: landmark.slug, candidate, licence: chosenLicence, bytes });
    await sleep(600);
  } catch (error) {
    unsourced.push({ slug: landmark.slug, why: String(error.message).split("\n")[0] });
  }
}

if (APPLY && sourced.length > 0) {
  const sorted = Object.fromEntries(Object.entries(attribution).sort(([a], [b]) => a.localeCompare(b)));
  await writeFile(ATTRIBUTION_FILE, JSON.stringify(sorted, null, 2) + "\n", "utf8");
}

console.log("\n" + sourced.length + " landmark(s) sourced, " + unsourced.length + " not:");
for (const row of unsourced) console.log("  - " + row.slug.padEnd(24) + row.why);

if (!APPLY) {
  console.log("\nDry run. Add --apply to download them.");
  process.exit(0);
}

// Wiring, in the same shape as `wire-local-models.mjs`: the catalogue files are the source of truth,
// so a downloaded file that no entry points at is a file nobody will ever see.
//
// Three files, because the catalogue outgrew one: the original fifteen are in `data/landmarks.ts` and
// the researched batches are in `data/landmarks/world-*.ts`. A wiring step that looked in one file
// would report successes and point at nothing.
const CATALOGUE_FILES = [
  join(ROOT, "data", "landmarks.ts"),
  join(ROOT, "data", "landmarks", "world-1.ts"),
  join(ROOT, "data", "landmarks", "world-2.ts"),
];

/** The file a slug lives in, read fresh so two edits to one file cannot race. */
async function fileWith(slug) {
  for (const file of CATALOGUE_FILES) {
    const text = await readFile(file, "utf8");
    if (text.includes('slug: "' + slug + '"')) return { file, text };
  }
  return null;
}

let wired = 0;

for (const row of sourced) {
  const found = await fileWith(row.slug);
  if (!found) {
    console.error("  ! " + row.slug + " is in none of the catalogue files");
    continue;
  }

  let source = found.text;
  const slugIndex = source.indexOf('slug: "' + row.slug + '"');
  const fieldIndex = source.indexOf("model_url:", slugIndex);
  if (fieldIndex === -1 || fieldIndex - slugIndex > 4000) {
    console.error("  ! could not find the model_url that belongs to " + row.slug);
    continue;
  }

  const lineEnd = source.indexOf("\n", fieldIndex);
  const url = "/models/landmarks/" + row.slug + ".glb";
  if (source.slice(fieldIndex, lineEnd).includes(url)) continue;

  const spacing = source.slice(fieldIndex, lineEnd).match(/^model_url:\s*/)?.[0] ?? "model_url: ";
  source = source.slice(0, fieldIndex) + spacing + '"' + url + '",' + source.slice(lineEnd);
  if (!source.includes('model_url: "' + url + '"')) throw new Error("the wiring produced no change for " + row.slug);
  await writeFile(found.file, source, "utf8");
  wired += 1;
}

console.log(wired > 0 ? "\nWired " + wired + " model(s) into the catalogue." : "\nNothing new to wire.");

// The hover index, in the same shape and for the same reason as data/model-preview.json: a card
// decides in the browser whether it may fetch a file, and it must not import the credit manifest to
// do it. Written from the same object in the same breath, so the two cannot disagree.
await writeFile(
  join(ROOT, "data", "landmark-preview.json"),
  JSON.stringify({
    note: "Generated by scripts/fetch-landmark-models.mjs from data/landmark-attribution.json. Same shape as data/model-preview.json and for the same reason: a card decides on hover whether it may fetch the file, and the decision has to happen in the browser without importing the credit manifest. Edit the manifest, not this file.",
    models: Object.fromEntries(
      Object.entries(attribution).map(([slug, entry]) => [slug, [entry.bytes ?? 0, entry.faceCount ?? null]]),
    ),
  }) + "\n",
  "utf8",
);
