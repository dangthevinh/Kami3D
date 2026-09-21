/**
 * NDVI: what the numbers mean, what colour they are, and what this project does with them.
 *
 * Three rules, all of them testable, and all of them there because the failure mode of an
 * agricultural dashboard is a beautiful green map over a flooded field:
 *
 *   1. **NDVI is bounded.** It runs from -1 to 1, and a value outside that range is not a
 *      measurement - it is a bug upstream, and it comes back as `null`;
 *   2. **no data is not healthy vegetation.** Water, cloud and the gap between swaths all come back
 *      as `null`, which the palette draws as an absence rather than as dark green. NASA's own
 *      colormap carries a dedicated `No Data` class for exactly this reason, and the palette below
 *      is taken from it;
 *   3. **the yield number says what it is.** It is a demonstration model with printed coefficients,
 *      not an agronomic forecast, and the panel that shows it says so in the same block.
 *
 * Palette source: NASA EOSDIS GIBS, `MODIS_NDVI` colour map v1.3
 * (https://gibs.earthdata.nasa.gov/colormaps/v1.3/MODIS_NDVI.xml, public domain), sampled at the
 * class boundaries below. Note the break at 0.3 that NASA's palette makes: below it the ramp is
 * brown (soil, sparse cover, water) and above it, green - which is the same split agronomists use.
 */

export interface NdviClass {
  id: string;
  label: string;
  /** Inclusive lower bound. */
  from: number;
  /** Exclusive upper bound. */
  to: number;
  color: string;
  /** One line the legend prints, so a colour is never the only thing carrying the meaning. */
  hint: string;
}

/**
 * The classes, low to high.
 *
 * Deliberately coarse: sixteen agronomic classes on a legend nobody reads is worse than six a
 * visitor can hold in their head, and the underlying raster is 250 m anyway.
 */
export const NDVI_CLASSES: readonly NdviClass[] = [
  { id: "water", label: "Water or cloud", from: -1, to: 0, color: "#001a69", hint: "Below zero: open water, cloud edge, or a broken retrieval." },
  { id: "bare", label: "Bare soil", from: 0, to: 0.1, color: "#d9c9bc", hint: "Fallow, freshly ploughed, or built-up." },
  { id: "sparse", label: "Sparse cover", from: 0.1, to: 0.2, color: "#b0997f", hint: "Dry season stubble, young transplants, thin pasture." },
  { id: "shrub", label: "Shrub and grass", from: 0.2, to: 0.3, color: "#96695a", hint: "NASA's palette breaks to green at 0.3: below it, this is not a crop canopy." },
  { id: "crop_low", label: "Crop, low vigour", from: 0.3, to: 0.45, color: "#8fb400", hint: "Canopy closing but thin - the stage where a top-dressing decision is made." },
  { id: "crop_fair", label: "Crop, fair", from: 0.45, to: 0.6, color: "#5f8f00", hint: "A working crop canopy." },
  { id: "crop_good", label: "Crop, good", from: 0.6, to: 0.75, color: "#3a7d00", hint: "Dense, healthy canopy for rice, maize or vegetables." },
  { id: "crop_dense", label: "Crop, very dense", from: 0.75, to: 0.9, color: "#056400", hint: "Peak canopy, or perennial tree crops." },
  { id: "crop_max", label: "Maximum canopy", from: 0.9, to: 1, color: "#002400", hint: "Above 0.9 the index saturates: it stops telling one dense crop from another." },
];

/** The valid range of the index. Anything outside it is a broken reading, not a measurement. */
export const NDVI_RANGE = { min: -1, max: 1 } as const;

/**
 * A value in, a class out - or `null`.
 *
 * `null` is returned for a missing value, a non-finite one, and anything outside NDVI's own range.
 * Callers must not treat `null` as "low": it is the absence of a reading, and painting it as bare
 * soil would be the same mistake as painting it as forest.
 */
export function classifyNdvi(value: number | null | undefined): NdviClass | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (value < NDVI_RANGE.min || value > NDVI_RANGE.max) return null;

  return NDVI_CLASSES.find((entry) => value >= entry.from && value < entry.to) ?? NDVI_CLASSES[NDVI_CLASSES.length - 1];
}

/** The colour for a value, or the grey this project uses for "we do not know". */
export const NDVI_NODATA_COLOR = "#3a4256";

export function ndviColor(value: number | null | undefined): string {
  return classifyNdvi(value)?.color ?? NDVI_NODATA_COLOR;
}

/** Where a value sits in the ramp, 0 to 1, with `null` mapped to the middle of nothing. */
export function ndviPosition(value: number | null | undefined): number | null {
  const entry = classifyNdvi(value);
  if (!entry) return null;
  return NDVI_CLASSES.indexOf(entry) / (NDVI_CLASSES.length - 1);
}

export type CropId = "rice" | "vegetables" | "fruit";

