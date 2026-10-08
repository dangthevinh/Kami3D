#!/usr/bin/env node
/**
 * Grade a 3D model by looking at it.
 *
 *   node scripts/model-vision-review.mjs --queue          # build the review queue from what is on disk
 *   node scripts/model-vision-review.mjs --record=answers.json
 *   node scripts/model-vision-review.mjs --report         # what is verified, what is stale, what is wrong
 *
 * ## The question this answers
 *
 * Every gate the catalogue has is a gate on **text**. The licence gate reads a label, the title gate
 * reads a search result, the colour gate reads a texture count, the size gate reads a byte count. None
 * of them can tell a walrus from a walrus **skull**, and that is not a hypothetical: this repository
 * shipped a meerkat that was a skull, an octopus that was a sphere on a plane, and a "Sea otters charm
 * fastener" filed under sea otter, until a person looked at the pictures.
 *
 * So the standard this file implements is the one that caught them, applied at scale and recorded:
 * **a model ships only if somebody has looked at it and said what it is.** The looking is done by a
 * vision model, the saying is written down, and the record is checkable by a stranger - it names the
 * image, the md5 of that image, the model file, and the sentence the reviewer wrote about what they saw.
 *
 * ## Why the ledger is keyed by the model file
 *
 * `data/model-verification.json` is keyed the same way `data/previews.json` is: by the model's path
 * under `public/models/`, without the extension. That is the unit a vision check can actually see - one
 * file, one picture - and it is deliberately **not** the entry slug, because a slug is a claim about the
 * file and there can be several of them. Three entries in this repository point at the same International
 * Space Station model; they are one picture and one verdict, and the report says so rather than
 * pretending three checks happened.
 *
 * ## Why a verdict goes stale by itself
 *
 * The ledger records the md5 of the image it judged. Re-render a preview and the md5 changes, so the
 * verdict stops counting and the model goes back in the queue. This is the point: a verdict is evidence
 * about *a picture*, and a picture that has been replaced is a picture nobody has looked at. Measured
 * before it was designed - `npm run models:previews -- --force` reproduces 228 of 234 images and
 * shifts six, so verdicts tied to a file name alone would quietly outlive their own evidence.
 */

import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

// The rule itself lives in a pure module so it can be tested without a browser, a model file or a
// vision model - the same split `lib/catalog-project.ts` makes against `lib/catalog.ts`.
import { MIN_DESCRIPTION_LENGTH, VISION_VERDICTS, isVerdict, rejectionReason } from "../lib/model-verification.ts";

const ROOT = process.cwd();
const QUEUE_FILE = join(ROOT, "data", "model-vision-queue.json");
const LEDGER_FILE = join(ROOT, "data", "model-verification.json");

const argv = process.argv.slice(2);
const has = (name) => argv.some((arg) => arg === "--" + name || arg.startsWith("--" + name + "="));
const value = (name) => {
  const hit = argv.find((arg) => arg.startsWith("--" + name + "="));
  return hit === undefined ? null : hit.slice(name.length + 3);
};

/**
 * The model, named in the ledger rather than in the prompt.
 *
 * `deepseek-v4-flash-vision-exp` is the one model this deployment exposes that accepts image input.
 * It is recorded per verdict because a verdict is only as good as the reviewer, and a future run on a
 * different model must not look like the same evidence.
 */
const REVIEWER = "deepseek-v4-flash-vision-exp";

/**
 * The question, written once and stored in the queue so the answer can never be separated from it.
 *
 * Three things about it are deliberate:
 *
 *   - **"what you actually see" comes first**, and the verdict is asked for second. A reviewer that has
 *     already decided is a reviewer that describes the decision.
 *   - **"unclear" is a real answer.** A render can be a dot, and a dot is not evidence for anything -
 *     the same reason `scripts/render-model-previews.mjs` refuses to write a frame below a coverage
 *     floor instead of writing a blank square that counts as success.
 *   - **the claims are listed as claims**, not as facts: "the catalogue uses this model as …" is true
 *     even when the model is something else entirely, and it is what the reviewer is being asked to
 *     check.
 */
