#!/usr/bin/env node
/**
 * Automatic 3D model acquisition for Kami3D.
 *
 *   npm run models:report                     # what is available, no downloads
 *   npm run models:fetch -- --species=lion    # fetch one species
 *   npm run models:fetch -- --all             # fetch every species that lacks a model
 *
 * ## Why this is not a scraper
 *
 * Every provider below is an official, documented API, and every download is
 * gated on a licence allow-list. A model is only written to disk when its
 * licence permits redistribution *and* the attribution that licence requires has
 * been recorded — which is why each download also writes
 * `data/model-attribution.json`. The species page renders that credit, so a
 * CC-BY model is never shipped without its author.
 *
 * ## Providers
 *
 *   sketchfab   official v3 API; search is public, downloading needs an OAuth
 *               token from https://sketchfab.com/settings/password
 *               (env SKETCHFAB_API_TOKEN). Only models whose author enabled
 *               download and whose licence passes the allow-list are accepted.
 *   smithsonian Smithsonian Open Access; CC0 by default. Needs a free
 *               api.data.gov key (env SI_API_KEY).
 *   polypizza   Poly Pizza (the CC0 Google Poly archive); needs an API key
 *               (env POLY_PIZZA_API_KEY).
 *   direct      A list you maintain yourself in `data/model-sources.json`.
 *               No key, always available, and the path used by the test suite.
 *
 * Nothing here bypasses a site's terms: where a provider requires a key, the
 * script fails with instructions instead of scraping around it.
 */

import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { ANIMALS } from "../data/animals.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MODEL_DIR = join(ROOT, "public", "models");
const ATTRIBUTION_FILE = join(ROOT, "data", "model-attribution.json");
const DIRECT_SOURCES_FILE = join(ROOT, "data", "model-sources.json");

const USER_AGENT = "Kami3D-model-fetcher/1.0 (+https://github.com/dangthevinh/Kami3D)";
const REQUEST_DELAY_MS = 350;

/* -------------------------------------------------------------------------- */
/* Licence policy                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Licences we may redistribute, mapped from the provider's human-readable label
 * to an SPDX identifier. Share-alike and non-commercial variants are denied by
 * default: a NC model cannot sit inside a page that shows advertising, and SA
 * would impose obligations on the rest of the site.
 */
const LICENSE_ALLOWLIST = {
  // sketchfab labels
  "CC0 Public Domain": { spdx: "CC0-1.0", attributionRequired: false, commercial: true },
  "Public Domain Mark": { spdx: "PDM-1.0", attributionRequired: false, commercial: true },
  "CC Attribution": { spdx: "CC-BY-4.0", attributionRequired: true, commercial: true },
  // generic labels used by the other providers
  CC0: { spdx: "CC0-1.0", attributionRequired: false, commercial: true },
  "CC0-1.0": { spdx: "CC0-1.0", attributionRequired: false, commercial: true },
  "CC-BY-4.0": { spdx: "CC-BY-4.0", attributionRequired: true, commercial: true },
  "Public Domain": { spdx: "PDM-1.0", attributionRequired: false, commercial: true },
};

/** Explicitly refused, so the reason is legible in the report. */
const LICENSE_DENYLIST = {
  "CC Attribution-ShareAlike": "share-alike would impose obligations on the whole site",
  "CC Attribution-NoDerivs": "no-derivatives forbids the scale and compression we apply",
  "CC Attribution-NonCommercial": "non-commercial is incompatible with ad-supported pages",
  "CC Attribution-NonCommercial-ShareAlike": "non-commercial",
  "CC Attribution-NonCommercial-NoDerivs": "non-commercial + no-derivatives",
  "Standard": "Sketchfab's default licence is all-rights-reserved",
};

function evaluateLicense(label) {
  if (!label) return { ok: false, reason: "no licence declared" };
  if (LICENSE_ALLOWLIST[label]) return { ok: true, ...LICENSE_ALLOWLIST[label] };
  if (LICENSE_DENYLIST[label]) return { ok: false, reason: LICENSE_DENYLIST[label] };
  return { ok: false, reason: `unrecognised licence "${label}" — refusing by default` };
}

