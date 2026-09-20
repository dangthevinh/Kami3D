/**
 * Assertions for the quiz round builder.
 *
 * A quiz is the one surface where a data bug is invisible: a question whose
 * correct answer is not among its options, a round with the same animal twice, a
 * "is it longer than a bus?" whose answer contradicts `length_m` — all of them
 * still *play*, they just quietly teach the wrong thing. These tests are the
 * referee.
 *
 * Run with: npm run check:quiz
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import { ANIMALS } from "../data/animals.ts";
import { REGIONS, TAXONOMIC_CLASSES } from "../types/animal.ts";
import {
  DEFAULT_ROUND_KINDS,
  QUESTIONS_PER_ROUND,
  SIZE_LADDER,
  buildRound,
  isCorrect,
} from "../lib/quiz.ts";

const SEED = "check-quiz-seed";

function assertWellFormed(question) {
  assert.ok(question.id.length > 0, "every question needs an id");
  assert.ok(question.prompt.trim().length > 0, `${question.id} has no prompt`);
  assert.ok(question.reveal.trim().length > 0, `${question.id} has nothing to reveal`);
  assert.ok(question.options.length >= 2, `${question.id} has ${question.options.length} options`);

  const ids = question.options.map((option) => option.id);
  assert.equal(new Set(ids).size, ids.length, `${question.id} repeats an option`);
  assert.ok(ids.includes(question.answerId), `${question.id}: the answer is not among its own options`);
  for (const option of question.options) {
    assert.ok(option.label.trim().length > 0, `${question.id}: an option has no label`);
  }
}

test("the same seed rebuilds the same round", () => {
  const first = buildRound(ANIMALS, { seed: SEED });
  const second = buildRound(ANIMALS, { seed: SEED });
  assert.deepEqual(first, second, "a resumed round must be reproducible");

  const other = buildRound(ANIMALS, { seed: "different" });
  assert.notDeepEqual(
    first.map((question) => question.subject.slug),
    other.map((question) => question.subject.slug),
    "a different seed should pick different subjects",
  );
});

test("a round has the advertised shape", () => {
  const round = buildRound(ANIMALS, { seed: SEED });
  assert.equal(round.length, QUESTIONS_PER_ROUND);
  assert.deepEqual(
    round.map((question) => question.kind),
    DEFAULT_ROUND_KINDS,
    "the rotation is the game's pace: six silhouettes, then the others",
  );

  for (const question of round) assertWellFormed(question);

  const subjects = round.map((question) => question.subject.id);
  assert.equal(new Set(subjects).size, subjects.length, "the same animal must not appear twice in a round");
});

test("silhouette questions offer four species, including the right one", () => {
  const round = buildRound(ANIMALS, { seed: SEED, kinds: ["species"] });
  const pool = new Set(ANIMALS.map((animal) => animal.id));

  for (const question of round) {
    assert.equal(question.options.length, 4, `${question.id} should offer four species`);
    assert.ok(question.options.some((option) => option.id === question.subject.id), "the subject is an option");
    for (const option of question.options) {
      assert.ok(pool.has(option.id), `${question.id} offered an unknown species: ${option.id}`);
    }
    assert.ok(question.reveal.includes(question.subject.latin_name), "the reveal names the species");
  }
});

test("region and class questions only offer real answers", () => {
  const regions = buildRound(ANIMALS, { seed: SEED, kinds: ["region"] });
  for (const question of regions) {
    assert.equal(question.options.length, 4);
    assert.equal(question.answerId, question.subject.region);
    for (const option of question.options) {
      assert.ok(REGIONS.includes(option.id), `unknown region ${option.id}`);
    }
  }

  const classes = buildRound(ANIMALS, { seed: SEED, kinds: ["class"] });
  for (const question of classes) {
    assert.equal(question.options.length, 4);
    assert.equal(question.answerId, question.subject.category);
    for (const option of question.options) {
      assert.ok(TAXONOMIC_CLASSES.includes(option.id), `unknown class ${option.id}`);
    }
  }
});

test("the size question compares against the closest familiar thing", () => {
  const round = buildRound(ANIMALS, { seed: SEED, kinds: ["relative-size"] });
  assert.equal(round.length, QUESTIONS_PER_ROUND);

  for (const question of round) {
    assert.equal(question.options.length, 2, "bigger or smaller is a two-way question");
    assert.deepEqual(
      question.options.map((option) => option.id).sort(),
      ["longer", "shorter"],
    );

    // The rung named in the prompt must be the one nearest the animal's length,
    // or the question is either trivial or unfair.
    const metres = question.subject.length_m > 0 ? question.subject.length_m : question.subject.scale_ratio;
    const closest = [...SIZE_LADDER].sort((a, b) => Math.abs(a.metres - metres) - Math.abs(b.metres - metres))[0];
    assert.ok(
      question.prompt.includes(closest.label),
      `${question.id}: asked about "${question.prompt}" but ${closest.label} is nearest`,
    );

    // And the answer has to agree with the dataset.
    const expected = metres > closest.metres ? "longer" : "shorter";
    assert.equal(question.answerId, expected, `${question.id}: wrong answer for ${metres} m`);
    assert.equal(isCorrect(question, expected), true);
    assert.equal(isCorrect(question, expected === "longer" ? "shorter" : "longer"), false);
  }
});

test("a round on a small pool still works", () => {
  const pool = ANIMALS.slice(0, 5);
  const round = buildRound(pool, { seed: SEED });
  assert.equal(round.length, 5, "the round cannot be longer than the pool");
  for (const question of round) assertWellFormed(question);

  // Four species is the smallest pool that can still offer four options.
  const four = buildRound(ANIMALS.slice(0, 4), { seed: SEED, kinds: ["species"], count: 4 });
  for (const question of four) {
    assert.equal(question.options.length, 4);
    assertWellFormed(question);
  }
});

test("isCorrect treats a timeout as wrong", () => {
  const [question] = buildRound(ANIMALS, { seed: SEED });
  assert.equal(isCorrect(question, question.answerId), true);
  assert.equal(isCorrect(question, null), false);
  assert.equal(isCorrect(question, "not-an-option"), false);
});

test("every question in a hundred seeded rounds is well formed", () => {
  // A cheap fuzz: the builder has to hold its guarantees for any seed, not just
  // the one the other tests happen to use.
  const failures = [];
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const round = buildRound(ANIMALS, { seed: `fuzz-${attempt}` });
    for (const question of round) {
      const ids = question.options.map((option) => option.id);
      if (!ids.includes(question.answerId)) failures.push(`${question.id} (seed ${attempt}): answer missing`);
      if (new Set(ids).size !== ids.length) failures.push(`${question.id} (seed ${attempt}): duplicate option`);
      if (question.kind === "species" && question.options.length !== 4) failures.push(`${question.id}: ${question.options.length} options`);
    }
  }
  assert.deepEqual(failures.slice(0, 5), []);
});
