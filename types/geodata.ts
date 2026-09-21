/**
 * The shape of a geospatial feature, as this project uses it.
 *
 * Deliberately not `@types/geojson`: the product needs four properties of a Feature
 * and none of the union types, and a dependency that exists to describe a standard we
 * read three fields of is a dependency that has to be kept up to date forever.
 *
 * The coordinates are `[longitude, latitude]` - RFC 7946 order. `lib/geo.ts` is the only
 * place allowed to translate between that and the `{ lat, lng }` the rest of the app
 * uses.
 */

import type { Region } from "@/types/animal";

export type GeodataKind = "habitat_current" | "habitat_historic" | "protected_area" | "occurrence";

/** The two values `animal_geodata.license` accepts. */
export type GeodataLicense = "CC0" | "CC-BY";

export interface GeodataProperties {
  slug: string;
  name: string;
  region: Region | string;
  kind: GeodataKind;
  year: number | null;
  source: string;
  license: GeodataLicense;
  /** True when the shape is a generated envelope rather than a published range. */
  synthetic?: boolean;
  /** What the visitor needs to know about the data, rendered verbatim. */
  note?: string;
  area_km2?: number | null;
  radius_km?: number | null;
  latin_name?: string;
  category?: string;
  conservation_status?: string;
  [key: string]: unknown;
}

export interface GeodataGeometry {
  type: "Polygon" | "MultiPolygon" | "Point" | "MultiPoint";
  /** PostgREST adds a legacy `crs` member; the loader strips it before rendering. */
  crs?: unknown;
  coordinates: number[] | number[][] | number[][][] | number[][][][];
}

export interface GeodataFeature {
  type: "Feature";
  properties: GeodataProperties;
  geometry: GeodataGeometry;
}

export interface GeodataCollection {
  type: "FeatureCollection";
  features: GeodataFeature[];
}

export interface GeodataCredit {
  label: string;
  license: string;
  licenseUrl?: string;
  attribution: string;
  note?: string;
}

export type GeodataCredits = Record<string, GeodataCredit>;
