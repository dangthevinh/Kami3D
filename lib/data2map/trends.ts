import type { Feature, FeatureCollection, Polygon } from "geojson";

import { hourlyFactor, type TrendCategory } from "./footfall.ts";

/**
 * The trends sample, and the two metrics drawn from it.
 *
 * `data/data2map-trends.json` holds one hex grid over Ho Chi Minh City where every cell carries
 * **two numbers from two different worlds**:
 *
 *   - `population` and `density_per_km2`, real, from WorldPop 2020 (CC BY 4.0);
 *   - `footfall_index`, simulated (CC0), shaped by an hourly profile.
 *
 * The page never mixes them silently: the metric switch names which one is being drawn, the layer
 * hint repeats it, and the popup shows both with their own provenance line. `readTrendsSample`
 * refuses a file that is missing either half's provenance, because that refusal is the only thing
 * standing between "labelled simulation" and "a demo that looks like telemetry".
 */

export interface TrendHexProperties {
  layer: "trends";
  hex_id: string;
  lng: number;
  lat: number;
  area_km2: number;
  population: number;
  population_source: string;
  population_license: string;
  population_year: number;
  density_per_km2: number;
  distance_km: number;
  footfall_index: number;
  footfall_source: string;
  footfall_license: string;
  synthetic: true;
  note: string;
}

export interface TrendProvenance {
  source: string;
  license: string;
  licenseLabel: string;
  year?: number;
  url?: string;
  method?: string;
  synthetic?: boolean;
  note?: string;
}

export interface TrendArea {
  west: number;
  south: number;
  east: number;
  north: number;
}

export interface TrendsSample {
  area: TrendArea;
  centre: { lng: number; lat: number };
  cellSideKm: number;
  note: string;
  attribution: string;
  provenance: { population: TrendProvenance; footfall: TrendProvenance };
  collection: FeatureCollection<Polygon, TrendHexProperties>;
  /** The largest value each metric reaches in this grid, for scaling the colour ramp. */
  maxima: { density: number; footfall: number };
}

export type TrendHex = Feature<Polygon, TrendHexProperties>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function number(value: unknown, what: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`trends sample: ${what} is not a number`);
  return value;
}

/**
 * Validates the bundled file once and hands back a typed sample.
 *
 * Throws rather than repairing: a trends file whose provenance is missing is not a file to draw
 * with a warning, it is a file to fail the build on.
 */
export function readTrendsSample(raw: unknown): TrendsSample {
  if (!isRecord(raw) || raw.type !== "FeatureCollection" || !Array.isArray(raw.features)) {
    throw new Error("trends sample: not a FeatureCollection");
  }

  const properties = isRecord(raw.properties) ? raw.properties : {};
  const area = properties.area;
  const provenance = properties.provenance;

  if (!isRecord(area)) throw new Error("trends sample: no area");
  if (!isRecord(provenance) || !isRecord(provenance.population) || !isRecord(provenance.footfall)) {
    throw new Error("trends sample: both halves must record where they came from");
  }

  const centres = isRecord(properties.centre) ? properties.centre : { lng: 0, lat: 0 };

  const features = (raw.features as TrendHex[]).map((feature) => {
    const props = feature.properties as unknown as TrendHexProperties;
    number(props?.population, `${props?.hex_id} population`);
    number(props?.density_per_km2, `${props?.hex_id} density`);
    number(props?.footfall_index, `${props?.hex_id} footfall index`);
    if (props.synthetic !== true) throw new Error(`trends sample: ${props.hex_id} does not declare its simulated half`);
    return feature;
  });

  const maxima = {
    density: features.reduce((max, feature) => Math.max(max, feature.properties.density_per_km2), 0),
    footfall: features.reduce((max, feature) => Math.max(max, feature.properties.footfall_index), 0),
  };

  return {
    area: {
      west: number(area.west, "west"),
      south: number(area.south, "south"),
      east: number(area.east, "east"),
      north: number(area.north, "north"),
    },
    centre: { lng: number(centres.lng, "centre lng"), lat: number(centres.lat, "centre lat") },
    cellSideKm: typeof properties.cellSideKm === "number" ? properties.cellSideKm : 1,
    note: typeof properties.note === "string" ? properties.note : "",
    attribution: typeof properties.attribution === "string" ? properties.attribution : "",
    provenance: {
      population: provenance.population as unknown as TrendProvenance,
      footfall: provenance.footfall as unknown as TrendProvenance,
    },
    collection: { type: "FeatureCollection", features },
    maxima,
  };
}