export interface CropModel {
  id: CropId;
  label: string;
  /** Tonnes per hectare at the reference NDVI below - a demonstration coefficient, not a study. */
  baseYieldTPerHa: number;
  /** The mean NDVI at which the base yield is reached. */
  ndviAtBase: number;
  /** Below this mean NDVI the model expects nothing worth harvesting. */
  ndviFloor: number;
  /** Months this project's demonstration calendar puts the harvest in, by province. */
  harvestMonths: number[];
}

/**
 * The demonstration coefficients, and where they come from.
 *
 * They come from **us**, chosen to sit inside the published range for each system in the Mekong
 * Delta (roughly 5-6 t/ha for a rice crop, 12-20 t/ha for vegetables, 8-15 t/ha for fruit). They
 * are not taken from a specific study, they are not calibrated to any province, and the UI prints
 * this paragraph next to the number rather than a citation it has not earned.
 */
export const YIELD_COEFFICIENT_SOURCE =
  "Kami3D demonstration coefficients, set inside the published range for each system (rice 5-6 t/ha, vegetables 12-20 t/ha, fruit 8-15 t/ha). Not from a specific study, not calibrated to any province.";

export const CROP_MODELS: readonly CropModel[] = [
  { id: "rice", label: "Rice", baseYieldTPerHa: 5.6, ndviAtBase: 0.72, ndviFloor: 0.3, harvestMonths: [3, 4, 8, 9, 12] },
  { id: "vegetables", label: "Vegetables", baseYieldTPerHa: 16, ndviAtBase: 0.68, ndviFloor: 0.3, harvestMonths: [1, 2, 5, 6, 10, 11] },
  { id: "fruit", label: "Fruit", baseYieldTPerHa: 11, ndviAtBase: 0.75, ndviFloor: 0.35, harvestMonths: [4, 5, 6, 7] },
];

export function cropModel(crop: CropId): CropModel {
  return CROP_MODELS.find((entry) => entry.id === crop) ?? CROP_MODELS[0];
}

export interface YieldEstimate {
  tonnes: number;
  tonnesPerHa: number;
  crop: CropModel;
  /** How far the mean NDVI was above the crop's floor, 0 to 1 - what the estimate scales with. */
  vigour: number;
  source: string;
}

/**
 * A yield estimate from a mean NDVI and an area.
 *
 * Linear in vigour between the crop's floor and its reference NDVI, then clamped: an index above
 * 0.9 saturates, so pretending it means more yield would be reading signal that is not there.
 */
export function estimateYield(input: { crop: CropId; meanNdvi: number | null | undefined; areaHa: number }): YieldEstimate | null {
  const model = cropModel(input.crop);
  const ndvi = classifyNdvi(input.meanNdvi) ? (input.meanNdvi as number) : null;
  if (ndvi === null) return null;
  if (!Number.isFinite(input.areaHa) || input.areaHa <= 0) return null;

  const span = Math.max(0.01, model.ndviAtBase - model.ndviFloor);
  const vigour = Math.min(1, Math.max(0, (ndvi - model.ndviFloor) / span));
  const tonnesPerHa = Math.round(model.baseYieldTPerHa * vigour * 100) / 100;

  return {
    tonnes: Math.round(tonnesPerHa * input.areaHa * 100) / 100,
    tonnesPerHa,
    crop: model,
    vigour: Math.round(vigour * 100) / 100,
    source: YIELD_COEFFICIENT_SOURCE,
  };
}

/** The mean of a series, ignoring the gaps rather than treating them as zero. */
export function meanNdvi(series: readonly (number | null)[]): number | null {
  const valid = series.filter((value): value is number => classifyNdvi(value) !== null);
  if (valid.length === 0) return null;
  return Math.round((valid.reduce((sum, value) => sum + value, 0) / valid.length) * 1000) / 1000;
}

/**
 * What a person might do about it - short, non-prescriptive, and never a pesticide recommendation.
 *
 * The advice is deliberately about *looking* rather than about acting: this project has no soil
 * test, no weather forecast and no agronomist, and advice is the part of an agricultural dashboard
 * that can do real harm when it is confidently wrong.
 */
export function adviceFor(crop: CropId, meanNdvi: number | null | undefined): string {
  const model = cropModel(crop);
  const ndvi = classifyNdvi(meanNdvi) ? (meanNdvi as number) : null;
  if (ndvi === null) return "No usable reading here: cloud, water, or a swath gap. Check another period.";

  if (ndvi < model.ndviFloor) return "Below the floor for this crop. Walk the field before spending anything on it.";
  if (ndvi < model.ndviAtBase - 0.15) return "Canopy thinner than the reference. Worth a field check on water and nutrition.";
  if (ndvi > 0.9) return "Saturated index: past this point it cannot tell two dense canopies apart.";
  return "Within the range this model expects. Nothing here says a decision is needed.";
}
