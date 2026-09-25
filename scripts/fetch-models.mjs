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
import { mkdir, mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import { basename, dirname, extname, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { ANIMALS } from "../data/animals.ts";
import { describeQuality, modelLicenseFromSpdx, scoreModelQuality } from "../lib/model-quality.ts";

const run = promisify(execFile);

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MODEL_DIR = join(ROOT, "public", "models");
const ATTRIBUTION_FILE = join(ROOT, "data", "model-attribution.json");
const PREVIEW_INDEX_FILE = join(ROOT, "data", "model-preview.json");
const DIRECT_SOURCES_FILE = join(ROOT, "data", "model-sources.json");
const QUERY_OVERRIDES_FILE = join(ROOT, "data", "model-queries.json");

const USER_AGENT = "Kami3D-model-fetcher/1.0 (+https://github.com/dangthevinh/Kami3D)";
/** One bucket for every asset the product ships; storage paths keep them apart. */
const ASSET_BUCKET = "animal-assets";
const REQUEST_DELAY_MS = 350;

/** Mutable run configuration, populated from the CLI flags. */
const CONFIG = {
  /** 12 MB: comfortably inside the documented per-model budget. */
  maxBytes: 12 * 1024 * 1024,
};

/**
 * Load `.env.local` / `.env`.
 *
 * Next.js loads these for the app, but this script runs as a plain Node process,
 * so without this the provider keys would only work if they happened to be
 * exported in the shell. Existing environment variables always win, and nothing
 * is ever printed, so a token cannot leak into logs.
 */
export async function loadEnvFiles() {
  for (const name of [".env.local", ".env"]) {
    const file = join(ROOT, name);
    if (!existsSync(file)) continue;

    for (const line of (await readFile(file, "utf8")).split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;

      const separator = trimmed.indexOf("=");
      if (separator === -1) continue;

      const key = trimmed.slice(0, separator).trim();
      let value = trimmed.slice(separator + 1).trim();

      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      if (!(key in process.env)) process.env[key] = value;
    }
  }
}

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

export function evaluateLicense(label) {
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
      // /models/<uid> always resolves; viewerUrl carries a slug that can be "none".
      sourceUrl: `https://sketchfab.com/models/${model.uid}`,
      faceCount: model.faceCount ?? null,
      // The only quality signals the API gives: how many people wanted this model
      // and how many liked it. Absent on providers that do not report them, which
      // the scorer treats as "no signal" rather than as zero.
      downloadCount: model.downloadCount ?? null,
      likeCount: model.likeCount ?? null,
      thumbnail: model.thumbnails?.images?.find((image) => image.width >= 512)?.url
        ?? model.thumbnails?.images?.[0]?.url
        ?? null,
      annotationCount: model.annotationCount ?? 0,
    }));
  },

  /**
   * One model, by uid: the numbers a search result does not carry.
   *
   * `faceCount`, `downloadCount`, `likeCount` and the thumbnails are what the quality
   * score is made of, and a model fetched in an earlier phase has none of them in the
   * manifest. This endpoint is public — metadata needs no token.
   */
  async describe(uid) {
    const model = await fetchJson(`https://api.sketchfab.com/v3/models/${uid}`);
    return {
      uid,
      title: model.name ?? "Untitled",
      author: model.user?.displayName ?? model.user?.username ?? "Unknown",
      authorUrl: model.user?.profileUrl ?? null,
      licenseLabel: model.license?.label ?? null,
      licenseUrl: model.license?.url ?? null,
      sourceUrl: `https://sketchfab.com/models/${uid}`,
      faceCount: model.faceCount ?? null,
      downloadCount: model.downloadCount ?? null,
      likeCount: model.likeCount ?? null,
      thumbnail: model.thumbnails?.images?.find((image) => image.width >= 512)?.url
        ?? model.thumbnails?.images?.[0]?.url
        ?? null,
    };
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

    if (typeof entry.size === "number" && entry.size > CONFIG.maxBytes) {
      throw new Error(
        `declared size ${(entry.size / 1048576).toFixed(1)} MB exceeds the ${(CONFIG.maxBytes / 1048576).toFixed(0)} MB budget` +
          " (raise it with --max-mb if you really want this model)",
      );
    }

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


/* -------------------------------------------------------------------------- */
/* Phase 18B: the keyless providers                                           */
/* -------------------------------------------------------------------------- */

/**
 * Poly Haven, NASA and the Khronos sample assets need no token, which is why they are the default:
 * a fresh clone with no .env.local can still find and fetch a redistributable model. The other
 * three providers stay exactly as they were and are simply switches that are off without a key.
 *
 * All three are *catalogues* rather than search engines — Poly Haven publishes 521 models, NASA 227
 * folders, Khronos 162 samples — so search is a cached listing filtered by name, and the lists are
 * fetched once per run rather than per species.
 */
const CATALOGUE_TTL_MS = 10 * 60 * 1000;
const catalogueCache = new Map();

async function cachedListing(key, load) {
  const hit = catalogueCache.get(key);
  if (hit && Date.now() - hit.at < CATALOGUE_TTL_MS) return hit.value;
  const value = await load();
  catalogueCache.set(key, { at: Date.now(), value });
  return value;
}

/** Every word of the query must appear somewhere in the haystack. Cheap, and predictable to a user. */
function matchesAll(haystack, query) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const target = haystack.toLowerCase();
  return words.length > 0 && words.every((word) => target.includes(word));
}

async function githubContents(repo, path) {
  const url = "https://api.github.com/repos/" + repo + "/contents/" + encodeURIComponent(path).replace(/%2F/g, "/");
  const response = await request(url, { headers: { accept: "application/vnd.github+json" } });
  if (response.status === 403) throw new Error("GitHub rate limit reached (60 requests/hour without a token)");
  if (!response.ok) throw new Error(response.status + " for " + path);
  return response.json();
}

/**
 * The licence of one Khronos sample, read from its own LICENSE.md.
 *
 * The repository mixes CC0 and CC BY models and states which is which per model, so guessing from
 * the repository would be exactly the kind of assumption this project refuses. Anything that does
 * not clearly say CC0 or CC BY is returned as null, and the pipeline then refuses to download it
 * with that reason.
 */
export function classifySampleLicense(text) {
  if (!text) return null;
  const hasCC0 = /\bCC0\b|Creative Commons Zero|public domain/i.test(text);
  const hasBy = /CC[- ]BY|Attribution 4\.0|CC Attribution/i.test(text);
  if (hasBy && !hasCC0) return "CC-BY";
  if (hasCC0 && !hasBy) return "CC0";
  if (hasCC0 && hasBy) return "CC-BY";
  return null;
}

