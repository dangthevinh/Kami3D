#!/usr/bin/env node
/**
 * Automatic animal-call acquisition for Kami3D.
 *
 *   npm run sounds:report                       # what is available, no downloads
 *   npm run sounds:fetch -- --species=lion      # one species
 *   npm run sounds:fetch -- --all               # every species that lacks a call
 *   npm run sounds:fetch -- --species=lion --apply --upload --wire
 *
 * ## Providers
 *
 *   freesound   Freesound.org API v2. The primary source, and the one with a real
 *               licence facet to filter on. Needs a token in `FREESOUND_API_KEY`
 *               (https://freesound.org/apiv2/apply); without it the provider is
 *               skipped with instructions rather than scraped around.
 *   wikimedia   Wikimedia Commons. No key, public licence metadata, and the
 *               fallback that lets the pipeline run end to end on a fresh clone.
 *
 * ## What it refuses
 *
 * The licence rules live in `lib/sound-licenses.ts` and are unit-tested
 * (`npm run check:sounds`): CC0 / public domain, and CC BY — everything else,
 * including the CC BY-SA and CC BY-NC that most field recordings actually use, is
 * refused with the reason printed. A file is downloaded only after both the licence
 * and the size window pass, and it is verified *again* after the download.
 *
 * ## Size window
 *
 * 12 kB to 900 kB (override with --min-bytes / --max-bytes). That is the range real
 * recordings live in: a survey of Commons found calls from 12 kB (a 0.9 s chirp) to
 * 900 kB (a 93 s humpback song), while the files above a megabyte in the same search
 * were spoken-word recordings — pronunciations and audiobooks, at 2–6 MB each.
 * `sounds:report` prints what the window rejects and why.
 *
 * ## Storage
 *
 * With `--apply` the recording is written to `public/sounds/<slug>.<ext>` and
 * credited in `data/sound-attribution.json` — the copy that ships with the repo, so
 * Demo Mode plays calls without any keys. With `--upload` it is *also* pushed to the
 * `animal-sounds` bucket, recorded in `public.sound_assets`, and
 * `animals.sound_url` is pointed at the public storage URL.
 */

import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { ANIMALS } from "../data/animals.ts";
import {
  SOUND_DURATION,
  SOUND_SIZE,
  audioExtension,
  evaluateSoundLicense,
  evaluateSoundSize,
  looksLikeAudio,
  normaliseAudioMime,
  soundFileName,
} from "../lib/sound-licenses.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SOUND_DIR = join(ROOT, "public", "sounds");
const ATTRIBUTION_FILE = join(ROOT, "data", "sound-attribution.json");
const OVERRIDES_FILE = join(ROOT, "data", "sound-queries.json");

const USER_AGENT = "Kami3D-sound-fetcher/1.0 (+https://github.com/dangthevinh/Kami3D)";
const REQUEST_DELAY_MS = 250;
const BUCKET = "animal-sounds";

/** Populated from the CLI. */
const CONFIG = {
  minBytes: SOUND_SIZE.minBytes,
  maxBytes: SOUND_SIZE.maxBytes,
  maxSeconds: SOUND_DURATION.maxSeconds,
  minSeconds: SOUND_DURATION.minSeconds,
  provider: "auto",
  apply: false,
  upload: false,
  wire: false,
  force: false,
  report: false,
  species: /** @type {string[]} */ ([]),
  all: false,
};

/* -------------------------------------------------------------------------- */
/* Environment                                                                */
/* -------------------------------------------------------------------------- */