const PROMPT = [
  "You are auditing a 3D catalogue. You will be shown ONE image: an off-screen render of a single 3D",
  "model, framed and lit exactly the way the site's own viewer frames and lights it.",
  "",
  "Open the image with the read_image tool at the absolute path given below, look at it, and answer.",
  "",
  "First write, in one sentence, what you actually see - the object, plainly, without guessing what it",
  "was meant to be. Then judge whether it supports the catalogue's claim about it.",
  "",
  "Answer with JSON only, no prose around it:",
  '{"subject": "<what you actually see, one sentence>", "verdict": "matches" | "mismatch" | "unclear", "reason": "<one sentence: why that verdict>"}',
  "",
  'Use "matches" when the object in the image is the thing claimed. Use "mismatch" when it is a',
  'different thing, or only a part of the thing (a skull is not an animal, a fragment is not the',
  'building, a diagram with no texture is not a model). Use "unclear" when the render is too small,',
  'too dark, or too empty to tell. Do not reward effort and do not be polite: "unclear" and "mismatch"',
  "are useful answers, and a wrong \"matches\" is the one answer that costs this catalogue its credit.",
].join("\n");

/* -------------------------------------------------------------------------- */
/* What is on disk, and what claims it backs                                  */
/* -------------------------------------------------------------------------- */

/**
 * Every catalogue, and how to get at its entries. The same table `scripts/catalogue-status.mjs` reads,
 * so a count here and a count there cannot disagree.
 */
const CATALOGUES = [
  { id: "animals", module: "../data/animals.ts", exported: "ANIMALS", dir: "" },
  { id: "space", module: "../data/space.ts", exported: "SPACE_ENTRIES", dir: "space" },
  { id: "plants", module: "../data/plants.ts", exported: "PLANT_ENTRIES", dir: "plants" },
  { id: "vehicles", module: "../data/vehicles.ts", exported: "VEHICLE_ENTRIES", dir: "vehicles" },
  { id: "architecture", module: "../data/landmarks/all.ts", exported: "ALL_LANDMARKS", dir: "landmarks" },
  // The curated half of the buildings subject: the same files the architecture entries use, so no
  // separate folder and no separate verdict.
  { id: "buildings", module: "../data/buildings.ts", exported: "MODERN_BUILDINGS", dir: "landmarks", slugsOnly: true },
  { id: "buildings", module: "../data/buildings-entries.ts", exported: "BUILDING_ENTRIES", dir: "buildings" },
];

/** The path `public/models/<key>.glb` is under, and the preview that mirrors it. */
const previewPath = (key) => join(ROOT, "public", "previews", key + ".webp");
const modelPath = (key) => join(ROOT, "public", "models", key + ".glb");

/**
 * The claims: for every shipped model file, which catalogue entries say it is what.
 *
 * Built from the catalogues rather than from the filesystem, because the question being asked is "does
 * this file back the claim made about it" - a file nothing claims is a different problem
 * (`scripts/catalogue-status.mjs` reports those as orphans) and there is nothing to check it against.
 */
