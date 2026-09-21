/**
 * Footfall, and the site-selection score built on it.
 *
 * Three things this module is careful about, because the phase mixes real and invented data:
 *
 *   1. **the simulated half says what it is.** `HOURLY_PROFILE` is a plausible shape for a cafe, a
 *      bubble-tea shop, a restaurant and a bakery, and it is invented. The UI labels the layer
 *      "simulated" and never calls it live data, because no open dataset of hourly footfall exists
 *      for Vietnam;
 *   2. **the real half is real.** Population comes from WorldPop 2020 (CC BY 4.0), summed per hex
 *      by `scripts/fetch-trends.mjs`, and competitors come from OpenStreetMap through Overpass
 *      (ODbL). The score prefers the real signal and says which source it used;
 *   3. **the score is a function.** Site selection decides where somebody spends money, so the
 *      inputs are named, the arithmetic is pure, and `scripts/check-footfall.mjs` pins the
 *      direction every term moves in.
 *
 * A missing input is dropped from the weighted mean and reported - see `assessSiteGap` - rather
 * than quietly scored as zero.
 */

export const TREND_CATEGORIES = ["cafe", "bubble_tea", "restaurant", "bakery"] as const;
export type TrendCategory = (typeof TREND_CATEGORIES)[number];

export function isTrendCategory(value: string): value is TrendCategory {
  return (TREND_CATEGORIES as readonly string[]).includes(value);
}

/** The label a category is drawn with, in the panel and in the popup. */
export const TREND_CATEGORY_LABEL: Record<TrendCategory, string> = {
  cafe: "Cafe",
  bubble_tea: "Bubble tea",
  restaurant: "Restaurant",
  bakery: "Bakery",
};

/**
 * A day in the life of each kind of premises, as 24 relative weights.
 *
 * Simulated. A cafe peaks twice (morning commute, mid-afternoon), a bubble-tea shop runs from
 * mid-afternoon into the evening, a restaurant peaks at lunch and again at dinner, and a bakery is
 * a morning business.
 */
export const HOURLY_PROFILE: Record<TrendCategory, readonly number[]> = {
  cafe: [2, 1, 1, 1, 2, 6, 20, 38, 48, 40, 30, 26, 24, 28, 36, 42, 44, 36, 26, 18, 12, 8, 5, 3],
  bubble_tea: [3, 2, 1, 1, 1, 2, 5, 9, 12, 16, 22, 30, 34, 36, 42, 52, 62, 74, 86, 92, 88, 70, 42, 16],
  restaurant: [1, 1, 1, 1, 1, 2, 5, 10, 18, 26, 34, 48, 62, 44, 26, 20, 26, 40, 58, 66, 54, 34, 16, 6],
  bakery: [2, 1, 1, 1, 3, 14, 36, 52, 44, 26, 16, 12, 14, 10, 8, 8, 10, 14, 18, 14, 10, 6, 4, 2],
};

/** Every hour of the day, which is what the trends page's clock steps through. */
export function hourTicks(): number[] {
  return Array.from({ length: 24 }, (_, hour) => hour);
}

/** The weight at one hour of the day for a category, normalised to 0-1 against its own peak. */
export function hourlyFactor(category: TrendCategory, hour: number): number {
  const profile = HOURLY_PROFILE[category] ?? HOURLY_PROFILE.cafe;
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) return 0;

  const peak = Math.max(...profile);
  return peak === 0 ? 0 : profile[hour] / peak;
}

/** The busiest hour for a category, which is the one a site decision usually cares about. */
export function peakHour(category: TrendCategory): number {
  const profile = HOURLY_PROFILE[category] ?? HOURLY_PROFILE.cafe;
  return profile.indexOf(Math.max(...profile));
}

/**
 * One place's day, from its baseline index.
 *
 * Deterministic: the same baseline gives the same 24 values, which is what lets the map animate an
 * hour at a time without inventing a new number on every frame.
 */
export function dayCurve(category: TrendCategory, baseline: number, hour: number): number {
  if (!Number.isFinite(baseline) || baseline <= 0) return 0;
  return Math.round(baseline * hourlyFactor(category, hour));
}

/** The category an OpenStreetMap POI belongs to, or null when the tags say nothing useful. */
export function trendCategoryForPoi(tags: Record<string, string> | null | undefined): TrendCategory | null {
  const tag = (key: string) => (tags?.[key] ?? "").toLowerCase();

  if (tag("shop") === "bakery" || tag("amenity") === "bakery") return "bakery";
  if (tag("amenity") === "restaurant" || tag("amenity") === "food_court") return "restaurant";

  if (tag("amenity") === "cafe") {
    // Trà sữa is mapped as a cafe with a cuisine tag; without one it is a coffee shop.
    return /bubble_tea|bubble tea|milk_tea|tea/.test(tag("cuisine")) ? "bubble_tea" : "cafe";
  }

  if (tag("shop") === "coffee" || tag("shop") === "tea") return "cafe";
  return null;
}

export interface SiteGapInputs {
  /** Real population density per square kilometre, from the WorldPop hexes. */
  populationDensity?: number | null;
  /** The simulated footfall index at the busiest hour, 0-100. Used only when density is missing. */
  footfallIndex?: number | null;
  /** Real competitor count from OpenStreetMap, within `radiusKm`. */
  competitors?: number | null;
  /** How much demand one competitor absorbs at this scale: the supply term needs a scale. */
  competitorsAtSaturation?: number | null;
  /** Fraction of the radius that is walkable, when we know it. Usually missing. */
  walkableFraction?: number | null;
}

export const SITE_WEIGHTS = { demand: 45, supply: 40, access: 15 } as const;

export type SiteBandId = "excellent" | "good" | "thin" | "crowded" | "unknown";

