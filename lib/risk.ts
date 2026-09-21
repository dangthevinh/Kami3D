/**
 * The Kami3D risk index: one number per species, from inputs we actually have.
 *
 * It is deliberately **not** an IUCN assessment and the UI says so. It is a weighted mean of
 * four things, each of which is either measured or honestly missing:
 *
 *   status  40  the IUCN category the catalogue already carries (real data)
 *   range   20  how large the range is - small ranges are fragile (today: demo envelopes)
 *   threat  25  the share of that range a threat polygon overlaps (measured by PostGIS)
 *   trend   15  whether recent observation records are thinning out (real, effort-dependent)
 *
 * Two rules make it usable rather than decorative:
 *
 *   1. a missing input is missing, not zero: it is dropped from the weighted mean and
 *      reported, so a species scored on two of four inputs says so instead of looking
 *      confidently wrong;
 *   2. the score is a function: no hidden state, no rounding inside the total, and
 *      `scripts/check-risk.mjs` pins the monotonicity of every term - a number shown to a
 *      visitor that cannot be tested should not be shown.
 *
 * Dependency-free so the checks can import it in plain Node.
 */

export const RISK_WEIGHTS = { status: 40, range: 20, threat: 25, trend: 15 } as const;

export type RiskBandId = "critical" | "high" | "moderate" | "low" | "unknown";

export interface RiskBand {
  id: RiskBandId;
  label: string;
  /** Inclusive lower bound. */
  from: number;
  /** Fill colour, for swatches, bars and map paint: nothing is read on top of it. */
  color: string;
  /**
   * The Tailwind utility for *text*.
   *
   * The hex above is the night value: on the light palette, amber #ffb738 on #f4f6fc is
   * 1.6:1. Tailwind tokens are re-pointed by the `.light` block, so `text-solar` stays
   * readable in both themes - a difference `npm run audit:theme` caught, not an eye.
   */
  textClass: string;
}

/** Highest band first, so a lookup is the first match. */
export const RISK_BANDS: readonly RiskBand[] = [
  { id: "critical", label: "Critical risk", from: 70, color: "#ff5d8f", textClass: "text-coral" },
  { id: "high", label: "High risk", from: 50, color: "#ffb738", textClass: "text-solar" },
  { id: "moderate", label: "Moderate risk", from: 30, color: "#38e0ff", textClass: "text-glow" },
  { id: "low", label: "Lower risk", from: 0, color: "#35f0c0", textClass: "text-neon" },
];

