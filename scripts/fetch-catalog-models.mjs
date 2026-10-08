#!/usr/bin/env node
/**
 * Source a 3D model for every entry of a catalogue, under the same rules as the animals and landmarks.
 *
 *   node scripts/fetch-catalog-models.mjs --catalogue=space              # report, download nothing
 *   node scripts/fetch-catalog-models.mjs --catalogue=space --apply      # download, compress, credit, wire
 *   node scripts/fetch-catalog-models.mjs --catalogue=plants --slug=oak --apply
 *
 * ## The rules are the animal and landmark rules, because they are not about animals or landmarks
 *
 * This script owns no policy of its own. Every gate is imported from the module that already owns it:
 *
 *   1. **licence CC0 / public domain / CC BY** - `evaluateLicense` inside `rankCandidates`, the same
 *      table the other two pipelines use. Share-alike, no-derivatives, non-commercial and
 *      all-rights-reserved are refused;
 *   2. **the title must name the thing** - `titleNamesEntry` from `lib/catalog-gate.ts`;
 *   3. **inside the polygon budget** - `FACE_BUDGET.max`, 800k. A provider that does not report a face
 *      count (NASA's repository does not) has it **counted from the downloaded file** rather than
 *      trusted, so the budget means the same thing on both providers;
 *   4. **it must have a colour** - `modelCanShowColour`, checked after the download;
 *   5. **and something to look at** - `CRUDE_MONUMENT_FACES` + `modelHasNoTexture`: a file with almost
 *      no geometry *and* nothing painted on it is a diagram, not a model;
 *   6. **DRACO-compressed**, then measured against the project's 25 MB ceiling **on the file that
 *      ships**, not on the size the provider declared;
 *   7. **no model means no entry.** An entry that cannot be sourced is reported and then **deleted**
 *      from its catalogue by `scripts/drop-entries-without-models.mjs` - the rule the user set for the
 *      animals and the landmarks, applied to the three new subjects.
 *
 * ## Two providers, merged
 *
 * Space is mostly NASA (public domain, keyless); plants and vehicles are Sketchfab. Both are searched
 * for every entry and the results are ranked together, so a model is chosen on its merits rather than
 * on which catalogue it happened to live in.
 */

import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as sleep } from "node:timers/promises";

import { titleNamesEntry } from "../lib/catalog-gate.ts";
import {
  CRUDE_MONUMENT_FACES,
  FACE_BUDGET,
  modelCanShowColour,
  modelHasNoTexture,
} from "../lib/model-quality.ts";
import { CONFIG, PROVIDERS, compressGlb, loadEnvFiles, rankCandidates } from "./fetch-models.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/** The catalogues this script can fill. Each one is data plus where its files and records go. */
const CATALOGUES = {
  space: { module: "../data/space.ts", exported: "SPACE_ENTRIES", label: "space" },
  plants: { module: "../data/plants.ts", exported: "PLANT_ENTRIES", label: "plants" },
  vehicles: { module: "../data/vehicles.ts", exported: "VEHICLE_ENTRIES", label: "vehicles" },
  // `dataFile` is stated for buildings because its name is not its id: `data/buildings.ts` is the
  // modern-monument rule, and this pipeline writes `model_url` back into the file it read the entries
  // from. Deriving the path from the id would rewrite the rule file with entry objects.
  buildings: {
    module: "../data/buildings-entries.ts",
    exported: "BUILDING_ENTRIES",
    label: "buildings",
    dataFile: "data/buildings-entries.ts",
  },
};

/** NASA's repository is keyless and public domain; Sketchfab carries the rest. */
const SEARCHABLE = ["nasa", "sketchfab"];

const flags = process.argv.slice(2);
const APPLY = flags.includes("--apply");
const only = flags.find((arg) => arg.startsWith("--slug="))?.slice("--slug=".length);
const catalogueId = flags.find((arg) => arg.startsWith("--catalogue="))?.slice("--catalogue=".length) ?? "space";

if (!CATALOGUES[catalogueId]) {
  console.error("unknown catalogue " + catalogueId + "; expected one of " + Object.keys(CATALOGUES).join(", "));
  process.exit(1);
}

