/**
 * Checks for the model-quality ranking and the acquisition pipeline’s pure parts.
 *
 * Phase 12 replaced "take the first licensed result" with "score every licensed
 * result and take the best". That is a judgement call about someone else’s models, so
 * the rules are pinned here rather than being tuned by feel: what makes a model good,
 * how much each signal is worth, and — most importantly — that a licence the project
 * refuses can never win however attractive the model is.
 *
 * Run with: npm run check:models
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import {
  FACE_BUDGET,
  MODEL_LICENSES,
  QUALITY_WEIGHTS,
  describeQuality,
  modelLicenseFromSpdx,
  scoreModelQuality,
} from "../lib/model-quality.ts";

const { rankCandidates, modelFileName, modelCredit } = await import("../scripts/fetch-models.mjs");

const animal = {
  slug: "bengal-tiger",
  name: "Bengal Tiger",
  latin_name: "Panthera tigris tigris",
  category: "Mammal",
};

const candidate = (patch = {}) => ({
  provider: "sketchfab",
  id: "abc123",
  title: "Bengal Tiger",
  author: "Someone",
  licenseLabel: "CC0 Public Domain",
  licenseUrl: null,
  sourceUrl: "https://sketchfab.com/models/abc123",
  faceCount: 40_000,
  downloadCount: 500,
  likeCount: 50,
  thumbnail: "https://example.invalid/thumb.jpg",
  ...patch,
});

test("the licence column values are the two the database accepts", () => {
  assert.deepEqual([...MODEL_LICENSES], ["CC0", "CC-BY"]);
  assert.equal(modelLicenseFromSpdx("CC0-1.0"), "CC0");
  assert.equal(modelLicenseFromSpdx("PDM-1.0"), "CC0");
  assert.equal(modelLicenseFromSpdx("CC-BY-4.0"), "CC-BY");

  // Everything else is "do not store this model", including the licences the project
  // refuses by name: the column would reject them anyway, so the mapping must too.
  for (const spdx of [null, undefined, "", "CC-BY-SA-4.0", "CC-BY-NC-4.0", "CC-BY-ND-4.0", "All-Rights-Reserved"]) {
    assert.equal(modelLicenseFromSpdx(spdx), null, `${spdx} must not map to a stored licence`);
  }
});

test("the weights add up to the 0-100 scale the column is constrained to", () => {
  const total = Object.values(QUALITY_WEIGHTS).reduce((sum, value) => sum + value, 0);
  assert.equal(total, 100);
});

test("a title that names the species scores higher than one that merely mentions it", () => {
  const terms = [animal.name, animal.latin_name, animal.category];
  const score = (title) => scoreModelQuality({ title, terms, spdx: "CC0-1.0" }).title;

  assert.equal(score("Bengal Tiger"), QUALITY_WEIGHTS.title);
  assert.equal(score("bengal tiger"), QUALITY_WEIGHTS.title);
  // The binomial is a term in its own right, so an exact binomial is a full match.
  assert.equal(score("Panthera tigris tigris"), QUALITY_WEIGHTS.title);
  // A decorated title is still a match, but not the strongest one.
  assert.ok(score("Bengal Tiger (rigged)") < QUALITY_WEIGHTS.title);
  assert.equal(score("Bengal Tiger (rigged)"), score("Panthera tigris tigris scan"));
  assert.ok(score("Bengal Tiger (rigged)") > 0);
  assert.equal(score("African Elephant"), 0);
  assert.equal(scoreModelQuality({ title: "African Elephant", terms }).matched, false);
});

test("no-attribution licences score higher than attribution ones", () => {
  const terms = [animal.name];
  const cc0 = scoreModelQuality({ title: "Bengal Tiger", terms, spdx: "CC0-1.0" });
  const by = scoreModelQuality({ title: "Bengal Tiger", terms, spdx: "CC-BY-4.0" });
  const none = scoreModelQuality({ title: "Bengal Tiger", terms, spdx: null });

  assert.equal(cc0.license, QUALITY_WEIGHTS.license);
  assert.ok(by.license > 0 && by.license < cc0.license);
  assert.equal(none.license, 0);
});

test("popularity is log-scaled and capped", () => {
  const terms = [];
  const popularity = (downloads, likes) =>
    scoreModelQuality({ title: "x", terms, downloadCount: downloads, likeCount: likes }).popularity;

  assert.equal(popularity(0, 0), 0);
  assert.equal(popularity(null, null), 0);
  assert.ok(Math.abs(popularity(1000, 0) - QUALITY_WEIGHTS.popularity * 0.6) < 0.2);
  assert.ok(Math.abs(popularity(0, 1000) - QUALITY_WEIGHTS.popularity * 0.4) < 0.2);
  assert.equal(popularity(1_000_000, 1_000_000), QUALITY_WEIGHTS.popularity);

  // Ten times the downloads must not be ten times the score.
  assert.ok(popularity(10_000, 0) / popularity(1_000, 0) < 1.4);
});

test("the polygon budget rewards models a phone can draw and punishes statues", () => {
  const complexity = (faceCount) => scoreModelQuality({ title: "x", terms: [], faceCount }).complexity;

  assert.equal(complexity(FACE_BUDGET.ideal), QUALITY_WEIGHTS.complexity);
  assert.ok(complexity(300_000) < QUALITY_WEIGHTS.complexity);
  assert.ok(complexity(700_000) < complexity(300_000));
  assert.ok(complexity(2_000_000) < complexity(700_000));
  assert.ok(complexity(100) < complexity(40_000), "a 100-triangle blob is not a good model");

  // Unknown is neutral: most providers do not report a face count, and scoring them
  // as if they had would be inventing data.
  assert.ok(complexity(null) > complexity(2_000_000));
  assert.ok(complexity(null) < complexity(40_000));
  assert.equal(complexity(undefined), complexity(null));
});

test("a clear thumbnail is worth something, and its absence costs exactly that", () => {
  const withThumb = scoreModelQuality({ title: "x", terms: [], hasThumbnail: true });
  const without = scoreModelQuality({ title: "x", terms: [], hasThumbnail: false });

  assert.equal(withThumb.thumbnail, QUALITY_WEIGHTS.thumbnail);
  assert.equal(without.thumbnail, 0);
  assert.equal(withThumb.total - without.total, QUALITY_WEIGHTS.thumbnail);
});

test("the total is always the sum of its parts, inside 0-100", () => {
  const inputs = [];
  for (const title of ["Bengal Tiger", "tiger", "Tiger", "unrelated model", ""]) {
    for (const spdx of ["CC0-1.0", "CC-BY-4.0", null]) {
      for (const faceCount of [null, 0, 100, 40_000, 400_000, 4_000_000]) {
        for (const downloadCount of [null, 0, 10, 100_000]) {
          inputs.push({ title, terms: [animal.name, animal.latin_name], spdx, faceCount, downloadCount, likeCount: 3 });
        }
      }
    }
  }

  for (const input of inputs) {
    const score = scoreModelQuality(input);
    const sum = score.title + score.license + score.popularity + score.complexity + score.thumbnail;
    assert.ok(Math.abs(sum - score.total) < 0.05, `parts do not add up for ${JSON.stringify(input)}`);
    assert.ok(score.total >= 0 && score.total <= 100, `score out of range: ${score.total}`);
  }
});

test("describeQuality covers the whole scale", () => {
  assert.equal(describeQuality(0), "poor");
  assert.equal(describeQuality(34.9), "poor");
  assert.equal(describeQuality(35), "usable");
  assert.equal(describeQuality(60), "good");
  assert.equal(describeQuality(100), "excellent");
});

test("the ranking takes the best licensed model, not the first one returned", () => {
  const statue = candidate({
    id: "statue",
    title: "Lion statue in the park",
    faceCount: 2_400_000,
    downloadCount: 0,
    likeCount: 0,
    thumbnail: null,
  });
  const scan = candidate({
    id: "scan",
    title: "Bengal Tiger — photogrammetry scan",
    faceCount: 38_000,
    downloadCount: 900,
    likeCount: 120,
  });

  const ranked = rankCandidates([statue, scan], animal);
  assert.equal(ranked[0].candidate.id, "scan");
  assert.ok(ranked[0].score > ranked[1].score);
  assert.equal(ranked[0].matched, true);
  assert.equal(ranked[1].matched, false);
  assert.equal(ranked[0].quality.total, ranked[0].score);
});

test("a refused licence never wins, however good the model is", () => {
  const perfect = candidate({ id: "nc", licenseLabel: "CC Attribution-NonCommercial" });
  const plain = candidate({ id: "allowed", title: "Tiger", downloadCount: 1, likeCount: 0, thumbnail: null });

  const ranked = rankCandidates([perfect, plain], animal);
  const winner = ranked.find((entry) => entry.licence.ok);

  assert.ok(winner, "an allowed candidate must exist");
  assert.equal(winner.candidate.id, "allowed");
  assert.equal(ranked.find((entry) => entry.candidate.id === "nc").licence.ok, false);
  assert.match(ranked.find((entry) => entry.candidate.id === "nc").licence.reason, /non-commercial/i);
});

test("an unlabelled licence is refused by default", () => {
  const ranked = rankCandidates([candidate({ licenseLabel: null })], animal);
  assert.equal(ranked[0].licence.ok, false);
  assert.match(ranked[0].licence.reason, /no licence declared/);
});

test("equal scores are ordered by title, so runs cannot reorder", () => {
  const a = candidate({ id: "a", title: "Bengal Tiger A" });
  const b = candidate({ id: "b", title: "Bengal Tiger B" });
  const first = rankCandidates([b, a], animal).map((entry) => entry.candidate.id);
  const second = rankCandidates([a, b], animal).map((entry) => entry.candidate.id);

  assert.deepEqual(first, second);
});

test("models are filed as <slug>.glb, then <slug>-alt2.glb", () => {
  assert.equal(modelFileName("bengal-tiger", 0), "bengal-tiger.glb");
  assert.equal(modelFileName("bengal-tiger", 1), "bengal-tiger-alt2.glb");
  assert.equal(modelFileName("bengal-tiger", 2), "bengal-tiger-alt3.glb");
  assert.notEqual(modelFileName("bengal-tiger", 0), modelFileName("bengal-tiger", 1));
});

test("the credit line names the model, the author, the licence and the provider", () => {
  const credit = modelCredit({ title: "Bengal Tiger", author: "A. Scanner", spdx: "CC-BY-4.0", provider: "sketchfab" });
  assert.match(credit, /Bengal Tiger/);
  assert.match(credit, /A\. Scanner/);
  assert.match(credit, /CC-BY-4\.0/);
  assert.match(credit, /sketchfab/);
});