/** Reads .env.local / .env without printing anything: a token must not reach a log. */
async function loadEnvFiles() {
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
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = value;
    }
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Any credential that could end up inside an error message. */
function redact(message) {
  return String(message)
    .replace(/token=[^&\s"']+/gi, "token=REDACTED")
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer REDACTED");
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { accept: "application/json", "user-agent": USER_AGENT, ...(options.headers ?? {}) },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(redact(`${response.status} ${response.statusText} for ${url}`));
  return response.json();
}

/* -------------------------------------------------------------------------- */
/* Queries                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Search terms for a species, best first.
 *
 * The latin name is the only term that reliably finds the animal itself; a common
 * name finds its *word* ("lion" returns a German pronunciation of Lion Feuchtwanger
 * before it returns a roar), which is why the ranking below insists on a match.
 */
export function queriesFor(animal, overrides = {}, limit = 4) {
  const override = Array.isArray(overrides[animal.slug]) ? overrides[animal.slug] : [];
  const defaults = [animal.latin_name, animal.name, `${animal.name} sound`];

  // Overrides lead, defaults follow: a replacement list that happens to match
  // nothing on a provider used to lose the species entirely (the lion override
  // asked for "Panthera leo roar" and returned zero files, while the plain latin
  // name had already found a roar).
  return [...new Set([...override, ...defaults].filter(Boolean))].slice(0, limit);
}

/**
 * Files that are about the *word*, not the animal.
 *
 * Wikimedia hosts an enormous number of pronunciation recordings, and they match a
 * species search exactly ("De-Lion Feuchtwanger.ogg"). They are legal, correctly
 * licensed, the right size — and completely wrong.
 */
const SPOKEN_WORD = /pronunciation|spoken wikipedia|wikisource|audiobook|linguistic|lecture|interview|music|song of the|orchestra|piano|guitar/i;
const LANGUAGE_PREFIX = /^[A-Z][a-z]{1,3}-/;
const LANGUAGE_CODES = /\(\b(de|en|fr|ru|es|it|nl|pt|ja|zh|ar|he|hi|ko|pl|sv|tr|vi|id|th|uk|cs|da|fi|no|el|hu|ro|sk|bg|hr|sr|lt|lv|et|sl|ca|gl|eu|af|sw|fa|ur|bn|ta|te|ml|kn|mr|gu|pa|si|ne|my|km|lo|mn|ka|hy|az|kk|uz|ky|tg|tk)\)/i;

function looksSpoken(title, categories) {
  const haystack = `${title} ${categories}`;
  if (SPOKEN_WORD.test(haystack)) return true;
  if (LANGUAGE_PREFIX.test(title)) return true;
  if (LANGUAGE_CODES.test(title)) return true;
  return false;
}

function escapeForRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Does the file name this species?
 *
 * Two signals, and the weaker one is deliberately narrow. A *title* that names the
 * animal (latin binomial, genus, or common name) is good evidence. A category is
 * not: the first version of this accepted a file called "Sndcrickets.wav" for the
 * giraffe because its categories said "Giraffa angolensis of Etosha National Park"
 * — crickets recorded during a giraffe study. So a category only counts when it
 * carries the **full binomial** ("Canis lupus"), which is a statement about the
 * animal rather than about a project.
 */
export function matchAgainstSpecies(title, categories, animal) {
  const name = title.toLowerCase();
  const category = categories.toLowerCase();
  const latin = animal.latin_name.toLowerCase();
  const common = animal.name.toLowerCase();
  const genus = latin.split(" ")[0];

  // Matching on the head noun alone ("panda" for Giant panda) was tried and
  // reverted: it found "Red panda twittering.ogg" for the giant panda, a little
  // penguin for the emperor penguin, and a French song called "Ah les crocodile"
  // for the saltwater crocodile. A qualifier is not decoration — it is the species.
  // The full name, the genus, or the latin binomial, or nothing.
  const titleNames =
    name.includes(latin) ||
    (genus.length > 4 && name.includes(genus)) ||
    new RegExp(`\\b${escapeForRegExp(common)}\\b`).test(name);

  if (titleNames) return { matched: true, via: "title" };
  if (category.includes(latin)) return { matched: true, via: "category" };
  return { matched: false, via: null };
}

/* -------------------------------------------------------------------------- */
/* Providers                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * A real Freesound token. Anything shorter than this is a placeholder somebody left
 * in `.env.local`, and treating it as configured would spend the whole run on 401s.
 */
export function freesoundToken() {
  const token = (process.env.FREESOUND_API_KEY ?? "").trim();
  return token.length >= 20 ? token : null;
}

/** Freesound.org API v2: the primary source, when a token is configured. */
const freesound = {
  name: "freesound",
  available: () => Boolean(freesoundToken()),

  async search(animal) {
    const token = freesoundToken();
    const url = new URL("https://freesound.org/apiv2/search/text/");
    url.searchParams.set("query", `${animal.latin_name} ${animal.name}`);
    // Ask the API to do the licence filtering, then check it again ourselves: a
    // facet is a convenience, not a guarantee.
    url.searchParams.set("filter", 'license:("Creative Commons 0" OR "Attribution")');
    url.searchParams.set("fields", "id,name,license,username,duration,filesize,url,previews,description");
    url.searchParams.set("page_size", "20");

    // In a header, not in the query string: a URL ends up in logs, and a token in a
    // log is a token somebody has to rotate.
    const data = await fetchJson(url, { headers: { authorization: `Bearer ${token}` } });
    await sleep(REQUEST_DELAY_MS);

    return (data?.results ?? []).map((result) => ({
      provider: "freesound",
      id: String(result.id),
      title: result.name ?? `freesound-${result.id}`,
      licenseLabel: result.license ?? "",
      licenseUrl: result.license === "Creative Commons 0" ? "https://creativecommons.org/publicdomain/zero/1.0/" : "https://creativecommons.org/licenses/by/4.0/",
      author: result.username ?? null,
      bytes: Number(result.filesize ?? 0),
      duration: Number(result.duration ?? 0),
      mime: "audio/mpeg",
      // The high-quality preview is the file a token-free client can fetch; the
      // original needs OAuth2 and is not required for a 20-second call.
      downloadUrl: result.previews?.["preview-hq-mp3"] ?? result.previews?.["preview-lq-mp3"] ?? null,
      sourceUrl: result.url ?? `https://freesound.org/s/${result.id}/`,
      categories: result.description ?? "",
    }));
  },
};

/** Wikimedia Commons: no key, public licence metadata, the fallback that runs here. */
const wikimedia = {
  name: "wikimedia",
  available: () => true,

  async search(animal, term) {
    const url = new URL("https://commons.wikimedia.org/w/api.php");
    url.searchParams.set("action", "query");
    url.searchParams.set("format", "json");
    url.searchParams.set("generator", "search");
    url.searchParams.set("gsrsearch", `filetype:audio ${term}`);
    url.searchParams.set("gsrnamespace", "6");
    url.searchParams.set("gsrlimit", "20");
    url.searchParams.set("prop", "imageinfo");
    url.searchParams.set("iiprop", "url|size|mime|extmetadata");

    const data = await fetchJson(url);
    await sleep(REQUEST_DELAY_MS);

    return Object.values(data?.query?.pages ?? {}).map((page) => {
      const info = page.imageinfo?.[0] ?? {};
      const meta = info.extmetadata ?? {};
      // Commons wraps values in links and escapes them: "<a ...>NPS &amp; MSU</a>"
      // has to become "NPS & MSU" before it can be shown as a credit.
      const strip = (value) =>
        value
          ? String(value)
              .replace(/<[^>]*>/g, "")
              .replace(/&amp;/g, "&")
              .replace(/&quot;/g, '"')
              .replace(/&#0?39;|&apos;/g, "'")
              .replace(/&lt;/g, "<")
              .replace(/&gt;/g, ">")
              .replace(/&nbsp;/g, " ")
              .replace(/\s+/g, " ")
              .trim()
          : "";

      return {
        provider: "wikimedia",
        id: page.pageid ? String(page.pageid) : null,
        title: String(page.title ?? "").replace(/^File:/, ""),
        licenseLabel: strip(meta.LicenseShortName?.value) || strip(meta.License?.value),
        licenseUrl: strip(meta.LicenseUrl?.value) || null,
        author: strip(meta.Artist?.value) || null,
        bytes: Number(info.size ?? 0),
        duration: Number(info.duration ?? 0),
        mime: info.mime ?? "",
        downloadUrl: info.url ?? null,
        sourceUrl: info.descriptionurl ?? null,
        categories: strip(meta.Categories?.value) || "",
      };
    });
  },
};

export const PROVIDERS = { freesound, wikimedia };

/* -------------------------------------------------------------------------- */
/* Ranking                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Score a candidate, and refuse the ones that must never ship.
 *
 * Refusals are explicit and returned with a reason so `sounds:report` can explain
 * itself. Ranking then prefers: a licence that needs no credit, a file that names
 * the species in its latin form, a duration in the useful range, and a format that
 * every browser can play.
 */
export function rankCandidates(candidates, animal) {
  const scored = [];
  const rejected = [];

  for (const candidate of candidates) {
    const licence = evaluateSoundLicense(candidate.licenseLabel);
    if (!licence.ok) {
      rejected.push({ candidate, reason: licence.reason ?? "licence refused" });
      continue;
    }

    if (!candidate.downloadUrl) {
      rejected.push({ candidate, reason: "no downloadable file" });
      continue;
    }

    if (looksSpoken(candidate.title, candidate.categories)) {
      rejected.push({ candidate, reason: "spoken-word recording, not an animal call" });
      continue;
    }

    const size = evaluateSoundSize(candidate.bytes, { minBytes: CONFIG.minBytes, maxBytes: CONFIG.maxBytes });
    if (!size.ok) {
      rejected.push({ candidate, reason: size.reason ?? "size refused" });
      continue;
    }

    if (candidate.duration && (candidate.duration < CONFIG.minSeconds || candidate.duration > CONFIG.maxSeconds)) {
      rejected.push({ candidate, reason: `${candidate.duration.toFixed(1)} s is outside ${CONFIG.minSeconds}–${CONFIG.maxSeconds} s` });
      continue;
    }

    if (!audioExtension(candidate.mime)) {
      rejected.push({ candidate, reason: `unsupported format ${candidate.mime || "unknown"}` });
      continue;
    }

    // A licence and a size window do not make a recording the right animal. The
    // first version of this only *penalised* an unrelated file, so a mammoth was
    // "matched" to a ruffed grouse from a sound library: everything else had been
    // refused, and something has to be better than nothing only if it is right.
    const match = matchAgainstSpecies(candidate.title, candidate.categories, animal);
    if (!match.matched) {
      rejected.push({ candidate, reason: "never names this species — not evidence it is the right animal" });
      continue;
    }

    let score = 0;
    score += licence.license === "CC0" ? 30 : 0;
    score += match.via === "title" ? 60 : 25;
    score += candidate.mime === "audio/mpeg" ? 12 : candidate.mime === "audio/ogg" ? 8 : 2;
    score += candidate.duration >= 5 && candidate.duration <= 90 ? 20 : 0;

    scored.push({ candidate, licence, score, via: match.via });
  }

  scored.sort((a, b) => b.score - a.score || a.candidate.bytes - b.candidate.bytes);
  return { best: scored[0] ?? null, ranked: scored, rejected };
}

/* -------------------------------------------------------------------------- */
/* Download and validate                                                      */
/* -------------------------------------------------------------------------- */

async function download(url) {
  const response = await fetch(url, {
    headers: { "user-agent": USER_AGENT, accept: "audio/*,*/*" },
    redirect: "follow",
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return new Uint8Array(await response.arrayBuffer());
}

/**
 * Verifies what actually arrived.
 *
 * A provider outage, a redirect to an error page, or a truncated response all
 * produce "a file" — one that would be uploaded, linked from a species page and
 * play as silence. Size, header and MIME are all re-checked here, after the
 * download, not just before it.
 */
export function validateDownload(bytes, candidate) {
  const size = evaluateSoundSize(bytes.byteLength, { minBytes: CONFIG.minBytes, maxBytes: CONFIG.maxBytes });
  if (!size.ok) return { ok: false, reason: `downloaded ${size.reason}` };
  if (!looksLikeAudio(bytes)) return { ok: false, reason: "the download is not an audio file" };

  const extension = audioExtension(candidate.mime);
  if (!extension) return { ok: false, reason: `unsupported format ${candidate.mime}` };
  return { ok: true, extension };
}

/* -------------------------------------------------------------------------- */
/* Attribution                                                                */
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

/** The credit line a species page renders, assembled once. */
export function creditLine({ title, author, license, provider, licenseUrl, sourceUrl }) {
  const parts = [title];
  if (author) parts.push(author);
  parts.push(`${license} (${provider})`);
  return { text: parts.join(" · "), licenseUrl: licenseUrl ?? null, sourceUrl: sourceUrl ?? null };
}

/* -------------------------------------------------------------------------- */
/* Supabase                                                                   */
/* -------------------------------------------------------------------------- */

function supabaseConfig() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "";
  return { url, key, ready: Boolean(url && key) };
}

/** Uploads to the public bucket and returns the URL a browser can play. */
async function uploadToStorage({ url, key }, path, bytes, mime) {
  const response = await fetch(`${url}/storage/v1/object/${BUCKET}/${path}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${key}`,
      apikey: key,
      "content-type": mime,
      "x-upsert": "true",
      "cache-control": "public, max-age=31536000, immutable",
    },
    body: bytes,
    signal: AbortSignal.timeout(60_000),
  });

  if (!response.ok) throw new Error(`storage upload failed: ${response.status} ${await response.text()}`);
  return `${url}/storage/v1/object/public/${BUCKET}/${path}`;
}

async function rest({ url, key }, path, init = {}) {
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
      prefer: "resolution=merge-duplicates,return=representation",
      ...(init.headers ?? {}),
    },
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) throw new Error(`${init.method ?? "GET"} ${path} failed: ${response.status} ${await response.text()}`);
  return response.status === 204 ? null : response.json().catch(() => null);
}

