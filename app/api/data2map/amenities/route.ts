import { NextResponse } from "next/server";

import {
  OVERPASS_ATTRIBUTION,
  OVERPASS_LICENSE,
  overpassQuery,
  readBounds,
  runOverpass,
  toPointFeatures,
} from "@/lib/overpass";

/**
 * Amenities from OpenStreetMap, fetched per view.
 *
 * This is the one layer on the real-estate page whose data is real. It is also the one layer with a
 * licence that shapes the implementation: OSM is ODbL, which is fine to display with attribution
 * and is **not** something to accumulate into a private database. So the query runs here, on the
 * server, answers the current viewport, and stores nothing - no table, no cache beyond an HTTP one.
 *
 * The mirrors, the query builder and the element-to-GeoJSON step live in `lib/overpass.ts`, shared
 * with the trends page's food-and-drink layer: one place to fix when an endpoint goes down.
 */

export const dynamic = "force-dynamic";

/** Only these four, mapped to the tags that produce them. */
const KINDS: Record<string, string> = {
  school: 'node["amenity"="school"]',
  hospital: 'node["amenity"="hospital"]',
  market: 'node["amenity"="marketplace"]',
  park: 'node["leisure"="park"]',
};

const MAX_SPAN = 0.25; // degrees, about 25 km: a city view, not a country

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const bounds = readBounds(params, MAX_SPAN);

  if (!bounds.ok) return NextResponse.json({ error: bounds.error }, { status: bounds.status });

  const requested = (params.get("kinds") ?? Object.keys(KINDS).join(","))
    .split(",")
    .map((kind) => kind.trim())
    .filter((kind) => kind in KINDS);

  if (requested.length === 0) return NextResponse.json({ error: "No known amenity kinds requested." }, { status: 400 });

  const kindOf = (tags: Record<string, string>): string | null => {
    if (tags.amenity === "school") return "school";
    if (tags.amenity === "hospital") return "hospital";
    if (tags.amenity === "marketplace") return "market";
    if (tags.leisure === "park") return "park";
    return null;
  };

  try {
    const result = await runOverpass(overpassQuery(requested.map((kind) => KINDS[kind]), bounds.bounds));
    const features = toPointFeatures(result.elements, kindOf).filter((feature) => requested.includes(feature.properties.kind));

    return NextResponse.json(
      {
        type: "FeatureCollection",
        features,
        source: "OpenStreetMap via Overpass",
        license: OVERPASS_LICENSE,
        attribution: OVERPASS_ATTRIBUTION,
      },
      // The tile is the same for everyone looking at the same view, and OSM asks that clients not
      // hammer the endpoint: an hour of shared caching is polite and sufficient.
      { headers: { "cache-control": "public, s-maxage=3600, stale-while-revalidate=86400" } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: `OpenStreetMap is not answering right now (${(error as Error).message}). The other layers still work.`,
        features: [],
      },
      { status: 503 },
    );
  }
}
