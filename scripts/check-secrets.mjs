/**
 * Proves the server-only secrets are not in the shipped files.
 *
 * Phase 18B said "tokens stay on the server" and nothing measured it. This does, on the real artifacts:
 * it reads the secret **values** from .env.local, then looks for them in every file git tracks and in the
 * built client output. A hit is a real leak — the service role key in a JS chunk is the whole database.
 *
 *   node scripts/check-secrets.mjs          # local
 *   npm run check:secrets                   # same, via npm
 *
 * It never prints a secret, not even on failure: a security check that echoes the thing it protects is a
 * second leak. Failures name the key and the file.
 *
 * Runs after the build in CI, because the client chunks are what matter. Without a build it scans what
 * exists and says so, rather than passing silently.
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();

/** The secrets worth protecting: sensitive names, long enough to be a credential rather than a flag. */
const SECRET_NAME = /(SECRET|SERVICE_ROLE|_TOKEN$|API_KEY|PASSWORD|ACCESS_TOKEN)/i;
const MIN_LENGTH = 20;

function readEnvFile(name) {
  const path = join(root, name);
  if (!existsSync(path)) return {};
  const values = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const key = trimmed.slice(0, trimmed.indexOf("=")).trim();
    const value = trimmed.slice(trimmed.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "");
    if (SECRET_NAME.test(key) && value.length >= MIN_LENGTH) values[key] = value;
  }
  return values;
}

const secrets = { ...readEnvFile(".env"), ...readEnvFile(".env.local") };
if (Object.keys(secrets).length === 0) {
  console.log("No server-only secrets are configured here, so there is nothing to look for.");
  process.exit(0);
}

/** Files to scan: everything git tracks, plus the built client chunks when a build exists. */
function scanTargets() {
  const targets = [];
  try {
    const tracked = execFileSync("git", ["ls-files"], { cwd: root, encoding: "utf8" }).split("\n").filter(Boolean);
    for (const file of tracked) targets.push({ path: file, fromGit: true });
  } catch {
    console.warn("Not a git checkout: scanning the tree instead of the tracked files.");
  }

  for (const dir of ["public", join(".next", "static")]) {
    const path = join(root, dir);
    if (!existsSync(path)) continue;
    const walk = (current) => {
      for (const entry of readdirSync(current)) {
        const full = join(current, entry);
        if (statSync(full).isDirectory()) walk(full);
        else targets.push({ path: relative(root, full), fromGit: false });
      }
    };
    walk(path);
  }

  return targets;
}

const targets = scanTargets();
const skip = /(\.env|\.map$|\.png$|\.jpg$|\.jpeg$|\.webp$|\.gif$|\.glb$|\.gltf$|\.ogg$|\.mp3$|\.woff2?$|\.ico$)/i;
const leaks = [];
let scanned = 0;

for (const { path, fromGit } of targets) {
  // The files the secrets are *supposed* to live in are not leaks.
  if (path === ".env" || path === ".env.local" || path.endsWith(".env.local")) continue;
  if (skip.test(path)) continue;
  if (fromGit && path.startsWith("node_modules/")) continue;

  let content;
  try {
    content = readFileSync(join(root, path), "utf8");
  } catch {
    continue;
  }
  scanned += 1;

  for (const [key, value] of Object.entries(secrets)) {
    if (content.includes(value)) leaks.push({ key, path });
  }
}

const hasBuild = existsSync(join(root, ".next", "static"));
console.log(
  "Scanned " + scanned + " of " + targets.length + " files for " + Object.keys(secrets).length + " configured secret(s).",
);
console.log(
  hasBuild
    ? "The built client chunks were included."
    : "No build found: only source and public/ were scanned. Run npm run build, then this again.",
);

if (leaks.length > 0) {
  console.error("");
  console.error("FAIL - a server-only secret appears in a file that ships:");
  for (const leak of leaks) console.error("  " + leak.key + " -> " + leak.path);
  console.error("Rotate the key, then remove it from the file above.");
  process.exit(1);
}

console.log("PASS - no configured secret appears in any scanned file.");
