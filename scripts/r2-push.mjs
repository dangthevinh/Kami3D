#!/usr/bin/env node
/**
 * Push the repository's own assets to Cloudflare R2.
 *
 * The scope, as decided (PLAN.md, Phase 34): the 6 sound files **and** the whole model catalogue —
 * 236 .glb, 461,7 MB — because those 236 files are the ones that are actually served today, from
 * `public/models/**` in this repo. Supabase Storage holds almost nothing (0 / 6 / 0 objects), so
 * "migrate Storage to R2" was never the real job; this is.
 *
 * Folder structure is preserved, which is the whole reason the move is cheap: a key is the path
 * under `public/` with the leading slash dropped, so `public/models/lion.glb` becomes the key
 * `models/lion.glb` and `public/sounds/lion.ogg` becomes `sounds/lion.ogg`. Changing the host
 * without changing the path means nothing in the database has to be migrated — only the prefix of
 * the URL a reader builds.
 *
 * The repository keeps its copy (the decision taken with the user, PLAN 0b): Demo Mode and any
 * self-host must still run with no keys at all, so R2 is the fast path, not the only path.
 *
 *   node scripts/r2-push.mjs --sounds                # the 6 recordings
 *   node scripts/r2-push.mjs --previews              # the rendered card images
 *   node scripts/r2-push.mjs --models --limit=1      # one real model, timed, before committing to 236
 *   node scripts/r2-push.mjs --models                # the rest, in batches, resumable
 *   node scripts/r2-push.mjs --verify                # HEAD every key over the public URL, compare bytes
 *   node scripts/r2-push.mjs --dry-run               # what would go, and how much
 *
 * Idempotent and resumable: an object whose remote size already matches is skipped, so an interrupted
 * run continues instead of starting the 461,7 MB again.
 */

import { existsSync } from "node:fs";
import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import { dirname, join, posix, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { createR2, describeR2Config, loadEnvFiles, md5, readR2Config } from "./r2.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC_DIR = join(ROOT, "public");
export const MANIFEST = join(ROOT, "data", "r2-manifest.json");

/** Mirrors the cache header the Supabase upload path already sends, so both hosts behave the same. */
const CACHE_CONTROL = "public, max-age=31536000, immutable";

const CONTENT_TYPES = {
  ".glb": "model/gltf-binary",
  ".ogg": "audio/ogg",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".avif": "image/avif",
};

/**
 * What gets mirrored, and where it lands.
 *
 * The prefix is the directory name, which is also the key prefix — the same rule that makes a key
 * `models/lion.glb`. Previews are here because they are assets the site serves like any other: a card
 * draws `/previews/lion.webp` until the CDN cutover is on, and the same file from the bucket after.
 */
const GROUPS = {
  sounds: { dir: "sounds", extensions: [".ogg", ".mp3", ".wav"] },
  models: { dir: "models", extensions: [".glb"] },
  previews: { dir: "previews", extensions: [".webp", ".png"] },
};

/* -------------------------------------------------------------------------- */
/* What to push                                                               */
/* -------------------------------------------------------------------------- */

async function walk(directory) {
  const out = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const full = join(directory, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else if (entry.isFile()) out.push(full);
  }
  return out;
}

/**
 * `public/models/lion.glb` → `models/lion.glb`. The key IS the served path, on purpose.
 *
 * Exported for `scripts/check-r2.mjs`, which asserts that this mapping and `assetUrl` in lib/r2.ts
 * agree. If the uploader and the site ever disagreed about a path, every model would 404 and no type
 * would say a word about it.
 */
export function keyFor(file) {
  return relative(PUBLIC_DIR, file).split(sep).join(posix.sep);
}

/** Every file of one group that exists in the repository right now. */
async function collect(group) {
  const { dir, extensions } = GROUPS[group];
  const files = await walk(join(PUBLIC_DIR, dir)).catch(() => []);
  return files.filter((file) => extensions.includes(file.slice(file.lastIndexOf("."))));
}

export async function collectSounds() {
  return collect("sounds");
}

export async function collectModels() {
  return collect("models");
}

export async function collectPreviews() {
  return collect("previews");
}

/* -------------------------------------------------------------------------- */
/* Upload                                                                     */
/* -------------------------------------------------------------------------- */

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * One object, with retries.
 *
 * A retry is not politeness here: 461,7 MB over a home connection will see a reset, and a script
 * that gives up on the first one turns a resumable migration into a manual one.
 */
async function uploadOne(r2, config, file, attempts = 4) {
  const key = keyFor(file);
  const bytes = await readFile(file);
  const digest = md5(bytes);
  const contentType = CONTENT_TYPES[file.slice(file.lastIndexOf("."))] ?? "application/octet-stream";

  let lastError = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const started = Date.now();
      const put = await r2.put(key, bytes, contentType, CACHE_CONTROL);
      const ms = Date.now() - started;

      // The bucket's ETag for a single-part upload is the md5 of the bytes, so this is a byte-level
      // receipt: "it uploaded" and "it uploaded the same file" are different claims.
      if (put.etag && put.etag !== digest) {
        throw new Error("etag " + put.etag + " does not match md5 " + digest + " — the object that landed is not this file");
      }

      return { key, source: posix.join("public", key), bytes: bytes.byteLength, md5: digest, ms };
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await sleep(500 * attempt * attempt);
    }
  }

  throw new Error(key + ": " + (lastError?.message ?? "failed"));
}

