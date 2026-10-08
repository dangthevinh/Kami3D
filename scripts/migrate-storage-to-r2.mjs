#!/usr/bin/env node
/**
 * Retire Supabase Storage: copy anything it still holds to R2, prove the copy, then empty it.
 *
 * ## What was actually in there
 *
 * PLAN.md said `animal-assets` held 0 objects. It did not: measured on 2026-10-07 it holds **113
 * objects across two buckets**, and the three groups are genuinely different problems:
 *
 *   - **69** are byte-identical to what R2 already serves — the same model, already mirrored;
 *   - **35** exist **only** in Supabase: models for species that are in neither `data/**` nor the `animals`
 *     table. Orphans, but real files, and deleting them would destroy the only copy in existence;
 *   - **9** exist in both with *different* bytes — the Supabase copy is consistently a little larger.
 *     These are the pre-compression originals of models the repository serves in DRACO form, so the
 *     served file is not a copy of them and cannot replace them.
 *
 * A script that trusted the PLAN's "0 objects" would have deleted 113 files including 35 that exist
 * nowhere else. That is the reason this file verifies before it deletes rather than after.
 *
 * ## The order, which is the whole safety argument
 *
 *   1. **compare by md5**, not by size. R2 returns the md5 of a single-part upload as its ETag, so
 *      "same bytes" is checkable without downloading the R2 side;
 *   2. **copy** what is missing, and what differs, to a key that cannot collide with a served file;
 *   3. **read every copy back** over the public URL and compare bytes again;
 *   4. only then **rewrite** the rows that still name the old host;
 *   5. only then **delete** from Supabase.
 *
 *   node scripts/migrate-storage-to-r2.mjs            # report only; changes nothing
 *   node scripts/migrate-storage-to-r2.mjs --apply    # copy, verify, rewrite, delete
 *   node scripts/migrate-storage-to-r2.mjs --restore  # copy + verify only, never delete
 */

import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { createClient } from "@supabase/supabase-js";

import { R2_PREFIXES, STORAGE_PUBLIC_MARKER, parseStorageUrl, r2KeyFor } from "../lib/r2-paths.ts";
import { createR2, loadEnvFiles, readR2Config } from "./r2.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Where an original goes when R2 already holds a different file at the natural key.
 *
 * `models/axolotl.glb` on R2 is the file the site serves and the file the repository holds; it must
 * stay byte-identical to `public/models/axolotl.glb` or the CDN and the repository have quietly
 * forked. So the Supabase original is parked beside it rather than on top of it, under a prefix whose
 * only job is to say "this is the as-downloaded bytes, kept because it is the only copy".
 */
const ORIGINALS_PREFIX = R2_PREFIXES.originals;

/** Every table.column that has ever held a Storage URL. */
const URL_COLUMNS = [
  { table: "model_assets", column: "public_url", id: "id" },
  { table: "sound_assets", column: "public_url", id: "id" },
  { table: "manga_panels", column: "image_url", id: "id" },
  { table: "animals", column: "model_url", id: "id" },
  { table: "animals", column: "sound_url", id: "id" },
  { table: "items", column: "model_url", id: "id" },
  { table: "items", column: "sound_url", id: "id" },
];

const MARKER = STORAGE_PUBLIC_MARKER;

await loadEnvFiles();

const apply = process.argv.includes("--apply");
const restoreOnly = process.argv.includes("--restore");

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/+$/, "");
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "";
if (!supabaseUrl || !serviceKey) {
  console.error("Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.");
  process.exit(1);
}

const r2Config = readR2Config();
if (!r2Config.configured) {
  console.error("Needs Cloudflare R2 configured. Missing: " + r2Config.missing.join(", "));
  process.exit(1);
}

const r2 = createR2(r2Config);
const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

// `r2KeyFor` and `parseStorageUrl` come from lib/r2-paths.ts rather than being defined here: the app,
// the pipelines and this migration all need the same bucket→key rule, and the first version of this
// file proved what a private copy costs — it looked for `lion.ogg` where the key is `sounds/lion.ogg`
// and reported six files as missing that had been on R2 all along.

const md5 = (bytes) => createHash("md5").update(bytes).digest("hex");
const human = (bytes) => (bytes >= 1048576 ? (bytes / 1048576).toFixed(1) + " MiB" : (bytes / 1024).toFixed(0) + " KiB");

/** A HEAD that survives a flaky connection; a network error is not evidence of absence. */
async function head(key, attempts = 3) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await r2.headPublic(key);
    } catch (error) {
      if (attempt === attempts) return { status: 0, bytes: 0, etag: "", error: String(error?.cause?.code ?? error?.message ?? error) };
      await new Promise((resolve) => setTimeout(resolve, 400 * attempt));
    }
  }
  return { status: 0, bytes: 0, etag: "", error: "unreachable" };
}

