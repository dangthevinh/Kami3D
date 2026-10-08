#!/usr/bin/env node
/**
 * Which landmarks can actually be sourced, before anyone writes a fact about them.
 *
 *   node scripts/probe-landmarks.mjs                    # data/landmark-candidates.json
 *   node scripts/probe-landmarks.mjs --file=other.json
 *
 * ## Why this exists
 *
 * The project's rule for the model pipeline is **"dò trước, chọn sau"** - search before you choose -
 * and it was paid for once already, with 31 species that had no model of their own name. Writing a
 * catalogue entry is research: every date and every height needs a source. Writing one for a monument
 * that has no downloadable model is that research spent on something that cannot ship, because the
 * catalogue's rule is that **a landmark with no model is deleted, not shown with a placeholder**.
 *
 * So this runs first. It searches, applies the same gates the fetcher applies - licence, the title
 * naming the thing, not a piece of it, not a toy, inside the polygon budget - and prints which
 * candidates are worth writing up.
 *
 * ## What it cannot tell you
 *
 * Whether the file is any good. It has not downloaded anything: the geometry, the colour and the
 * texture can only be judged from the file itself, and the fetcher refuses a colourless model after
 * downloading it (see `modelCanShowColour`). A probe is a shortlist, not a licence to write.
 *
 * The candidate file is a list of `{ slug, name, city, country, query }` objects.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as sleep } from "node:timers/promises";

import { namesTheLandmark } from "../lib/landmark-gate.ts";
import { FACE_BUDGET } from "../lib/model-quality.ts";
import { PROVIDERS, loadEnvFiles, rankCandidates } from "./fetch-models.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const fileFlag = process.argv.find((arg) => arg.startsWith("--file="));
const LIST_FILE = fileFlag ? join(ROOT, fileFlag.slice("--file=".length)) : join(ROOT, "data", "landmark-candidates.json");

await loadEnvFiles();

const candidates = JSON.parse(readFileSync(LIST_FILE, "utf8"));
const sourced = [];
const refused = [];

for (const entry of candidates) {
  const landmark = { name: entry.name, city: entry.city, country: entry.country };
  try {
    const found = await PROVIDERS.sketchfab.search(entry.query ?? entry.name + " " + entry.city, { limit: 24 });
    const ranked = rankCandidates(found, { name: landmark.name, latin_name: landmark.city, category: landmark.country });

    let best = null;
    const why = [];
    for (const row of ranked) {
      const named = namesTheLandmark(row.candidate, landmark);
      if (!named.ok) { why.push(named.reason); continue; }
      if (!row.licence.ok) { why.push(row.licence.reason); continue; }
      if (!row.candidate.downloadable) { why.push("download disabled by the author"); continue; }
      const faces = row.candidate.faceCount;
      if (typeof faces === "number" && faces > FACE_BUDGET.max) { why.push(faces + " faces, over budget"); continue; }
      best = row;
      break;
    }

    if (best) sourced.push({ ...entry, faces: best.candidate.faceCount, title: best.candidate.title });
    else refused.push({ ...entry, why: why[0] ?? "no search results" });
  } catch (error) {
    refused.push({ ...entry, why: "ERROR " + String(error.message).split("\n")[0] });
  }
  await sleep(350);
}

console.log("SOURCED " + sourced.length + " / " + candidates.length);
for (const row of sourced) {
  console.log("  + " + (row.country + " / " + row.name).padEnd(54) + String(row.faces ?? "?").padStart(9) + "  " + row.title.slice(0, 32));
}

console.log("\nREFUSED " + refused.length);
for (const row of refused) {
  console.log("  - " + (row.country + " / " + row.name).padEnd(54) + row.why);
}

console.log("\nWrite data only for the SOURCED list. A monument that is refused here cannot ship.");
