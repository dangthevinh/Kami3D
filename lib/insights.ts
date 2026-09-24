/**
 * Personal analytics: what a visitor can learn about their own use of Kami3D.
 *
 * Pure and dependency-free, so `scripts/check-insights.mjs` can pin every rule without a
 * database, a browser or a session. The page that draws it (`app/analytics`) only reads rows
 * the visitor already owns — their quiz rounds and their favourites — which is the whole
 * privacy story: there is no new collection here, and nothing in this file can describe
 * anybody else.
 *
 * Three rules the rest of the codebase already follows, applied to a dashboard:
 *
 *   1. **No invented numbers.** A visitor who has played nothing gets `null`, not 0% accuracy,
 *      and the page says what is missing instead of drawing an empty chart as if it were data.
 *   2. **State the definition.** "Streak" means rounds in a row at or above a stated percentage,
 *      because the quiz stores a score per round and not which question was answered correctly —
 *      `ROUND_GOOD_PERCENT` is written down here rather than left to the reader.
 *   3. **Deterministic output.** Every list is sorted by count and then by label, so the same
 *      rows always produce the same page, and a screenshot is comparable with the next one.
 */

/** The fields this module needs from a species. `Animal` satisfies it structurally. */
export interface SpeciesFacts {
  name: string;
  category: string;
  region: string;
  diet: string;
  conservation_status: string;
}

/** One completed round, as `public.quiz_scores` stores it. */
export interface QuizRound {
  score: number;
  total_questions: number;
  mode: string;
  created_at: string;
}

/**
 * A round counts towards a run at or above this accuracy.
 *
 * Derived from the badge thresholds in `lib/quiz-scoring.ts`: 60% is where the quiz stops
 * calling a round "passed", so it is the honest place to draw the line here too.
 */
export const ROUND_GOOD_PERCENT = 60;

/** IUCN categories this project calls threatened. Used for one count, never for a judgement. */
export const THREATENED_STATUSES = ["Vulnerable", "Endangered", "Critically Endangered"] as const;

/** The accuracy bands the distribution uses, low to high. */
export const ACCURACY_BANDS = [0, 20, 40, 60, 80] as const;

/** How many seven-day windows the weekly series keeps. Twelve is a quarter, and fits a page. */
export const WEEK_WINDOW_COUNT = 12;

const MS_PER_DAY = 86_400_000;
const MS_PER_WEEK = 7 * MS_PER_DAY;

export interface QuizInsights {
  rounds: number;
  questions: number;
  correct: number;
  /** 0–100, or null when nothing has been played. */
  accuracy: number | null;
  best: { score: number; total: number; at: string } | null;
  latest: { accuracy: number; at: string } | null;
  /** Accuracy per round, oldest first. */
  series: { at: string; accuracy: number }[];
  bands: { label: string; from: number; count: number }[];
  byMode: { label: string; rounds: number; accuracy: number }[];
  byWeek: { label: string; rounds: number; accuracy: number }[];
  /** Longest run of rounds at or above ROUND_GOOD_PERCENT. */
  bestRun: number;
  /** The run the visitor is on now: the rounds at the end of the series. */
  currentRun: number;
  averageQuestions: number | null;
  firstAt: string | null;
  lastAt: string | null;
}

export interface FavouriteBreakdown {
  label: string;
  count: number;
  /** 0–1 of this visitor's favourites. Null when they have none. */
  share: number | null;
}

export interface FavouriteInsights {
  favourites: number;
  catalogue: number;
  /** 0–1 of the catalogue, or null when the catalogue is empty. */
  shareOfCatalogue: number | null;
  byCategory: FavouriteBreakdown[];
  byRegion: FavouriteBreakdown[];
  byDiet: FavouriteBreakdown[];
  byStatus: FavouriteBreakdown[];
  threatened: number;
  /** Regions with nothing favourited in them yet — a gap, stated as one. */
  untouchedRegions: string[];
}

const round = (value: number) => Math.round(value * 10) / 10;

