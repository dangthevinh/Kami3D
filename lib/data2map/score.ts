/**
 * The potential score: one number for a plot, from inputs that are named.
 *
 * This is the D2 counterpart of `lib/risk.ts` - the same discipline for a different question.
 * A visitor looking at land is deciding whether to spend money, so the number cannot be a vibe:
 *
 *   price     30  how this hex compares with the area median (cheaper is better)
 *   amenity   30  schools, hospitals, markets and parks within walking distance
 *   flood     25  the hazard band the plot sits in
 *   zoning    15  the designation and its floor-area ratio
 *
 * Two rules, both inherited from the risk index and both load-bearing:
 *
 *   1. **missing is missing.** An input we do not have is dropped from the weighted mean and
 *      reported, so a score built from one layer says so instead of looking confident;
 *   2. **it is a function.** Pure, dependency-free, and pinned by `scripts/check-score.mjs`,
 *      including the direction every term moves in.
 *
 * It is a **Kami3D index, not an appraisal**, and the UI prints that next to the number - which
 * matters more here than anywhere else in this project, because the sample data is simulated.
 */

export const POTENTIAL_WEIGHTS = { price: 30, amenity: 30, flood: 25, zoning: 15 } as const;

export type PotentialBandId = "strong" | "good" | "fair" | "weak" | "unknown";

export interface PotentialBand {
  id: PotentialBandId;
  label: string;
  from: number;
  /** Fill colour for bars and swatches. */
  color: string;
  /** Tailwind utility for text: the light palette re-points these, a raw hex does not. */
  textClass: string;
}

export const POTENTIAL_BANDS: readonly PotentialBand[] = [
  { id: "strong", label: "Strong", from: 70, color: "#35f0c0", textClass: "text-neon" },
  { id: "good", label: "Good", from: 55, color: "#38e0ff", textClass: "text-glow" },
  { id: "fair", label: "Fair", from: 40, color: "#ffb738", textClass: "text-solar" },
  { id: "weak", label: "Weak", from: 0, color: "#ff5d8f", textClass: "text-coral" },
];