/* -------------------------------------------------------------------------- */
/* Small helpers                                                              */
/* -------------------------------------------------------------------------- */

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { accept: "application/json", "user-agent": USER_AGENT, ...(options.headers ?? {}) },
    signal: AbortSignal.timeout(45_000),
  });
  return response;
}

async function fetchJson(url, options) {
  const response = await request(url, options);
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText} for ${url}`);
  }
  return response.json();
}

/** A GLB starts with the magic "glTF"; a glTF is JSON; a zip starts with PK. */
export function detectFormat(buffer) {
  if (buffer.length < 4) return "unknown";
  const magic = buffer.subarray(0, 4).toString("ascii");
  if (magic === "glTF") return "glb";
  if (magic.startsWith("PK")) return "zip";
  if (buffer.subarray(0, 1).toString("ascii") === "{" || magic.startsWith("{") || magic.includes('"asset"')) {
    return "gltf";
  }
  return "unknown";
}

/* -------------------------------------------------------------------------- */
/* Providers                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Sketchfab — https://docs.sketchfab.com/data.html
 * Search is unauthenticated; `/download` requires an OAuth token.
 */
const sketchfab = {
  id: "sketchfab",
  label: "Sketchfab",
  homepage: "https://sketchfab.com",
  tokenEnv: "SKETCHFAB_API_TOKEN",

  get token() {
    return process.env.SKETCHFAB_API_TOKEN ?? "";
  },

  async search(query, { limit = 24 } = {}) {
    const url = new URL("https://api.sketchfab.com/v3/search");
    url.searchParams.set("type", "models");
    url.searchParams.set("q", query);
    url.searchParams.set("downloadable", "true");
    url.searchParams.set("count", String(limit));

    const data = await fetchJson(url.toString());
    return (data.results ?? []).map((model) => ({
      provider: "sketchfab",
      id: model.uid,
      title: model.name ?? "Untitled",
      author: model.user?.displayName ?? model.user?.username ?? "Unknown",
      authorUrl: model.user?.profileUrl ?? null,
      // Only models whose author explicitly enabled download are considered.
      downloadable: Boolean(model.isDownloadable),
      licenseLabel: model.license?.label ?? null,
      licenseUrl: model.license?.url ?? null,
      sourceUrl: model.viewerUrl ?? `https://sketchfab.com/3d-models/${model.uid}`,
      faceCount: model.faceCount ?? null,
      thumbnail: model.thumbnails?.images?.[0]?.url ?? null,
      annotationCount: model.annotationCount ?? 0,
    }));
  },

  async download(candidate, destination) {
    if (!this.token) {
      throw new Error(
        `${this.tokenEnv} is not set. Create an OAuth token at https://sketchfab.com/settings/password ` +
          "and add it to .env.local (see docs/MODELS.md).",
      );
    }

    const manifest = await fetchJson(`https://api.sketchfab.com/v3/models/${candidate.id}/download`, {
      headers: { authorization: `Token ${this.token}` },
    });

    // Prefer a single binary glb; fall back to the gltf archive.
    const entry = manifest.glb ?? manifest.gltf;
    if (!entry?.url) throw new Error("Sketchfab returned no downloadable glb/gltf for this model");

    const response = await request(entry.url, { headers: { accept: "*/*" } });
    if (!response.ok) throw new Error(`download failed: ${response.status}`);

    const buffer = Buffer.from(await response.arrayBuffer());
    const format = detectFormat(buffer);
    if (format === "unknown") throw new Error("downloaded payload is not glb/gltf/zip");

    const target = format === "zip" ? destination.replace(/\.glb$/, ".zip") : destination;
    await writeFile(target, buffer);
    return { file: target, bytes: buffer.length, format };
  },
};

/**
 * Smithsonian Open Access — https://edan.si.edu/openaccess/apidocs/
 * CC0 by default, which is why it is the second provider.
 */