async function listRecursive(bucket, prefix = "") {
  const found = [];
  const { data, error } = await supabase.storage.from(bucket).list(prefix, { limit: 1000 });
  if (error || !data) return found;
  for (const entry of data) {
    const path = prefix ? prefix + "/" + entry.name : entry.name;
    if (entry.id === null && entry.metadata === null) found.push(...(await listRecursive(bucket, path)));
    else found.push({ path, size: typeof entry.metadata?.size === "number" ? entry.metadata.size : 0 });
  }
  return found;
}

/* ------------------------------------------------------------------ inventory */

const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
if (bucketError) {
  console.error("Could not list buckets: " + bucketError.message);
  process.exit(1);
}

const inventory = [];
for (const bucket of buckets ?? []) {
  const objects = await listRecursive(bucket.name);
  inventory.push({ bucket: bucket.name, objects });
}

const all = inventory.flatMap((entry) => entry.objects.map((object) => ({ bucket: entry.bucket, ...object })));
const totalBytes = all.reduce((sum, object) => sum + object.size, 0);

console.log("Supabase Storage");
for (const entry of inventory) {
  console.log("  " + entry.bucket.padEnd(18) + String(entry.objects.length).padStart(4) + " object(s)  " + human(entry.objects.reduce((s, o) => s + o.size, 0)));
}
console.log("  " + "TOTAL".padEnd(18) + String(all.length).padStart(4) + " object(s)  " + human(totalBytes));

/* --------------------------------------------------- classify against R2 (md5) */

console.log("\nComparing by md5 against R2\n");

const identical = [];
const missing = [];
const different = [];
const unreachable = [];

for (const object of all) {
  object.key = r2KeyFor(object.bucket, object.path);
  const remote = await head(object.key);

  if (remote.status === 0) unreachable.push({ ...object, reason: remote.error });
  else if (remote.status === 404) missing.push(object);
  else if (remote.bytes === object.size) identical.push({ ...object, etag: remote.etag ?? "" });
  else different.push({ ...object, r2Bytes: remote.bytes });

  if (object.size > 0 && (identical.length + missing.length + different.length + unreachable.length) % 25 === 0) {
    process.stdout.write("  … " + (identical.length + missing.length + different.length + unreachable.length) + "/" + all.length + "\r");
  }
}

process.stdout.write(" ".repeat(40) + "\r");
// A byte count is a filter, not a verdict: two files of the same length are not the same file. This
// pass narrows the work; the md5 comparison in the apply phase is what actually licenses a delete.
console.log("  " + identical.length + " same byte count as R2 (to be proven by md5 before anything is deleted)");
console.log("  " + missing.length + " only in Supabase — nothing else holds these");
console.log("  " + different.length + " in both, with different bytes — R2 has the served file, Supabase the original");
if (unreachable.length) console.log("  " + unreachable.length + " could not be reached at all");

/* --------------------------------------------------------------- copy phase  */

// Everything that exists only in Supabase is copied, orphans included. They are unreferenced — no
// species, no row — but they are also the only copy of themselves, and a migration that silently drops
// unreferenced files is one nobody can audit afterwards. Deleting them deliberately, later, is a
// decision somebody can make with the list in front of them.
const toCopy = missing.map((object) => ({ ...object, target: object.key }));
const toPreserve = different.map((object) => ({ ...object, target: ORIGINALS_PREFIX + "/" + object.key }));

console.log(
  "\nPlan: " + identical.length + " to verify in place, " + toCopy.length + " to copy, " +
    toPreserve.length + " original(s) to park under " + ORIGINALS_PREFIX + "/",
);

if (unreachable.length > 0) {
  console.error("\nRefusing to go further: " + unreachable.length + " object(s) could not be checked. A network error is not a verification.");
  process.exit(1);
}

if (!apply && !restoreOnly) {
  console.log("\nDRY RUN — nothing was changed.");
  console.log("  would copy " + (toCopy.length + toPreserve.length) + " file(s) (" + human([...toCopy, ...toPreserve].reduce((s, o) => s + o.size, 0)) + ")");
  console.log("  would rewrite the rows that name " + MARKER);
  console.log("  would then delete " + all.length + " object(s) from Supabase Storage");
  console.log("  re-run with --apply to do all of it, or --restore to copy without deleting.");
  process.exit(0);
}

const CONTENT_TYPES = {
  ".glb": "model/gltf-binary",
  ".ogg": "audio/ogg",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".json": "application/json",
  ".txt": "text/plain",
};

const contentTypeFor = (key) => CONTENT_TYPES[key.slice(key.lastIndexOf("."))] ?? "application/octet-stream";

/**
 * One pass over **every** object, and it ends in proof rather than in a plan.
 *
 * The object is downloaded once, md5'd, and compared against R2's ETag — which is the md5 of a
 * single-part upload, so "these are the same bytes" is checkable without transferring the R2 side
 * twice. Only an md5 match licenses a delete. The dry run above deliberately does **not** download
 * anything: it is cheap because it is only a filter, and cheap is what makes it safe to run often.
 */
let verifiedSame = 0;
let copied = 0;
let failed = 0;

console.log("\nVerifying every object by md5, and copying what R2 does not have\n");

