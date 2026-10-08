#!/usr/bin/env node
/**
 * Back the bucket up without any credentials.
 *
 * The S3 token in .env.local died on 2026-10-08 and nothing on the machine could
 * mint a replacement, so `rclone copy` and `npm run r2:check` both return 401.
 * Losing the token must not mean losing the bucket, and it doesn't: the bucket is
 * public at NEXT_PUBLIC_R2_PUBLIC_URL, so every object is readable with no key at
 * all. The only thing credentials buy is the *index* — ListObjectsV2 — and that is
 * exactly what data/r2-manifest.json already is. It was written by r2-push.mjs at
 * upload time and records one entry per object with its key, byte length and md5.
 *
 * So this script treats the manifest as the index, fetches each key over the public
 * endpoint, and verifies both the byte length and the md5 against what the manifest
 * says. A file that fails either check is deleted and retried rather than trusted,
 * which makes the manifest the integrity claim and the network just transport.
 *
 *     node scripts/r2-backup.mjs                    # into ./kami3d-storage-backup
 *     node scripts/r2-backup.mjs --out=/tmp/mirror  # somewhere else
 *     node scripts/r2-backup.mjs --limit=5          # smoke test
 *     node scripts/r2-backup.mjs --concurrency=4    # gentler on the connection
 *     node scripts/r2-backup.mjs --dry-run          # say what would happen
 *
 * Re-run it as often as you like: anything already on disk with the right size and
 * md5 is skipped, so an interrupted run resumes instead of starting over. Exit code
 * is 1 if anything failed to download or failed its checksum, 0 otherwise, so it is
 * safe to chain in a shell.
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MANIFEST = join(ROOT, "data", "r2-manifest.json");
const DEFAULT_OUT = join(ROOT, "kami3d-storage-backup");

function parseArgs(argv) {
  const args = { out: DEFAULT_OUT, limit: Infinity, concurrency: 8, dryRun: false, base: null };
  for (const arg of argv) {
    if (arg === "--dry-run") args.dryRun = true;
    else if (arg.startsWith("--out=")) args.out = resolve(arg.slice("--out=".length));
    else if (arg.startsWith("--base=")) args.base = arg.slice("--base=".length).replace(/\/+$/, "");
    else if (arg.startsWith("--limit=")) args.limit = Number(arg.slice("--limit=".length));
    else if (arg.startsWith("--concurrency=")) args.concurrency = Number(arg.slice("--concurrency=".length));
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!Number.isFinite(args.limit) && args.limit !== Infinity) throw new Error("--limit must be a number");
  if (!Number.isInteger(args.concurrency) || args.concurrency < 1) throw new Error("--concurrency must be a positive integer");
  return args;
}

export async function readManifest(path = MANIFEST) {
  const manifest = JSON.parse(await readFile(path, "utf8"));
  if (!Array.isArray(manifest.objects)) throw new Error(`${path} has no objects array`);
  return manifest;
}

/** The manifest is the receipt, so it carries the base URL it was written against. */
export function manifestBase(manifest, override) {
  const base = override ?? manifest.publicBase;
  if (!base) throw new Error("No public base URL: pass --base= or set publicBase in the manifest");
  return base.replace(/\/+$/, "");
}

async function existingFile(path) {
  try {
    const info = await stat(path);
    return info.isFile() ? info.size : null;
  } catch {
    return null;
  }
}

async function md5Of(path) {
  const hash = createHash("md5");
  hash.update(await readFile(path));
  return hash.digest("hex");
}

async function download(base, object, dest, dryRun) {
  const url = `${base}/${object.key}`;
  if (dryRun) return { status: "would-fetch", bytes: object.bytes };

  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  const body = Buffer.from(await response.arrayBuffer());

  if (object.bytes != null && body.byteLength !== object.bytes) {
    throw new Error(`size ${body.byteLength} != manifest ${object.bytes}`);
  }
  const digest = createHash("md5").update(body).digest("hex");
  if (object.md5 && digest !== object.md5) {
    throw new Error(`md5 ${digest} != manifest ${object.md5}`);
  }

  await mkdir(dirname(dest), { recursive: true });
  await writeFile(dest, body);
  return { status: "fetched", bytes: body.byteLength };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const manifest = await readManifest();
  const base = manifestBase(manifest, args.base);
  const objects = manifest.objects.slice(0, args.limit === Infinity ? undefined : args.limit);

  console.log(`Bucket   ${manifest.bucket ?? "(unnamed)"}`);
  console.log(`Base     ${base}`);
  console.log(`Mirror   ${args.out}`);
  console.log(
    `Objects  ${objects.length} of ${manifest.objects.length}` +
      (Number.isFinite(args.limit) ? ` (--limit=${args.limit})` : ""),
  );
  if (args.dryRun) console.log("Dry run: nothing will be written.\n");
  else console.log("");

  const tally = { fetched: 0, skipped: 0, failed: 0 };
  let bytes = 0;
  const failures = [];
  const queue = [...objects];

  async function worker() {
    while (queue.length > 0) {
      const object = queue.shift();
      const dest = join(args.out, object.key);
      try {
        const size = await existingFile(dest);
        if (size !== null && size === object.bytes) {
          if (!object.md5 || (await md5Of(dest)) === object.md5) {
            tally.skipped += 1;
            bytes += size;
            continue;
          }
        }
        // A present-but-wrong file is worse than an absent one, since it looks done.
        if (size !== null) await rm(dest, { force: true });
        const result = await download(base, object, dest, args.dryRun);
        tally.fetched += 1;
        bytes += result.bytes ?? 0;
        console.log(`  ok    ${object.key}  ${((object.bytes ?? 0) / 1024 / 1024).toFixed(1)} MiB`);
      } catch (error) {
        tally.failed += 1;
        failures.push({ key: object.key, reason: error.message });
        console.log(`  FAIL  ${object.key}  ${error.message}`);
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(args.concurrency, queue.length || 1) }, worker));

  const mib = (bytes / 1024 / 1024).toFixed(1);
  console.log(`\n${tally.fetched} fetched, ${tally.skipped} already ok, ${tally.failed} failed — ${mib} MiB`);
  if (failures.length > 0) {
    console.log("\nFailures (re-run to retry; transfers are known to drop on long runs):");
    for (const failure of failures) console.log(`  ${failure.key}: ${failure.reason}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