const smithsonian = {
  id: "smithsonian",
  label: "Smithsonian Open Access",
  homepage: "https://www.si.edu/openaccess",
  tokenEnv: "SI_API_KEY",

  get token() {
    return process.env.SI_API_KEY ?? "";
  },

  async search(query, { limit = 10 } = {}) {
    if (!this.token) return [];

    const url = new URL("https://api.si.edu/openaccess/api/v1.0/search");
    url.searchParams.set("q", `${query} AND online_media_type:"3D Models"`);
    url.searchParams.set("rows", String(limit));
    url.searchParams.set("api_key", this.token);

    const data = await fetchJson(url.toString());
    return (data.response?.rows ?? []).map((row) => ({
      provider: "smithsonian",
      id: row.id,
      title: row.title ?? "Untitled",
      author: "Smithsonian Institution",
      authorUrl: "https://www.si.edu/openaccess",
      downloadable: true,
      licenseLabel: "CC0",
      licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
      sourceUrl: `https://www.si.edu/object/${row.id}`,
      faceCount: null,
      thumbnail: null,
      record: row,
    }));
  },

  async download(candidate, destination) {
    if (!this.token) {
      throw new Error(`${this.tokenEnv} is not set — request a free key at https://api.data.gov/signup/`);
    }

    // The 3D package document lists the actual mesh files.
    const document = await fetchJson(`https://3d-api.si.edu/content/document/${candidate.id}`, {
      headers: { "x-api-key": this.token },
    });

    const assets = (document?.resources ?? []).flatMap((resource) => resource.files ?? []);
    const mesh = assets.find((file) => /\.(glb|gltf)$/i.test(file.url ?? "")) ?? assets[0];
    if (!mesh?.url) throw new Error("no mesh file in the Smithsonian 3D package");

    const response = await request(mesh.url, { headers: { accept: "*/*" } });
    if (!response.ok) throw new Error(`download failed: ${response.status}`);

    const buffer = Buffer.from(await response.arrayBuffer());
    const format = detectFormat(buffer);
    if (format === "unknown") throw new Error("downloaded payload is not glb/gltf/zip");

    const target = format === "zip" ? destination.replace(/\.glb$/, ".zip") : destination;
    await writeFile(target, buffer);
    return { file: target, bytes: buffer.length, format };
  },
};

/**
 * Poly Pizza — https://poly.pizza (CC0 archive of the discontinued Google Poly).
 */
const polyPizza = {
  id: "polypizza",
  label: "Poly Pizza",
  homepage: "https://poly.pizza",
  tokenEnv: "POLY_PIZZA_API_KEY",

  get token() {
    return process.env.POLY_PIZZA_API_KEY ?? "";
  },

  async search(query, { limit = 10 } = {}) {
    if (!this.token) return [];

    const url = new URL("https://api.poly.pizza/v1.1/search");
    url.searchParams.set("search", query);
    url.searchParams.set("limit", String(limit));

    const data = await fetchJson(url.toString(), { headers: { "x-auth-token": this.token } });
    return (data.results ?? []).map((model) => ({
      provider: "polypizza",
      id: model.Id ?? model.id,
      title: model.Title ?? "Untitled",
      author: model.Creator?.Username ?? "Unknown",
      authorUrl: model.Creator?.ProfileUrl ?? null,
      downloadable: true,
      licenseLabel: model.License === "CC-BY" ? "CC-BY-4.0" : "CC0",
      licenseUrl:
        model.License === "CC-BY"
          ? "https://creativecommons.org/licenses/by/4.0/"
          : "https://creativecommons.org/publicdomain/zero/1.0/",
      sourceUrl: model.ViewerUrl ?? `https://poly.pizza/m/${model.Id ?? model.id}`,
      faceCount: model.TriCount ?? null,
      thumbnail: model.Thumbnail ?? null,
      downloadUrl: model.Download,
    }));
  },

  async download(candidate, destination) {
    if (!candidate.downloadUrl) throw new Error("Poly Pizza result has no download URL");

    const response = await request(candidate.downloadUrl, { headers: { accept: "*/*" } });
    if (!response.ok) throw new Error(`download failed: ${response.status}`);

    const buffer = Buffer.from(await response.arrayBuffer());
    const format = detectFormat(buffer);
    if (format === "unknown") throw new Error("downloaded payload is not glb/gltf/zip");

    const target = format === "zip" ? destination.replace(/\.glb$/, ".zip") : destination;
    await writeFile(target, buffer);
    return { file: target, bytes: buffer.length, format };
  },
};

/**
 * Direct URLs you maintain yourself in `data/model-sources.json`:
 *
 *   { "lion": { "url": "https://…/lion.glb", "title": "…", "author": "…",
 *               "license": "CC0", "licenseUrl": "https://…", "sourceUrl": "https://…" } }
 *
 * No key, no network policy to negotiate, and the path the tests exercise.
 */