for (const object of all) {
  const downloaded = await supabase.storage.from(object.bucket).download(object.path);
  if (downloaded.error || !downloaded.data) {
    console.error("  ! could not download " + object.bucket + "/" + object.path + ": " + (downloaded.error?.message ?? "no data"));
    failed += 1;
    continue;
  }

  const bytes = Buffer.from(await downloaded.data.arrayBuffer());
  const digest = md5(bytes);
  const remote = await head(object.key);

  if (remote.status === 200 && remote.bytes === bytes.byteLength && remote.etag === digest) {
    verifiedSame += 1;
    continue;
  }

  // Either R2 has nothing here, or it has a *different* file. The second case must not be overwritten:
  // `models/axolotl.glb` on R2 is the file the site serves and the file the repository holds, and the
  // Supabase copy is the original it was compressed from. Parking it beside the served file keeps both,
  // because only one of the two can be regenerated.
  const target = remote.status === 404 ? object.key : ORIGINALS_PREFIX + "/" + object.key;
  await r2.put(target, bytes, contentTypeFor(target), "public, max-age=31536000, immutable");

  // Read it back over the public URL: the point of the copy is that a browser can fetch it, and only
  // the public URL proves that. Comparing our own md5 with our own put would prove nothing at all.
  const check = await head(target);
  if (!(check.status === 200 && check.bytes === bytes.byteLength && check.etag === digest)) {
    console.error("  ! " + target + " did not read back correctly (HTTP " + check.status + ", " + check.bytes + " B, etag match " + (check.etag === digest) + ")");
    failed += 1;
    continue;
  }

  copied += 1;
  console.log("  " + (remote.status === 404 ? "copied    " : "preserved ") + target + "  " + human(bytes.byteLength));
}

console.log("\n  " + verifiedSame + " already on R2 with identical bytes, " + copied + " copied and read back, " + failed + " failed");

if (failed > 0 || verifiedSame + copied !== all.length) {
  console.error("Refusing to delete: " + (all.length - verifiedSame - copied) + " object(s) are not accounted for. An unproven copy is not a copy.");
  process.exit(1);
}
console.log("  every one of " + all.length + " object(s) is now on R2, proven by md5 over the public URL.");

/* --------------------------------------------------------------- row rewrites */

console.log("\nRewriting rows that name " + MARKER + "\n");
let rewritten = 0;
for (const target of URL_COLUMNS) {
  const { data, error } = await supabase.from(target.table).select(target.id + "," + target.column).limit(5000);
  if (error) continue;

  const rows = (data ?? []).filter((row) => typeof row[target.column] === "string" && row[target.column].includes(MARKER));
  for (const row of rows) {
    const parsed = parseStorageUrl(row[target.column]);
    const to = r2.publicUrl(r2KeyFor(parsed.bucket, parsed.path));
    const { error: writeError } = await supabase.from(target.table).update({ [target.column]: to }).eq(target.id, row[target.id]);
    if (writeError) console.error("  ! " + target.table + "." + target.column + " " + row[target.id] + ": " + writeError.message);
    else rewritten += 1;
  }
  if (rows.length) console.log("  " + target.table + "." + target.column + ": " + rows.length + " row(s)");
}
console.log("  " + rewritten + " row(s) now point at R2");

// The repository's own credit file names the old host too, and a credit line pointing at a deleted
// object is a licence problem rather than a cosmetic one.
const attributionFile = join(ROOT, "data", "sound-attribution.json");
const attribution = JSON.parse(await readFile(attributionFile, "utf8"));
let touched = 0;
for (const entry of Object.values(attribution)) {
  if (typeof entry?.publicUrl === "string" && entry.publicUrl.includes(MARKER)) {
    const parsed = parseStorageUrl(entry.publicUrl);
    entry.publicUrl = r2.publicUrl(r2KeyFor(parsed.bucket, parsed.path));
    touched += 1;
  }
}
if (touched > 0) {
  await writeFile(attributionFile, JSON.stringify(attribution, null, 2) + "\n", "utf8");
  console.log("  data/sound-attribution.json: " + touched + " publicUrl(s)");
}

if (restoreOnly) {
  console.log("\n--restore: copies are verified; Supabase Storage was left untouched.");
  process.exit(0);
}

/* ------------------------------------------------------------------ deletion */

console.log("\nEmptying Supabase Storage\n");
for (const entry of inventory) {
  if (entry.objects.length === 0) continue;
  const { error } = await supabase.storage.from(entry.bucket).remove(entry.objects.map((object) => object.path));
  console.log("  " + (error ? "FAILED " : "deleted ") + entry.objects.length + " object(s) from " + entry.bucket + (error ? ": " + error.message : ""));
}

const after = [];
for (const entry of inventory) after.push({ bucket: entry.bucket, count: (await listRecursive(entry.bucket)).length });
console.log("\n  after: " + after.map((entry) => entry.bucket + "=" + entry.count).join(", "));
console.log(existsSync(join(ROOT, "public")) ? "  the repository copies in public/ are untouched — they are the fallback." : "");