/** Records the asset and points the species at it. */
async function recordInDatabase(supabase, animal, entry) {
  const animals = await rest(supabase, `animals?slug=eq.${encodeURIComponent(animal.slug)}&select=id`);
  const animalId = animals?.[0]?.id;
  if (!animalId) throw new Error(`no animals row for ${animal.slug} — run 'npm run db:seed' first`);

  await rest(supabase, "sound_assets?on_conflict=animal_id", {
    method: "POST",
    body: JSON.stringify([
      {
        animal_id: animalId,
        freesound_id: entry.provider === "freesound" && Number.isFinite(Number(entry.id)) ? Number(entry.id) : null,
        title: entry.title,
        license: entry.license,
        source_url: entry.sourceUrl,
        attribution: entry.credit,
        file_size_bytes: entry.bytes,
        duration_seconds: entry.duration || null,
        storage_path: entry.storagePath,
        public_url: entry.publicUrl,
        provider: entry.provider,
        mime_type: entry.mime,
        license_label: entry.licenseLabel,
      },
    ]),
  });

  await rest(supabase, `animals?slug=eq.${encodeURIComponent(animal.slug)}`, {
    method: "PATCH",
    body: JSON.stringify({ sound_url: entry.publicUrl }),
  });
}

/* -------------------------------------------------------------------------- */
/* Wiring                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Point `data/animals.ts` at the local copy.
 *
 * `sound_url` is the single source of truth for "which call does this species
 * play" — the column the SQL seed is generated from — so the bundled dataset gets
 * the repo-relative path (Demo Mode and a self-hosted deploy have no Supabase), while
 * `--upload` points the *database* at the storage URL. Both play the same
 * recording; the difference is only which copy the client fetches.
 */