const direct = {
  id: "direct",
  label: "Direct URL (data/model-sources.json)",
  homepage: null,
  tokenEnv: null,
  token: "",

  async loadSources() {
    if (!existsSync(DIRECT_SOURCES_FILE)) return {};
    try {
      return JSON.parse(await readFile(DIRECT_SOURCES_FILE, "utf8"));
    } catch (error) {
      throw new Error(`data/model-sources.json is not valid JSON: ${error.message}`);
    }
  },

  async searchFor(slug) {
    const sources = await this.loadSources();
    const entry = sources[slug];
    if (!entry) return [];

    return [
      {
        provider: "direct",
        id: slug,
        title: entry.title ?? slug,
        author: entry.author ?? "Unknown",
        authorUrl: entry.authorUrl ?? null,
        downloadable: true,
        licenseLabel: entry.license ?? null,
        licenseUrl: entry.licenseUrl ?? null,
        sourceUrl: entry.sourceUrl ?? entry.url,
        faceCount: entry.faceCount ?? null,
        thumbnail: null,
        downloadUrl: entry.url,
      },
    ];
  },

  async download(candidate, destination) {
    const response = await request(candidate.downloadUrl, { headers: { accept: "*/*" } });
    if (!response.ok) throw new Error(`download failed: ${response.status} for ${candidate.downloadUrl}`);

    const buffer = Buffer.from(await response.arrayBuffer());
    const format = detectFormat(buffer);
    if (format === "unknown") throw new Error("downloaded payload is not glb/gltf/zip");

    const target = format === "zip" ? destination.replace(/\.glb$/, ".zip") : destination;
    await writeFile(target, buffer);
    return { file: target, bytes: buffer.length, format };
  },
};

export const PROVIDERS = { sketchfab, smithsonian, polypizza: polyPizza, direct };

/* -------------------------------------------------------------------------- */
/* Attribution store                                                          */
/* -------------------------------------------------------------------------- */

export async function readAttribution() {
  if (!existsSync(ATTRIBUTION_FILE)) return {};
  try {
    return JSON.parse(await readFile(ATTRIBUTION_FILE, "utf8"));
  } catch {
    return {};
  }
}

async function writeAttribution(manifest) {
  const sorted = Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)));
  await writeFile(ATTRIBUTION_FILE, `${JSON.stringify(sorted, null, 2)}\n`, "utf8");
}

/**
 * Point `data/animals.ts` at a locally fetched model.
 *
 * `model_url` stays the single source of truth for "which model does this species
 * use" — the same column the SQL schema and Supabase storage rely on — so a local
 * file has to be wired in explicitly rather than guessed at runtime. The edit is
 * scoped to the species' own object literal and verified before it is written.
 */
async function wireModelUrl(slug, url) {
  const file = join(ROOT, "data", "animals.ts");
  const source = await readFile(file, "utf8");

  const slugIndex = source.indexOf(`slug: "${slug}"`);
  if (slugIndex === -1) throw new Error(`could not find slug "${slug}" in data/animals.ts`);

  const fieldIndex = source.indexOf("model_url:", slugIndex);
  if (fieldIndex === -1) throw new Error(`could not find model_url for "${slug}"`);

  const lineEnd = source.indexOf("\n", fieldIndex);
  const currentLine = source.slice(fieldIndex, lineEnd);

  if (currentLine.includes(url)) return false;

  const spacing = currentLine.match(/^model_url:\s*/)?.[0] ?? "model_url: ";
  const next = source.slice(0, fieldIndex) + `${spacing}"${url}",` + source.slice(lineEnd);

  if (!next.includes(`model_url: "${url}"`)) throw new Error("wiring produced no change; aborting");

  await writeFile(file, next, "utf8");
  return true;
}

/* -------------------------------------------------------------------------- */
/* Candidate ranking                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Pick the best candidate for a species.
 *
 * Ranking favours, in order: no-attribution licences, a title that matches the
 * species, then lower polygon counts (mobile budget). Candidates whose licence
 * is denied are excluded before ranking, and the reason is reported.
 */