const polyHaven = {
  id: "polyhaven",
  label: "Poly Haven",
  homepage: "https://polyhaven.com",
  /** No token: this provider is always available, which is the point of the keyless three. */
  tokenEnv: null,
  keyless: true,
  /** Site-wide CC0: the API does not carry a licence field per model (docs/MODELS.md). */
  defaultLicense: "CC0",
  licenceNote: "CC0 for the whole library, declared at the site level",

  async search(query, { limit = 24 } = {}) {
    const assets = await cachedListing("polyhaven", () =>
      fetchJson("https://api.polyhaven.com/assets?t=models"),
    );

    return Object.entries(assets)
      .filter(([slug, entry]) =>
        matchesAll(slug + " " + (entry.name ?? "") + " " + (entry.tags ?? []).join(" ") + " " + (entry.categories ?? []).join(" "), query),
      )
      .slice(0, limit)
      .map(([slug, entry]) => ({
        provider: "polyhaven",
        id: slug,
        title: entry.name ?? slug,
        author: (entry.authors ?? {})[Object.keys(entry.authors ?? {})[0]] ?? "Poly Haven",
        authorUrl: "https://polyhaven.com/a/" + slug,
        downloadable: true,
        licenseLabel: "CC0",
        licenseUrl: "https://polyhaven.com/license",
        sourceUrl: "https://polyhaven.com/a/" + slug,
        faceCount: typeof entry.polycount === "number" ? entry.polycount : null,
        downloadCount: typeof entry.download_count === "number" ? entry.download_count : null,
        likeCount: null,
        thumbnail: entry.thumbnail_url ?? null,
      }));
  },

  /**
   * Poly Haven publishes .gltf plus its textures as separate files, at four resolutions. 1k keeps a
   * model inside the per-model budget (the same asset at 8k is tens of megabytes), and
   * \`gltf-transform copy\` packs the pair into the single .glb everything else in this project expects.
   */
  async download(candidate, destination) {
    const files = await fetchJson("https://api.polyhaven.com/files/" + encodeURIComponent(candidate.id));
    const resolution = Object.prototype.hasOwnProperty.call(files.gltf ?? {}, "1k") ? "1k" : Object.keys(files.gltf ?? {})[0];
    if (!resolution) throw new Error("no glTF published for this model");

    const variant = Object.values(files.gltf[resolution])[0];
    const includes = Object.entries(variant.include ?? {});

    const workdir = await mkdtemp(join(tmpdir(), "kami3d-polyhaven-"));
    try {
      const localGltf = join(workdir, basename(new URL(variant.url).pathname));
      await writeFile(localGltf, Buffer.from(await (await request(variant.url)).arrayBuffer()));

      for (const [relative, file] of includes) {
        const target = join(workdir, relative);
        await mkdir(dirname(target), { recursive: true });
        await writeFile(target, Buffer.from(await (await request(file.url)).arrayBuffer()));
      }

      if (!existsSync(GLTF_TRANSFORM)) {
        throw new Error("packing a Poly Haven model needs @gltf-transform/cli — run: npm install --save-dev @gltf-transform/cli");
      }
      // .gltf plus its textures in, one .glb out: the format the rest of the pipeline expects.
      await run(GLTF_TRANSFORM, ["copy", localGltf, destination], { timeout: 180_000, maxBuffer: 8 * 1024 * 1024 });
      const bytes = (await readFile(destination)).length;
      return { file: destination, bytes, format: "glb", resolution };
    } finally {
      await rm(workdir, { recursive: true, force: true });
    }
  },
};

/**
 * NASA 3D Resources: a GitHub repository of 227 folders, public domain.
 *
 * The folders hold one .glb each next to its preview image, and the repository's README states the
 * terms, so the licence is the provider's, not the model's: public domain, recorded here as CC0
 * because the two carry the same obligation.
 */
const nasa = {
  id: "nasa",
  label: "NASA 3D Resources",
  homepage: "https://nasa3d.arc.nasa.gov/models",
  tokenEnv: null,
  keyless: true,
  defaultLicense: "CC0",
  licenceNote: "public domain (NASA media usage guidelines)",
  repo: "nasa/NASA-3D-Resources",
  folder: "3D Models",

  async search(query, { limit = 24 } = {}) {
    const listing = await cachedListing("nasa", () => githubContents(this.repo, this.folder));

    return listing
      .filter((entry) => entry.type === "dir" && matchesAll(entry.name, query))
      .slice(0, limit)
      .map((entry) => ({
        provider: "nasa",
        id: entry.name,
        title: entry.name,
        author: "NASA",
        authorUrl: "https://www.nasa.gov/",
        downloadable: true,
        licenseLabel: "Public Domain",
        licenseUrl: "https://www.nasa.gov/nasa-brand-center/images-and-media/",
        sourceUrl: entry.html_url,
        faceCount: null,
        downloadCount: null,
        likeCount: null,
        thumbnail: null,
      }));
  },

  /** The folder's .glb, straight from raw.githubusercontent.com. */
  async download(candidate, destination) {
    const files = await githubContents(this.repo, this.folder + "/" + candidate.id);
    const model = files.find((entry) => /\.glb$/i.test(entry.name));
    if (!model) throw new Error("this NASA folder has no .glb (the repository also holds .obj/.stl, which this pipeline does not convert)");

    const buffer = Buffer.from(await (await request(model.download_url)).arrayBuffer());
    await writeFile(destination, buffer);
    return { file: destination, bytes: buffer.length, format: "glb", sourceBytes: model.size };
  },
};

/**
 * The Khronos glTF Sample Assets: 162 models that exist to test renderers, which makes them the
 * pipeline's own smoke test as much as a source of content.
 */
