#!/usr/bin/env node
/**
 * What each catalogue actually holds right now - measured, not remembered.
 *
 *   node scripts/catalogue-status.mjs            # the table
 *   node scripts/catalogue-status.mjs --json     # the same numbers, for a script to read
 *   node scripts/catalogue-status.mjs --missing  # only what is missing, entry by entry
 *
 * Phase 35 grew the catalogue by harvesting entries and then chasing a model for each one, and a chase
 * has two ways to lie: a count typed into PLAN.md by hand, and a `model_url` that names a file nobody
 * downloaded. Both are invisible in a grid - the card falls back to its emoji plate either way - so the
 * numbers here come from the data modules and from the filesystem, and the two are cross-checked:
 *
 *   **entries**      the catalogue's own list, from the module the site reads;
 *   **wired**        entries whose `model_url` is not null;
 *   **shipped**      a file that is really on disk behind that `model_url`;
 *   **credited**     a row in the catalogue's attribution manifest, which is what the licence gate writes;
 *   **previews**     the `*.webp` the card draws instead of downloading a model.
 *
 * A row that disagrees with another row is the point of the report, so the disagreements are printed as
 * findings rather than smoothed into a single "coverage" percentage.
 *
 * `buildings` has no folder and no manifest of its own on purpose: it is the modern subset of the
 * architecture catalogue (see `data/buildings.ts`), so it shares entries, models and credits with it.
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { ALL_LANDMARKS } from "../data/landmarks/all.ts";

const ROOT = process.cwd();
const flags = process.argv.slice(2);
const AS_JSON = flags.includes("--json");
const MISSING_ONLY = flags.includes("--missing");

const CATALOGUES = [
  { id: "animals", module: "../data/animals.ts", exported: "ANIMALS", dir: "public/models", attribution: "data/model-attribution.json" },
  { id: "space", module: "../data/space.ts", exported: "SPACE_ENTRIES", dir: "public/models/space", attribution: "data/space-attribution.json" },
  { id: "plants", module: "../data/plants.ts", exported: "PLANT_ENTRIES", dir: "public/models/plants", attribution: "data/plants-attribution.json" },
  { id: "vehicles", module: "../data/vehicles.ts", exported: "VEHICLE_ENTRIES", dir: "public/models/vehicles", attribution: "data/vehicles-attribution.json" },
  { id: "architecture", module: "../data/landmarks/all.ts", exported: "ALL_LANDMARKS", dir: "public/models/landmarks", attribution: "data/landmark-attribution.json" },
  // The projection, so its numbers are the architecture numbers filtered - reported, never counted twice.
  {
    id: "buildings",
    module: "../data/buildings.ts",
    exported: "MODERN_BUILDINGS",
    dir: "public/models/landmarks",
    attribution: "data/landmark-attribution.json",
    projectionOf: "architecture",
    // ...plus the harvested half, which is a catalogue of its own with its own folder and its own
    // credits. `slugsOnly` because data/buildings.ts exports landmark slugs, not entries.
    extra: { module: "../data/buildings-entries.ts", exported: "BUILDING_ENTRIES", dir: "public/models/buildings", attribution: "data/buildings-attribution.json" },
  },
];

const glbs = (dir) => {
  const path = join(ROOT, dir);
  if (!existsSync(path)) return [];
  return readdirSync(path).filter((name) => name.endsWith(".glb")).map((name) => name.slice(0, -".glb".length));
};

/** The preview that mirrors a model path: `/models/space/x.glb` -> `public/previews/space/x.webp`. */
function previewFor(modelUrl) {
  const relative = modelUrl.replace(/^\/models\//, "");
  const lastSlash = relative.lastIndexOf("/");
  const folder = lastSlash === -1 ? "" : relative.slice(0, lastSlash + 1);
  const name = relative.slice(lastSlash + 1).replace(/\.glb$/, "");
  return join("public", "previews", folder + name + ".webp");
}

function readJson(relative) {
  const path = join(ROOT, relative);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8"));
}

const report = [];
for (const catalogue of CATALOGUES) {
  const module_ = await import(catalogue.module);
  const branch = [];
  if (catalogue.extra) {
    const extra = await import(catalogue.extra.module);
    branch.push(...extra[catalogue.extra.exported]);
  }
  /**
   * The rows of this catalogue, always as entries with a `model_url`.
   *
   * The curated stream of `buildings` is a list of landmark **slugs**, so a bare string is resolved
   * against the architecture catalogue rather than counted as an entry with no model - which is what a
   * naive read would report, and it would be wrong about eleven monuments that all have one.
   */
  const landmarksBySlug = new Map(ALL_LANDMARKS.map((entry) => [entry.slug, entry]));
  const raw = [...module_[catalogue.exported], ...branch].map((row) =>
    typeof row === "string" ? (landmarksBySlug.get(row) ?? { slug: row, model_url: null }) : row,
  );
  const curatedManifest = readJson(catalogue.attribution) ?? {};
  const manifest = { ...curatedManifest, ...(catalogue.extra ? (readJson(catalogue.extra.attribution) ?? {}) : {}) };

  let wired = 0;
  let shipped = 0;
  let previewed = 0;
  const missingModel = [];
  const missingFile = [];
  const missingPreview = [];

  /**
   * The counters read **this catalogue's own rows**, not the ones it borrows.
   *
   * `buildings` shows eleven monuments that belong to `architecture`, and those eleven are counted
   * there - once each. Counting them here as well would make the totals say the site holds more things
   * than it does, which is exactly the kind of number a reader has no way to check.
   */
  const borrowed = catalogue.projectionOf ? (catalogue.extra ? module_[catalogue.exported].length : raw.length) : 0;
  const own = borrowed ? raw.slice(borrowed) : raw;

  for (const entry of own) {
    const slug = entry.slug;
    const modelUrl = entry.model_url;
    if (!modelUrl) { missingModel.push(slug); continue; }
    wired += 1;
    if (!existsSync(join(ROOT, "public", modelUrl))) { missingFile.push(slug + " -> " + modelUrl); continue; }
    shipped += 1;
    const preview = previewFor(modelUrl);
    if (existsSync(join(ROOT, preview))) previewed += 1;
    else missingPreview.push({ slug, model: modelUrl, preview: preview.replace(/^public\//, "/") });
  }

  const onDisk = [...new Set([...glbs(catalogue.dir), ...(catalogue.extra ? glbs(catalogue.extra.dir) : [])])];
  const credited = Object.keys(manifest);
  // What this catalogue owns, as opposed to what it shows: a projected stream's folder belongs to the
  // catalogue it was projected from. For buildings, "own" is exactly the harvested folder.
  const ownOnDisk = catalogue.extra ? glbs(catalogue.extra.dir) : (catalogue.projectionOf ? [] : onDisk);
  const ownCredited = catalogue.extra
    ? Object.keys(readJson(catalogue.extra.attribution) ?? {})
    : (catalogue.projectionOf ? [] : credited);
  const wiredFiles = new Set(raw.filter((entry) => entry.model_url).map((entry) => entry.model_url.split("/").pop().replace(/\.glb$/, "")));

  report.push({
    id: catalogue.id,
    projectionOf: catalogue.projectionOf ?? null,
    // How many rows of this catalogue are another catalogue's entries seen a different way. They are
    // reported here and counted nowhere else, or a monument with a second subject would be counted twice
    // in a total that is meant to say how many things the site has.
    projected: catalogue.extra ? module_[catalogue.exported].length : (catalogue.projectionOf ? raw.length : 0),
    /** True when this catalogue owns folders beyond the projected one, so its files are its own. */
    extraFiles: Boolean(catalogue.extra),
    entries: raw.length,
    wired,
    shipped,
    previewed,
    filesOnDisk: onDisk.length,
    credited: credited.length,
    ownFiles: ownOnDisk.length,
    ownCredited: ownCredited.length,
    missingModel,
    missingFile,
    missingPreview,
    // A file with no credit is a model nobody licensed; a credit with no file is a number about nothing.
    uncreditedFiles: onDisk.filter((slug) => !credited.includes(slug)),
    danglingCredits: credited.filter((slug) => !onDisk.includes(slug)),
    // Files nothing points at. Harmless, but they are what a stale search leaves behind.
    orphanFiles: onDisk.filter((slug) => !wiredFiles.has(slug)),
  });
}

if (AS_JSON) {
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

if (!MISSING_ONLY) {
  const pad = (value, width) => String(value).padStart(width);
  console.log("catalogue     entries  wired  shipped  previewed  files  credited");
  console.log("------------  -------  -----  -------  ---------  -----  --------");
  for (const row of report) {
    console.log(
      row.id.padEnd(12) + "  " + pad(row.entries, 7) + "  " + pad(row.wired, 5) + "  " + pad(row.shipped, 7) +
      "  " + pad(row.previewed, 9) + "  " + pad(row.filesOnDisk, 5) + "  " + pad(row.credited, 8) +
      (row.projectionOf ? "   (projection of " + row.projectionOf + ")" : ""),
    );
  }
  const totals = report.reduce(
    (sum, row) => ({
      entries: sum.entries + (row.entries - row.projected),
      wired: sum.wired + row.wired,
      shipped: sum.shipped + row.shipped,
      previewed: sum.previewed + row.previewed,
      // Files and credits are counted once: a projected stream's folder belongs to the catalogue it was
      // projected from, and counting it here would report the same 47 monuments two or three times.
      files: sum.files + row.ownFiles,
      credited: sum.credited + row.ownCredited,
      missingModel: sum.missingModel + row.missingModel.length,
      missingPreview: sum.missingPreview + row.missingPreview.length,
    }),
    { entries: 0, wired: 0, shipped: 0, previewed: 0, files: 0, credited: 0, missingModel: 0, missingPreview: 0 },
  );
  console.log("");
  console.log("total         " + pad(totals.entries, 7) + "  " + pad(totals.wired, 5) + "  " + pad(totals.shipped, 7) +
    "  " + pad(totals.previewed, 9) + "  " + pad(totals.files, 5) + "  " + pad(totals.credited, 8));
  console.log("model files: " + totals.files + " · previews: " + totals.previewed + " · entries with no model: " + totals.missingModel);
  console.log("");
}

for (const row of report) {
  const findings = [];
  if (row.missingFile.length) findings.push("  points at a file that is not in the repository (" + row.missingFile.length + "): " + row.missingFile.join(", "));
  if (row.missingPreview.length) findings.push("  no preview image (" + row.missingPreview.length + "): " + row.missingPreview.map((one) => one.slug).join(", "));
  if (row.uncreditedFiles.length) findings.push("  shipped with no credit (" + row.uncreditedFiles.length + "): " + row.uncreditedFiles.join(", "));
  if (row.danglingCredits.length) findings.push("  credited but not shipped (" + row.danglingCredits.length + "): " + row.danglingCredits.join(", "));
  if (findings.length) console.log(row.id + ":"), console.log(findings.join("\n"));
}

if (MISSING_ONLY) {
  for (const row of report) {
    if (!row.missingModel.length) continue;
    console.log("");
    console.log(row.id + " - no model (" + row.missingModel.length + " of " + row.entries + "):");
    for (const slug of row.missingModel) console.log("  " + slug);
  }
}