export function rankCandidates(candidates, animal) {
  const wanted = [animal.name, animal.latin_name, animal.category].map((value) => value.toLowerCase());

  return candidates
    .map((candidate) => {
      const licence = evaluateLicense(candidate.licenseLabel);
      const title = candidate.title.toLowerCase();
      let score = 0;

      if (wanted.some((term) => title === term)) score += 40;
      else if (wanted.some((term) => title.includes(term))) score += 25;
      else if (wanted.some((term) => term.includes(title) && title.length > 3)) score += 12;

      if (licence.spdx === "CC0-1.0" || licence.spdx === "PDM-1.0") score += 20;
      else if (licence.spdx === "CC-BY-4.0") score += 10;

      if (typeof candidate.faceCount === "number") {
        if (candidate.faceCount < 30_000) score += 12;
        else if (candidate.faceCount < 100_000) score += 5;
        else if (candidate.faceCount > 500_000) score -= 15;
      }

      return { candidate, licence, score };
    })
    .sort((a, b) => b.score - a.score);
}

/* -------------------------------------------------------------------------- */
/* Commands                                                                   */
/* -------------------------------------------------------------------------- */

function parseArgs(argv) {
  const flags = { species: [], providers: Object.keys(PROVIDERS), all: false, apply: false, force: false, report: false, wire: false };
  for (const arg of argv) {
    if (arg === "--all") flags.all = true;
    else if (arg === "--apply") flags.apply = true;
    else if (arg === "--force") flags.force = true;
    else if (arg === "--wire") flags.wire = true;
    else if (arg === "--report") flags.report = true;
    else if (arg.startsWith("--species=")) flags.species.push(arg.split("=")[1]);
    else if (arg.startsWith("--provider=")) flags.providers = arg.split("=")[1].split(",");
    else if (arg === "--help" || arg === "-h") flags.help = true;
    else console.warn(`ignoring unknown argument: ${arg}`);
  }
  return flags;
}

function providerKeyFor(id) {
  return id === "polypizza" ? "polypizza" : id;
}

/** Gather candidates for one species from every enabled provider. */
async function gatherCandidates(animal, providers) {
  const results = [];

  for (const id of providers) {
    const provider = PROVIDERS[providerKeyFor(id)];
    if (!provider) {
      console.warn(`unknown provider "${id}"`);
      continue;
    }

    try {
      const found =
        provider.id === "direct"
          ? await provider.searchFor(animal.slug)
          : await provider.search(animal.name, { limit: 24 });
      results.push(...found);
    } catch (error) {
      console.warn(`  ${provider.label}: ${error.message}`);
    }
    await sleep(REQUEST_DELAY_MS);
  }

  return results;
}

async function report(flags) {
  const animals = flags.all || flags.species.length === 0
    ? ANIMALS
    : ANIMALS.filter((animal) => flags.species.includes(animal.slug));

  console.log(`Scanning ${animals.length} species across: ${flags.providers.join(", ")}\n`);

  let allowed = 0;
  let refused = 0;

  for (const animal of animals) {
    const candidates = await gatherCandidates(animal, flags.providers);
    const ranked = rankCandidates(candidates, animal);
    const ok = ranked.filter((entry) => entry.licence.ok);

    console.log(`${animal.emoji} ${animal.name} (${animal.slug})`);
    if (ranked.length === 0) {
      console.log("   no results\n");
      continue;
    }

    for (const { candidate, licence } of ranked.slice(0, 3)) {
      if (licence.ok) {
        allowed += 1;
        console.log(`   ✔ ${licence.spdx.padEnd(9)} ${candidate.title.slice(0, 44).padEnd(46)} ${candidate.provider}`);
      } else {
        refused += 1;
        console.log(`   ✘ refused   ${candidate.title.slice(0, 44).padEnd(46)} ${licence.reason}`);
      }
    }
    console.log("");
  }

  console.log(`Summary: ${allowed} redistributable candidate(s), ${refused} refused on licence grounds.`);
  console.log("Run with --apply to download the best allowed candidate per species.");
}