/** Fixed-size pool: enough concurrency to keep a home uplink busy, small enough to stay honest about memory. */
async function pool(items, width, worker) {
  const results = [];
  let cursor = 0;

  const runners = Array.from({ length: Math.min(width, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index], index);
    }
  });

  await Promise.all(runners);
  return results;
}

function human(bytes) {
  if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + " MiB";
  if (bytes >= 1024) return (bytes / 1024).toFixed(0) + " KiB";
  return bytes + " B";
}

/* -------------------------------------------------------------------------- */
/* Manifest                                                                   */
/* -------------------------------------------------------------------------- */

async function readManifest() {
  return JSON.parse(await readFile(MANIFEST, "utf8").catch(() => '{"objects":[]}'));
}

async function writeManifest(objects, config) {
  const sorted = [...objects].sort((a, b) => a.key.localeCompare(b.key));
  const total = sorted.reduce((sum, object) => sum + object.bytes, 0);
  const document = {
    generatedAt: new Date().toISOString(),
    bucket: config.bucket,
    publicBase: config.publicBase,
    note:
      "Written by scripts/r2-push.mjs (routes: --push from public/**, --index from the bucket itself). " +
      "md5 is the ETag R2 reported, so this is a byte-level receipt, not a claim. An entry with source: null " +
      "is on R2 but was not produced from public/** — copied in by the Storage migration, or written by a pipeline.",
    count: sorted.length,
    bytes: total,
    objects: sorted,
  };
  await writeFile(MANIFEST, JSON.stringify(document, null, 2) + "\n", "utf8");
  return document;
}

/* -------------------------------------------------------------------------- */
/* Commands                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Remote size map, so a resume does not re-upload what already landed.
 *
 * The listing is an **optimisation, not a permission the upload needs**: every PUT here is idempotent,
 * and the only thing a resume saves is bandwidth. The token in `.env.local` is object-scoped, so
 * `ListObjectsV2` comes back **403 AccessDenied** - measured - which used to take the whole push down
 * with it and make it impossible to upload a single new preview until somebody edited a Cloudflare
 * dashboard. A denied listing now means "unknown", which is the same position a first run is in.
 */
async function remoteIndex(r2, prefix) {
  try {
    const objects = await r2.list(prefix);
    return new Map(objects.map((object) => [object.key, object.size]));
  } catch (error) {
    console.warn(
      "  ! could not list the bucket for " + (prefix || "(everything)") + " (" + String(error?.message ?? error).split("\n")[0] +
        ") - uploading without a resume. Every PUT is idempotent, so the only cost is bandwidth.",
    );
    return new Map();
  }
}

/**
 * Make the receipt describe the repository as well as the bucket.
 *
 * Two passes, both of which were missing and both of which made `scripts/check-r2.mjs` fail on a
 * manifest that was merely out of date:
 *
 *   - an entry whose `source` file has gone is marked `source: null`, because a model that was
 *     downloaded, refused by a gate and removed is a normal outcome;
 *   - an entry with no source whose file is **back** gets its source recorded, which happens whenever a
 *     later pass - or the order queue - downloads that model again and keeps it.
 *
 * `originals/**` is skipped in the second pass on purpose: those keys are parked copies of files that
 * were *replaced*, so the public path that mirrors the key is the served file, not them.
 */
