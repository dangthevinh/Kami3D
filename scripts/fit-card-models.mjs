#!/usr/bin/env node
/**
 * Fit a model into the card budget, and let the database know the measurements.
 *
 *   npm run models:fit                  # report what is over the card budget
 *   npm run models:fit -- --apply       # compress those models until they fit
 *   npm run models:fit -- --apply --publish   # ...and put them back on Storage + in the database
 *
 * The card budget (`lib/model-preview.ts`: 1.5 MB, 75k triangles) exists because a hover is not a
 * request to download three megabytes. When a model is over it, the answer is not to raise the
 * budget - it is to make the file smaller, with the same tool the pipeline already ships:
 * `gltf-transform` resizing textures to 1024 and running DRACO over the geometry. Measured on the
 * catalogue: the elephant goes from 2.8 MB to well under the budget with no visible change at the
 * sizes a card or a phone actually renders.
 *
 * `--publish` is the half that makes the fix visible: the compressed file is uploaded to the same
 * Storage path `animals.model_url` already points at, `model_assets` is corrected with the real
 * byte count, and `animals.preview_eligible` is set for **every** species from the file that is
 * actually served - which is the column the card reads first.
 */

import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { PREVIEW_BUDGET } from "../lib/model-preview.ts";
import { createR2, readR2Config } from "./r2.mjs";

const run = promisify(execFile);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const apply = args.includes("--apply");
const publish = args.includes("--publish");
const only = args.filter((arg) => arg.startsWith("--slug=")).map((arg) => arg.split("=")[1]);