async function wireSoundUrl(slug, url) {
  const file = join(ROOT, "data", "animals.ts");
  const source = await readFile(file, "utf8");

  const slugIndex = source.indexOf(`slug: "${slug}"`);
  if (slugIndex === -1) throw new Error(`could not find slug "${slug}" in data/animals.ts`);

  const fieldIndex = source.indexOf("sound_url:", slugIndex);
  if (fieldIndex === -1) throw new Error(`could not find sound_url for "${slug}"`);

  const lineEnd = source.indexOf("\n", fieldIndex);
  const currentLine = source.slice(fieldIndex, lineEnd);
  if (currentLine.includes(`"${url}"`)) return false;

  const spacing = currentLine.match(/^sound_url:\s*/)?.[0] ?? "sound_url: ";
  const next = source.slice(0, fieldIndex) + `${spacing}"${url}",` + source.slice(lineEnd);

  if (!next.includes(`sound_url: "${url}"`)) throw new Error("wiring produced no change; aborting");

  await writeFile(file, next, "utf8");
  return true;
}

/* -------------------------------------------------------------------------- */
/* Run                                                                        */
/* -------------------------------------------------------------------------- */

function parseArgs(argv) {
  const flags = { ...CONFIG, species: [] };
  for (const arg of argv) {
    if (arg === "--all") flags.all = true;
    else if (arg === "--apply") flags.apply = true;
    else if (arg === "--upload") flags.upload = true;
    else if (arg === "--wire") flags.wire = true;
    else if (arg === "--force") flags.force = true;
    else if (arg === "--report") flags.report = true;
    else if (arg.startsWith("--species=")) flags.species.push(arg.slice("--species=".length));
    else if (arg.startsWith("--provider=")) flags.provider = arg.slice("--provider=".length);
    else if (arg.startsWith("--min-bytes=")) flags.minBytes = Number(arg.slice("--min-bytes=".length));
    else if (arg.startsWith("--max-bytes=")) flags.maxBytes = Number(arg.slice("--max-bytes=".length));
    else if (arg.startsWith("--max-seconds=")) flags.maxSeconds = Number(arg.slice("--max-seconds=".length));
    else if (arg === "--help") flags.help = true;
  }
  return flags;
}