function reconcileWithRepository(byKey) {
  let orphaned = 0;
  let restored = 0;

  for (const [key, object] of byKey) {
    const path = posix.join("public", key);
    if (object.source && !existsSync(join(ROOT, object.source))) {
      byKey.set(key, { ...object, source: null, note: "in the bucket, not produced from public/**" });
      orphaned += 1;
      continue;
    }
    if (!object.source && !key.startsWith("originals/") && existsSync(join(ROOT, path)) && !key.startsWith("uploads/")) {
      const { note, ...rest } = object;
      byKey.set(key, { ...rest, source: path });
      restored += 1;
    }
  }

  return { orphaned, restored };
}

async function run({ config, r2, groups, limit, dryRun, concurrency }) {
  const existing = await readManifest();
  const byKey = new Map(existing.objects.map((object) => [object.key, object]));
  const report = { uploaded: [], skipped: [], failed: [] };

  for (const [name, files] of groups) {
    const prefix = GROUPS[name].dir + "/";
    const remote = dryRun ? new Map() : await remoteIndex(r2, prefix);
    const sized = [];

    for (const file of files) {
      const info = await stat(file);
      sized.push({ file, size: info.size, key: keyFor(file) });
    }

    sized.sort((a, b) => b.size - a.size);
    const chosen = limit ? sized.slice(0, limit) : sized;
    const todo = chosen.filter((entry) => {
      if (remote.get(entry.key) === entry.size) {
        report.skipped.push(entry.key);
        // An object that is already in the bucket still gets its manifest entry corrected here. A key
        // can be on R2 without being produced from `public/**` — the Storage migration copied 44 such
        // files — and the day one of them *does* appear in the repository (meerkat did, when its species
        // was added), the old `source: null` would otherwise stay and claim the file has no origin.
        const existing = byKey.get(entry.key);
        if (existing) {
          byKey.set(entry.key, { ...existing, source: posix.join("public", entry.key), bytes: entry.size });
        }
        return false;
      }
      return true;
    });

    const bytes = todo.reduce((sum, entry) => sum + entry.size, 0);
    console.log(
      "\n" + name + ": " + chosen.length + " file(s) in scope · " + human(chosen.reduce((s, e) => s + e.size, 0)) +
        " · " + todo.length + " to upload (" + human(bytes) + ") · " + report.skipped.length + " already there",
    );

    if (dryRun || todo.length === 0) {
      for (const entry of todo.slice(0, 10)) console.log("  would push  " + entry.key + "  " + human(entry.size));
      // The manifest is still written when there is nothing to upload. A run that skips every file can
      // still have learned something: an object that used to exist only on the CDN may have just
      // appeared in the repository, and its entry has to stop claiming `source: null`. Returning early
      // here is how that correction was silently lost the first time.
      if (!dryRun) await writeManifest([...byKey.values()], config);
      continue;
    }

    const started = Date.now();
    let done = 0;
    let doneBytes = 0;

    await pool(todo, concurrency, async (entry) => {
      try {
        const result = await uploadOne(r2, config, entry.file);
        byKey.set(result.key, {
          key: result.key,
          source: result.source,
          bytes: result.bytes,
          md5: result.md5,
          uploadedAt: new Date().toISOString(),
        });
        report.uploaded.push(result.key);
        done += 1;
        doneBytes += entry.size;
        if (done % 10 === 0 || done === todo.length || entry.size > 4194304) {
          const seconds = (Date.now() - started) / 1000;
          console.log(
            "  " + String(done).padStart(3) + "/" + todo.length + "  " + human(doneBytes).padStart(10) +
              "  " + (doneBytes / 1048576 / Math.max(seconds, 0.001)).toFixed(1) + " MiB/s  " + entry.key + " (" + human(entry.size) + ")",
          );
        }
      } catch (error) {
        report.failed.push({ key: entry.key, error: String(error?.message ?? error) });
        console.error("  FAILED  " + entry.key + ": " + String(error?.message ?? error));
      }
    });

    const seconds = (Date.now() - started) / 1000;
    console.log(
      "  → " + report.uploaded.length + " uploaded in " + seconds.toFixed(1) + " s (" +
        (doneBytes / 1048576 / Math.max(seconds, 0.001)).toFixed(1) + " MiB/s), " + report.failed.length + " failed",
    );

    // Written after every group, so a crash 200 files in still leaves a usable receipt.
    if (!dryRun) {
      reconcileWithRepository(byKey);
      await writeManifest([...byKey.values()], config);
    }
  }

  return report;
}

