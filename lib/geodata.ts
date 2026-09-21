import "server-only";

import { cache } from "react";

import bundled from "@/data/animal-geodata.json";
import credits from "@/data/geodata-attribution.json";
import { getSupabase } from "@/lib/supabase";
import type { GeodataCollection, GeodataCredits, GeodataFeature, GeodataGeometry } from "@/types/geodata";

/**
 * The geospatial layers, from the database when there is one and from the bundle when
 * there is not.
 *
 * Exactly the arrangement `lib/animals.ts` uses for the catalogue, for the same reason:
 * `data/animal-geodata.json` is the source of truth and `public.animal_geodata` is a
 * copy of it. A fresh clone with no environment variables has to open `/map` and see a
 * map, so the bundle is a real fallback and not a placeholder.
 *
 * PostgREST returns PostGIS geometry as GeoJSON with a legacy top-level `crs` member,
 * which RFC 7946 removed. MapLibre ignores unknown members, but a renderer that does not
 * is not a bug worth discovering in production, so it is stripped here.
 */

const BUNDLED = bundled as unknown as GeodataCollection;
const CREDITS = credits as unknown as GeodataCredits;

export interface GeodataResult {
  collection: GeodataCollection;
  credits: GeodataCredits;
  /** Where the shapes on screen actually came from. Shown in the UI. */
  source: "database" | "bundled";
}

function stripCrs(geometry: unknown): GeodataGeometry | null {
  if (!geometry || typeof geometry !== "object") return null;
  const { crs, ...rest } = geometry as Record<string, unknown>;
  void crs;
  return rest as unknown as GeodataGeometry;
}

interface GeodataRow {
  kind: string;
  year: number | null;
  geometry: unknown;
  source: string;
  license: string;
  attribution: string;
  properties: Record<string, unknown> | null;
  animals: { slug: string; name: string; region: string } | null;
}

async function loadGeodata(): Promise<GeodataResult> {
  const supabase = getSupabase();
  if (!supabase) return { collection: BUNDLED, credits: CREDITS, source: "bundled" };

  try {
    const { data, error } = await supabase
      .from("animal_geodata")
      .select("kind, year, geometry, source, license, attribution, properties, animals(slug, name, region)")
      .order("kind");

    if (error) throw error;
    if (!data || data.length === 0) return { collection: BUNDLED, credits: CREDITS, source: "bundled" };

    const features: GeodataFeature[] = [];
    for (const raw of data as unknown as GeodataRow[]) {
      const geometry = stripCrs(raw.geometry);
      if (!geometry) continue;

      features.push({
        type: "Feature",
        properties: {
          ...(raw.properties ?? {}),
          slug: raw.animals?.slug ?? String(raw.properties?.slug ?? "unknown"),
          name: raw.animals?.name ?? String(raw.properties?.name ?? "Unknown"),
          region: raw.animals?.region ?? String(raw.properties?.region ?? ""),
          kind: raw.kind as GeodataFeature["properties"]["kind"],
          year: raw.year,
          source: raw.source,
          license: raw.license as GeodataFeature["properties"]["license"],
        },
        geometry,
      });
    }

    if (features.length === 0) return { collection: BUNDLED, credits: CREDITS, source: "bundled" };

    return {
      collection: { type: "FeatureCollection", features },
      credits: CREDITS,
      source: "database",
    };
  } catch (error) {
    console.warn("[kami3d] falling back to the bundled geodata:", (error as Error).message);
    return { collection: BUNDLED, credits: CREDITS, source: "bundled" };
  }
}

/** Deduped per request, like the catalogue. */
export const getGeodata = cache(loadGeodata);

/** Re-exported so a server caller needs one import; the client uses the pure module. */
export { creditFor } from "@/lib/geodata-credits";