/** 0–100 accuracy for one round, or null when it says it asked no questions. */
export function roundAccuracy(entry: Pick<QuizRound, "score" | "total_questions">): number | null {
  if (!Number.isFinite(entry.total_questions) || entry.total_questions <= 0) return null;
  const score = Math.max(0, Math.min(entry.score, entry.total_questions));
  return round((score / entry.total_questions) * 100);
}

/** Oldest first. A row whose timestamp cannot be parsed sorts to the end rather than throwing. */
export function chronological(rows: readonly QuizRound[]): QuizRound[] {
  return [...rows].sort((a, b) => {
    const left = Date.parse(a.created_at);
    const right = Date.parse(b.created_at);
    if (Number.isNaN(left) && Number.isNaN(right)) return 0;
    if (Number.isNaN(left)) return 1;
    if (Number.isNaN(right)) return -1;
    return left - right;
  });
}

/** `count` items' shares of a total, or nulls when there is no total. */
export function shareOf(count: number, total: number): number | null {
  if (!Number.isFinite(total) || total <= 0) return null;
  return Math.round((count / total) * 1000) / 1000;
}

/** The band index a percentage falls in. 100 belongs to the last band, never past it. */
export function bandIndex(percentage: number): number {
  const clamped = Math.max(0, Math.min(percentage, 100));
  const index = Math.floor(clamped / 20);
  return Math.min(index, ACCURACY_BANDS.length - 1);
}

/**
 * Every quiz number the page shows, from the rounds the visitor owns.
 *
 * With no rounds at all, the counts are zero and the rates are `null`: a dashboard that reports
 * "0% accuracy" to somebody who has never played is telling them something false.
 */
export function summariseQuiz(rows: readonly QuizRound[]): QuizInsights {
  const ordered = chronological(rows.filter((row) => roundAccuracy(row) !== null));

  if (ordered.length === 0) {
    return {
      rounds: 0,
      questions: 0,
      correct: 0,
      accuracy: null,
      best: null,
      latest: null,
      series: [],
      bands: ACCURACY_BANDS.map((from) => ({ label: bandLabel(from), from, count: 0 })),
      byMode: [],
      byWeek: [],
      bestRun: 0,
      currentRun: 0,
      averageQuestions: null,
      firstAt: null,
      lastAt: null,
    };
  }

  const questions = ordered.reduce((sum, row) => sum + row.total_questions, 0);
  const correct = ordered.reduce((sum, row) => sum + Math.max(0, Math.min(row.score, row.total_questions)), 0);

  const series = ordered.map((row) => ({ at: row.created_at, accuracy: roundAccuracy(row) ?? 0 }));

  const bands = ACCURACY_BANDS.map((from) => ({ label: bandLabel(from), from, count: 0 }));
  for (const point of series) bands[bandIndex(point.accuracy)].count += 1;

  const byMode = groupBy(ordered, (row) => row.mode);
  const byWeek = weeklyWindows(ordered);

  let runs: number[] = [];
  let run = 0;
  for (const point of series) {
    if (point.accuracy >= ROUND_GOOD_PERCENT) run += 1;
    else {
      runs.push(run);
      run = 0;
    }
  }
  runs.push(run);

  const best = ordered.reduce(
    (winner, row) => {
      const accuracy = roundAccuracy(row) ?? 0;
      const winnerAccuracy = winner ? (roundAccuracy(winner) ?? 0) : -1;
      // Ties go to the earlier round: it is the one that set the mark.
      return accuracy > winnerAccuracy ? row : winner;
    },
    null as QuizRound | null,
  );

  const last = ordered[ordered.length - 1];

  return {
    rounds: ordered.length,
    questions,
    correct,
    accuracy: round((correct / questions) * 100),
    best: best ? { score: best.score, total: best.total_questions, at: best.created_at } : null,
    latest: { accuracy: roundAccuracy(last) ?? 0, at: last.created_at },
    series,
    bands,
    byMode,
    byWeek,
    bestRun: Math.max(...runs),
    currentRun: runs[runs.length - 1],
    averageQuestions: round(questions / ordered.length),
    firstAt: ordered[0].created_at,
    lastAt: last.created_at,
  };
}

function bandLabel(from: number): string {
  return from >= 80 ? from + "–100%" : from + "–" + (from + 20) + "%";
}

