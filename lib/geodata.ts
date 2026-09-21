import "server-only";

import { cache } from "react";

import bundled from "@/data/animal-geodata.json";
import credits from "@/data/geodata-attribution.json";
import { getSupabase } from "@/lib/supabase";
import type { GeodataCollection, GeodataCredits } from "@/types/geodata";

/**
 * The geospatial layers, from the database when there is one and from the bundle when
 * there is not.
 *
 * Exactly the arrangement `lib/animals.ts` uses for the catalogue, and for the same
 * reason: `data/animal-geodata.json` is the source of truth and `public.animal_geodata` is
 * a copy of it, so a fresh clone with no environment variables still opens a map.
 *
 * The read goes through `public.map_geodata()` rather than selecting the table: the
 * function simplifies each polygon with `ST_SimplifyPreserveTopology` and returns only the
 * properties the map draws, which keeps the payload small where the geometry lives instead
 * of shipping full-resolution rings to the browser and thinning them there. Points are
 * returned untouched - simplifying a sighting moves it.
 */

const BUNDLED = bundled as unknown as GeodataCollection;
const CREDITS = credits as unknown as GeodataCredits;

export interface GeodataResult {
  collection: GeodataCollection;
  credits: GeodataCredits;
  /** Where the shapes on screen actually came from. Shown in the UI. */
  source: "database" | "bundled";
}

const TOLERANCE = 0.01;

async function loadGeodata(): Promise<GeodataResult> {
  const supabase = getSupabase();
  if (!supabase) return { collection: BUNDLED, credits: CREDITS, source: "bundled" };

  try {
    const { data, error } = await supabase.rpc("map_geodata", { p_tolerance: TOLERANCE });
    if (error) throw error;

    const collection = data as unknown as GeodataCollection | null;
    if (!collection || collection.type !== "FeatureCollection" || collection.features.length === 0) {
      return { collection: BUNDLED, credits: CREDITS, source: "bundled" };
    }

    return { collection, credits: CREDITS, source: "database" };
  } catch (error) {
    console.warn("[kami3d] falling back to the bundled geodata:", (error as Error).message);
    return { collection: BUNDLED, credits: CREDITS, source: "bundled" };
  }
}

/** Deduped per request, like the catalogue. */
export const getGeodata = cache(loadGeodata);

/** The credit line for one feature: re-exported from the pure module for server callers. */
export { creditFor } from "@/lib/geodata-credits";