const catalogue = CATALOGUES[catalogueId];
const DATA_FILE = join(ROOT, catalogue.dataFile ?? join("data", catalogueId + ".ts"));
const QUERIES_FILE = join(ROOT, "data", catalogueId + "-queries.json");
const ATTRIBUTION_FILE = join(ROOT, "data", catalogueId + "-attribution.json");
const PREVIEW_FILE = join(ROOT, "data", catalogueId + "-preview.json");
const MODEL_DIR = join(ROOT, "public", "models", catalogueId);

await loadEnvFiles();
await mkdir(MODEL_DIR, { recursive: true });

const queries = existsSync(QUERIES_FILE) ? JSON.parse(await readFile(QUERIES_FILE, "utf8")) : {};
const attribution = existsSync(ATTRIBUTION_FILE) ? JSON.parse(await readFile(ATTRIBUTION_FILE, "utf8")) : {};

const module_ = await import(catalogue.module);
const entries = module_[catalogue.exported];
if (!Array.isArray(entries)) {
  console.error(catalogue.module + " does not export an array called " + catalogue.exported);
  process.exit(1);
}

/**
 * The other names an entry's model may be filed under, declared in its own data.
 *
 * The display name must name **all** of its own words to pass the gate, which is right for "Oak tree"
 * and wrong for a ship class: the model of the Los Angeles class is titled "Los angeles class" and the
 * word "submarine" is nowhere in it. Rather than distort the name a reader sees - or refuse a real
 * 30,700-triangle model of the right ships - the entry declares what its model may be called, and the
 * gate checks those names too. Nothing about the display name changes.
 */
function aliasesOf(entry) {
  const aliases = entry.metadata?.model_aliases;
  return Array.isArray(aliases) ? aliases.filter((value) => typeof value === "string") : null;
}

/** How many triangles a downloaded file actually holds, for providers that do not say. */
function trianglesIn(gltf) {
  let triangles = 0;
  for (const mesh of gltf.meshes ?? []) {
    for (const primitive of mesh.primitives ?? []) {
      const indexed = primitive.indices !== undefined ? gltf.accessors?.[primitive.indices]?.count : undefined;
      triangles += (indexed ?? gltf.accessors?.[primitive.attributes?.POSITION ?? -1]?.count ?? 0) / (indexed ? 3 : 3);
    }
  }
  return Math.round(triangles);
}

const sourced = [];
const unsourced = [];

