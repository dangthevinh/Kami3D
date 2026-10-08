#!/usr/bin/env node
/**
 * Which species are `model`-shaped, and which are placeholders wearing a species' name.
 *
 *   npm run models:audit            # the table
 *   npm run models:audit -- --json  # machine-readable, for the console or a script
 *
 * The question this answers is the one a visitor asks and a quality score alone does not: **does
 * this model actually depict this animal?** A "Bengal Tiger Voxel" scores 74 and an "Anaconda" scores
 * 60, and both are wrong in different ways - one is a toy, the other is a different animal's search
 * result. So the audit scores the title with the project's own title rule (`lib/model-quality.ts`,
 * the same 30 points the pipeline ranks with) and then says which of the three things it is:
 *
 *   matched     the title names the species
 *   unmatched   it does not (a stray search result, or a stand-in)
 *   placeholder it names something adjacent - a voxel toy, a chick, a "Seal" for a Weddell seal
 *
 * It reads the database and downloads nothing: the fix for any row is an order, a search, or an
 * upload, and all three already exist.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { ANIMALS } from "../data/animals.ts";
// The placeholder list lives beside the other quality constants, because the landmark pipeline
// refuses on it too - a rule that decides what ships belongs in one place.
import { PLACEHOLDER_WORDS, scoreModelQuality } from "../lib/model-quality.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const json = process.argv.includes("--json");

/** Below this, the pipeline's own ranking would not pick the model again today. */
const WEAK_SCORE = 75;
/** The title term of the quality score, out of the weights in lib/model-quality.ts. */
const TITLE_MATCH_POINTS = 24;

for (const name of [".env.local", ".env"]) {
  let text;
  try {
    text = readFileSync(join(ROOT, name), "utf8");
  } catch {
    continue;
  }
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const separator = trimmed.indexOf("=");
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("The audit reads the database: set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(2);
}

const rest = async (path) => {
  const response = await fetch(url + "/rest/v1/" + path, { headers: { apikey: key, authorization: "Bearer " + key } });
  if (!response.ok) throw new Error("HTTP " + response.status + " for " + path);
  return response.json();
};

const rows = await rest("animals?select=id,slug,name,latin_name,category,model_url&order=name.asc");
const assets = await rest("model_assets?select=animal_id,title,provider,license,quality_score,face_count,file_size_bytes,public_url,is_primary");

const primary = new Map();
for (const asset of assets) if (asset.is_primary) primary.set(asset.animal_id, asset);

const report = rows.map((animal) => {
  const asset = primary.get(animal.id) ?? null;
  if (!asset) {
    return { slug: animal.slug, name: animal.name, verdict: "no-model", score: null, title: null, detail: "no row in model_assets: the file on the site has no recorded provenance" };
  }

  const quality = scoreModelQuality({
    title: asset.title ?? "",
    terms: [animal.name, animal.latin_name ?? "", animal.category ?? ""],
    spdx: asset.license === "CC0" ? "CC0-1.0" : "CC-BY-4.0",
    faceCount: asset.face_count,
    downloadCount: null,
    likeCount: null,
    hasThumbnail: true,
  });

  const title = (asset.title ?? "").toLowerCase();
  const generic = PLACEHOLDER_WORDS.find((word) => title.includes(word));
  // The title rule gives 30 for a name match; anything less means the title does not name the species.
  const names = quality.title >= TITLE_MATCH_POINTS;
  const verdict = generic ? "placeholder" : names ? "matched" : "unmatched";
  const detail = generic
    ? "the title says \"" + generic + "\": a stand-in rather than the animal"
    : names
      ? (quality.total < WEAK_SCORE ? "names the species but scores " + quality.total + ", below the " + WEAK_SCORE + " bar" : "names the species")
      : "the title does not name the species";

  return { slug: animal.slug, name: animal.name, verdict, score: quality.total, title: asset.title ?? null, provider: asset.provider, faces: asset.face_count, bytes: asset.file_size_bytes, detail };
});

if (json) {
  console.log(JSON.stringify({ at: new Date().toISOString(), species: report.length, report }, null, 2));
} else {
  const width = Math.max(...report.map((row) => row.slug.length));
  console.log("verdict".padEnd(12), "score".padEnd(6), "slug".padEnd(width + 2), "model title");
  for (const row of report.sort((a, b) => (a.verdict === "matched" ? 1 : 0) - (b.verdict === "matched" ? 1 : 0) || (a.score ?? 0) - (b.score ?? 0))) {
    console.log(
      row.verdict.padEnd(12),
      String(row.score ?? "-").padEnd(6),
      row.slug.padEnd(width + 2),
      (row.title ?? "—").slice(0, 42) + (row.detail && row.verdict !== "matched" ? "   ← " + row.detail : ""),
    );
  }
  const counts = report.reduce((tally, row) => ({ ...tally, [row.verdict]: (tally[row.verdict] ?? 0) + 1 }), {});
  console.log("\n" + report.length + " species: " + Object.entries(counts).map(([verdict, count]) => count + " " + verdict).join(", "));
  console.log("Matched is not the same as good: a matched model can still be low detail. The score column is the pipeline's own, and anything under " + WEAK_SCORE + " is worth re-sourcing.");
}