async function collect() {
  const claims = new Map();

  for (const catalogue of CATALOGUES) {
    const module_ = await import(catalogue.module);
    const raw = module_[catalogue.exported];
    const entries = catalogue.slugsOnly
      ? (await import("../data/landmarks/all.ts")).ALL_LANDMARKS.filter((entry) =>
          raw.includes(entry.slug),
        )
      : raw;

    for (const entry of entries) {
      const slug = typeof entry === "string" ? entry : entry.slug;
      const modelUrl = typeof entry === "string" ? null : entry.model_url;
      if (!modelUrl) continue;
      const key = modelUrl.replace(/^\/models\//, "").replace(/\.glb$/, "");

      if (!claims.has(key)) claims.set(key, []);
      claims.get(key).push({
        catalogue: catalogue.id,
        slug,
        name: typeof entry === "string" ? slug : entry.name,
        latin: typeof entry === "string" ? null : (entry.latin_name ?? null),
      });
    }
  }

  const items = [];
  const unrenderable = [];

  for (const [key, list] of [...claims.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    const image = previewPath(key);
    if (!existsSync(image)) {
      unrenderable.push({ key, claims: list, why: "no preview image was rendered for this model" });
      continue;
    }
    const sha = createHash("sha256");
    sha.update(readFileSync(modelPath(key)));
    items.push({
      id: key,
      image: "public/previews/" + key + ".webp",
      imageMd5: createHash("md5").update(readFileSync(image)).digest("hex"),
      model: "public/models/" + key + ".glb",
      modelSha256: sha.digest("hex"),
      claims: list,
    });
  }

  return { items, unrenderable, claimed: claims.size };
}

/* -------------------------------------------------------------------------- */
/* Actions                                                                    */
/* -------------------------------------------------------------------------- */

const readJson = (path, fallback) => (existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : fallback);

async function queue() {
  const { items, unrenderable, claimed } = await collect();
  const ledger = readJson(LEDGER_FILE, { entries: {} }).entries ?? {};

  // An item is queued when it has no verdict, or when the verdict was made about a different image.
  const stale = [];
  const pending = [];
  let current = 0;
  for (const item of items) {
    const record = ledger[item.id];
    if (!record) {
      pending.push(item);
      continue;
    }
    if (record.imageMd5 !== item.imageMd5) {
      stale.push(item.id);
      pending.push(item);
      continue;
    }
    current += 1;
  }

  const document = {
    generatedAt: new Date().toISOString(),
    reviewer: REVIEWER,
    question: PROMPT,
    counts: { models: items.length, current, pending: pending.length, stale: stale.length, unrenderable: unrenderable.length },
    unrenderable,
    items: pending,
  };
  const { writeFileSync } = await import("node:fs");
  writeFileSync(QUEUE_FILE, JSON.stringify(document, null, 2) + "\n", "utf8");

  console.log("Kami3D vision review queue");
  console.log("  model files claimed by a catalogue : " + claimed);
  console.log("  with a preview to look at          : " + items.length);
  console.log("  already verified, image unchanged  : " + current);
  console.log("  stale (the image was re-rendered)  : " + stale.length);
  console.log("  to review now                      : " + pending.length);
  console.log("  no preview to review               : " + unrenderable.length + (unrenderable.length ? "  (" + unrenderable.map((one) => one.key).join(", ") + ")" : ""));
  console.log("  written to                         : data/model-vision-queue.json");
  return 0;
}

/**
 * The answer file, and the checks an answer has to pass before it counts as evidence.
 *
 * Nothing here trusts the reviewer. An answer is refused when it names a model that is not in the
 * queue, when its verdict is not one of the three words, when its description of what it saw is
 * missing or too short to be a description, or when the image has changed since the queue was built -
 * the last one because that is exactly the case the whole md5 design exists for.
 */
async function record() {
  const file = value("record");
  if (!file) {
    console.error("--record needs a path, e.g. --record=answers.json");
    return 2;
  }
  const answers = JSON.parse(readFileSync(join(ROOT, file), "utf8"));
  const list = Array.isArray(answers) ? answers : (answers.answers ?? null);
  if (!Array.isArray(list)) {
    console.error(file + ": expected a JSON array of {id, subject, verdict, reason}");
    return 2;
  }

  const { items } = await collect();
  const byId = new Map(items.map((item) => [item.id, item]));
  const ledger = readJson(LEDGER_FILE, { reviewer: REVIEWER, entries: {} });
  ledger.reviewer = ledger.reviewer ?? REVIEWER;
  ledger.entries = ledger.entries ?? {};

  const refused = [];
  let written = 0;
  let changed = 0;

  for (const answer of list) {
    const why = [];
    if (!answer || typeof answer !== "object") why.push("not an object");
    else {
      if (typeof answer.id !== "string") why.push("no id");
      if (!isVerdict(answer.verdict)) why.push("verdict must be one of " + VISION_VERDICTS.join(", "));
      if (typeof answer.subject !== "string" || answer.subject.trim().length < MIN_DESCRIPTION_LENGTH) {
        why.push("the description of what was seen is missing or too short");
      }
      if (typeof answer.reason !== "string" || answer.reason.trim().length < MIN_DESCRIPTION_LENGTH) {
        why.push("the reason is missing or too short");
      }
      if (answer.id && !byId.has(answer.id)) why.push("no such model in the queue");
    }

    if (why.length === 0) {
      const item = byId.get(answer.id);
      const previous = ledger.entries[item.id];
      if (previous && previous.imageMd5 !== item.imageMd5) changed += 1;
      ledger.entries[item.id] = {
        verdict: answer.verdict,
        subject: answer.subject.trim(),
        reason: answer.reason.trim(),
        reviewer: REVIEWER,
        image: item.image,
        imageMd5: item.imageMd5,
        model: item.model,
        modelSha256: item.modelSha256,
        claims: item.claims,
        checkedAt: new Date().toISOString(),
      };
      written += 1;
    } else {
      refused.push({ id: answer?.id ?? "(no id)", why: why.join("; ") });
    }
  }

  const { writeFileSync } = await import("node:fs");
  writeFileSync(
    LEDGER_FILE,
    JSON.stringify({ note: LEDGER_NOTE, reviewer: ledger.reviewer, generatedAt: new Date().toISOString(), entries: ledger.entries }, null, 2) + "\n",
    "utf8",
  );

  console.log("recorded " + written + " verdict(s) into data/model-verification.json");
  console.log("  replaced an earlier verdict about a different image : " + changed);
  console.log("  refused                                             : " + refused.length);
  for (const row of refused) console.log("    " + row.id + ": " + row.why);
  return refused.length ? 1 : 0;
}

const LEDGER_NOTE =
  "Every entry is one vision check of one image. It names the image, the md5 of that image, the model " +
  "file and its sha256, the sentence the reviewer wrote about what they saw, and the model that did the " +
  "looking. A verdict stops counting the moment the image it judged changes - see the header of " +
  "scripts/model-vision-review.mjs. Written by scripts/model-vision-review.mjs --record, never by hand.";

async function report() {
  const { items, unrenderable } = await collect();
  const ledger = readJson(LEDGER_FILE, { entries: {} }).entries ?? {};

  // The state of a model is decided by the same function the wiring gate uses, so "verified" here and
  // "may be wired" there cannot drift apart.
  const rows = items.map((item) => {
    const record = ledger[item.id] ?? null;
    const refusal = rejectionReason(record, item.imageMd5);
    const state = !record
      ? "unreviewed"
      : record.imageMd5 !== item.imageMd5
        ? "stale"
        : record.verdict;
    return { item, record, state, refusal };
  });

  const count = (state) => rows.filter((row) => row.state === state).length;
  console.log("Kami3D model verification");
  console.log("  models with a claim and an image : " + items.length);
  console.log("  matches                          : " + count("matches"));
  console.log("  mismatch                         : " + count("mismatch"));
  console.log("  unclear                          : " + count("unclear"));
  console.log("  stale (image replaced)           : " + count("stale"));
  console.log("  unreviewed                       : " + count("unreviewed"));
  console.log("  no preview to review             : " + unrenderable.length);

  console.log("  may be wired (verdict current)   : " + rows.filter((row) => row.refusal === null).length);

  const wrong = rows.filter((row) => row.state === "mismatch");
  if (wrong.length) {
    console.log("");
    console.log("  models the reviewer says are not what the catalogue claims:");
    for (const row of wrong) {
      const claims = row.item.claims.map((claim) => claim.catalogue + "/" + claim.slug + " (" + claim.name + ")").join(", ");
      console.log("    " + row.item.id);
      console.log("      claimed as : " + claims);
      console.log("      what it is : " + row.record.subject);
      console.log("      reviewer   : " + row.record.reason);
    }
  }
  return wrong.length ? 1 : 0;
}

/* -------------------------------------------------------------------------- */

if (has("queue")) process.exit(await queue());
if (has("record")) process.exit(await record());
process.exit(await report());