for (const entry of entries) {
  if (only && entry.slug !== only) continue;

  // An entry that already has a wired model is done. Re-running the pipeline after a harvest pass is
  // the normal case now that this site grows a hundred entries at a time, and re-downloading the models
  // it already has would make every pass cost minutes for nothing.
  if (entry.model_url && existsSync(join(ROOT, "public", entry.model_url.replace(/^\//, "")))) continue;

  const query = queries[entry.slug];
  if (!query) {
    unsourced.push({ slug: entry.slug, why: "no saved search in data/" + catalogueId + "-queries.json" });
    continue;
  }

  try {
    const gathered = [];
    for (const providerId of SEARCHABLE) {
      try {
        gathered.push(...(await PROVIDERS[providerId].search(query, { limit: 24 })));
      } catch (error) {
        console.warn("  ! " + providerId + " search failed for " + entry.slug + ": " + String(error.message).split("\n")[0]);
      }
    }

    const ranked = rankCandidates(gathered, {
      name: entry.name,
      // An empty string rather than null: a strain the ranker does not need to defend against, and the
      // same shape the animal pipeline passes.
      latin_name: typeof entry.metadata?.scientific_name === "string" ? entry.metadata.scientific_name : "",
      category: typeof entry.metadata?.kind === "string" ? entry.metadata.kind : catalogueId,
    });

    const rejected = [];
    let chosen = null;

    for (const candidate of ranked) {
      const named = titleNamesEntry(candidate.candidate, {
        name: entry.name,
        scientific_name: typeof entry.metadata?.scientific_name === "string" ? entry.metadata.scientific_name : null,
        aliases: aliasesOf(entry),
      });
      if (!named.ok) continue;
      if (!candidate.licence.ok) {
        rejected.push(candidate.candidate.title + " (" + candidate.licence.reason + ")");
        continue;
      }
      if (!candidate.candidate.downloadable) continue;
      const faces = candidate.candidate.faceCount;
      if (typeof faces === "number" && faces > FACE_BUDGET.max) {
        rejected.push(candidate.candidate.title + " (" + faces + " faces, over the " + FACE_BUDGET.max + " budget)");
        continue;
      }
      chosen = candidate;
      break;
    }

    if (!chosen) {
      unsourced.push({
        slug: entry.slug,
        why: rejected.length ? "every licence-clean candidate was refused: " + rejected.slice(0, 3).join("; ") : "no named, licence-clean result",
      });
      continue;
    }

    if (!APPLY) {
      console.log(
        "  " + entry.slug.padEnd(26) +
        String(chosen.candidate.faceCount ?? "?").padStart(9) + " faces  " +
        chosen.licence.spdx.padEnd(10) + chosen.candidate.provider.padEnd(10) +
        chosen.candidate.title.slice(0, 38),
      );
      sourced.push({ slug: entry.slug, candidate: chosen.candidate, licence: chosen.licence });
      continue;
    }

    const target = join(MODEL_DIR, entry.slug + ".glb");
    let attempt = null;
    let downloaded = null;
    let squashed = null;

    for (const candidate of ranked) {
      const named = titleNamesEntry(candidate.candidate, {
        name: entry.name,
        scientific_name: typeof entry.metadata?.scientific_name === "string" ? entry.metadata.scientific_name : null,
        aliases: aliasesOf(entry),
      });
      if (!named.ok) continue;
      if (!candidate.licence.ok) continue;
      if (!candidate.candidate.downloadable) continue;
      const faces = candidate.candidate.faceCount;
      if (typeof faces === "number" && faces > FACE_BUDGET.max) continue;

      try {
        const result = await PROVIDERS[candidate.candidate.provider].download(candidate.candidate, target);
        if (result.format !== "glb") {
          await rm(result.file, { force: true });
          rejected.push(candidate.candidate.title + " (served a " + result.format + " archive, not a glb)");
          continue;
        }

        const buffer = await readFile(result.file);
        const parsed = JSON.parse(buffer.slice(20, 20 + buffer.readUInt32LE(12)).toString("utf8"));

        if (!modelCanShowColour(parsed)) {
          await rm(result.file, { force: true });
          rejected.push(candidate.candidate.title + " (the file declares no colour at all)");
          continue;
        }

        // Counted from the file when the provider does not report a face count, so the budget and the
        // crude rule mean the same thing on NASA as they do on Sketchfab.
        const triangles = typeof faces === "number" ? faces : trianglesIn(parsed);
        if (triangles > FACE_BUDGET.max) {
          await rm(result.file, { force: true });
          rejected.push(candidate.candidate.title + " (" + triangles + " triangles counted in the file, over budget)");
          continue;
        }
        if (triangles < CRUDE_MONUMENT_FACES && modelHasNoTexture(parsed)) {
          await rm(result.file, { force: true });
          rejected.push(
            candidate.candidate.title + " (" + triangles + " triangles and no texture: a diagram of the " +
              "thing, not a model of it)",
          );
          continue;
        }

        const compressed = await compressGlb(result.file);
        const shipped = (await readFile(result.file)).length;
        if (shipped > CONFIG.maxBytes) {
          await rm(result.file, { force: true });
          rejected.push(
            candidate.candidate.title + " (compressed to " + (shipped / 1048576).toFixed(1) + " MB, over the " +
              (CONFIG.maxBytes / 1048576).toFixed(0) + " MB ceiling)",
          );
          continue;
        }

        attempt = candidate;
        downloaded = result;
        squashed = compressed;
        break;
      } catch (error) {
        rejected.push(candidate.candidate.title + " (" + String(error.message).split("\n")[0] + ")");
      }
      await sleep(400);
    }

    if (!attempt || !downloaded) {
      unsourced.push({ slug: entry.slug, why: "nothing downloadable fitted: " + rejected.slice(-3).join("; ") });
      continue;
    }

    const candidate = attempt.candidate;
    const bytes = (await readFile(target)).length;
    console.log(
      "  " + entry.slug.padEnd(26) +
      String(candidate.faceCount ?? "?").padStart(9) + " faces  " +
      attempt.licence.spdx.padEnd(10) + candidate.provider.padEnd(10) +
      (bytes / 1048576).toFixed(2).padStart(7) + " MB  " + candidate.title.slice(0, 34),
    );

    // A model nobody scanned. Meshy and Tripo generate a mesh from a sentence, and Meshy's free plan
    // licenses its output CC BY 4.0 - on this project's allow-list, so the pipeline may take it, but a
    // synthesised vehicle shown as a modelled one is the same lie as an invented statistic. The record
    // is written here and printed on the page, exactly as `scripts/generate-models.mjs` does for the
    // species it makes. Measured: the first vehicle run shipped "[🟢Meshy] Bell UH-1 Iroquois" and
    // nothing said so.
    const generator = /meshy|tripo|ai[- ]generated|text[- ]to[- ]3d/i.exec(candidate.title ?? "");

    attribution[entry.slug] = {
      ...(generator ? { generated: { provider: generator[0], at: new Date().toISOString(), note: "the provider's own title says the model was generated" } } : {}),
      title: candidate.title,
      author: candidate.author,
      authorUrl: candidate.authorUrl,
      license: attempt.licence.spdx,
      licenseUrl: candidate.licenseUrl,
      sourceUrl: candidate.sourceUrl,
      provider: candidate.provider,
      file: "/models/" + catalogueId + "/" + entry.slug + ".glb",
      format: "glb",
      bytes,
      sha256: createHash("sha256").update(await readFile(target)).digest("hex"),
      attributionRequired: attempt.licence.attributionRequired,
      fetchedAt: new Date().toISOString(),
      faceCount: candidate.faceCount ?? null,
      compressed: squashed.kept,
    };
    sourced.push({ slug: entry.slug, candidate, licence: attempt.licence, bytes });
    await sleep(600);
  } catch (error) {
    unsourced.push({ slug: entry.slug, why: String(error.message).split("\n")[0] });
  }
}

if (APPLY && sourced.length > 0) {
  const sorted = Object.fromEntries(Object.entries(attribution).sort(([a], [b]) => a.localeCompare(b)));
  await writeFile(ATTRIBUTION_FILE, JSON.stringify(sorted, null, 2) + "\n", "utf8");
  await writeFile(
    PREVIEW_FILE,
    JSON.stringify({
      note:
        "Generated by scripts/fetch-catalog-models.mjs from data/" + catalogueId + "-attribution.json. Same " +
        "shape as data/model-preview.json and for the same reason: a card decides on hover whether it may " +
        "fetch the file, and the decision happens in the browser without importing the credit manifest. " +
        "Edit the manifest, not this file.",
      models: Object.fromEntries(
        Object.entries(attribution).map(([slug, record]) => [slug, [record.bytes ?? 0, record.faceCount ?? null]]),
      ),
    }) + "\n",
    "utf8",
  );
}

console.log("\n" + sourced.length + " " + catalogue.label + " entr(y/ies) sourced, " + unsourced.length + " not:");
for (const row of unsourced) console.log("  - " + row.slug.padEnd(26) + row.why);

if (!APPLY) {
  console.log("\nDry run. Add --apply to download them.");
  process.exit(0);
}

// Wiring: `model_url` in the catalogue file is the single source of truth for which file an entry
// shows, so a downloaded model that nothing points at is a model nobody will ever see.
let wired = 0;
let source = await readFile(DATA_FILE, "utf8");

for (const row of sourced) {
  const slugIndex = source.indexOf('slug: "' + row.slug + '"');
  if (slugIndex === -1) {
    console.error("  ! " + row.slug + " is not in " + DATA_FILE);
    continue;
  }
  const fieldIndex = source.indexOf("model_url:", slugIndex);
  if (fieldIndex === -1 || fieldIndex - slugIndex > 4000) {
    console.error("  ! could not find the model_url that belongs to " + row.slug);
    continue;
  }
  const lineEnd = source.indexOf("\n", fieldIndex);
  const url = "/models/" + catalogueId + "/" + row.slug + ".glb";
  if (source.slice(fieldIndex, lineEnd).includes(url)) continue;

  const spacing = source.slice(fieldIndex, lineEnd).match(/^model_url:\s*/)?.[0] ?? "model_url: ";
  source = source.slice(0, fieldIndex) + spacing + '"' + url + '",' + source.slice(lineEnd);
  if (!source.includes('model_url: "' + url + '"')) throw new Error("the wiring produced no change for " + row.slug);
  wired += 1;
}

await writeFile(DATA_FILE, source, "utf8");
console.log(wired > 0 ? "\nWired " + wired + " model(s) into " + DATA_FILE + "." : "\nNothing new to wire.");
