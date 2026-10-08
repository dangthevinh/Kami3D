import type { FeatureCollection, Geometry } from "geojson";

/**
 * The real-estate sample, read rather than trusted.
 *
 * This is the one Data2Map dataset that arrived without a reader: the page imported the JSON and
 * cast it, so a file that had lost its `properties.area` would have shown `undefined` in the header
 * instead of failing. Every other product refuses a sample it cannot explain, and now that the file
 * is served by a route handler rather than imported at build time, the same rule has to hold at that
 * boundary - the check suite only ever sees the committed file, never what a request actually
 * returns.
 *
 * The layers themselves stay unvalidated on purpose: `data/data2map-real-estate.json` is checked
 * feature by feature by `scripts/check-trends.mjs` (it shares the hex grid with the footfall
 * sample), and duplicating that here would be a second copy of a rule.
 */

export interface RealEstateArea {
  west: number;
  south: number;
  east: number;
  north: number;
}

export interface RealEstateSample {
  collection: FeatureCollection<Geometry>;
  area: RealEstateArea;
  attribution: string;
  note: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

/** A number, or a refusal - `Number(undefined)` is NaN and `NaN` renders as "NaN" on a page. */
function requireNumber(value: unknown, what: string): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) throw new Error("real-estate sample: " + what + " is not a number");
  return parsed;
}

export function readRealEstateSample(raw: unknown): RealEstateSample {
  if (!isRecord(raw) || raw.type !== "FeatureCollection" || !Array.isArray(raw.features)) {
    throw new Error("real-estate sample: not a FeatureCollection");
  }
  if (raw.features.length === 0) throw new Error("real-estate sample: no features");

  const properties = isRecord(raw.properties) ? raw.properties : {};
  if (!isRecord(properties.area)) throw new Error("real-estate sample: no area");

  return {
    collection: { type: "FeatureCollection", features: raw.features } as FeatureCollection<Geometry>,
    area: {
      west: requireNumber(properties.area.west, "area.west"),
      south: requireNumber(properties.area.south, "area.south"),
      east: requireNumber(properties.area.east, "area.east"),
      north: requireNumber(properties.area.north, "area.north"),
    },
    attribution: typeof properties.attribution === "string" ? properties.attribution : "",
    note: typeof properties.note === "string" ? properties.note : "",
  };
}