async function loadOverrides() {
  if (!existsSync(OVERRIDES_FILE)) return {};
  try {
    return JSON.parse(await readFile(OVERRIDES_FILE, "utf8"));
  } catch {
    return {};
  }
}

function providerList(flags) {
  if (flags.provider === "auto") return [PROVIDERS.freesound, PROVIDERS.wikimedia];
  const chosen = PROVIDERS[flags.provider];
  return chosen ? [chosen] : [PROVIDERS.wikimedia];
}

async function gatherCandidates(animal, providers, overrides) {
  const queries = queriesFor(animal, overrides);
  const candidates = [];
  const notes = [];

  for (const provider of providers) {
    if (!provider.available()) {
      const configured = Boolean((process.env.FREESOUND_API_KEY ?? "").trim());
      notes.push(
        provider.name === "freesound"
          ? configured
            ? "freesound: skipped — FREESOUND_API_KEY looks like a placeholder (needs a real token from https://freesound.org/apiv2/apply)"
            : "freesound: skipped — no FREESOUND_API_KEY (get one at https://freesound.org/apiv2/apply)"
          : `${provider.name}: unavailable`,
      );
      continue;
    }

    const terms = provider.name === "wikimedia" ? queries : [queries[0]];
    for (const term of terms) {
      try {
        candidates.push(...(await provider.search(animal, term)));
      } catch (error) {
        notes.push(`${provider.name} "${term}": ${error.message}`);
      }
    }
  }

  return { candidates, notes: [...new Set(notes)] };
}