export type TrendMetric = "density" | "footfall";

export interface TrendMetricDefinition {
  id: TrendMetric;
  label: string;
  /** What the numbers are, in the sentence the panel prints. */
  unit: string;
  source: string;
  license: string;
  synthetic: boolean;
  /** The layer whose toggle this metric is part of, so the panel and the canvas agree. */
  layer: "population" | "footfall";
}

export const TREND_METRICS: readonly TrendMetricDefinition[] = [
  {
    id: "density",
    label: "Population density",
    unit: "people per km²",
    source: "WorldPop 2020",
    license: "CC BY 4.0",
    synthetic: false,
    layer: "population",
  },
  {
    id: "footfall",
    label: "Hourly footfall",
    unit: "footfall index, 0-100",
    source: "Kami3D synthetic",
    license: "CC0",
    synthetic: true,
    layer: "footfall",
  },
];

export function metricDefinition(metric: TrendMetric): TrendMetricDefinition {
  return TREND_METRICS.find((entry) => entry.id === metric) ?? TREND_METRICS[0];
}

/**
 * What one hex is worth under a metric at a given hour.
 *
 * Density ignores the clock - people live where they live - while the footfall metric is the
 * simulated index shaped by that category's hour. That difference is the whole reason the page has
 * a category selector as well as a clock.
 */
export function intensityFor(
  properties: TrendHexProperties,
  metric: TrendMetric,
  category: TrendCategory,
  hour: number,
): number {
  if (metric === "density") return properties.density_per_km2;
  return properties.footfall_index * hourlyFactor(category, hour);
}

/** The same grid, with a `value` property for the renderer and the popup to read. */
export function valuedCollection(
  sample: TrendsSample,
  metric: TrendMetric,
  category: TrendCategory,
  hour: number,
): FeatureCollection<Polygon, TrendHexProperties & { value: number }> {
  return {
    type: "FeatureCollection",
    features: sample.collection.features.map((feature) => ({
      ...feature,
      properties: { ...feature.properties, value: Math.round(intensityFor(feature.properties, metric, category, hour) * 100) / 100 },
    })),
  };
}

/** The largest value on screen for a metric, hour and category - what the ramp is scaled to. */
export function maxIntensity(
  sample: TrendsSample,
  metric: TrendMetric,
  category: TrendCategory,
  hour: number,
): number {
  return sample.collection.features.reduce(
    (max, feature) => Math.max(max, intensityFor(feature.properties, metric, category, hour)),
    0,
  );
}

/**
 * The heat ramp, anchored to the largest value on screen.
 *
 * Scaling to the data rather than to an absolute number is deliberate: a quiet hour has a shape
 * worth reading, and a ramp pinned to the daily peak would paint it uniformly dark.
 */
export function heatExpression(max: number): unknown {
  const top = max > 0 ? max : 1;

  return [
    "interpolate",
    ["linear"],
    ["get", "value"],
    0, "#0b1220",
    top * 0.15, "#123b53",
    top * 0.35, "#1f7f8c",
    top * 0.55, "#35f0c0",
    top * 0.75, "#ffb738",
    top, "#ff5d8f",
  ];
}

export function legendStops(max: number): { value: number; label: string }[] {
  const top = max > 0 ? max : 1;
  return [0, 0.35, 0.55, 0.75, 1].map((fraction) => ({
    value: top * fraction,
    label: formatCount(top * fraction),
  }));
}

/** Thousands separators, and a readable step below 1 000. */
export function formatCount(value: number): string {
  if (!Number.isFinite(value)) return "—";
  if (Math.abs(value) >= 1000) return Math.round(value).toLocaleString("en-US");
  if (Math.abs(value) >= 10) return String(Math.round(value));
  return String(Math.round(value * 10) / 10);
}
