/**
 * A path a species moves along, as the map draws it.
 *
 * The fields here are the ones that decide whether the thing on screen can be believed:
 * `properties.method` says how the line was derived, `mean_spread_km` says how scattered each
 * month was, and `coherence` is the ratio between them. A route with a spread larger than its
 * own length is a centroid that barely moved while the observations were everywhere - which
 * is why the number travels with the geometry instead of being left in a script log.
 */

export interface MigrationStop {
  month: number;
  records: number;
  coordinates: [number, number];
}

export interface MigrationRoute {
  slug: string;
  season: string;
  /** `[lng, lat]` pairs, in order. */
  coordinates: [number, number][];
  stops: MigrationStop[];
  source: string;
  sourceUrl: string | null;
  license: string;
  attribution: string;
  properties: {
    method?: string;
    months?: number[];
    records?: number;
    length_km?: number;
    mean_spread_km?: number;
    coherence?: number | null;
    note?: string;
  };
}
