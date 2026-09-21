import { NextResponse } from "next/server";

/**
 * Amenities from OpenStreetMap, fetched per view.
 *
 * This is the one layer on the real-estate page whose data is real. It is also the one layer
 * with a licence that shapes the implementation: OSM is ODbL, which is fine to display with
 * attribution and is **not** something to accumulate into a private database. So the query runs
 * here, on the server, answers the current viewport, and stores nothing - no table, no cache
 * beyond an HTTP one.
 *
 * Rate limiting is Overpass's, not ours: the query is bounded to a small bounding box and to
 * four tags, and answers with an empty set and an explanation when Overpass is busy rather than
 * hanging on to a visitor request.
 */

export const dynamic = "force-dynamic";

/**
 * Overpass mirrors, tried in order.
 *
 * The public instances are shared and get busy; the main one answered 504 during this build,
 * which is not a reason to show an empty layer when a mirror is a line of configuration away.
 * `OVERPASS_URL` still wins, because a self-hosted instance is the right answer at scale.
 */
const ENDPOINTS = [
  process.env.OVERPASS_URL,
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
].filter(Boolean) as string[];

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

  const number = (key: string) => {
    const value = Number(params.get(key));
    return Number.isFinite(value) ? value : null;
  };

  const west = number("west");
  const south = number("south");
  const east = number("east");
  const north = number("north");

  if (west === null || south === null || east === null || north === null || east <= west || north <= south) {
    return NextResponse.json({ error: "A bounding box is required: west, south, east, north." }, { status: 400 });
  }

  if (east - west > MAX_SPAN || north - south > MAX_SPAN) {
    return NextResponse.json(
      { error: "That view is too large to ask OpenStreetMap for. Zoom in a little." },
      { status: 413 },
    );
  }

  const requested = (params.get("kinds") ?? "school,hospital,market,park")
    .split(",")
    .map((kind) => kind.trim())
    .filter((kind) => kind in KINDS);

  if (requested.length === 0) return NextResponse.json({ error: "No known amenity kinds requested." }, { status: 400 });

  const bbox = `${south},${west},${north},${east}`;
  const body = `[out:json][timeout:20];(${requested.map((kind) => `${KINDS[kind]}(${bbox});`).join("")});out center 800;`;

  try {
    let data: { elements?: { id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }[] } | null = null;
    const failures: string[] = [];

    for (const endpoint of ENDPOINTS) {
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "content-type": "application/x-www-form-urlencoded",
            "user-agent": "Kami3D/1.0 (+https://github.com/dangthevinh/Kami3D)",
          },
          body: `data=${encodeURIComponent(body)}`,
          signal: AbortSignal.timeout(20_000),
        });

        if (!response.ok) throw new Error(`${response.status}`);
        data = await response.json();
        break;
      } catch (error) {
        failures.push(`${new URL(endpoint).host}: ${(error as Error).message}`);
      }
    }

    if (!data) throw new Error(failures.join("; "));

    const features = (data.elements ?? [])
      .map((element) => {
        const lat = element.lat ?? element.center?.lat;
        const lng = element.lon ?? element.center?.lon;
        if (typeof lat !== "number" || typeof lng !== "number") return null;

        const tags = element.tags ?? {};
        const kind = tags.amenity === "school" ? "school" : tags.amenity === "hospital" ? "hospital" : tags.amenity === "marketplace" ? "market" : "park";

        return {
          type: "Feature" as const,
          properties: { kind, name: tags.name ?? null, osm_id: element.id },
          geometry: { type: "Point" as const, coordinates: [lng, lat] },
        };
      })
      .filter(Boolean);

    return NextResponse.json(
      {
        type: "FeatureCollection",
        features,
        source: "OpenStreetMap via Overpass",
        license: "ODbL",
        attribution: "© OpenStreetMap contributors (ODbL 1.0)",
      },
      // The tile is the same for everyone looking at the same view, and OSM asks that clients
      // not hammer the endpoint: an hour of shared caching is polite and sufficient.
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
