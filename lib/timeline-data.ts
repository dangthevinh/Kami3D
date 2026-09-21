import "server-only";

import { cache } from "react";

import { getSupabase } from "@/lib/supabase";
import type { TimelineEvent } from "@/lib/timeline";
import type { MigrationRoute, MigrationStop } from "@/types/migration";

/**
 * Annotations and seasonal paths, for the timeline.
 *
 * Both are small (18 events, 7 paths) and read once per request. The events are our own
 * summaries with a citation each; the paths are derived from GBIF observations and carry the
 * method and the coherence number with them, so the UI can say what it is showing rather than
 * implying telemetry.
 */

interface EventRow {
  id: string;
  year: number;
  title: string;
  summary: string;
  kind: string;
  source: string;
  source_url: string;
  attribution: string;
  animals: { slug: string } | null;
}

interface RouteRow {
  season: string;
  geometry: { coordinates: [number, number][] } | null;
  stops: MigrationStop[];
  source: string;
  source_url: string | null;
  license: string;
  attribution: string;
  properties: MigrationRoute["properties"];
  animals: { slug: string } | null;
}

export const getTimelineEvents = cache(async (): Promise<TimelineEvent[]> => {
  const supabase = getSupabase();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from("range_events")
      .select("id, year, title, summary, kind, source, source_url, attribution, animals(slug)")
      .order("year");

    if (error) throw error;

    return ((data ?? []) as unknown as EventRow[]).map((row) => ({
      id: row.id,
      year: row.year,
      title: row.title,
      summary: row.summary,
      kind: row.kind,
      slug: row.animals?.slug ?? null,
      source: row.source,
      sourceUrl: row.source_url,
      attribution: row.attribution,
    }));
  } catch (error) {
    console.warn("[kami3d] timeline events unavailable:", (error as Error).message);
    return [];
  }
});

export const getMigrationRoutes = cache(async (): Promise<MigrationRoute[]> => {
  const supabase = getSupabase();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from("migration_routes")
      .select("season, geometry, stops, source, source_url, license, attribution, properties, animals(slug)")
      .order("source");

    if (error) throw error;

    return ((data ?? []) as unknown as RouteRow[])
      .filter((row): row is RouteRow & { geometry: { coordinates: [number, number][] } } => {
        const coordinates = row.geometry?.coordinates;
        return Array.isArray(coordinates) && coordinates.length >= 2;
      })
      .map((row) => ({
        slug: row.animals?.slug ?? "unknown",
        season: row.season,
        coordinates: row.geometry.coordinates,
        stops: row.stops ?? [],
        source: row.source,
        sourceUrl: row.source_url,
        license: row.license,
        attribution: row.attribution,
        properties: row.properties ?? {},
      }));
  } catch (error) {
    console.warn("[kami3d] migration routes unavailable:", (error as Error).message);
    return [];
  }
});
