/**
 * How good a 3D model candidate is, as a number a pipeline can sort by.
 *
 * Phase 12’s core change: the fetcher used to take the *first* licensed result a
 * provider returned. Search relevance is not quality — the first hit for "lion" is
 * regularly a 900k-triangle statue with no thumbnail and four downloads — so the
 * ranking now scores every licensed candidate on the four things a visitor can
 * actually perceive, plus the one that is a legal requirement:
 *
 *   title       30  does the title name this species at all
 *   licence     15  CC0 costs the site nothing to credit, CC BY does
 *   popularity  25  downloads and likes, log-scaled — a proxy for "this is the one
 *                   people use", and the only quality signal the APIs actually give
 *   complexity  20  face count against a mobile budget, with a penalty for models
 *                   that would need decimating before they can be shipped
 *   thumbnail   10  a clear thumbnail means a usable preview and social card
 *
 * The total is 0–100 and is stored verbatim in `model_assets.quality_score`, whose
 * CHECK constraint says so. Pure and dependency-free, so `scripts/check-models.mjs`
 * can pin every rule — a ranking that is tuned by feel is a ranking that silently
 * changes when someone edits a constant.
 */

/** The two licence values `model_assets.license` accepts. */
export const MODEL_LICENSES = ["CC0", "CC-BY"] as const;
export type ModelLicense = (typeof MODEL_LICENSES)[number];

/**
 * The database value for an SPDX id the licence allow-list resolved.
 *
 * Public domain is stored as CC0 because they are the same obligation — none — and a
 * third enum value would only invite a CHECK constraint to disagree with the UI.
 * `null` means "do not store this model": the column refuses anything else, which is
 * the point of putting the allow-list in the database as well as in the script.
 */
export function modelLicenseFromSpdx(spdx: string | null | undefined): ModelLicense | null {
  if (!spdx) return null;
  if (spdx === "CC0-1.0" || spdx === "PDM-1.0") return "CC0";
  if (spdx === "CC-BY-4.0") return "CC-BY";
  return null;
}

export const QUALITY_WEIGHTS = {
  title: 30,
  license: 15,
  popularity: 25,
  complexity: 20,
  thumbnail: 10,
} as const;

/**
 * The polygon budget a web viewer can afford.
 *
 * `ideal` is where a model needs no work at all; `max` is the point past which it has
 * to be decimated before it can ship, and is scored accordingly rather than refused,
 * because a decimation pass is exactly what `--compress` is for.
 */
export const FACE_BUDGET = { crude: 500, ideal: 150_000, heavy: 500_000, max: 800_000 } as const;

export interface QualityInput {
  title: string;
  /** Terms a title has to contain to count as a match: the species name, its latin name, its class. */
  terms: readonly string[];
  /** SPDX id from `LICENSE_ALLOWLIST`, or null when the licence is not allowed. */
  spdx?: string | null;
  faceCount?: number | null;
  downloadCount?: number | null;
  likeCount?: number | null;
  hasThumbnail?: boolean | null;
}

export interface QualityBreakdown {
  /** 0–100. What `model_assets.quality_score` stores. */
  total: number;
  title: number;
  license: number;
  popularity: number;
  complexity: number;
  thumbnail: number;
  /** True when the title names the species, which is what `--strict-match` filters on. */
  matched: boolean;
}

const round = (value: number) => Math.round(value * 10) / 10;

function titleScore(title: string, terms: readonly string[]): { score: number; matched: boolean } {
  const normalised = title.trim().toLowerCase();
  const wanted = terms.map((term) => term.trim().toLowerCase()).filter(Boolean);

  if (wanted.some((term) => normalised === term)) return { score: QUALITY_WEIGHTS.title, matched: true };
  if (wanted.some((term) => normalised.includes(term))) return { score: round(QUALITY_WEIGHTS.title * 0.75), matched: true };
  // The other direction: a provider that returns "Panthera leo" for a title of
  // "Lion" is still a match, but a weaker one than a title that says it outright.
  if (wanted.some((term) => term.includes(normalised) && normalised.length > 3)) {
    return { score: round(QUALITY_WEIGHTS.title * 0.4), matched: true };
  }
  return { score: 0, matched: false };
}

/** Downloads and likes, log-scaled: 1 000 downloads is "known", 1 000 000 is not 1 000× better. */
function popularityScore(downloadCount?: number | null, likeCount?: number | null): number {
  const downloads = Math.max(0, Number(downloadCount) || 0);
  const likes = Math.max(0, Number(likeCount) || 0);
  const fromDownloads = (Math.log10(1 + downloads) / 3) * (QUALITY_WEIGHTS.popularity * 0.6);
  const fromLikes = (Math.log10(1 + likes) / 3) * (QUALITY_WEIGHTS.popularity * 0.4);
  return round(Math.min(QUALITY_WEIGHTS.popularity, fromDownloads + fromLikes));
}

function complexityScore(faceCount?: number | null): number {
  const budget = QUALITY_WEIGHTS.complexity;
  // Unknown is *neutral*, not zero and not full marks: most providers simply do not
  // report a face count, and scoring them as if they had would be inventing data.
  if (typeof faceCount !== "number" || !Number.isFinite(faceCount)) return round(budget * 0.6);
  if (faceCount < FACE_BUDGET.crude) return round(budget * 0.2);
  if (faceCount <= FACE_BUDGET.ideal) return budget;
  if (faceCount <= FACE_BUDGET.heavy) return round(budget * 0.7);
  if (faceCount <= FACE_BUDGET.max) return round(budget * 0.4);
  return round(budget * 0.1);
}

/** Scores one candidate. Never throws: a missing field is a missing signal, not an error. */
export function scoreModelQuality(input: QualityInput): QualityBreakdown {
  const title = titleScore(input.title ?? "", input.terms ?? []);
  const license = input.spdx === "CC0-1.0" || input.spdx === "PDM-1.0"
    ? QUALITY_WEIGHTS.license
    : input.spdx === "CC-BY-4.0"
      ? round(QUALITY_WEIGHTS.license * 0.55)
      : 0;

  const popularity = popularityScore(input.downloadCount, input.likeCount);
  const complexity = complexityScore(input.faceCount);
  const thumbnail = input.hasThumbnail ? QUALITY_WEIGHTS.thumbnail : 0;

  return {
    total: round(title.score + license + popularity + complexity + thumbnail),
    title: title.score,
    license,
    popularity,
    complexity,
    thumbnail,
    matched: title.matched,
  };
}

/** A short label for the report, so a human can read a score without the weights. */
export function describeQuality(total: number): string {
  if (total >= 75) return "excellent";
  if (total >= 55) return "good";
  if (total >= 35) return "usable";
  return "poor";
}
