/**
 * Assertions for quiz scoring.
 *
 * The invariants that matter: a correct answer is never worth less than a wrong
 * one, bonuses are bounded, and the *correct count* — the number the server
 * recomputes badges from — is unaffected by any of it.
 *
 * Run with: npm run check:quiz
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import {
  BASE_POINTS,
  MAX_SPEED_BONUS,
  MAX_STREAK_BONUS,
  accuracyPercent,
  bestStreakOf,
  scoreAnswer,
} from "../lib/quiz-scoring.ts";

test("an instant correct answer is worth the base plus the full speed bonus", () => {
  const score = scoreAnswer({ correct: true, secondsLeft: 15, secondsAllowed: 15, streakBefore: 0 });
  assert.equal(score.base, BASE_POINTS);
  assert.equal(score.speedBonus, MAX_SPEED_BONUS);
  assert.equal(score.points, BASE_POINTS + MAX_SPEED_BONUS);
  assert.equal(score.streak, 1);
});

test("a last-second correct answer earns no haste bonus but is still correct", () => {
  const score = scoreAnswer({ correct: true, secondsLeft: 0, secondsAllowed: 15, streakBefore: 0 });
  assert.equal(score.speedBonus, 0);
  assert.equal(score.points, BASE_POINTS);
  assert.equal(score.streak, 1);
});

test("a wrong answer resets the streak and scores nothing", () => {
  const score = scoreAnswer({ correct: false, secondsLeft: 12, secondsAllowed: 15, streakBefore: 7 });
  assert.deepEqual(score, { points: 0, base: 0, speedBonus: 0, streakBonus: 0, streak: 0 });
});

test("the haste bonus does not favour a longer clock", () => {
  // Half the clock left is worth the same whether the clock was 5 s or 15 s.
  const short = scoreAnswer({ correct: true, secondsLeft: 2.5, secondsAllowed: 5, streakBefore: 0 });
  const long = scoreAnswer({ correct: true, secondsLeft: 7.5, secondsAllowed: 15, streakBefore: 0 });
  assert.equal(short.speedBonus, long.speedBonus);
  assert.equal(short.points, long.points);
});

test("the streak bonus grows, then stops", () => {
  const second = scoreAnswer({ correct: true, secondsLeft: 0, secondsAllowed: 15, streakBefore: 1 });
  assert.equal(second.streakBonus, 10);
  assert.equal(second.streak, 2);

  const tenth = scoreAnswer({ correct: true, secondsLeft: 0, secondsAllowed: 15, streakBefore: 9 });
  assert.equal(tenth.streakBonus, MAX_STREAK_BONUS, "the bonus is capped");
  assert.equal(tenth.streak, 10);

  const absurd = scoreAnswer({ correct: true, secondsLeft: 0, secondsAllowed: 15, streakBefore: 500 });
  assert.equal(absurd.streakBonus, MAX_STREAK_BONUS);
});

test("points are bounded, so a round has a known ceiling", () => {
  const worst = scoreAnswer({ correct: true, secondsLeft: 0, secondsAllowed: 15, streakBefore: 0 });
  const best = scoreAnswer({ correct: true, secondsLeft: 15, secondsAllowed: 15, streakBefore: 9 });

  assert.equal(worst.points, BASE_POINTS);
  assert.equal(best.points, BASE_POINTS + MAX_SPEED_BONUS + MAX_STREAK_BONUS);

  for (const secondsLeft of [-5, 0, 3, 15, 99]) {
    for (const streakBefore of [-2, 0, 4, 40]) {
      const score = scoreAnswer({ correct: true, secondsLeft, secondsAllowed: 15, streakBefore });
      assert.ok(Number.isInteger(score.points), "points stay whole");
      assert.ok(score.points >= BASE_POINTS && score.points <= best.points, `out of range: ${score.points}`);
      assert.ok(score.streak >= 1);
    }
  }
});

test("a zero-length clock does not divide by zero", () => {
  const score = scoreAnswer({ correct: true, secondsLeft: 5, secondsAllowed: 0, streakBefore: 0 });
  assert.equal(score.speedBonus, 0);
  assert.ok(Number.isFinite(score.points));
});

test("accuracy is a whole percentage, and empty rounds are zero", () => {
  assert.equal(accuracyPercent({ correct: 0, total: 0 }), 0);
  assert.equal(accuracyPercent({ correct: 10, total: 10 }), 100);
  assert.equal(accuracyPercent({ correct: 7, total: 10 }), 70);
  assert.equal(accuracyPercent({ correct: 1, total: 3 }), 33);
});

test("the best streak is recovered from the answers themselves", () => {
  // A resumed round has no memory of its streak, so it must be derivable.
  assert.equal(bestStreakOf([]), 0);
  assert.equal(bestStreakOf([true, true, false, true]), 2);
  assert.equal(bestStreakOf([false, false]), 0);
  assert.equal(bestStreakOf([true, true, true, true]), 4);
});