const khronos = {
  id: "khronos",
  label: "Khronos glTF Sample Assets",
  homepage: "https://github.com/KhronosGroup/glTF-Sample-Assets",
  tokenEnv: null,
  keyless: true,
  defaultLicense: null,
  licenceNote: "per model, read from that model's LICENSE.md (the repository mixes CC0 and CC BY)",
  repo: "KhronosGroup/glTF-Sample-Assets",
  folder: "Models",

  async search(query, { limit = 24 } = {}) {
    const listing = await cachedListing("khronos", () => githubContents(this.repo, this.folder));

    return listing
      .filter((entry) => entry.type === "dir" && matchesAll(entry.name, query))
      .slice(0, limit)
      .map((entry) => ({
        provider: "khronos",
        id: entry.name,
        title: entry.name.replace(/([a-z])([A-Z])/g, "$1 $2"),
        author: "Khronos Group",
        authorUrl: "https://www.khronos.org/",
        downloadable: true,
        // Filled in by `download`, which reads the model's own licence before deciding.
        licenseLabel: null,
        licenseUrl: null,
        sourceUrl: entry.html_url,
        faceCount: null,
        downloadCount: null,
        likeCount: null,
        thumbnail:
          "https://raw.githubusercontent.com/" + this.repo + "/main/" + this.folder + "/" + entry.name + "/screenshot/screenshot.png",
      }));
  },

  /** Read the model's licence first: a sample whose terms are unclear is not downloaded. */
  async licenseFor(candidate) {
    const files = await githubContents(this.repo, this.folder + "/" + candidate.id);
    const licenseFile = files.find((entry) => /^LICENSE(\.md|\.txt)?$/i.test(entry.name));
    if (!licenseFile) return { license: null, reason: "the sample has no LICENSE file, so its terms are unknown" };

    const text = await (await request(licenseFile.download_url)).text();
    const license = classifySampleLicense(text);
    if (!license) return { license: null, reason: "the sample's LICENSE file does not state CC0 or CC BY" };
    return { license, url: licenseFile.html_url };
  },

  async download(candidate, destination) {
    const info = await this.licenseFor(candidate);
    if (!info.license) throw new Error(info.reason);

    const files = await githubContents(this.repo, this.folder + "/" + candidate.id + "/glTF-Binary");
    const model = files.find((entry) => /\.glb$/i.test(entry.name));
    if (!model) throw new Error("this sample has no glTF-Binary build");

    const buffer = Buffer.from(await (await request(model.download_url)).arrayBuffer());
    await writeFile(destination, buffer);
    return { file: destination, bytes: buffer.length, format: "glb", license: info.license, licenseUrl: info.url };
  },
};

/**
 * The registry as data, so the console can print it, the tests can assert it and nobody has to read
 * three implementations to find out which providers need a token.
 */
export const PROVIDER_REGISTRY = [
  { id: "polyhaven", label: "Poly Haven", homepage: "https://polyhaven.com", keyless: true, needsKey: null, license: "CC0", kind: "catalogue" },
  { id: "nasa", label: "NASA 3D Resources", homepage: "https://nasa3d.arc.nasa.gov/models", keyless: true, needsKey: null, license: "CC0", kind: "catalogue" },
  { id: "khronos", label: "Khronos glTF Sample Assets", homepage: "https://github.com/KhronosGroup/glTF-Sample-Assets", keyless: true, needsKey: null, license: "per model", kind: "catalogue" },
  { id: "sketchfab", label: "Sketchfab", homepage: "https://sketchfab.com", keyless: false, needsKey: "SKETCHFAB_API_TOKEN", license: "per model", kind: "search" },
  { id: "smithsonian", label: "Smithsonian Open Access", homepage: "https://3d.si.edu", keyless: false, needsKey: "SI_API_KEY", license: "CC0", kind: "search" },
  { id: "polypizza", label: "Poly Pizza", homepage: "https://poly.pizza", keyless: false, needsKey: "POLY_PIZZA_API_KEY", license: "per model", kind: "search" },
  // The one provider that is not a service: an admin pinned this URL in data/model-sources.json.
  // Its licence is declared per entry, checked like any other, and the download still goes through
  // the budget — which is why it can be allowed by default without weakening anything.
  { id: "direct", label: "Direct URL", homepage: "https://github.com/dangthevinh/Kami3D", keyless: true, needsKey: null, license: "declared per entry", kind: "catalogue" },
];

/**
 * Providers this project will not fetch from, with the reason written down.
 *
 * Kept as data rather than as an omission: "we did not implement it" and "we decided against it"
 * look identical in a codebase, and only one of them is true here.
 */
export const REFUSED_PROVIDERS = [
  { id: "thingiverse", reason: "terms forbid automated downloading, and most models are CC BY-NC" },
  { id: "myminifactory", reason: "CC BY-NC and terms forbid scripted downloads" },
  { id: "cgtrader", reason: "marketplace terms forbid scraping; licences are per purchase" },
  { id: "googlepoly", reason: "the service closed in 2021; Poly Pizza carries what was archived" },
  { id: "sketchfab-standard", reason: "Sketchfab's default licence is all rights reserved" },
];

export const PROVIDERS = { sketchfab, smithsonian, polypizza: polyPizza, direct, polyhaven: polyHaven, nasa, khronos };


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
  await writePreviewIndex(sorted);
}

/**
 * The same models, reduced to the two numbers a species card needs.
 *
 * The card decides on hover whether it may fetch a model (see lib/model-preview.ts), and
 * that decision has to happen in the browser. Importing the credit manifest to answer it
 * put both manifests — every author, licence, source URL and sha256 — into the client
 * bundle of three routes, measured at **+5.6 kB gzip on /quiz, /explore and /**, which was
 * enough to push /quiz past its budget. This file is the answer: about 700 bytes, written
 * from the same object in the same breath, so the two cannot disagree.
 */
