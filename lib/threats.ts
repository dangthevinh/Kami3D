import "server-only";

import { cache } from "react";

import { getSupabase } from "@/lib/supabase";

/**
 * Threat geometry and the species-by-threat join.
 *
 * Both come from PostGIS functions rather than from table selects: `map_threats()` returns
 * centroids with severity (drawing a megabyte of city outlines at world zoom shows nothing
 * extra), and `species_threat_impact()` does the real polygon overlay with `ST_Intersects`.
 * The two answer different questions, which is why they are separate calls.
 *
 * Empty arrays rather than an error when there is no database: `/map` has to work in Demo
 * Mode, and the risk panel simply has fewer inputs to work with - and says so.
 */

export interface ThreatImpactRow {
  slug: string;
  name: string;
  conservation_status: string;
  habitat_km2: number;
  threatened_km2: number;
  threatened_fraction: number;
  worst_severity: number;
  mean_severity: number;
  threats: number;
}

export interface ThreatPoint {
  type: "Feature";
  properties: {
    kind: string;
    name: string;
    severity: number;
    year: number | null;
    source: string;
    license: string;
    attribution: string;
    license_label?: string | null;
    area_sqkm?: string | number | null;
    note?: string | null;
  };
  geometry: { type: "Point"; coordinates: [number, number] };
}

export const getThreatImpact = cache(async (): Promise<ThreatImpactRow[]> => {
  const supabase = getSupabase();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase.rpc("species_threat_impact", {});
    if (error) throw error;
    return (data ?? []) as ThreatImpactRow[];
  } catch (error) {
    console.warn("[kami3d] threat impact unavailable:", (error as Error).message);
    return [];
  }
});

export const getMapThreats = cache(async (): Promise<ThreatPoint[]> => {
  const supabase = getSupabase();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase.rpc("map_threats", { p_kind: "urban_expansion" });
    if (error) throw error;
    return ((data as { features?: ThreatPoint[] } | null)?.features ?? []).filter(Boolean);
  } catch (error) {
    console.warn("[kami3d] threat layer unavailable:", (error as Error).message);
    return [];
  }
});
