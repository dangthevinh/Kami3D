/**
 * The bundle budget, enforced by CI instead of by memory.
 *
 * `next build` reports "First Load JS" from its own accounting of a route's chunk
 * graph, and that accounting has been wrong twice in this project in the way that
 * matters: it never mentioned Clerk's 239 kB CDN payload, and it said nothing
 * about the 3D bundles being requested *before* the first paint. Both were found
 * by driving a real browser; both could have shipped.
 *
 * This script closes most of that gap without a browser. It reads the HTML the
 * build actually produced, takes the exact `<script src>` list out of it — which is
 * what a browser downloads, not what the manifest says it should — gzips those
 * files, and fails when:
 *
 *   1. a route's initial JavaScript exceeds its budget,
 *   2. a chunk that must never be in the first paint (`three`, Clerk's client,
 *      Supabase's client, a motion library) shows up in it, or
 *   3. the 3D engine is missing from the build altogether — the cheapest way to
 *      pass a size budget is to break the product.
 *
 * `polyfills-*.js` is excluded on purpose: it is served `nomodule`, so no browser
 * that can run this app ever fetches it.
 *
 * It needs a build, so it runs after `npm run build` (locally and in CI):
 *
 *   npm run build && npm run check:bundle
 *   node scripts/check-bundle.mjs --report     # print numbers, never fail on size
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { gzipSync } from "node:zlib";

const nextDir = process.env.NEXT_DIR || ".next";
const reportOnly = process.argv.includes("--report");

/** A route and the prerendered file that represents it. */
const ROUTES = [
  { route: "/", html: "server/app/index.html", budget: 165 },
  { route: "/explore", html: "server/app/explore.html", budget: 165 },
  { route: "/quiz", html: "server/app/quiz.html", budget: 165 },
  { route: "/leaderboard", html: "server/app/leaderboard.html", budget: 165 },
  { route: "/about", html: "server/app/about.html", budget: 165 },
  { route: "/animal/[slug]", html: "server/app/animal/lion.html", budget: 165 },
];

/** Must never appear in an initial chunk of a content route. */
const FORBIDDEN = [
  { marker: "WebGLRenderer", why: "three.js must stay behind next/dynamic + MountWhenVisible" },
  { marker: "GoTrueClient", why: "the Supabase client must only load for a session that exists" },
  { marker: "@clerk/nextjs", why: "Clerk's client must only load for a signed-in visitor" },
  { marker: "framer-motion", why: "the motion library was removed; animations are CSS" },
];

if (!existsSync(nextDir)) {
  console.error(`No build found in ${nextDir}. Run \`npm run build\` first.`);
  process.exit(1);
}

const gzipCache = new Map();
const sourceCache = new Map();

/** `/_next/static/chunks/x.js` → the file inside `.next` (paths in HTML are URL-encoded). */
function resolveAsset(url) {
  const relative = decodeURIComponent(url).replace(/^\/_next\//, "");
  const file = path.join(nextDir, relative);
  return existsSync(file) ? file : null;
}

function gzipSize(file) {
  if (gzipCache.has(file)) return gzipCache.get(file);
  const size = gzipSync(readFileSync(file), { level: 6 }).length;
  gzipCache.set(file, size);
  return size;
}

function source(file) {
  if (!sourceCache.has(file)) sourceCache.set(file, readFileSync(file, "utf8"));
  return sourceCache.get(file);
}

function scriptsIn(htmlPath) {
  const html = readFileSync(htmlPath, "utf8");
  const urls = new Set();
  for (const [, url] of html.matchAll(/<script[^>]+src="(\/_next\/static\/[^"]+\.js)"/g)) urls.add(url);
  return [...urls].filter((url) => !/\/polyfills-[^/]*\.js$/.test(url));
}

const problems = [];
const rows = [];

for (const { route, html, budget } of ROUTES) {
  const htmlPath = path.join(nextDir, html);
  if (!existsSync(htmlPath)) {
    problems.push(`${route}: expected prerendered HTML at ${html} — is the route still static?`);
    continue;
  }

  let bytes = 0;
  const files = [];
  for (const url of scriptsIn(htmlPath)) {
    const file = resolveAsset(url);
    if (!file) {
      problems.push(`${route}: ${url} is referenced by the HTML but missing from ${nextDir}`);
      continue;
    }
    files.push(file);
    bytes += gzipSize(file);
  }

  rows.push({ route, kb: +(bytes / 1024).toFixed(1), chunks: files.length, budget });

  for (const file of files) {
    const text = source(file);
    for (const { marker, why } of FORBIDDEN) {
      if (text.includes(marker)) {
        problems.push(`${route}: initial chunk ${path.basename(file)} contains "${marker}" — ${why}`);
      }
    }
  }

  if (bytes / 1024 > budget) {
    problems.push(`${route}: ${(bytes / 1024).toFixed(1)} kB of initial JS exceeds its ${budget} kB budget`);
  }
}

// The deferred code has to still exist, or "it is not in the initial payload"
// would be trivially true because somebody deleted the feature.
const chunksDir = path.join(nextDir, "static", "chunks");
const deferredChunks = existsSync(chunksDir) ? readdirSync(chunksDir).filter((name) => name.endsWith(".js")) : [];
const findDeferred = (marker, minBytes) =>
  deferredChunks.filter(
    (name) => statSync(path.join(chunksDir, name)).size > minBytes && source(path.join(chunksDir, name)).includes(marker),
  );

const threeChunks = findDeferred("WebGLRenderer", 20_000);
const clerkChunks = findDeferred("@clerk/nextjs", 1_000);

if (!threeChunks.length) {
  problems.push("no chunk in the build contains three.js — the 3D viewers would silently fall back to nothing");
}
if (!clerkChunks.length) {
  problems.push("no chunk in the build contains Clerk's client — the account menu would never load for a signed-in visitor");
}

rows.sort((a, b) => b.kb - a.kb);
console.log("initial JavaScript per route, from the build's own HTML (gzip -6, polyfills excluded):\n");
for (const row of rows) {
  const flag = row.kb > row.budget ? "OVER" : " ok ";
  console.log(`  ${flag} ${String(row.kb).padStart(7)} kB  ${row.route.padEnd(18)} ${row.chunks} chunks  (budget ${row.budget})`);
}
console.log(`\n  deferred, not deleted: three.js in ${threeChunks.length} chunk(s), Clerk in ${clerkChunks.length}`);

if (problems.length) {
  console.error("\nProblems:");
  for (const problem of problems) console.error(`  ✗ ${problem}`);
  if (!reportOnly) process.exitCode = 1;
} else {
  console.log("\n✓ every route is inside its budget and free of eager 3D/auth code.");
}
