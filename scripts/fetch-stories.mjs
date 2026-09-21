#!/usr/bin/env node
/**
 * Resolves the images for the Data2Map story entries, from Wikimedia Commons.
 *
 *   npm run stories:report   # what each story would get, nothing written
 *   npm run stories:fetch    # resolve and write data/data2map-stories.json
 *
 * ## Why the licence check is the whole point
 *
 * Commons is mostly CC BY-SA and CC BY, with a long tail of non-commercial and no-derivatives
 * files. This site carries advertising, so the allow-list is the same discipline the animal
 * maps follow - and the script records the **file page, the author and the exact licence label**
 * for every image it accepts, because share-alike is a condition rather than a courtesy.
 *
 * The search is by term rather than by filename: guessed filenames are missing more often than
 * they exist, and Commons search returns the licence in the same response, which is what makes
 * the check possible at all.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const STORIES_FILE = join(ROOT, "data", "data2map-stories.json");
const USER_AGENT = "Kami3D-story-fetcher/1.0 (+https://github.com/dangthevinh/Kami3D)";

/** Accepted licence labels, matched on the short name Commons returns. */
const ALLOWED = [
  { test: /^CC0/i, column: "CC0" },
  { test: /^Public domain/i, column: "CC0" },
  { test: /^CC BY-SA/i, column: "CC-BY-SA" },
  { test: /^CC BY/i, column: "CC-BY" },
];

export function licenseFor(label) {
  if (typeof label !== "string" || label.trim().length === 0) return null;
  for (const entry of ALLOWED) {
    if (entry.test.test(label.trim())) return { column: entry.column, label: label.trim() };
  }
  return null;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function stripHtml(value) {
  return String(value ?? "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

/**
 * An author credit a person can read.
 *
 * Commons artist fields are often a template with instructions attached, and one of them came
 * back as three hundred characters of licence notes. A credit line is a name and a link; the
 * rest belongs on the file page, which the entry also records.
 */
function cleanAuthor(value) {
  const text = stripHtml(value).replace(/https?:\/\/\S+/g, "").trim();
  const firstSentence = text.split(/(?<=[.!?])\s/)[0] ?? text;
  const short = firstSentence.length > 60 ? `${firstSentence.slice(0, 57).trim()}...` : firstSentence;
  return short.replace(/[,;:\s]+$/, "") || "Unknown";
}

/** The best image for a term: the widest result whose licence this site may use. */
export async function searchImage(term) {
  const url = new URL("https://commons.wikimedia.org/w/api.php");
  url.searchParams.set("action", "query");
  url.searchParams.set("format", "json");
  url.searchParams.set("generator", "search");
  url.searchParams.set("gsrsearch", `${term} filetype:bitmap`);
  url.searchParams.set("gsrnamespace", "6");
  url.searchParams.set("gsrlimit", "8");
  url.searchParams.set("prop", "imageinfo");
  url.searchParams.set("iiprop", "url|extmetadata|size");
  url.searchParams.set("iiurlwidth", "1600");

  const response = await fetch(url, { headers: { "user-agent": USER_AGENT }, signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`Commons answered ${response.status}`);
  const data = await response.json();

  const candidates = Object.values(data.query?.pages ?? {})
    .map((page) => {
      const info = page.imageinfo?.[0] ?? {};
      const meta = info.extmetadata ?? {};
      const licence = licenseFor(meta.LicenseShortName?.value);
      return {
        file: page.title,
        url: info.thumburl ?? info.url,
        pageUrl: info.descriptionurl ?? `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title)}`,
        width: info.thumbwidth ?? info.width ?? null,
        license: licence?.column ?? null,
        licenseLabel: licence?.label ?? meta.LicenseShortName?.value ?? null,
        author: cleanAuthor(meta.Artist?.value),
      };
    })
    .filter((candidate) => candidate.url && candidate.license)
    .sort((a, b) => (b.width ?? 0) - (a.width ?? 0));

  return candidates[0] ?? null;
}

async function main() {
  const registry = JSON.parse(readFileSync(STORIES_FILE, "utf8"));
  const apply = process.argv.includes("--apply") || process.argv.includes("--fetch");
  const images = { ...(registry.images ?? {}) };
  let resolved = 0;
  let refused = 0;

  for (const story of registry.stories) {
    const existing = images[story.slug];
    if (existing && !process.argv.includes("--force")) {
      console.log(`= ${story.slug}: already has ${existing.licenseLabel} by ${existing.author}`);
      continue;
    }

    try {
      const image = await searchImage(story.searchTerm ?? story.name);
      if (!image) {
        console.log(`x ${story.slug}: no image with a licence this site may use`);
        refused += 1;
        continue;
      }

      console.log(
        `→ ${story.slug}: ${image.file.replace("File:", "")} · ${image.licenseLabel} · ${image.author} · ${image.width}px`,
      );

      if (apply) {
        images[story.slug] = image;
        resolved += 1;
      }
    } catch (error) {
      console.error(`x ${story.slug}: ${error.message}`);
      refused += 1;
    }

    await sleep(300);
  }

  if (apply) {
    registry.images = images;
    writeFileSync(STORIES_FILE, `${JSON.stringify(registry, null, 2)}\n`, "utf8");
    console.log(`\nWrote ${resolved} image(s) to data/data2map-stories.json, ${refused} refused.`);
  } else {
    console.log(`\nDry run (${refused} refused) - pass --apply to write the credits.`);
  }
}

if (process.argv[1] && process.argv[1].endsWith("fetch-stories.mjs")) {
  await main();
}