export function bandForPotential(score: number, coverage = 1): PotentialBand {
  if (coverage < 0.5) {
    return { id: "unknown", label: "Too little data", from: 0, color: "#8a93a6", textClass: "text-white/70" };
  }
  return POTENTIAL_BANDS.find((band) => score >= band.from) ?? POTENTIAL_BANDS[POTENTIAL_BANDS.length - 1];
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/**
 * How the price compares with the area median, 0-1.
 *
 * Half the median scores 1; twice the median scores 0; the median itself scores 0.5. A ratio
 * rather than a difference, because land prices span orders of magnitude across a city and a
 * difference would make every central plot worthless.
 */
export function priceScore(priceVndM2?: number | null, medianVndM2?: number | null): number | null {
  if (typeof priceVndM2 !== "number" || !Number.isFinite(priceVndM2) || priceVndM2 <= 0) return null;
  if (typeof medianVndM2 !== "number" || !Number.isFinite(medianVndM2) || medianVndM2 <= 0) return null;

  const ratio = priceVndM2 / medianVndM2;
  // 0.5x -> 1.0, 1x -> 0.5, 2x -> 0.0, and clamped outside that.
  return clamp01(1.5 - ratio);
}

export interface AmenityCounts {
  school?: number;
  hospital?: number;
  market?: number;
  park?: number;
}

/** Weights per amenity kind: a school is worth more to a household than a park, slightly. */
const AMENITY_VALUE: Record<keyof AmenityCounts, number> = { school: 1.2, hospital: 1.4, market: 1.1, park: 1 };

/**
 * Amenities within walking distance, 0-1.
 *
 * Counting is capped per kind, so four schools in one hex are not four times as good as one:
 * the third school within a kilometre adds little. A count of zero is a real answer - it means
 * the data says there is nothing there - and it scores 0 rather than being treated as missing.
 */
export function amenityScore(counts?: AmenityCounts | null): number | null {
  if (!counts || typeof counts !== "object") return null;

  const kinds = Object.keys(AMENITY_VALUE) as (keyof AmenityCounts)[];
  const present = kinds.filter((kind) => typeof counts[kind] === "number");
  if (present.length === 0) return null;

  const maxValue = present.reduce((sum, kind) => sum + AMENITY_VALUE[kind], 0);
  const value = present.reduce((sum, kind) => {
    const capped = Math.min(2, Math.max(0, Number(counts[kind]) || 0));
    return sum + (capped / 2) * AMENITY_VALUE[kind];
  }, 0);

  return clamp01(value / maxValue);
}

const FLOOD_SCORE: Record<string, number> = { low: 0.9, medium: 0.5, high: 0.1, none: 1 };

/** Flood exposure, 0-1, where higher is safer. */
export function floodScore(level?: string | null): number | null {
  if (typeof level !== "string") return null;
  return FLOOD_SCORE[level.toLowerCase()] ?? null;
}

/** Designation and floor-area ratio, 0-1. */
export function zoningScore(zone?: string | null, far?: number | null): number | null {
  const base = typeof zone === "string" ? { commercial: 0.9, mixed: 0.8, residential: 0.6, public: 0.5, green: 0.4, industrial: 0.3 }[zone.toLowerCase()] : undefined;

  if (base === undefined && typeof far !== "number") return null;

  // The ratio adjusts the designation rather than replacing it: a residential plot with a high
  // FAR is better than one without, but it is still a residential plot.
  const farBonus = typeof far === "number" && Number.isFinite(far) ? clamp01((far - 1) / 4) * 0.2 : 0;
  return clamp01((base ?? 0.5) + farBonus);
}

export interface PotentialInputs {
  priceVndM2?: number | null;
  medianVndM2?: number | null;
  amenities?: AmenityCounts | null;
  floodLevel?: string | null;
  zone?: string | null;
  far?: number | null;
}

export interface PotentialBreakdown {
  score: number | null;
  band: PotentialBand;
  parts: Record<keyof typeof POTENTIAL_WEIGHTS, number | null>;
  missing: (keyof typeof POTENTIAL_WEIGHTS)[];
  coverage: number;
}

export function assessPotential(inputs: PotentialInputs): PotentialBreakdown {
  const parts: PotentialBreakdown["parts"] = {
    price: priceScore(inputs.priceVndM2, inputs.medianVndM2),
    amenity: amenityScore(inputs.amenities),
    flood: floodScore(inputs.floodLevel),
    zoning: zoningScore(inputs.zone, inputs.far),
  };

  const keys = Object.keys(POTENTIAL_WEIGHTS) as (keyof typeof POTENTIAL_WEIGHTS)[];
  const missing = keys.filter((key) => parts[key] === null);
  const available = keys.filter((key) => parts[key] !== null);

  const totalWeight = keys.reduce((sum, key) => sum + POTENTIAL_WEIGHTS[key], 0);
  const availableWeight = available.reduce((sum, key) => sum + POTENTIAL_WEIGHTS[key], 0);
  const coverage = availableWeight / totalWeight;

  if (availableWeight === 0) return { score: null, band: bandForPotential(0, 0), parts, missing, coverage: 0 };

  const weighted = available.reduce((sum, key) => sum + POTENTIAL_WEIGHTS[key] * (parts[key] as number), 0);
  return {
    score: Math.round((weighted / availableWeight) * 1000) / 10,
    band: bandForPotential((weighted / availableWeight) * 100, coverage),
    parts,
    missing,
    coverage,
  };
}

/** The median of a set of prices, or null when there is nothing to take a median of. */
export function medianPrice(values: readonly number[]): number | null {
  const usable = values.filter((value) => Number.isFinite(value) && value > 0).sort((a, b) => a - b);
  if (usable.length === 0) return null;

  const middle = Math.floor(usable.length / 2);
  return usable.length % 2 === 0 ? (usable[middle - 1] + usable[middle]) / 2 : usable[middle];
}