/* -------------------------------------------------------------------------- */
/* Verify                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Reconcile the manifest with what the bucket actually holds.
 *
 * The manifest used to be written only by a push, which made it a receipt for the repository mirror and
 * nothing else. That stopped being the whole truth the moment objects reached R2 another way: the
 * Storage migration copied 44 files (35 models that exist in no repository and no catalogue, and 9
 * pre-compression originals), and `uploads/models/**` is written by the admin upload path. An object
 * that is on the CDN and not in the receipt is exactly the kind of thing that goes unnoticed until it
 * is needed.
 *
 * So the index does two things a push cannot: it **adds** keys it finds that the manifest does not
 * know, marked `source: null` because no file in this repository corresponds to them, and it
 * **drops** keys that no longer exist. Bytes and md5 come from the bucket itself — its ETag is the md5
 * of a single-part upload — so the receipt describes R2 rather than what we hoped we sent.
 */
async function index({ config, r2, concurrency }) {
  const remote = await r2.list("");
  const existing = await readManifest();
  const byKey = new Map(existing.objects.map((object) => [object.key, object]));
  const live = new Set(remote.map((object) => object.key));

  for (const key of [...byKey.keys()]) if (!live.has(key)) byKey.delete(key);

  // Both directions of "the repository changed under the receipt" — see reconcileWithRepository, which
  // a push calls too, so the two writers cannot disagree about what a source means.
  const { orphaned, restored } = reconcileWithRepository(byKey);
  if (orphaned > 0) console.log("  " + orphaned + " entr(y/ies) had a source that is no longer on disk — marked source: null");
  if (restored > 0) console.log("  " + restored + " entr(y/ies) had no source and now have one again — recorded from disk");

  // Counted before the additions: at this point every key left is one the bucket still has, so the
  // difference from the old list is exactly what was dropped.
  let refreshed = 0;
  const dropped = existing.objects.length - byKey.size;
  const unknown = remote.filter((object) => !byKey.has(object.key));
  console.log(
    remote.length + " object(s) in the bucket · " + byKey.size + " already in the manifest · " +
      unknown.length + " to add · " + dropped + " to drop",
  );

  /**
   * Refresh **every** entry from the bucket, not only the ones the manifest has never seen.
   *
   * An object can be overwritten without the manifest noticing: a pipeline run uploads a replacement at
   * the same key, and the entry keeps the old size and md5. `--verify` then fails with "public X B ≠
   * manifest Y B" for a file that is perfectly fine — which is what happened after a batch of models was
   * downloaded and then removed. The receipt has to describe the bucket, so it is read from the bucket.
   */
  await pool(remote, concurrency, async (object) => {
    const existing = byKey.get(object.key);
    const stale = !existing || existing.bytes !== object.size;

    if (!stale) {
      byKey.set(object.key, { ...existing, bytes: object.size });
      return;
    }

    const head = await r2.headPublic(object.key).catch(() => ({ etag: "", contentType: "" }));
    byKey.set(object.key, {
      key: object.key,
      // A repository file produced this only if one still exists at the key's path.
      source: existsSync(join(ROOT, "public", object.key)) ? posix.join("public", object.key) : null,
      bytes: object.size,
      md5: head.etag ?? "",
      contentType: head.contentType ?? "",
      ...(existsSync(join(ROOT, "public", object.key)) ? {} : { note: "in the bucket, not produced from public/**" }),
      uploadedAt: existing?.uploadedAt ?? null,
    });
    refreshed += 1;
  });

  void unknown;

  const document = await writeManifest([...byKey.values()], config);
  console.log("manifest now lists " + document.count + " object(s), " + (document.bytes / 1048576).toFixed(1) + " MiB");
  return document;
}

