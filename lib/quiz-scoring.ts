import { BADGES } from "../types/animal.ts";
import { clamp } from "./utils.ts";

/**
 * What a round is worth, in points.
 *
 * The stored `score` stays what it always was — **how many questions were
 * answered correctly** — because that is what the server recomputes badges from
 * (`score / total`) and what the profile and the leaderboard rank by. Points are
 * a separate, client-side currency for the player: they reward answering fast and
 * answering in a row, which the correct-count cannot express, and nothing is
 * authorised by them.
 *
 * Keeping the two apart matters. A round of ten correct answers at 3 s each and a
 * round of ten correct answers at 14 s each are the same ten out of ten — the
 * badges must not disagree with the score line above them.
 */

/** A correct answer is worth this before any bonus. */
export const BASE_POINTS = 100;

/** Answering instantly is worth BASE_POINTS + this. */
export const MAX_SPEED_BONUS = 50;

/** Each answer already in the streak adds this much to the next one. */
export const STREAK_BONUS = 10;

/** ...up to this much, so a long streak cannot dwarf the questions themselves. */
export const MAX_STREAK_BONUS = 50;

export interface AnswerInput {
  correct: boolean;
  /** Seconds still on the clock when the answer was given. */
  secondsLeft: number;
  /** The clock the question started with. */
  secondsAllowed: number;
  /** Consecutive correct answers *before* this one. */
  streakBefore: number;
}

export interface AnswerScore {
  /** Total points for this answer. */
  points: number;
  base: number;
  speedBonus: number;
  streakBonus: number;
  /** Streak after this answer: +1 when correct, reset to 0 when not. */
  streak: number;
}

/**
 * Scores one answer.
 *
 * The speed bonus is proportional to the clock that was left, not to how many
 * seconds the question allowed: a five-second question and a fifteen-second one
 * reward the same *proportion* of haste, so the bonus never quietly favours the
 * longer clock.
 */
export function scoreAnswer({ correct, secondsLeft, secondsAllowed, streakBefore }: AnswerInput): AnswerScore {
  if (!correct) return { points: 0, base: 0, speedBonus: 0, streakBonus: 0, streak: 0 };

  const allowed = Math.max(0, secondsAllowed);
  const proportion = allowed > 0 ? clamp(secondsLeft / allowed, 0, 1) : 0;

  const speedBonus = Math.round(MAX_SPEED_BONUS * proportion);
  const streakBonus = Math.min(MAX_STREAK_BONUS, Math.max(0, streakBefore) * STREAK_BONUS);

  return {
    points: BASE_POINTS + speedBonus + streakBonus,
    base: BASE_POINTS,
    speedBonus,
    streakBonus,
    streak: Math.max(0, streakBefore) + 1,
  };
}

export interface RoundSummary {
  correct: number;
  total: number;
  points: number;
  bestStreak: number;
}

/**
 * Badges earned by a single round.
 *
 * Lives here, next to the scoring rules, so the client's optimistic prediction and
 * the server's authoritative recomputation cannot drift apart — `lib/profile.ts`
 * re-exports this exact function rather than keeping a second copy.
 */
export function badgesForScore(score: number, total: number): string[] {
  const ratio = total > 0 ? score / total : 0;
  return BADGES.filter((badge) => ratio >= badge.threshold).map((badge) => badge.id);
}

/** The accuracy shown on the finish screen, as a whole percentage. */
export function accuracyPercent(summary: Pick<RoundSummary, "correct" | "total">): number {
  if (summary.total <= 0) return 0;
  return Math.round((summary.correct / summary.total) * 100);
}

/**
 * The best streak in a list of correct/incorrect answers — computed rather than
 * tracked, so a resumed round recovers it from its own history.
 */
export function bestStreakOf(answers: readonly boolean[]): number {
  let best = 0;
  let current = 0;
  for (const correct of answers) {
    current = correct ? current + 1 : 0;
    best = Math.max(best, current);
  }
  return best;
}
