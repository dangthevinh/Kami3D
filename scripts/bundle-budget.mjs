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
 *   node scripts/bundle-budget.mjs --report     # print numbers, never fail on size
 *
 * It is deliberately **not** named `check-*.mjs`: that glob is the contract for
 * "a node:test suite that CI can run on a fresh checkout", and this file needs a
 * production build that the check step runs before. Naming it `check-bundle.mjs`
 * used to make `npm run check:suites` fail in CI — which is exactly how the
 * convention was discovered.
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
  // The visitor's own analytics: server-rendered numbers and inline SVG, so there is nothing to
  // load beyond the shared layout — but it is rendered on demand (it reads the visitor's own rows),
  // so like /map it is measured from the app build manifest rather than from prerendered HTML.
  // Measured at 106.3 kB when it landed. 140 leaves the same headroom the admin page has rather
  // than the 165 a content route gets, because there is no 3D, no map and no third party here.
  { route: "/analytics", manifest: "/analytics/page", budget: 140 },
  // The map route is server-rendered on demand (its URL decides what the server
  // draws), so there is no prerendered HTML to read: its chunks come from the app
  // build manifest instead. MapLibre itself stays deferred - this budget covers the
  // layer panel, the query codec and the species panel, plus a small margin over the
  // measured number (see docs/MAP.md).
  // Measured at 139 kB after the timeline and the seasonal-path player landed, so the
  // budget moved with it: this is the measured number plus a small margin, never a number
  // chosen to be easy to pass.
  { route: "/map", manifest: "/map/page", budget: 150 },
  // The Data2Map landing is a page of cards and must stay cheap: it lists five products and
  // their data sources, and loading a map renderer to do that would spend the whole budget on
  // the one route that does not draw anything. Measured at 104.6 kB on the first build, so the
  // budget is that plus a small margin - not a number chosen to be easy to pass.
  // Measured from the HTML, like every other route: 131.2 kB. The manifest-based numbers these
  // budgets started from were an undercount - the manifest lists the chunks Next tracks, and the
  // HTML lists everything the browser actually fetches before `load`. Same route, honest number.
  { route: "/data2map", html: "server/app/data2map.html", budget: 140 },
  // The first product page, and the first Data2Map route that draws a map. Its renderer is the
  // same lazily-loaded MapLibre chunk /map uses; measured after the first build.
  // Measured at 127.1 kB on the first build; the budget is that plus a small margin.
  // 144.2 kB measured - the largest route in the project, because it carries the map renderer.
  { route: "/data2map/real-estate", html: "server/app/data2map/real-estate.html", budget: 155 },
  // The story page has no map: it is a timeline, an image and a panel, so its budget is close to
  // the landing page's. Measured after the first build.
  // 141.2 kB measured: the timeline, the story panel and the lightbox.
  { route: "/data2map/stories", html: "server/app/data2map/stories.html", budget: 150 },
  // The second map route: the same lazily-loaded MapLibre chunk, plus the hex data it draws and the
  // hour clock it reuses. Measured at 150.3 kB - the largest route in the project, which is what a
  // map and a 162-cell grid cost - so the budget is that plus a small margin.
  { route: "/data2map/trends", html: "server/app/data2map/trends.html", budget: 160 },
  // The third map route, and the one that carries the most features: clustered stops, traces and
  // coverage bands. Measured after the first build; the budget is that plus a small margin.
  { route: "/data2map/logistics", html: "server/app/data2map/logistics.html", budget: 160 },
  // The last Data2Map route: raster layers over a parcel sample, with the shared stats components
  // rather than a chart library. Measured after the first build; the budget is that plus a margin.
  { route: "/data2map/agriculture", html: "server/app/data2map/agriculture.html", budget: 160 },
  // The twin (D7): MapLibre in three dimensions plus the Supabase Realtime client, both behind
  // next/dynamic - which is why a route with a map, a stream and a cockpit still measures close to
  // its neighbours. 152.1 kB measured; the budget is that plus a small margin.
  { route: "/data2map/twin", html: "server/app/data2map/twin.html", budget: 160 },
  // The admin analytics page (18A) is dynamic - it reads the last thirty days per request - so it is
  // measured from the manifest like /map. A table of numbers should never cost what a map costs.
  { route: "/admin/analytics", manifest: "/admin/analytics/page", budget: 140 },
];

/** Must never appear in an initial chunk of a content route. */
const FORBIDDEN = [
  { marker: "WebGLRenderer", why: "three.js must stay behind next/dynamic + MountWhenVisible" },
  { marker: "GoTrueClient", why: "the Supabase client must only load for a session that exists" },
  { marker: "@clerk/nextjs", why: "Clerk's client must only load for a signed-in visitor" },
  { marker: "framer-motion", why: "the motion library was removed; animations are CSS" },
  { marker: "maplibre-gl", why: "the map renderer must only load on /map, behind next/dynamic" },
  { marker: "MaplibreMap", why: "react-map-gl must not be part of any other route first paint" },
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

/**
 * The chunks a server-rendered route loads, from `app-build-manifest.json`.
 *
 * A dynamic route has no prerendered HTML to parse, but Next records exactly what it
 * would send - the layout, the shared chunks and the page itself - so a route that
 * cannot be checked by reading its HTML can still be held to a budget.
 */
function scriptsInManifest(key) {
  const file = path.join(nextDir, "app-build-manifest.json");
  if (!existsSync(file)) return null;

  const manifest = JSON.parse(readFileSync(file, "utf8"));
  const chunks = manifest?.pages?.[key];

  // No fallback on purpose. The client-reference manifest was tried and reports about half the
  // truth (it lists the page chunks, not the shared framework ones: `/map` came out at 62.9 kB
  // against 136.9 kB measured from the build manifest). A budget that silently under-measures is
  // worse than one that refuses to answer, so a missing entry is a loud failure instead.

  return chunks
    .filter((chunk) => chunk.endsWith(".js") && !/polyfills-[^/]*\.js$/.test(chunk))
    .map((chunk) => `/_next/${chunk}`);
}

const problems = [];
const rows = [];

for (const { route, html, manifest, budget } of ROUTES) {
  let urls;

  if (manifest) {
    urls = scriptsInManifest(manifest);
    if (!urls) {
      // This happens after a `next start` has run against the build: the server rewrites
      // `app-build-manifest.json` with the handful of entries it needed. Rebuilding fixes it,
      // and CI never hits it because it goes straight from build to check.
      problems.push(
        `${route}: no chunk list for "${manifest}" in app-build-manifest.json - run the build again with no server running`,
      );
      continue;
    }
  } else {
    const htmlPath = path.join(nextDir, html);
    if (!existsSync(htmlPath)) {
      problems.push(`${route}: expected prerendered HTML at ${html} — is the route still static?`);
      continue;
    }
    urls = scriptsIn(htmlPath);
  }

  let bytes = 0;
  const files = [];
  for (const url of urls) {
    const file = resolveAsset(url);
    if (!file) {
      problems.push(`${route}: ${url} is referenced by the route but missing from ${nextDir}`);
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
console.log("initial JavaScript per route, from the build's own HTML or its chunk manifest");
console.log("(gzip -6, polyfills excluded):\n");
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