export interface SiteBand {
  id: SiteBandId;
  label: string;
  from: number;
  color: string;
  textClass: string;
}

export const SITE_BANDS: readonly SiteBand[] = [
  { id: "excellent", label: "Open market", from: 70, color: "#35f0c0", textClass: "text-neon" },
  { id: "good", label: "Worth a look", from: 55, color: "#38e0ff", textClass: "text-glow" },
  { id: "thin", label: "Thin demand", from: 35, color: "#ffb738", textClass: "text-solar" },
  { id: "crowded", label: "Crowded", from: 0, color: "#ff5d8f", textClass: "text-coral" },
];

export function siteBandFor(score: number, coverage = 1): SiteBand {
  if (coverage < 0.5) {
    return { id: "unknown", label: "Too little data", from: 0, color: "#8a93a6", textClass: "text-white/70" };
  }
  return SITE_BANDS.find((band) => score >= band.from) ?? SITE_BANDS[SITE_BANDS.length - 1];
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/**
 * Demand, 0-1, from **real** population density.
 *
 * Logarithmic, because the difference between 5 000 and 10 000 people per square kilometre matters
 * more than the difference between 45 000 and 50 000 - and because a linear term would make the
 * score a population ranking with a map attached. `saturation` is the density that scores 1.
 */
export function densityScore(densityPerKm2?: number | null, saturation = 30_000): number | null {
  if (typeof densityPerKm2 !== "number" || !Number.isFinite(densityPerKm2) || densityPerKm2 < 0) return null;
  if (!Number.isFinite(saturation) || saturation <= 1) return null;

  return clamp01(Math.log10(1 + densityPerKm2) / Math.log10(1 + saturation));
}

/**
 * Demand, 0-1, from the **simulated** footfall index.
 *
 * Only used when the real density is missing, and the breakdown records that it was used.
 */
export function footfallScore(footfallIndex?: number | null): number | null {
  if (typeof footfallIndex !== "number" || !Number.isFinite(footfallIndex)) return null;
  return clamp01(footfallIndex / 100);
}

/**
 * Supply, 0-1, where fewer competitors is better.
 *
 * A gap is not "no competitors at all": an empty block may be empty because nobody can trade there.
 * So the curve peaks at a small number and falls away at both ends - zero scores 0.8 rather than 1,
 * and saturation scores 0.
 */
export function supplyScore(competitors?: number | null, saturation = 12): number | null {
  if (typeof competitors !== "number" || !Number.isFinite(competitors) || competitors < 0) return null;
  if (!Number.isFinite(saturation) || saturation <= 0) return null;

  const ratio = competitors / saturation;
  if (ratio >= 1) return 0;
  // 0 competitors -> 0.8, a quarter of saturation -> 1.0, saturation -> 0.
  const peakAt = 0.25;
  const distance = Math.abs(ratio - peakAt) / Math.max(peakAt, 1 - peakAt);
  return clamp01(0.8 + 0.2 * (1 - distance));
}

export function accessScore(walkableFraction?: number | null): number | null {
  if (typeof walkableFraction !== "number" || !Number.isFinite(walkableFraction)) return null;
  return clamp01(walkableFraction);
}

export type DemandSource = "population" | "footfall" | null;

export interface SiteGapBreakdown {
  score: number | null;
  band: SiteBand;
  parts: Record<keyof typeof SITE_WEIGHTS, number | null>;
  /** Which layer the demand term came from, so the panel can label the real one and the simulated one. */
  demandSource: DemandSource;
  missing: (keyof typeof SITE_WEIGHTS)[];
  coverage: number;
}

export function assessSiteGap(inputs: SiteGapInputs): SiteGapBreakdown {
  const real = densityScore(inputs.populationDensity);
  const simulated = footfallScore(inputs.footfallIndex);
  const demand = real ?? simulated;
  const demandSource: DemandSource = real !== null ? "population" : simulated !== null ? "footfall" : null;

  const parts: SiteGapBreakdown["parts"] = {
    demand,
    supply: supplyScore(inputs.competitors, inputs.competitorsAtSaturation ?? 12),
    access: accessScore(inputs.walkableFraction),
  };

  const keys = Object.keys(SITE_WEIGHTS) as (keyof typeof SITE_WEIGHTS)[];
  const missing = keys.filter((key) => parts[key] === null);
  const available = keys.filter((key) => parts[key] !== null);

  const totalWeight = keys.reduce((sum, key) => sum + SITE_WEIGHTS[key], 0);
  const availableWeight = available.reduce((sum, key) => sum + SITE_WEIGHTS[key], 0);
  const coverage = availableWeight / totalWeight;

  if (availableWeight === 0) return { score: null, band: siteBandFor(0, 0), parts, demandSource, missing, coverage: 0 };

  const weighted = available.reduce((sum, key) => sum + SITE_WEIGHTS[key] * (parts[key] as number), 0);
  return {
    score: Math.round((weighted / availableWeight) * 1000) / 10,
    band: siteBandFor((weighted / availableWeight) * 100, coverage),
    parts,
    demandSource,
    missing,
    coverage,
  };
}

/** How many competitors are inside a radius of a point, from a list of `[lng, lat]` pairs. */
export function competitorsWithin(
  centre: readonly number[],
  points: readonly (readonly number[])[],
  radiusKm: number,
): number {
  const rad = Math.PI / 180;
  const distance = (a: readonly number[], b: readonly number[]) => {
    const dLat = (b[1] - a[1]) * rad;
    const dLng = (b[0] - a[0]) * rad;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * rad) * Math.cos(b[1] * rad) * Math.sin(dLng / 2) ** 2;
    return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
  };

  return points.filter((point) => distance(centre, point) <= radiusKm).length;
}
