/**
 * The vision ledger, and the rule that turns it into a decision.
 *
 *   node --test scripts/check-model-vision.mjs
 *
 * This suite exists because the ledger is the only gate in this project whose evidence a stranger can
 * check by opening a file, and that property is worth exactly as much as the checks that keep it: a row
 * whose image is not on disk cannot be checked by anyone, a row that names an entry the catalogue does
 * not have is a verdict about nothing, and a row whose description is "looks fine" is a checkbox.
 *
 * What is **not** tested is the verdicts themselves. Whether "a spiny multi-eyed monster toad" is a
 * hellbender is a judgement, and a test that encoded this reviewer's judgement would fail the day a
 * better reviewer disagreed - which is the opposite of what the ledger is for.
 */

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import {
  MIN_DESCRIPTION_LENGTH,
  VISION_VERDICTS,
  evidenceLine,
  isVerdict,
  isVerified,
  modelPathFor,
  rejectionReason,
} from "../lib/model-verification.ts";

const root = process.cwd();
const ledger = JSON.parse(readFileSync(join(root, "data", "model-verification.json"), "utf8"));
const previews = JSON.parse(readFileSync(join(root, "data", "previews.json"), "utf8"));

/** The reviewer this deployment has. A verdict from an unnamed model is not evidence about anything. */
const REVIEWER = "deepseek-v4-flash-vision-exp";

/** Every catalogue the ledger may make a claim about, and how to check that the claim names a real entry. */
const CATALOGUES = {
  animals: { module: "../data/animals.ts", exported: "ANIMALS" },
  space: { module: "../data/space.ts", exported: "SPACE_ENTRIES" },
  plants: { module: "../data/plants.ts", exported: "PLANT_ENTRIES" },
  vehicles: { module: "../data/vehicles.ts", exported: "VEHICLE_ENTRIES" },
  architecture: { module: "../data/landmarks/all.ts", exported: "ALL_LANDMARKS" },
  buildings: { module: "../data/buildings-entries.ts", exported: "BUILDING_ENTRIES" },
};

const rows = Object.entries(ledger.entries);

test("the ledger is a record with rows, not an empty promise", () => {
  assert.equal(typeof ledger.entries, "object");
  assert.ok(rows.length > 0, "no verdict has been recorded, so every rule below proves nothing");
  assert.equal(ledger.reviewer, REVIEWER, "the ledger must name the reviewer it was written by");
});

test("every row carries the fields that make it checkable", () => {
  for (const [key, row] of rows) {
    assert.ok(isVerdict(row.verdict), key + ": " + row.verdict + " is not one of " + VISION_VERDICTS.join("/"));
    assert.equal(typeof row.subject, "string", key + ": no description of what was seen");
    assert.ok(
      row.subject.trim().length >= MIN_DESCRIPTION_LENGTH,
      key + ': "' + row.subject + '" is too short to be a description',
    );
    assert.ok(row.reason.trim().length >= MIN_DESCRIPTION_LENGTH, key + ": the reason is too short to read");
    assert.equal(row.reviewer, REVIEWER, key + ": the reviewer is not the model this deployment runs");
    assert.equal(row.model, modelPathFor(key), key + ": the row names a different model file");
    assert.match(row.imageMd5, /^[0-9a-f]{32}$/, key + ": imageMd5 is not an md5");
    assert.match(row.modelSha256, /^[0-9a-f]{64}$/, key + ": modelSha256 is not a sha256");
    assert.ok(!Number.isNaN(Date.parse(row.checkedAt)), key + ": checkedAt is not a date");
  }
});

test("every row points at an image that is really there", () => {
  // The whole value of the ledger is that a second person can open the picture. A row whose image is
  // gone is a claim nobody can check, which is the thing this project refuses to ship anywhere else.
  for (const [key, row] of rows) {
    const path = join(root, row.image);
    assert.ok(existsSync(path), key + " points at " + row.image + ", which is not in the repository");
    assert.equal(
      createHash("md5").update(readFileSync(path)).digest("hex"),
      row.imageMd5,
      key + ": the image on disk is not the image that was judged - the verdict is stale and must be re-queued",
    );
  }
});

