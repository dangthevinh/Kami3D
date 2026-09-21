import type { Metadata } from "next";

import { MapExperience, type MapSpecies } from "@/components/map/MapExperience";
import { getAllAnimals } from "@/lib/animals";
import { getGeodata } from "@/lib/geodata";
import { parseMapQuery } from "@/lib/map-query";

/**
 * `/map` - habitat ranges, drawn from PostGIS or from the bundled sample.
 *
 * The query string is read here rather than in the browser so the server renders the
 * view the link asked for: a shared `?region=Africa&layers=habitat` opens on Africa
 * instead of jumping there after hydration. The client takes over from that first
 * render and writes later changes back to the URL (see `MapExperience`).
 *
 * The catalogue and the geodata are both loaded through `lib/` loaders that fall back to
 * the bundled files, so this page is complete with no environment variables at all.
 */

export const metadata: Metadata = {
  title: "Habitat map",
  description:
    "Explore where each species lives: habitat ranges on an interactive map, filterable by region and layer.",
  alternates: { canonical: "/map" },
};

// No `revalidate`: the URL decides what this page draws, so it is rendered per request
// rather than cached. The geodata read is 28 rows through `cache()`.

export default async function MapPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query = parseMapQuery(
    new URLSearchParams(
      Object.entries(params).flatMap(([key, value]) =>
        value === undefined ? [] : [[key, Array.isArray(value) ? value[0] : value] as [string, string]],
      ),
    ).toString(),
  );

  const [{ collection, credits, source }, animals] = await Promise.all([getGeodata(), getAllAnimals()]);

  const species: MapSpecies[] = animals.map((animal) => ({
    slug: animal.slug,
    name: animal.name,
    region: animal.region,
    conservation_status: animal.conservation_status,
    category: animal.category,
    emoji: animal.emoji,
  }));

  return (
    <MapExperience
      collection={collection}
      credits={credits}
      species={species}
      initialQuery={query}
      source={source}
    />
  );
}