async function report(flags) {
  const overrides = await loadOverrides();
  const providers = providerList(flags);
  const targets = flags.species.length ? ANIMALS.filter((a) => flags.species.includes(a.slug)) : ANIMALS;
  const attribution = await readAttribution();

  console.log(`Licence policy: CC0 / public domain / CC BY. Size window: ${Math.round(flags.minBytes / 1024)}–${Math.round(flags.maxBytes / 1024)} kB, ${flags.minSeconds}–${flags.maxSeconds} s.\n`);

  let usable = 0;

  for (const animal of targets) {
    const { candidates, notes } = await gatherCandidates(animal, providers, overrides);
    const { best, rejected } = rankCandidates(candidates, animal);
    const already = Boolean(attribution[animal.slug]);

    if (best) usable += 1;
    console.log(
      `${best ? "  ✓" : "  ✗"} ${animal.slug.padEnd(22)} ${String(candidates.length).padStart(3)} candidates, ${rejected.length} refused` +
        (best ? ` → ${best.candidate.title.slice(0, 44)} (${(best.candidate.bytes / 1024).toFixed(0)} kB, ${best.candidate.licenseLabel})` : "") +
        (already ? "  [already credited]" : ""),
    );

    if (process.env.SOUNDS_VERBOSE === "1") {
      for (const item of rejected.slice(0, 4)) console.log(`        refused: ${item.reason} — ${item.candidate.title.slice(0, 46)}`);
      for (const note of notes) console.log(`        ${note}`);
    }
  }

  console.log(`\n${usable}/${targets.length} species have a usable recording in the current window.`);
  console.log("Run 'npm run sounds:fetch -- --all --apply' to download them.");
}