for (const name of [".env.local", ".env"]) {
  let text;
  try {
    text = readFileSync(join(ROOT, name), "utf8");
  } catch {
    continue;
  }
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const separator = trimmed.indexOf("=");
    if (!process.env[trimmed.slice(0, separator).trim()]) {
      process.env[trimmed.slice(0, separator).trim()] = trimmed.slice(separator + 1).trim().replace(/^["']|["']$/g, "");
    }
  }
}

const attributionPath = join(ROOT, "data", "model-attribution.json");
const indexPath = join(ROOT, "data", "model-preview.json");
const attribution = JSON.parse(readFileSync(attributionPath, "utf8"));
const index = JSON.parse(readFileSync(indexPath, "utf8"));

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

/** Texture size to try, largest first: the first one that fits the budget wins. */
const SIZES = [1024, 768, 512];

async function compress(source, target, size) {
  const first = join(tmpdir(), "kami-fit-resize.glb");
  await run("npx", ["--no-install", "gltf-transform", "resize", source, first, "--width", String(size), "--height", String(size)], { cwd: ROOT, maxBuffer: 32 * 1024 * 1024 });
  await run("npx", ["--no-install", "gltf-transform", "draco", first, target], { cwd: ROOT, maxBuffer: 32 * 1024 * 1024 });
  return statSync(target).size;
}

const over = [];
for (const [slug, entry] of Object.entries(attribution)) {
  if (only.length > 0 && !only.includes(slug)) continue;
  const budgetBytes = index.models[slug]?.[0] ?? entry.bytes;
  if (budgetBytes > PREVIEW_BUDGET.bytes) over.push({ slug, bytes: budgetBytes });
}
if (over.length === 0) {
  console.log("Every model is already inside the card budget (" + (PREVIEW_BUDGET.bytes / 1_048_576).toFixed(1) + " MB).");
}

for (const row of over) {
  const file = join(ROOT, "public", "models", row.slug + ".glb");
  if (!existsSync(file)) {
    console.log("skip " + row.slug + ": no local file");
    continue;
  }
  console.log(row.slug + ": " + (row.bytes / 1_048_576).toFixed(2) + " MB is over the budget");

  if (!apply) {
    console.log("   would try texture sizes " + SIZES.join(", ") + " with DRACO");
    continue;
  }

  const directory = mkdtempSync(join(tmpdir(), "kami-fit-"));
  let best = null;
  for (const size of SIZES) {
    const target = join(directory, row.slug + "-" + size + ".glb");
    const bytes = await compress(file, target, size).catch((error) => {
      console.log("   " + size + "px failed: " + String(error.message).split("\n")[0]);
      return null;
    });
    console.log("   " + size + "px -> " + (bytes === null ? "failed" : (bytes / 1_048_576).toFixed(2) + " MB"));
    if (bytes !== null && bytes <= PREVIEW_BUDGET.bytes) {
      best = target;
      break;
    }
  }

  if (!best) {
    console.log("   still over the budget at the smallest texture size; left alone");
    rmSync(directory, { recursive: true, force: true });
    continue;
  }

  copyFileSync(best, file);
  const bytes = readFileSync(file);
  attribution[row.slug].bytes = bytes.byteLength;
  attribution[row.slug].sha256 = sha256(bytes);
  index.models[row.slug][0] = bytes.byteLength;
  rmSync(directory, { recursive: true, force: true });
  console.log("   -> " + (bytes.byteLength / 1_048_576).toFixed(2) + " MB, written to public/models/" + row.slug + ".glb");
}

if (apply) {
  writeFileSync(attributionPath, JSON.stringify(attribution, null, 2) + "\n");
  writeFileSync(indexPath, JSON.stringify(index, null, 2) + "\n");
  console.log("\nUpdated data/model-attribution.json and data/model-preview.json.");
}

/* ------------------------------------------------------------------ publish */

if (publish) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("--publish needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY for the rows.");
    process.exit(2);
  }

  // The file goes to R2; only the rows still go to Supabase.
  const r2Config = readR2Config();
  if (!r2Config.configured) {
    console.error("--publish needs Cloudflare R2 for the file: missing " + r2Config.missing.join(", ") + ".");
    process.exit(2);
  }
  const r2 = createR2(r2Config);
  const headers = { apikey: key, authorization: "Bearer " + key, "content-type": "application/json" };
  const rest = async (path, init = {}) => {
    const response = await fetch(url + "/rest/v1/" + path, { ...init, headers: { ...headers, ...(init.headers ?? {}) } });
    const text = await response.text();
    return [response.status, text ? JSON.parse(text) : null];
  };

  const animals = (await rest("animals?select=id,slug,model_url"))[1];
  const assets = (await rest("model_assets?select=id,animal_id,storage_path,public_url,is_primary"))[1];
  const primary = new Map();
  for (const asset of assets) if (asset.is_primary) primary.set(asset.animal_id, asset);

  let inside = 0;
  let outside = 0;

  for (const animal of animals) {
    const asset = primary.get(animal.id);
    const entry = index.models[animal.slug];
    if (!asset || !entry) {
      // No sourced row: leave the column alone rather than invent a decision.
      continue;
    }

    const local = join(ROOT, "public", "models", animal.slug + ".glb");
    const bytes = entry[0];
    const faces = entry[1] ?? null;
    const eligible = bytes <= PREVIEW_BUDGET.bytes && (faces ?? 0) <= PREVIEW_BUDGET.faces;

    if (apply && existsSync(local) && rowChanged(animal.slug)) {
      const file = readFileSync(local);

      // The key is the row's own `storage_path`, still `models/<slug>.glb`: only the host changed, so
      // a row written before the move is republished to a path that already exists.
      const put = await r2.put(asset.storage_path, file, "model/gltf-binary", "public, max-age=31536000, immutable");

      // Then read the size back **over the public URL**, not from the call we just made. The number
      // written into model_assets has to describe what a visitor downloads; a value taken from the
      // upload would only describe what we hoped they would.
      const head = await fetch(put.publicUrl, { method: "HEAD" });
      const served = Number(head.headers.get("content-length"));
      if (!Number.isFinite(served) || served <= 0) {
        console.warn("  ! could not read " + animal.slug + " back from R2 — row left alone");
        continue;
      }

      await rest("model_assets?id=eq." + asset.id, { method: "PATCH", body: JSON.stringify({ file_size_bytes: served, face_count: faces }) });
      console.log("republished " + animal.slug + ": " + (served / 1_048_576).toFixed(2) + " MB on R2");
    }

    await rest("animals?id=eq." + animal.id, { method: "PATCH", body: JSON.stringify({ preview_eligible: eligible }) });
    if (eligible) inside += 1;
    else outside += 1;
  }

  console.log("\npreview_eligible written for " + (inside + outside) + " species: " + inside + " on the card, " + outside + " species page only.");
}

function rowChanged(slug) {
  return over.some((row) => row.slug === slug) && apply;
}