async function fetchModels(flags) {
  if (!flags.all && flags.species.length === 0) {
    console.error("Nothing to do: pass --all or --species=<slug> (add --apply to download).");
    process.exitCode = 2;
    return;
  }

  // Searching is often unauthenticated (Sketchfab is), but downloading is not.
  if (flags.apply) {
    const missingToken = flags.providers
      .map((id) => PROVIDERS[providerKeyFor(id)])
      .filter((provider) => provider?.tokenEnv && !provider.token);

    for (const provider of missingToken) {
      console.warn(`note: downloading from ${provider.label} is disabled — ${provider.tokenEnv} is not set.`);
    }
  }

  const animals = flags.all
    ? ANIMALS
    : ANIMALS.filter((animal) => flags.species.includes(animal.slug));

  const manifest = await readAttribution();
  let downloaded = 0;
  let skipped = 0;

  for (const animal of animals) {
    const destination = join(MODEL_DIR, `${animal.slug}.glb`);

    if (existsSync(destination) && !flags.force) {
      console.log(`= ${animal.slug}: already has a local model (use --force to replace)`);
      skipped += 1;
      continue;
    }

    const candidates = await gatherCandidates(animal, flags.providers);
    const best = rankCandidates(candidates, animal).find((entry) => entry.licence.ok);

    if (!best) {
      console.log(`✘ ${animal.slug}: no candidate with a redistributable licence`);
      skipped += 1;
      continue;
    }

    const { candidate, licence } = best;
    console.log(
      `→ ${animal.slug}: ${candidate.title} by ${candidate.author} [${licence.spdx}] from ${candidate.provider}`,
    );

    if (!flags.apply) {
      console.log("   (dry run — add --apply to download)");
      continue;
    }

    const provider = PROVIDERS[providerKeyFor(candidate.provider)];
    await mkdir(MODEL_DIR, { recursive: true });

    try {
      const result = await provider.download(candidate, destination);

      manifest[animal.slug] = {
        title: candidate.title,
        author: candidate.author,
        authorUrl: candidate.authorUrl,
        license: licence.spdx,
        licenseUrl: candidate.licenseUrl,
        sourceUrl: candidate.sourceUrl,
        provider: candidate.provider,
        file: `/models/${result.file.split("/").pop()}`,
        format: result.format,
        bytes: result.bytes,
        sha256: createHash("sha256")
          .update(await readFile(result.file))
          .digest("hex"),
        attributionRequired: licence.attributionRequired,
        fetchedAt: new Date().toISOString(),
      };

      downloaded += 1;
      console.log(`   saved ${result.file.replace(ROOT + "/", "")} (${(result.bytes / 1024).toFixed(0)} KB)`);

      if (flags.wire && result.format !== "zip") {
        const wired = await wireModelUrl(animal.slug, `/models/${result.file.split("/").pop()}`);
        console.log(
          wired
            ? `   wired data/animals.ts: model_url -> /models/${result.file.split("/").pop()}`
            : "   data/animals.ts already points at this model",
        );
      } else if (result.format === "zip") {
        console.log("   note: this provider returned an archive; extract the .glb and wire model_url by hand.");
      }
    } catch (error) {
      console.error(`   failed: ${error.message}`);
      skipped += 1;
    }

    await sleep(REQUEST_DELAY_MS);
  }

  if (flags.apply && downloaded > 0) {
    await writeAttribution(manifest);
    console.log(`\nWrote attribution for ${downloaded} model(s) to data/model-attribution.json.`);
    console.log("Commit that file: it is what lets the UI credit the author.");
    if (flags.wire) console.log("data/animals.ts was updated — run 'npm run seed:generate' to refresh the SQL seed.");
    console.log("Compress before shipping — see docs/MODELS.md for the DRACO step.");
  }

  console.log(`\n${downloaded} downloaded, ${skipped} skipped.`);
}

/* -------------------------------------------------------------------------- */

const flags = parseArgs(process.argv.slice(2));

if (flags.help) {
  console.log(`Kami3D model fetcher

  --report                list what each provider offers, download nothing
  --species=<slug>        limit to one or more species (repeatable)
  --all                   every species in the catalogue
  --provider=a,b          restrict providers (default: all)
  --apply                 actually download (default is a dry run)
  --wire                  also set model_url in data/animals.ts to the local file
  --force                 replace an existing local model

Environment:
  SKETCHFAB_API_TOKEN     Sketchfab OAuth token (required to download)
  SI_API_KEY              Smithsonian Open Access key
  POLY_PIZZA_API_KEY      Poly Pizza key
`);
} else if (flags.report || (!flags.all && flags.species.length === 0)) {
  await report(flags);
} else {
  await fetchModels(flags);
}