/**
 * HEAD every manifest key over the *public* URL.
 *
 * This is the step that would catch the failure the PLAN warns about: a public URL that 403s, or a
 * key that landed under the wrong name, produces a site that 404s on every model page. A local
 * "upload" that was never read back is not evidence.
 */
async function verify({ config, r2, concurrency }) {
  const manifest = await readManifest();
  const objects = manifest.objects;
  console.log("Verifying " + objects.length + " object(s) over " + config.publicBase + "\n");

  let ok = 0;
  const problems = [];

  await pool(objects, concurrency, async (object) => {
    // A null source is a real state, not a missing one: the Storage migration put 44 objects on R2 that
    // no repository file corresponds to. Comparing them against a file that does not exist would report
    // a failure for something that is exactly as intended.
    const local = object.source ? await stat(join(ROOT, object.source)).catch(() => null) : null;
    const head = await r2.headPublic(object.key).catch((error) => ({ status: 0, bytes: 0, error: String(error?.cause?.code ?? error?.message ?? error) }));

    if (head.status !== 200) problems.push({ key: object.key, problem: head.status === 0 ? "unreachable (" + head.error + ")" : "HTTP " + head.status });
    else if (head.bytes !== object.bytes) problems.push({ key: object.key, problem: "public " + head.bytes + " B ≠ manifest " + object.bytes + " B" });
    else if (local && local.size !== object.bytes) problems.push({ key: object.key, problem: "local " + local.size + " B ≠ manifest " + object.bytes + " B" });
    else ok += 1;
  });

  const fromRepo = objects.filter((object) => object.source).length;
  console.log(ok + "/" + objects.length + " đọc được công khai với đúng số byte");
  console.log("  " + fromRepo + " có bản sao trong repo · " + (objects.length - fromRepo) + " chỉ có trên R2 (đã ghi rõ source: null)");
  for (const problem of problems.slice(0, 20)) console.log("  ✗ " + problem.key + " — " + problem.problem);
  if (problems.length) process.exitCode = 1;
  return problems.length;
}

/* -------------------------------------------------------------------------- */
/* Main                                                                       */
/* -------------------------------------------------------------------------- */

async function main() {
  // One implementation of the loader, in the adapter, so the two scripts cannot drift.
  await loadEnvFiles();

  const argv = process.argv.slice(2);
  const has = (name) => argv.includes("--" + name);
  const value = (name) => {
    const hit = argv.find((arg) => arg.startsWith("--" + name + "="));
    return hit ? hit.slice(name.length + 3) : null;
  };

  const config = readR2Config();
  console.log("R2 configuration\n  " + describeR2Config(config) + "\n");
  if (!config.configured) {
    console.error("R2 chưa được cấu hình — không đẩy gì cả.");
    process.exitCode = 1;
    return;
  }

  const r2 = createR2(config);
  const concurrency = Number(value("concurrency") ?? 4);
  const limit = value("limit") ? Number(value("limit")) : null;

  if (has("verify")) {
    await verify({ config, r2, concurrency });
    return;
  }

  if (has("index")) {
    await index({ config, r2, concurrency });
    return;
  }

  const groups = [];
  if (has("sounds") || has("all")) groups.push(["sounds", await collectSounds()]);
  if (has("models") || has("all")) groups.push(["models", await collectModels()]);
  if (has("previews") || has("all")) groups.push(["previews", await collectPreviews()]);
  if (groups.length === 0) {
    groups.push(["sounds", await collectSounds()], ["models", await collectModels()], ["previews", await collectPreviews()]);
  }

  const report = await run({ config, r2, groups, limit, dryRun: has("dry-run"), concurrency });

  console.log(
    "\nTổng: " + report.uploaded.length + " đã đẩy · " + report.skipped.length + " đã có sẵn (bỏ qua) · " +
      report.failed.length + " lỗi",
  );
  if (report.failed.length) process.exitCode = 1;
}

// Guarded like scripts/r2.mjs: the suite imports `keyFor` and the collectors from here, and importing
// them must not start a 488 MB upload.
const invokedDirectly = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (invokedDirectly) {
  main().catch((error) => {
    console.error(String(error?.stack ?? error));
    process.exitCode = 1;
  });
}