async function writePreviewIndex(sorted) {
  const models = Object.fromEntries(
    Object.entries(sorted).map(([slug, entry]) => [slug, [entry.bytes ?? 0, entry.faceCount ?? null]]),
  );
  const payload = {
    note: "Generated by scripts/fetch-models.mjs from data/model-attribution.json. Compact on purpose: a species card imports this on hover, so it carries only the size and triangle count the preview budget needs. Edit the manifest, not this file; check:preview fails if they disagree.",
    models,
  };
  await writeFile(PREVIEW_INDEX_FILE, `${JSON.stringify(payload)}\n`, "utf8");
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
 * Score and order every candidate for a species.

 * The rules live in `lib/model-quality.ts` so they can be pinned by a test; this
 * function only feeds them the candidate fields and sorts. A denied licence scores
 * zero on the licence component but is still *listed*, because the report has to be
 * able to say why a candidate was refused — it is never selected, since callers
 * filter on `licence.ok`.
 */
export function rankCandidates(candidates, animal) {
  const terms = [animal.name, animal.latin_name, animal.category];

  return candidates
    .map((candidate) => {
      const licence = evaluateLicense(candidate.licenseLabel);
      const quality = scoreModelQuality({
        title: candidate.title ?? "",
        terms,
        spdx: licence.ok ? licence.spdx : null,
        faceCount: candidate.faceCount ?? null,
        downloadCount: candidate.downloadCount ?? null,
        likeCount: candidate.likeCount ?? null,
        hasThumbnail: Boolean(candidate.thumbnail),
      });

      // Ties are broken by title so two identical scores cannot reorder between runs.
      return { candidate, licence, score: quality.total, quality, matched: quality.matched };
    })
    .sort((a, b) => b.score - a.score || a.candidate.title.localeCompare(b.candidate.title));
}

/* -------------------------------------------------------------------------- */
/* DRACO compression                                                          */
/* -------------------------------------------------------------------------- */

/**
 * The compressor, resolved from `node_modules` rather than through `npx`.
 *
 * It is a **devDependency**: `check:bundle` fails if three.js or a glTF toolchain
 * reaches the browser bundle, and the visitor has no reason to download a
 * compactor. Installing it locally also means no network round trip per model.
 */
const GLTF_TRANSFORM = join(ROOT, "node_modules", ".bin", "gltf-transform");

async function compressGlb(file) {
  if (!existsSync(GLTF_TRANSFORM)) {
    throw new Error(
      "DRACO compression needs @gltf-transform/cli — run: npm install --save-dev @gltf-transform/cli",
    );
  }

  const before = (await readFile(file)).length;
  const temporary = `${file}.draco.glb`;

  try {
    await run(GLTF_TRANSFORM, ["draco", file, temporary], { timeout: 180_000, maxBuffer: 8 * 1024 * 1024 });
  } catch (error) {
    await rm(temporary, { force: true });
    throw new Error(`DRACO compression failed: ${String(error.message).split("\n")[0]}`);
  }

  const after = (await readFile(temporary)).length;
  // Keep the result only when it is genuinely smaller: a model that already
  // carries DRACO, or has almost no geometry, can come out bigger.
  if (after >= before) {
    await rm(temporary, { force: true });
    return { before, after: before, kept: false };
  }

  await rm(file);
  await rename(temporary, file);
  return { before, after, kept: true };
}

/* -------------------------------------------------------------------------- */
/* Supabase Storage + `model_assets`                                          */
/* -------------------------------------------------------------------------- */

export function supabaseConfig() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "";
  return { url, key, ready: Boolean(url && key) };
}

/**
 * Uploads into `animal-assets`, the bucket models already live in.
 *
 * The project has exactly one asset bucket (see `lib/supabase.ts` and
 * `docs/ASSETS.md`); adding a second one for models would mean two places to look
 * and two policies to keep in step, so the storage path — `models/<file>` — is what
 * separates a model from an image or a call recording.
 */
async function uploadToStorage(supabase, path, bytes) {
  const response = await fetch(`${supabase.url}/storage/v1/object/${ASSET_BUCKET}/${path}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${supabase.key}`,
      apikey: supabase.key,
      "content-type": "model/gltf-binary",
      "x-upsert": "true",
      "cache-control": "public, max-age=31536000, immutable",
    },
    body: bytes,
    signal: AbortSignal.timeout(120_000),
  });

  if (!response.ok) throw new Error(`storage upload failed: ${response.status} ${await response.text()}`);
  return `${supabase.url}/storage/v1/object/public/${ASSET_BUCKET}/${path}`;
}