/** Rounds and accuracy per distinct value of one field, sorted by rounds and then by label. */
function groupBy(
  rows: readonly QuizRound[],
  key: (row: QuizRound) => string,
): { label: string; rounds: number; accuracy: number }[] {
  const buckets = new Map<string, { questions: number; correct: number; rounds: number }>();
  for (const row of rows) {
    const label = key(row);
    const bucket = buckets.get(label) ?? { questions: 0, correct: 0, rounds: 0 };
    bucket.questions += row.total_questions;
    bucket.correct += Math.max(0, Math.min(row.score, row.total_questions));
    bucket.rounds += 1;
    buckets.set(label, bucket);
  }

  return [...buckets.entries()]
    .map(([label, bucket]) => ({
      label,
      rounds: bucket.rounds,
      accuracy: bucket.questions > 0 ? round((bucket.correct / bucket.questions) * 100) : 0,
    }))
    .sort((a, b) => b.rounds - a.rounds || a.label.localeCompare(b.label));
}

/**
 * Seven-day windows counted back from the most recent round.
 *
 * Counting back from the latest round rather than from today keeps the newest window full: a
 * visitor who last played in March should not see eleven empty weeks and one lonely bar, which is
 * a chart of the calendar rather than of their play.
 */
function weeklyWindows(rows: readonly QuizRound[]): { label: string; rounds: number; accuracy: number }[] {
  const last = Date.parse(rows[rows.length - 1].created_at);
  if (Number.isNaN(last)) return [];

  const windows: { label: string; rounds: number; questions: number; correct: number }[] = [];
  for (let index = WEEK_WINDOW_COUNT - 1; index >= 0; index -= 1) {
    const end = last - index * MS_PER_WEEK;
    windows.push({ label: new Date(end - MS_PER_WEEK + MS_PER_DAY).toISOString().slice(0, 10), rounds: 0, questions: 0, correct: 0 });
  }

  const oldest = last - WEEK_WINDOW_COUNT * MS_PER_WEEK;
  for (const row of rows) {
    const at = Date.parse(row.created_at);
    if (Number.isNaN(at) || at < oldest) continue;
    const index = Math.min(WEEK_WINDOW_COUNT - 1, Math.floor((at - oldest) / MS_PER_WEEK));
    const bucket = windows[index];
    bucket.rounds += 1;
    bucket.questions += row.total_questions;
    bucket.correct += Math.max(0, Math.min(row.score, row.total_questions));
  }

  return windows.map((bucket) => ({
    label: bucket.label,
    rounds: bucket.rounds,
    accuracy: bucket.questions > 0 ? round((bucket.correct / bucket.questions) * 100) : 0,
  }));
}

/**
 * What a visitor's favourites say about their taste, and where the gaps are.
 *
 * Every count is of rows they own; the catalogue is the reference for shares and for the list of
 * regions they have not touched yet. Nothing here is inferred about anyone else.
 */
export function summariseFavourites(
  favourites: readonly SpeciesFacts[],
  catalogue: readonly SpeciesFacts[],
): FavouriteInsights {
  const total = favourites.length;
  const breakdown = (pick: (species: SpeciesFacts) => string): FavouriteBreakdown[] => {
    const counts = new Map<string, number>();
    for (const species of favourites) counts.set(pick(species), (counts.get(pick(species)) ?? 0) + 1);
    return [...counts.entries()]
      .map(([label, count]) => ({ label, count, share: shareOf(count, total) }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  };

  const threatened = favourites.filter((species) =>
    (THREATENED_STATUSES as readonly string[]).includes(species.conservation_status),
  ).length;

  const touched = new Set(favourites.map((species) => species.region));
  const untouchedRegions = [...new Set(catalogue.map((species) => species.region))]
    .filter((region) => !touched.has(region))
    .sort((a, b) => a.localeCompare(b));

  return {
    favourites: total,
    catalogue: catalogue.length,
    shareOfCatalogue: shareOf(total, catalogue.length),
    byCategory: breakdown((species) => species.category),
    byRegion: breakdown((species) => species.region),
    byDiet: breakdown((species) => species.diet),
    byStatus: breakdown((species) => species.conservation_status),
    threatened,
    untouchedRegions,
  };
}
