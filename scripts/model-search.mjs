/**
 * Search every enabled provider and print what a human can choose from.
 *
 * The console cannot import the pipeline (it starts child processes and reads .env.local), so the search
 * runs here — the same `gatherCandidates` and `rankCandidates` the CLI uses, in the same order, with the
 * same licence verdicts. What the console adds on top is the download budget, per candidate.
 *
 *   node scripts/model-search.mjs --query="snow leopard" --json
 *   node scripts/model-search.mjs --slug=lion --providers=polyhaven,khronos --limit=8
 *
 * Sizes are resolved where a provider publishes them before the download (the GitHub catalogues and Poly
 * Haven do; Sketchfab and the rest do not). An unknown size is reported as null rather than guessed: the
 * budget then reserves the policy's per-model ceiling, which is what the CLI does too.
 */

import { ANIMALS } from "../data/animals.ts";
import { describeQuality, scoreModelQuality } from "../lib/model-quality.ts";
import {
  PROVIDERS,
  PROVIDER_REGISTRY,
  evaluateLicense,
  gatherCandidates,
  rankCandidates,
} from "./fetch-models.mjs";

const args = process.argv.slice(2);
const value = (name) => {
  const found = args.find((arg) => arg.startsWith("--" + name + "="));
  return found ? found.slice(name.length + 3) : null;
};

const asJson = args.includes("--json");
const slug = value("slug");
const query = value("query") ?? slug;
const limit = Math.min(Number(value("limit") ?? 8) || 8, 24);
const providers = (value("providers") ?? "polyhaven,nasa,khronos")
  .split(",")
  .map((id) => id.trim())
  .filter((id) => id in PROVIDERS);

if (!query) {
  console.error("usage: node scripts/model-search.mjs --query=\"...\" [--slug=lion] [--providers=a,b] [--json]");
  process.exit(2);
}

/** The catalogue entry when a species was named, otherwise a synthetic one for a free-text query. */
const animal = ANIMALS.find((entry) => entry.slug === slug) ?? {
  slug: slug ?? "search",
  name: query,
  latin_name: "",
  category: "",
  region: "",
};

/** The size of the file a candidate would download, where the provider publishes it. */
async function resolveBytes(candidate) {
  try {
    if (candidate.provider === "khronos" || candidate.provider === "nasa") {
      const folder = candidate.provider === "khronos" ? "Models" : "3D Models";
      const repo = candidate.provider === "khronos" ? "KhronosGroup/glTF-Sample-Assets" : "nasa/NASA-3D-Resources";
      const path = candidate.provider === "khronos"
        ? folder + "/" + candidate.id + "/glTF-Binary"
        : folder + "/" + candidate.id;
      const url = "https://api.github.com/repos/" + repo + "/contents/" + encodeURIComponent(path).replace(/%2F/g, "/");
      const response = await fetch(url, { headers: { accept: "application/vnd.github+json", "user-agent": "Kami3D-model-search" } });
      if (!response.ok) return null;
      const listing = await response.json();
      const model = listing.find((entry) => /\.glb$/i.test(entry.name));
      return model?.size ?? null;
    }

    if (candidate.provider === "polyhaven") {
      const response = await fetch("https://api.polyhaven.com/files/" + encodeURIComponent(candidate.id));
      if (!response.ok) return null;
      const files = await response.json();
      const resolution = files.gltf?.["1k"] ? "1k" : Object.keys(files.gltf ?? {})[0];
      if (!resolution) return null;
      const variant = Object.values(files.gltf[resolution])[0];
      const includes = Object.values(variant.include ?? {});
      return (variant.size ?? 0) + includes.reduce((total, file) => total + (file.size ?? 0), 0);
    }
  } catch {
    // A size we cannot read is a size we do not know; the budget treats it conservatively.
    return null;
  }
  return null;
}

// Licence labels come back with the candidates: a catalogue that states its licence per model (Khronos)
// has it read during the search, so a row can show it and the budget can check it before anyone clicks.
const gathered = await gatherCandidates(animal, providers, {});
const ranked = rankCandidates(gathered, animal).slice(0, limit);

const candidates = [];
for (const entry of ranked) {
  const { candidate, licence } = entry;
  const quality = scoreModelQuality({
    title: candidate.title,
    terms: [animal.name, animal.latin_name, animal.category].filter(Boolean),
    licenseSpdx: licence.ok ? licence.spdx : null,
    downloadCount: candidate.downloadCount ?? null,
    likeCount: candidate.likeCount ?? null,
    faceCount: candidate.faceCount ?? null,
    thumbnail: candidate.thumbnail ?? null,
  });

  candidates.push({
    provider: candidate.provider,
    providerId: String(candidate.id ?? ""),
    title: candidate.title,
    author: candidate.author ?? null,
    authorUrl: candidate.authorUrl ?? null,
    sourceUrl: candidate.sourceUrl ?? null,
    licenseLabel: candidate.licenseLabel ?? null,
    licenseUrl: candidate.licenseUrl ?? null,
    // The value the database checks, not the label the provider printed.
    license: licence.ok ? (licence.spdx === "CC0-1.0" || licence.spdx === "PDM-1.0" ? "CC0" : "CC-BY") : null,
    licenseVerdict: licence.ok ? "allowed" : licence.reason,
    faceCount: candidate.faceCount ?? null,
    bytes: await resolveBytes(candidate),
    quality: { total: quality.total, summary: describeQuality(quality.total) },
    credit: [candidate.title, candidate.author ? " by " + candidate.author : "", " — ", licence.ok ? licence.spdx : "licence refused", " via ", candidate.provider].join(""),
    matched: Boolean(entry.matched),
  });
}

const payload = {
  query,
  slug: animal.slug,
  providers,
  known: PROVIDER_REGISTRY.filter((provider) => providers.includes(provider.id)).map((provider) => provider.id),
  candidates,
};

if (asJson) {
  process.stdout.write(JSON.stringify(payload));
} else {
  console.log("Search: " + query + " across " + providers.join(", "));
  if (candidates.length === 0) console.log("  nothing found");
  for (const candidate of candidates) {
    console.log(
      "  " + String(candidate.quality.total).padStart(4) + "  " + candidate.provider.padEnd(10) + "  " +
        (candidate.license ?? "REFUSED") + "  " + (candidate.bytes ? Math.round(candidate.bytes / 1024) + " KB" : "size unknown") +
        "  " + candidate.title.slice(0, 44),
    );
    if (!candidate.license) console.log("        refused: " + candidate.licenseVerdict);
  }
}