export async function rest(supabase, path, init = {}) {
  const response = await fetch(`${supabase.url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: supabase.key,
      authorization: `Bearer ${supabase.key}`,
      "content-type": "application/json",
      prefer: "resolution=merge-duplicates,return=representation",
      ...(init.headers ?? {}),
    },
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) throw new Error(`${init.method ?? "GET"} ${path} failed: ${response.status} ${await response.text()}`);
  return response.status === 204 ? null : response.json().catch(() => null);
}

/**
 * Records one model and, when it is the species' primary, points `animals.model_url`
 * at it.
 *
 * `model_assets` has `unique (animal_id, source_url)`, so re-running the pipeline
 * updates the row instead of duplicating it. The partial unique index allows only
 * one primary per species, so the previous primary is demoted first — otherwise the
 * second upload would fail on a constraint that the reader cannot see.
 */
async function recordInDatabase(supabase, animal, row) {
  const animals = await rest(supabase, `animals?slug=eq.${encodeURIComponent(animal.slug)}&select=id`);
  const animalId = animals?.[0]?.id;
  if (!animalId) throw new Error(`no animals row for ${animal.slug} — run "npm run db:seed" first`);

  if (row.is_primary) {
    await rest(supabase, `model_assets?animal_id=eq.${animalId}&is_primary=is.true`, {
      method: "PATCH",
      body: JSON.stringify({ is_primary: false }),
    });
  }

  await rest(supabase, "model_assets?on_conflict=animal_id,source_url", {
    method: "POST",
    body: JSON.stringify([{ animal_id: animalId, ...row }]),
  });

  if (row.is_primary) {
    await rest(supabase, `animals?slug=eq.${encodeURIComponent(animal.slug)}`, {
      method: "PATCH",
      body: JSON.stringify({ model_url: row.public_url }),
    });
  }
}

/** The credit line a CC-BY model has to carry, in the same shape as a call credit. */
export function modelCredit({ title, author, spdx, provider }) {
  return `${title} by ${author} — ${spdx} (via ${provider})`;
}

/* -------------------------------------------------------------------------- */
/* Commands                                                                   */
/* -------------------------------------------------------------------------- */

function parseArgs(argv) {
  const flags = {
    species: [],
    providers: Object.keys(PROVIDERS),
    all: false,
    apply: false,
    force: false,
    report: false,
    wire: false,
    strictMatch: false,
    rehash: false,
    refreshQuality: false,
    /** Compress every downloaded model with DRACO before it is stored. */
    compress: false,
    /** Push the files to Supabase Storage and record them in `model_assets`. */
    upload: false,
    /** How many models to keep per species. The first is the primary. */
    count: 1,
    /** The admin who approved this run: written to the download log. */
    actor: null,
    /** Set by an admin, per order. Without it a policy with require_approval refuses everything. */
    approve: false,
    /** The model_source_orders row this run belongs to, if any. */
    order: null,
    /** Machine-readable candidate list on stdout, for the console. */
    json: false,
    /**
     * One exact candidate, as the console sends it: "provider:id".
     *
     * A human picked this model in the search results, so the ranking is skipped — but nothing else is:
     * the licence check, the per-model size cap, the download budget and the attribution all still
     * apply, because this is the same code path the CLI has always used.
     */
    candidate: null,
    /**
     * The query to use with --candidate: the title of the model the console showed the admin.
     *
     * Necessary because providers do not share an id shape. Khronos and NASA name their models (the id is
     * "Duck"), Poly Haven uses a slug that its own search matches, but a Sketchfab id is an opaque uid
     * that no search returns — so the console sends the title it displayed, and the run searches for that
     * and then keeps only the exact id.
     */
    candidateQuery: null,
  };
  for (const arg of argv) {
    if (arg === "--all") flags.all = true;
    else if (arg === "--apply") flags.apply = true;
    else if (arg === "--compress") flags.compress = true;
    else if (arg === "--upload") flags.upload = true;
    else if (arg.startsWith("--count=")) {
      const count = Number.parseInt(arg.slice("--count=".length), 10);
      flags.count = Number.isFinite(count) && count > 0 ? Math.min(count, 10) : 1;
    }
    else if (arg === "--force") flags.force = true;
    else if (arg === "--wire") flags.wire = true;
    else if (arg === "--strict-match") flags.strictMatch = true;
    else if (arg === "--rehash") flags.rehash = true;
    else if (arg === "--refresh-quality") flags.refreshQuality = true;
    else if (arg.startsWith("--max-mb=")) CONFIG.maxBytes = Number(arg.split("=")[1]) * 1024 * 1024;
    else if (arg === "--report") flags.report = true;
    else if (arg.startsWith("--actor=")) flags.actor = arg.split("=")[1];
    else if (arg === "--approve") flags.approve = true;
    else if (arg.startsWith("--order=")) flags.order = arg.split("=")[1];
    else if (arg === "--json") flags.json = true;
    else if (arg.startsWith("--candidate=")) flags.candidate = arg.slice("--candidate=".length);
    else if (arg.startsWith("--candidate-query=")) flags.candidateQuery = arg.slice("--candidate-query=".length);
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

/**
 * Per-species search overrides.
 *
 * A species' display name is not always the best search term: searching Sketchfab
 * for "Common Octopus" happily returns an octopus *fillet*, and some names simply
 * have no matches while their genus does. `data/model-queries.json` maps
 * `slug -> query` and can also add words that must appear in the title.
 *
 *   { "common-octopus": { "query": "octopus vulgaris", "reject": ["fillet", "sashimi", "food"] } }
 */
async function loadQueryOverrides() {
  if (!existsSync(QUERY_OVERRIDES_FILE)) return {};
  try {
    return JSON.parse(await readFile(QUERY_OVERRIDES_FILE, "utf8"));
  } catch (error) {
    throw new Error(`data/model-queries.json is not valid JSON: ${error.message}`);
  }
}

/** Gather candidates for one species from every enabled provider. */
export async function gatherCandidates(animal, providers, overrides = {}) {
  const results = [];
  const override = overrides[animal.slug] ?? {};
  const query = override.query ?? animal.name;

  if (override.query) console.log(`   (searching "${override.query}" instead of "${animal.name}")`);

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
          : await provider.search(query, { limit: 24 });

      /**
       * Some catalogues state the licence per model rather than per provider.
       *
       * Khronos is the one that does: each sample carries its own LICENSE.md, so a search result arrives
       * with no licence label and every candidate is refused by the allow-list before a human ever sees
       * it — including when the console asks for one *by id*, which is the whole point of picking a model
       * by hand. Resolving it here, for the first few results, means the licence is known before the
       * download: the ranking can score it, the report prints it, and the console shows it in the row.
       */
      if (typeof provider.licenseFor === "function") {
        for (const candidate of found.slice(0, 8)) {
          if (candidate.licenseLabel) continue;
          const info = await provider.licenseFor(candidate);
          if (info?.license) {
            candidate.licenseLabel = info.license === "CC0" ? "CC0" : "CC Attribution";
            candidate.licenseUrl = info.url ?? null;
          }
        }
      }

      // Drop results whose title contains a rejected word ("fillet", "sashimi"…).
      const rejected = (override.reject ?? []).map((word) => word.toLowerCase());
      const kept = rejected.length
        ? found.filter((candidate) => !rejected.some((word) => candidate.title.toLowerCase().includes(word)))
        : found;

      for (const candidate of found) {
        if (!kept.includes(candidate)) {
          console.log(`   – rejected "${candidate.title.slice(0, 50)}" (matches a reject word)`);
        }
      }

      results.push(...kept);
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

  const overrides = await loadQueryOverrides();
  console.log(`Scanning ${animals.length} species across: ${flags.providers.join(", ")}\n`);

  let allowed = 0;
  let refused = 0;

  for (const animal of animals) {
    const candidates = await gatherCandidates(animal, flags.providers, overrides);
    const ranked = rankCandidates(candidates, animal);
    // Count every candidate, not just the three printed below: a summary that only
    // describes what is on screen is how "3 candidates available" ends up quoted in a
    // decision it cannot support.
    const ok = ranked.filter((entry) => entry.licence.ok);
    allowed += ok.length;
    refused += ranked.length - ok.length;

    console.log(`${animal.emoji} ${animal.name} (${animal.slug})`);
    if (ranked.length === 0) {
      console.log("   no results\n");
      continue;
    }

    for (const { candidate, licence, score, quality, matched } of ranked.slice(0, 3)) {
      // A model whose title says nothing about the species is usually a stray
      // result, so it is flagged rather than presented as a good match.
      const flag = matched ? " " : "?";
      // The score is printed with its parts because "62" alone cannot be argued
      // with: downloads/complexity/thumbnail are what actually moved the number.
      if (licence.ok) {
        console.log(
          `   ✔${flag} ${String(score).padStart(5)}  ${describeQuality(score).padEnd(9)} ${licence.spdx.padEnd(9)} ` +
            `${candidate.title.slice(0, 40).padEnd(42)} ${candidate.provider}` +
            `\n        ↳ title ${quality.title} · licence ${quality.license} · popularity ${quality.popularity} ·` +
            ` complexity ${quality.complexity} · thumbnail ${quality.thumbnail}` +
            `${typeof candidate.faceCount === "number" ? ` · ${candidate.faceCount.toLocaleString("en-US")} faces` : ""}` +
            `${typeof candidate.downloadCount === "number" ? ` · ${candidate.downloadCount} downloads` : ""}`,
        );
      } else {
        console.log(`   ✘${flag} refused   ${candidate.title.slice(0, 40).padEnd(42)} ${licence.reason}`);
      }
    }
    console.log("");
  }

  console.log(`Summary: ${allowed} redistributable candidate(s), ${refused} refused on licence grounds.`);
  console.log("Run with --apply to download the best allowed candidate per species.");
}

/** Where a species' Nth model lives: `<slug>.glb`, then `<slug>-alt2.glb`, … */
export function modelFileName(slug, index) {
  return index === 0 ? `${slug}.glb` : `${slug}-alt${index + 1}.glb`;
}

/**
 * The quality score of a manifest entry.
 *
 * Entries written before this phase carry no face count, download count or
 * thumbnail, so they are scored from what they do say: the title, the licence, and
 * the fact that we have no popularity signal — which the scorer treats as unknown
 * rather than as zero.
 */
function qualityForEntry(animal, entry) {
  if (typeof entry.qualityScore === "number") return entry.qualityScore;

  return scoreModelQuality({
    title: entry.title ?? animal.name,
    terms: [animal.name, animal.latin_name, animal.category],
    spdx: entry.license ?? null,
    faceCount: entry.faceCount ?? null,
    downloadCount: entry.downloadCount ?? null,
    likeCount: entry.likeCount ?? null,
    hasThumbnail: Boolean(entry.thumbnail),
  }).total;
}

/**
 * Uploads one model and records it — the storage object, the `model_assets` row and,
 * for the primary, `animals.model_url`.
 *
 * The licence is re-checked here rather than trusted from the caller: this is the
 * last point before a model becomes part of the product, and `model_assets` refuses
 * anything but CC0 and CC BY anyway. Failing here means the row is not written and
 * the file is not stored, which is the correct outcome for an unattributable model.
 */
async function storeModel({ supabase, animal, file, entry, index }) {
  const license = modelLicenseFromSpdx(entry.license);
  if (!license) {
    throw new Error(`refusing to store a model under "${entry.license ?? "no licence"}" — only CC0 and CC BY are shipped`);
  }

  const storagePath = `models/${basename(file)}`;
  const bytes = await readFile(file);
  const publicUrl = await uploadToStorage(supabase, storagePath, bytes);

  await recordInDatabase(supabase, animal, {
    provider: entry.provider ?? "unknown",
    sketchfab_uid: entry.provider === "sketchfab" ? entry.uid ?? null : null,
    title: entry.title ?? animal.name,
    license,
    source_url: entry.sourceUrl ?? null,
    attribution: modelCredit({
      title: entry.title ?? animal.name,
      author: entry.author ?? "Unknown",
      spdx: entry.license ?? license,
      provider: entry.provider ?? "unknown",
    }),
    face_count: entry.faceCount ?? null,
    download_count: entry.downloadCount ?? null,
    like_count: entry.likeCount ?? null,
    file_size_bytes: bytes.length,
    storage_path: storagePath,
    public_url: publicUrl,
    quality_score: qualityForEntry(animal, entry),
    is_primary: index === 0,
  });

  return publicUrl;
}


/* -------------------------------------------------------------------------- */
/* The download budget - the one place a download is allowed                   */
/* -------------------------------------------------------------------------- */

/**
 * Ask the database whether this download may happen, and record the attempt.
 *
 * This is the choke point. The worker, the console route and this CLI all end up in
 * `public.reserve_model_download()`, which holds an advisory lock, counts the log and writes the
 * attempt in one transaction - so a second process racing for the last slot of the day loses, and
 * there is no flag here that turns the budget off. Without a database there is no policy, and no
 * policy means no download: the honest refusal is cheaper than an unlogged one.
 *
 * The reservation is made at the *largest* size the policy allows rather than at a guess, so the
 * storage budget cannot be overspent by discovering afterwards that a model was bigger than the
 * search result suggested. `settle` then writes the real number.
 */
async function reserveDownload({ candidate, licence, animal, flags }) {
  const supabase = supabaseConfig();
  if (!supabase) {
    return {
      allowed: false,
      reason: "no Supabase configured, so the download policy cannot be read - set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
    };
  }

  try {
    // `rest` throws on a non-2xx, so an unreachable policy is a refusal rather than an exception:
    // the download must not happen either way, and the reason has to reach the operator.
    return await rest(supabase, "rpc/reserve_model_download", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        p_provider: candidate.provider,
        p_provider_id: candidate.id ?? null,
        p_title: candidate.title ?? null,
        p_license: modelLicenseFromSpdx(licence.spdx) ?? null,
        // Worst case on purpose: the policy caps the model, and the settle records the truth.
        p_bytes: policyCeiling.current ?? CONFIG.maxBytes,
        p_animal_slug: animal.slug,
        p_actor: flags.actor ?? null,
        p_order_id: flags.order ?? null,
        p_approved: Boolean(flags.approve),
      }),
    });
  } catch (error) {
    return { allowed: false, reason: "the budget could not be read: " + String(error.message).split("\n")[0] };
  }
}

/** Close the attempt: a failure hands its slot back instead of spending it. */
async function settleDownload(id, outcome, bytes, reason) {
  const supabase = supabaseConfig();
  if (!supabase || !id) return;
  try {
    await rest(supabase, "rpc/settle_model_download", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ p_id: id, p_outcome: outcome, p_bytes: bytes ?? null, p_reason: reason ?? null }),
    });
  } catch (error) {
    console.warn(`   (could not settle the download log: ${error.message})`);
  }
}

/** The per-model ceiling the policy currently allows, cached for the run. */
const policyCeiling = { current: null };

async function loadPolicyCeiling() {
  const supabase = supabaseConfig();
  if (!supabase) return;
  try {
    const usage = await rest(supabase, "rpc/model_download_usage", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
    const ceiling = usage?.policy?.max_bytes_per_model;
    if (typeof ceiling === "number" && ceiling > 0) policyCeiling.current = ceiling;
  } catch {
    // The reserve call will refuse with a readable reason if the policy is unreachable.
  }
}

/**
 * Keep only the candidate the console asked for, by provider and id.
 *
 * Both halves are required: provider ids are only unique inside a provider, and the two catalogues this
 * project reads from (NASA, Khronos) both have a model called "Duck".
 */
export function filterToCandidate(candidates, selector) {
  const separator = selector.indexOf(":");
  if (separator <= 0) return [];
  const provider = selector.slice(0, separator);
  const id = selector.slice(separator + 1);
  return candidates.filter((candidate) => candidate.provider === provider && String(candidate.id) === id);
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

  const supabase = flags.upload ? supabaseConfig() : null;
  if (flags.upload && !supabase.ready) {
    console.error("--upload needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (see README).");
    process.exitCode = 2;
    return;
  }

  const animals = flags.all
    ? ANIMALS
    : ANIMALS.filter((animal) => flags.species.includes(animal.slug));

  const overrides = await loadQueryOverrides();
  const manifest = await readAttribution();
  let downloaded = 0;
  let stored = 0;
  let skipped = 0;
  /** Refused by the download budget. Counted separately so the summary cannot hide them. */
  let refused = 0;
  // Upload-only runs never touch the manifest; rewriting it would reorder the file
  // and add noise to a diff that changed nothing.
  let manifestDirty = false;

  for (const animal of animals) {
    const primaryPath = join(MODEL_DIR, modelFileName(animal.slug, 0));
    const hasLocal = existsSync(primaryPath);

    // Upload-only pass. The 24 models that shipped before this phase are already in
    // the repository: there is nothing to search for, but there is a row to write and
    // an object to store — and refusing to credit a model we cannot attribute keeps
    // the licence rule honest even on this path.
    if (hasLocal && flags.upload && !flags.force) {
      const entry = manifest[animal.slug];
      if (!entry) {
        console.log(`? ${animal.slug}: model on disk with no attribution entry — storing nothing`);
        skipped += 1;
        continue;
      }

      try {
        await storeModel({ supabase, animal, file: primaryPath, entry, index: 0 });
        stored += 1;
        console.log(`⇧ ${animal.slug}: stored ${basename(primaryPath)} and recorded it`);
      } catch (error) {
        console.error(`   failed: ${error.message}`);
        skipped += 1;
      }
      continue;
    }

    if (hasLocal && !flags.force) {
      console.log(`= ${animal.slug}: already has a local model (use --force to replace)`);
      skipped += 1;
      continue;
    }

    // The console can name one model. Then the search is run for that model's title — an opaque id is
    // not searchable — and only the exact id survives the filter, so the run can never substitute a
    // different model for the one that was picked.
    const searchOverrides = flags.candidate
      ? { ...overrides, [animal.slug]: { ...(overrides[animal.slug] ?? {}), query: flags.candidateQuery ?? animal.name } }
      : overrides;
    const gathered = await gatherCandidates(animal, flags.providers, searchOverrides);
    const candidates = flags.candidate ? filterToCandidate(gathered, flags.candidate) : gathered;
    const ranked = rankCandidates(candidates, animal).filter(
      (entry) => entry.licence.ok && (!flags.strictMatch || entry.matched),
    );

    // One model per source: two providers can return the same asset, and
    // `model_assets` is keyed on (animal_id, source_url).
    const seen = new Set();
    const chosen = [];
    for (const entry of ranked) {
      if (seen.has(entry.candidate.sourceUrl)) continue;
      seen.add(entry.candidate.sourceUrl);
      chosen.push(entry);
      if (chosen.length >= flags.count) break;
    }

    if (chosen.length === 0) {
      console.log(
        `✘ ${animal.slug}: no candidate with a redistributable licence${flags.strictMatch ? " AND a matching title" : ""}`,
      );
      skipped += 1;
      continue;
    }

    console.log(
      `→ ${animal.slug}: ${chosen.length} model(s) selected — ` +
        chosen.map((entry) => `${entry.score} ${entry.candidate.title.slice(0, 34)}`).join(" | "),
    );

    if (!flags.apply) {
      for (const entry of chosen) {
        if (!entry.matched) console.log(`   ⚠ "${entry.candidate.title.slice(0, 50)}" does not name this species`);
      }
      console.log("   (dry run — add --apply to download)");
      continue;
    }

    await mkdir(MODEL_DIR, { recursive: true });

    // One read of the policy per run: the per-model ceiling the reservation is made at.
    await loadPolicyCeiling();

    /** Key for an alternate model: the manifest already owns the plain slug. */
    const manifestKey = (index) => (index === 0 ? animal.slug : `${animal.slug}-alt${index + 1}`);

    for (const [index, entry] of chosen.entries()) {
      const { candidate, licence, quality } = entry;
      const destination = join(MODEL_DIR, modelFileName(animal.slug, index));
      const provider = PROVIDERS[providerKeyFor(candidate.provider)];

      // Nothing is downloaded before the database says it may be. This is the only
      // path to a file: the worker and the console both end up here too.
      const reservation = await reserveDownload({ candidate, licence, animal, flags });
      if (!reservation.allowed) {
        console.log(`   ✘ refused by the download budget: ${reservation.reason}`);
        refused += 1;
        continue;
      }

      try {
        const result = await provider.download(candidate, destination);
        let bytes = result.bytes;

        if (flags.compress && result.format === "glb") {
          const compressed = await compressGlb(result.file);
          bytes = compressed.after;
          console.log(
            compressed.kept
              ? `   DRACO: ${(compressed.before / 1024).toFixed(0)} KB → ${(compressed.after / 1024).toFixed(0)} KB`
              : "   DRACO: no gain, keeping the original file",
          );
        }

        const file = `/models/${basename(result.file)}`;
        const record = {
          title: candidate.title,
          author: candidate.author,
          authorUrl: candidate.authorUrl,
          license: licence.spdx,
          licenseUrl: candidate.licenseUrl,
          sourceUrl: candidate.sourceUrl,
          provider: candidate.provider,
          uid: candidate.id ?? null,
          file,
          format: result.format,
          bytes,
          faceCount: candidate.faceCount ?? null,
          downloadCount: candidate.downloadCount ?? null,
          likeCount: candidate.likeCount ?? null,
          thumbnail: candidate.thumbnail ?? null,
          qualityScore: quality.total,
          sha256: createHash("sha256")
            .update(await readFile(result.file))
            .digest("hex"),
          attributionRequired: licence.attributionRequired,
          fetchedAt: new Date().toISOString(),
        };

        manifest[manifestKey(index)] = record;
        manifestDirty = true;
        downloaded += 1;
        console.log(`   saved ${result.file.replace(ROOT + "/", "")} (${(bytes / 1024).toFixed(0)} KB, quality ${quality.total})`);

        if (result.format === "zip") {
          console.log("   note: this provider returned an archive; extract the .glb and wire model_url by hand.");
        } else if (flags.wire && index === 0) {
          const wired = await wireModelUrl(animal.slug, file);
          console.log(
            wired
              ? `   wired data/animals.ts: model_url -> ${file}`
              : "   data/animals.ts already points at this model",
          );
        }

        if (flags.upload) {
          await storeModel({ supabase, animal, file: result.file, entry: record, index });
          stored += 1;
          console.log(`   stored ${file} and recorded it in model_assets${index === 0 ? " (primary)" : ""}`);
        }

        // The real size, not the ceiling the reservation was made at.
        await settleDownload(reservation.id, "downloaded", bytes);
      } catch (error) {
        // Hand the slot back: a failed download must not spend the budget.
        await settleDownload(reservation.id, "failed", null, error.message);
        console.error(`   failed: ${error.message}`);
        skipped += 1;
      }

      await sleep(REQUEST_DELAY_MS);
    }
  }

  if (manifestDirty) {
    await writeAttribution(manifest);
    console.log(`\nWrote attribution for ${downloaded} model(s) to data/model-attribution.json.`);
    console.log("Commit that file: it is what lets the UI credit the author.");
    if (flags.wire) console.log("data/animals.ts was updated — run 'npm run seed:generate' to refresh the SQL seed.");
    if (!flags.compress) console.log("Compress before shipping — pass --compress, or see docs/MODELS.md.");
  }

  console.log(`\n${downloaded} downloaded, ${stored} stored, ${skipped} skipped, ${refused} refused by the download budget.`);
  if (flags.upload) console.log("Re-run \"npm run db:seed\" only before this: seeding rewrites animals.model_url from the dataset.");
}

/* -------------------------------------------------------------------------- */

/**
 * Recompute `bytes` and `sha256` for every model already on disk.
 *
 * Run after compressing or otherwise editing a fetched model, so the manifest
 * describes the file that is actually committed rather than the download it
 * originally came from.
 */
async function rehash() {
  const manifest = await readAttribution();
  let updated = 0;

  for (const [slug, entry] of Object.entries(manifest)) {
    // A manifest key is a slug for the primary model and `<slug>-alt2` for the ones
    // `--count` adds, so the entry itself is the authority on which file it describes.
    const file = join(MODEL_DIR, basename(entry.file ?? `${slug}.glb`));
    if (!existsSync(file)) {
      console.log(`? ${slug}: no local file, leaving the entry alone`);
      continue;
    }

    const buffer = await readFile(file);
    manifest[slug] = {
      ...entry,
      file: `/models/${basename(file)}`,
      format: "glb",
      bytes: buffer.length,
      sha256: createHash("sha256").update(buffer).digest("hex"),
      verifiedAt: new Date().toISOString(),
    };
    updated += 1;
  }

  await writeAttribution(manifest);
  console.log(`Rehashed ${updated} model(s) in data/model-attribution.json.`);
}

/**
 * Fills in the quality signals for models that were fetched before this phase.
 *
 * Their manifest entries carry a title and a licence and not much else, so the score
 * recorded for them is a floor rather than a measurement. This looks each one up by
 * its Sketchfab uid, updates the manifest, and — with `--upload` — corrects the row
 * that is already in `model_assets` instead of storing the file a second time.
 *
 * A model whose provider is not Sketchfab, or whose entry has no uid, is reported and
 * left alone: inventing a popularity number for it would be worse than admitting we
 * do not have one.
 */
async function refreshQuality(flags) {
  const manifest = await readAttribution();
  const supabase = flags.upload ? supabaseConfig() : null;
  if (flags.upload && !supabase.ready) {
    console.error("--upload needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (see README).");
    process.exitCode = 2;
    return;
  }

  let updated = 0;
  let skipped = 0;

  for (const [slug, entry] of Object.entries(manifest)) {
    // `--species` narrows the run, the same way it does everywhere else.
    if (flags.species.length > 0 && !flags.species.includes(slug)) continue;

    const uid = entry.uid ?? entry.sourceUrl?.match(/sketchfab\.com\/models\/([0-9a-f]{32})/)?.[1] ?? null;
    if (entry.provider !== "sketchfab" || !uid) {
      console.log(`? ${slug}: not a Sketchfab model — leaving its score as it is`);
      skipped += 1;
      continue;
    }

    try {
      const described = await sketchfab.describe(uid);
      const animal = ANIMALS.find((candidate) => candidate.slug === slug);
      const quality = scoreModelQuality({
        title: described.title,
        terms: [animal?.name ?? described.title, animal?.latin_name ?? "", animal?.category ?? ""],
        spdx: entry.license ?? null,
        faceCount: described.faceCount,
        downloadCount: described.downloadCount,
        likeCount: described.likeCount,
        hasThumbnail: Boolean(described.thumbnail),
      });

      const before = typeof entry.qualityScore === "number" ? entry.qualityScore : null;
      manifest[slug] = {
        ...entry,
        uid,
        faceCount: described.faceCount,
        downloadCount: described.downloadCount,
        likeCount: described.likeCount,
        thumbnail: described.thumbnail,
        qualityScore: quality.total,
        qualityCheckedAt: new Date().toISOString(),
      };

      updated += 1;
      console.log(
        `↻ ${slug}: ${before ?? "unscored"} → ${quality.total} ` +
          `(downloads ${described.downloadCount ?? "?"}, likes ${described.likeCount ?? "?"}, ` +
          `faces ${described.faceCount?.toLocaleString("en-US") ?? "?"})`,
      );

      if (supabase) {
        const animals = await rest(supabase, `animals?slug=eq.${encodeURIComponent(slug)}&select=id`);
        const animalId = animals?.[0]?.id;
        if (animalId) {
          await rest(supabase, `model_assets?animal_id=eq.${animalId}&source_url=eq.${encodeURIComponent(entry.sourceUrl ?? "")}`, {
            method: "PATCH",
            body: JSON.stringify({
              face_count: described.faceCount,
              download_count: described.downloadCount,
              like_count: described.likeCount,
              quality_score: quality.total,
            }),
          });
        }
      }
    } catch (error) {
      console.error(`   ${slug}: ${error.message}`);
      skipped += 1;
    }

    await sleep(REQUEST_DELAY_MS);
  }

  await writeAttribution(manifest);
  console.log(`\nRefreshed ${updated} model(s), skipped ${skipped}.`);
  if (!supabase) console.log("Pass --upload to correct the rows already in model_assets.");
}

/* -------------------------------------------------------------------------- */

async function main() {
  await loadEnvFiles();

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
  --strict-match          skip candidates whose title does not name the species
  --max-mb=<n>            refuse models larger than n megabytes (default 12)
  --count=<n>             keep up to n models per species (default 1; the first is
                          the primary one and is what model_url points at)
  --compress              run DRACO over every downloaded .glb before storing it
  --upload                push to the animal-assets bucket, write model_assets and
                          point animals.model_url at the public URL
  --rehash                recompute bytes/sha256 for models already on disk
                          (run after compressing them)
  --refresh-quality       re-read face/download/like counts for models already in the
                          manifest and rescore them (--upload also corrects the rows)

Environment:
  SKETCHFAB_API_TOKEN     Sketchfab OAuth token (required to download)
  SI_API_KEY              Smithsonian Open Access key
  POLY_PIZZA_API_KEY      Poly Pizza key
`);
  } else if (flags.rehash) {
    await rehash();
  } else if (flags.refreshQuality) {
    await refreshQuality(flags);
  } else if (flags.report || (!flags.all && flags.species.length === 0)) {
    await report(flags);
  } else {
    await fetchModels(flags);
  }
}

// Only run when invoked directly: the check suite imports the pure helpers
// (ranking, file naming, licence mapping) without searching or downloading anything.
if (process.argv[1] && process.argv[1].endsWith("fetch-models.mjs")) {
  await main();
}