async function fetchSounds(flags) {
  const overrides = await loadOverrides();
  const providers = providerList(flags);
  const attribution = await readAttribution();
  const supabase = supabaseConfig();

  // `--force` re-processes everything, including species the dataset already points
  // at a file for: that is how the first upload run silently did nothing.
  const targets = flags.species.length
    ? ANIMALS.filter((animal) => flags.species.includes(animal.slug))
    : ANIMALS.filter((animal) => flags.force || (!attribution[animal.slug] && !animal.sound_url));

  if (targets.length === 0) {
    console.log("Nothing to do: every species already has a credited recording (use --force to refetch).");
    return;
  }

  await mkdir(SOUND_DIR, { recursive: true });
  if (flags.upload && !supabase.ready) {
    console.error("--upload needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.");
    return;
  }

  let written = 0;
  let uploaded = 0;
  const failures = [];
  const printedNotes = new Set();

  for (const animal of targets) {
    const { candidates, notes } = await gatherCandidates(animal, providers, overrides);
    const { best, rejected } = rankCandidates(candidates, animal);

    if (!best) {
      const top = rejected.slice(0, 2).map((item) => `${item.reason} (${item.candidate.title.slice(0, 34)})`).join("; ");
      console.log(`  ✗ ${animal.slug}: no usable recording${top ? ` — ${top}` : ""}`);
      // Provider skips are a property of the run, not of the species: printed once.
      for (const note of notes) {
        if (printedNotes.has(note)) continue;
        printedNotes.add(note);
        console.log(`      ${note}`);
      }
      failures.push(animal.slug);
      continue;
    }

    try {
      const bytes = await download(best.candidate.downloadUrl);
      const validation = validateDownload(bytes, best.candidate);
      if (!validation.ok) throw new Error(validation.reason);

      const fileName = soundFileName(animal.slug, validation.extension);
      const localPath = join(SOUND_DIR, fileName);
      await writeFile(localPath, bytes);

      const credit = creditLine({
        title: best.candidate.title,
        author: best.candidate.author,
        license: best.licence.label,
        provider: best.candidate.provider,
        licenseUrl: best.candidate.licenseUrl,
        sourceUrl: best.candidate.sourceUrl,
      });

      const entry = {
        slug: animal.slug,
        title: best.candidate.title,
        provider: best.candidate.provider,
        id: best.candidate.id,
        license: best.licence.license,
        licenseLabel: best.licence.label,
        licenseUrl: best.candidate.licenseUrl,
        author: best.candidate.author,
        sourceUrl: best.candidate.sourceUrl,
        credit: credit.text,
        file: `/sounds/${fileName}`,
        bytes: bytes.byteLength,
        duration: best.candidate.duration,
        mime: best.candidate.mime,
        downloadedAt: new Date().toISOString(),
      };

      written += 1;
      console.log(
        `  ✓ ${animal.slug.padEnd(22)} ${(bytes.byteLength / 1024).toFixed(0).padStart(4)} kB ${best.licence.license.padEnd(5)} ${best.candidate.title.slice(0, 44)}`,
      );

      if (flags.apply) {
        attribution[animal.slug] = entry;
        await writeAttribution(attribution);

        if (flags.wire) {
          const wired = await wireSoundUrl(animal.slug, entry.file);
          if (wired) console.log(`      wired data/animals.ts: sound_url -> ${entry.file}`);
        }
      }

      if (flags.upload) {
        const contentType = normaliseAudioMime(best.candidate.mime) ?? "audio/mpeg";
        entry.mime = contentType;
        entry.storagePath = fileName;
        entry.publicUrl = await uploadToStorage(supabase, fileName, bytes, contentType);
        await recordInDatabase(supabase, animal, entry);
        await writeAttribution(attribution);
        uploaded += 1;
        console.log(`      uploaded + recorded: ${entry.publicUrl}`);
      }
    } catch (error) {
      console.log(`  ✗ ${animal.slug}: ${error.message}`);
      failures.push(animal.slug);
    }
  }

  console.log(`\n${written} downloaded, ${uploaded} uploaded, ${failures.length} without a usable recording.`);
  if (written > 0 && flags.wire) {
    console.log("Next: npm run seed:generate   # refresh supabase/seed.sql from the dataset");
  }
}

async function main() {
  await loadEnvFiles();
  const flags = parseArgs(process.argv.slice(2));

  if (flags.help) {
    console.log(`Kami3D animal-call fetcher

  npm run sounds:report                     what is available, no downloads
  npm run sounds:fetch -- --species=lion    one species
  npm run sounds:fetch -- --all             every species without a credited call

Flags
  --species=<slug>       repeatable
  --all                  every species without a recording
  --provider=auto|freesound|wikimedia
  --min-bytes / --max-bytes / --max-seconds   size and duration window
  --apply                write public/sounds/* and data/sound-attribution.json
  --upload               also push to the animal-sounds bucket and record it in sound_assets
  --wire                 also set sound_url in data/animals.ts
  --force                refetch species that already have a recording
  --report               dry run, prints what each species would get
`);
    return;
  }

  Object.assign(CONFIG, flags);
  if (flags.report) await report(flags);
  else await fetchSounds(flags);
}

// Only run when invoked directly: the check suite imports the pure helpers.
if (process.argv[1] && process.argv[1].endsWith("fetch-sounds.mjs")) {
  await main();
}
