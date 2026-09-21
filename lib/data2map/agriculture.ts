import type { Feature, FeatureCollection, Point, Polygon } from "geojson";

import { meanNdvi } from "./ndvi.ts";

/**
 * The agriculture sample: what is real, what is simulated, and the small derivations the page needs.
 *
 * The split is the whole point of the file. **Two rasters are real** - NASA GIBS serves MODIS NDVI
 * 8-day composites and IMERG precipitation as keyless public-domain tiles, so the page draws real
 * imagery with no pipeline of our own. **The parcels are simulated**, because field boundaries are
 * not open data in Vietnam and a parcel map that looks official while being invented is worse than
 * no parcel map. The two are never mixed: the raster carries the colour, the parcels carry the
 * geometry and a number that says where it came from.
 */

export interface AgriculturePeriod {
  date: string;
  label: string;
}

export interface CropSummary {
  id: string;
  label: string;
  harvestMonths: number[];
  baseYieldTPerHa: number;
  coefficientSource: string;
}

export interface RasterSource {
  layer: string;
  source: string;
  license: string;
  resolution: string;
  url: string;
  palette?: string;
}

export interface ProvinceProperties {
  layer: "province";
  province_id: string;
  name: string;
  envelope_radius_km: number;
  supply_share: number;
  synthetic: true;
  note: string;
}

export interface FieldProperties {
  layer: "field";
  field_id: string;
  province_id: string;
  crop: string;
  crop_label: string;
  area_ha: number;
  sowing_month: number;
  ndvi_series: (number | null)[];
  ndvi_mean: number | null;
  yield_t_per_ha: number | null;
  yield_tonnes: number | null;
  yield_source: string;
  synthetic: true;
  note: string;
}

export interface AgricultureSample {
  area: { west: number; south: number; east: number; north: number };
  centre: { lng: number; lat: number };
  note: string;
  attribution: string;
  periods: AgriculturePeriod[];
  crops: CropSummary[];
  rasterSources: { ndvi: RasterSource; rain: RasterSource };
  collection: FeatureCollection;
  provinces: Feature<Polygon, ProvinceProperties>[];
  fields: Feature<Polygon, FieldProperties>[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function readAgricultureSample(raw: unknown): AgricultureSample {
  if (!isRecord(raw) || raw.type !== "FeatureCollection" || !Array.isArray(raw.features)) {
    throw new Error("agriculture sample: not a FeatureCollection");
  }

  const properties = isRecord(raw.properties) ? raw.properties : {};
  if (!isRecord(properties.area)) throw new Error("agriculture sample: no area");
  if (!Array.isArray(properties.periods) || properties.periods.length === 0) {
    throw new Error("agriculture sample: the season has no periods to step through");
  }
  if (!isRecord(properties.rasterSources)) throw new Error("agriculture sample: the rasters have no provenance");

  const features = raw.features as Feature[];
  for (const feature of features) {
    const props = feature.properties as { synthetic?: boolean; note?: string; layer?: string } | null;
    if (props?.synthetic !== true) throw new Error("agriculture sample: a " + (props?.layer ?? "") + " feature does not declare itself simulated");
    if (!props.note || props.note.length < 20) throw new Error("agriculture sample: a " + props.layer + " feature does not explain what it is");
  }

  const provinces = features.filter((feature) => (feature.properties as { layer?: string })?.layer === "province") as Feature<Polygon, ProvinceProperties>[];
  const fields = features.filter((feature) => (feature.properties as { layer?: string })?.layer === "field") as Feature<Polygon, FieldProperties>[];

  if (provinces.length === 0 || fields.length === 0) throw new Error("agriculture sample: a crop map needs provinces and fields");

  return {
    area: {
      west: Number(properties.area.west),
      south: Number(properties.area.south),
      east: Number(properties.area.east),
      north: Number(properties.area.north),
    },
    centre: isRecord(properties.centre)
      ? { lng: Number(properties.centre.lng), lat: Number(properties.centre.lat) }
      : { lng: 0, lat: 0 },
    note: typeof properties.note === "string" ? properties.note : "",
    attribution: typeof properties.attribution === "string" ? properties.attribution : "",
    periods: properties.periods as unknown as AgriculturePeriod[],
    crops: (properties.crops ?? []) as unknown as CropSummary[],
    rasterSources: properties.rasterSources as unknown as AgricultureSample["rasterSources"],
    collection: { type: "FeatureCollection", features },
    provinces,
    fields,
  };
}

/** The mean NDVI of one field's season, gaps ignored - the same rule the check suite pins. */
export function fieldSeasonMean(field: Feature<Polygon, FieldProperties>): number | null {
  return meanNdvi(field.properties.ndvi_series);
}

/** The value a field shows at one period, or null when that composite was cloud. */
export function fieldAtPeriod(field: Feature<Polygon, FieldProperties>, index: number): number | null {
  const series = field.properties.ndvi_series;
  if (!Number.isInteger(index) || index < 0 || index >= series.length) return null;
  return series[index];
}

export interface ProvinceProduction {
  provinceId: string;
  name: string;
  /** Sum of the sampled fields' estimates, which is a sample - not the province's harvest. */
  sampledTonnes: number;
  sampledAreaHa: number;
  /** The simulated share of the delta's production the province carries, printed as simulated. */
  simulatedShare: number;
}

/**
 * What the sample knows about each province.
 *
 * The tonnes here are **the sum of the fields in this sample**, not a provincial harvest: 140 parcels
 * standing in for a delta of two million hectares would be a lie with a decimal point. The share
 * beside it is the simulated distribution the file carries, and the panel labels both.
 */
export function productionByProvince(sample: AgricultureSample): ProvinceProduction[] {
  return sample.provinces
    .map((province) => {
      const own = sample.fields.filter((field) => field.properties.province_id === province.properties.province_id);
      return {
        provinceId: province.properties.province_id,
        name: province.properties.name,
        sampledTonnes: Math.round(own.reduce((sum, field) => sum + (field.properties.yield_tonnes ?? 0), 0) * 10) / 10,
        sampledAreaHa: Math.round(own.reduce((sum, field) => sum + field.properties.area_ha, 0) * 10) / 10,
        simulatedShare: province.properties.supply_share,
      };
    })
    .sort((a, b) => b.sampledTonnes - a.sampledTonnes);
}

/** Harvested area per calendar month across the sample, for the dashboard's bar chart. */
export function harvestByMonth(sample: AgricultureSample): { label: string; value: number }[] {
  const months = Array.from({ length: 12 }, (_, index) => ({ label: String(index + 1), value: 0 }));

  for (const field of sample.fields) {
    const crop = sample.crops.find((entry) => entry.id === field.properties.crop);
    if (!crop) continue;
    for (const month of crop.harvestMonths) {
      const bucket = months[month - 1];
      if (bucket) bucket.value = Math.round((bucket.value + field.properties.area_ha) * 10) / 10;
    }
  }

  return months;
}

export type { Point };