test("every row is about a model the catalogue actually ships", () => {
  const shipped = new Set(previews.entries.map((entry) => entry.key));
  for (const [key] of rows) {
    assert.ok(shipped.has(key), key + ": a verdict about a model that no preview manifest lists");
  }
});

test("every row names the entries it is a claim about, and those entries exist", async () => {
  const slugs = {};
  for (const [id, catalogue] of Object.entries(CATALOGUES)) {
    const module_ = await import(catalogue.module);
    slugs[id] = new Set(module_[catalogue.exported].map((entry) => entry.slug ?? entry));
  }
  // The buildings subject is half projection: its curated monuments are landmark slugs selected by the
  // rule in data/buildings.ts, so a row that claims to back buildings/burj-khalifa is right and a set
  // read from data/buildings-entries.ts alone would call it a lie.
  const { MODERN_BUILDINGS } = await import("../data/buildings.ts");
  for (const slug of MODERN_BUILDINGS) slugs.buildings.add(slug);

  for (const [key, row] of rows) {
    assert.ok(Array.isArray(row.claims) && row.claims.length > 0, key + ": a verdict about nothing in particular");
    for (const claim of row.claims) {
      assert.ok(slugs[claim.catalogue], key + ": claims to be in an unknown catalogue, " + claim.catalogue);
      assert.ok(
        slugs[claim.catalogue].has(claim.slug),
        key + ": claims to back " + claim.catalogue + "/" + claim.slug + ", which is not in that catalogue",
      );
      assert.ok(typeof claim.name === "string" && claim.name.length > 0, key + ": a claim with no name");
    }
  }
});

test("a verdict only counts while the image it judged is still the image on disk", () => {
  const row = rows[0][1];
  assert.equal(isVerified(row, row.imageMd5), true, "a current verdict about a current image must count");
  assert.equal(isVerified(row, "0".repeat(32)), false, "an md5 that differs means the picture was replaced");
  assert.equal(isVerified(row, null), false, "no image means nothing to have judged");
  assert.equal(isVerified(null, row.imageMd5), false, "no verdict at all");
});

test("the rule refuses each of the ways a row can fail to be evidence", () => {
  const base = rows.find(([, row]) => row.verdict === "matches")[1];
  const withVerdict = (verdict) => ({ ...base, verdict });

  assert.match(rejectionReason(withVerdict("mismatch"), base.imageMd5), /not what the catalogue claims/);
  assert.match(rejectionReason(withVerdict("unclear"), base.imageMd5), /could not tell/);
  assert.match(rejectionReason({ ...base, subject: "looks ok" }, base.imageMd5), /does not describe/);
  assert.match(rejectionReason({ ...base, verdict: "probably" }, base.imageMd5), /not one of/);
  assert.equal(rejectionReason(base, base.imageMd5), null, "a matching verdict about a current image is clean");
});

test("the evidence line a wiring writes down names the reviewer, the picture and the verdict", () => {
  const row = rows.find(([, value]) => value.verdict === "matches")[1];
  const line = evidenceLine(row);
  assert.match(line, new RegExp(REVIEWER), "the line must name who looked");
  assert.match(line, new RegExp(row.imageMd5), "the line must name the exact image, by md5");
  assert.ok(line.includes(row.image), "the line must name the file a person can open");
  assert.ok(line.includes(row.subject.trim()), "the line must carry the sentence the reviewer wrote");
});

test("the ledger's own verdicts are the three answers and nothing else", () => {
  const counts = {};
  for (const [, row] of rows) counts[row.verdict] = (counts[row.verdict] ?? 0) + 1;
  for (const verdict of Object.keys(counts)) assert.ok(isVerdict(verdict), verdict + " is not a verdict");
  assert.equal(
    Object.values(counts).reduce((sum, value) => sum + value, 0),
    rows.length,
    "every row must be counted once",
  );
  console.log(
    "  " + rows.length + " verdict(s): " + VISION_VERDICTS.map((verdict) => verdict + " " + (counts[verdict] ?? 0)).join(" · "),
  );
});