export function bandFor(score: number, coverage = 1): RiskBand {
  if (coverage < 0.5) {
    return { id: "unknown", label: "Too little data", from: 0, color: "#8a93a6", textClass: "text-white/70" };
  }
  return RISK_BANDS.find((band) => score >= band.from) ?? RISK_BANDS[RISK_BANDS.length - 1];
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/**
 * How threatening an IUCN category is, 0-1.
 *
 * Extinct and extinct-in-the-wild are 1: there is nothing left to lose, and a ranking that
 * placed them below "critically endangered" would be describing the wrong thing.
 */
export function statusWeight(status: string | null | undefined): number | null {
  switch (status) {
    case "Extinct":
    case "Extinct in the Wild":
    case "Critically Endangered":
      return 1;
    case "Endangered":
      return 0.85;
    case "Vulnerable":
      return 0.65;
    case "Near Threatened":
      return 0.4;
    case "Least Concern":
      return 0.15;
    case "Data Deficient":
      return 0.4;
    default:
      return null;
  }
}
/**
 * How fragile a range of this size is, 0-1.
 *
 * Log-scaled between 10 000 km2 (a single valley: 1.0) and about 3 million km2 (a continent:
 * 0.0). Linear scaling would make every large mammal identical, because range sizes span
 * five orders of magnitude.
 */
export function rangeWeight(areaKm2: number | null | undefined): number | null {
  if (typeof areaKm2 !== "number" || !Number.isFinite(areaKm2) || areaKm2 <= 0) return null;
  return clamp01(1 - (Math.log10(areaKm2) - 4) / 2.5);
}

/**
 * How much of the range a threat overlaps, weighted by how severe the worst overlap is.
 *
 * A severity-1 threat covering everything is not the same as a severity-5 one covering the
 * same area, which is why severity scales the result rather than being averaged in.
 */
export function threatWeight(
  fraction: number | null | undefined,
  worstSeverity: number | null | undefined,
): number | null {
  if (typeof fraction !== "number" || !Number.isFinite(fraction)) return null;
  const severity = typeof worstSeverity === "number" && worstSeverity > 0 ? Math.min(5, worstSeverity) : null;
  const severityFactor = severity === null ? 0.6 : 0.6 + 0.4 * ((severity - 1) / 4);
  return clamp01(clamp01(fraction) * severityFactor);
}

export interface ObservationBucket {
  from: number;
  to: number;
  records: number;
}

/**
 * Whether records are thinning out over time, 0-1.
 *
 * The most recent bucket is compared with the mean of the earlier ones. This measures
 * observation effort as much as the species: fewer records can mean fewer animals or fewer
 * observers, and the UI labels it that way. It is still worth a small weight, because a
 * range that used to be recorded and no longer is, is a real signal.
 */
export function trendWeight(buckets: readonly ObservationBucket[] | null | undefined): number | null {
  if (!Array.isArray(buckets) || buckets.length < 2) return null;

  const recent = buckets[buckets.length - 1]?.records ?? 0;
  const earlier = buckets.slice(0, -1).map((bucket) => bucket.records ?? 0);
  const baseline = earlier.reduce((sum, value) => sum + value, 0) / earlier.length;

  if (baseline <= 0) return null;
  // At or above the old level there is no signal; a fall to zero is the maximum.
  return clamp01((baseline - recent) / baseline);
}
export interface RiskInputs {
  conservationStatus: string | null | undefined;
  rangeAreaKm2?: number | null;
  threatenedFraction?: number | null;
  worstSeverity?: number | null;
  observationBuckets?: readonly ObservationBucket[] | null;
}

export interface RiskBreakdown {
  /** 0-100, or null when nothing could be scored at all. */
  score: number | null;
  band: RiskBand;
  /** Each term 0-1, or null when the input is missing. */
  parts: Record<keyof typeof RISK_WEIGHTS, number | null>;
  /** Which inputs were missing, so the UI can list them rather than hide them. */
  missing: (keyof typeof RISK_WEIGHTS)[];
  /** Share of the total weight that was available, 0-1. */
  coverage: number;
}

/**
 * The weighted mean, with missing inputs dropped rather than counted as zero.
 *
 * Coverage is returned with the score, because a number built from one input and a number
 * built from four look identical otherwise.
 */
export function assessRisk(inputs: RiskInputs): RiskBreakdown {
  const parts: RiskBreakdown["parts"] = {
    status: statusWeight(inputs.conservationStatus),
    range: rangeWeight(inputs.rangeAreaKm2),
    threat: threatWeight(inputs.threatenedFraction, inputs.worstSeverity),
    trend: trendWeight(inputs.observationBuckets),
  };

  const keys = Object.keys(RISK_WEIGHTS) as (keyof typeof RISK_WEIGHTS)[];
  const missing = keys.filter((key) => parts[key] === null);
  const available = keys.filter((key) => parts[key] !== null);

  const totalWeight = keys.reduce((sum, key) => sum + RISK_WEIGHTS[key], 0);
  const availableWeight = available.reduce((sum, key) => sum + RISK_WEIGHTS[key], 0);
  const coverage = availableWeight / totalWeight;

  if (availableWeight === 0) {
    return { score: null, band: bandFor(0, 0), parts, missing, coverage: 0 };
  }

  const weighted = available.reduce((sum, key) => sum + RISK_WEIGHTS[key] * (parts[key] as number), 0);
  const score = Math.round((weighted / availableWeight) * 1000) / 10;

  return { score, band: bandFor(score, coverage), parts, missing, coverage };
}

/**
 * The 1-5 severity a Natural Earth urban area gets.
 *
 * From the dataset own `area_sqkm` on a log scale - a megacity is not a hundred times more
 * threatening than a town, but it is more than one band - nudged up by `min_zoom`, which is
 * how Natural Earth marks a feature it considers significant at world scale.
 */
export function severityForUrbanArea(areaKm2: number, minZoom?: number | null): number {
  if (!Number.isFinite(areaKm2) || areaKm2 <= 0) return 1;

  // 30 km2 -> 1, 300 -> 3, 3 000+ -> 5.
  const byArea = 1 + Math.round(clamp01((Math.log10(areaKm2) - 1.5) / 2) * 4);
  const bonus = typeof minZoom === "number" && minZoom <= 3 ? 1 : 0;
  return Math.min(5, Math.max(1, byArea + bonus));
}
