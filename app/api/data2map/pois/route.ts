import { NextResponse } from "next/server";

import {
  OVERPASS_ATTRIBUTION,
  OVERPASS_ENDPOINTS,
  OVERPASS_LICENSE,
  overpassQuery,
  readBounds,
  runOverpass,
  toPointFeatures,
} from "@/lib/overpass";
import {
  TREND_CATEGORIES,
  isTrendCategory,
  trendCategoryForPoi,
  type TrendCategory,
} from "@/lib/data2map/footfall";

/**
 * Food and drink POIs from OpenStreetMap, fetched per view.
 *
 * This is the **real** half of the trends page: the competitors the site-selection score counts,
 * and the pins under the heat. It is ODbL, so it is displayed with attribution and never stored -
 * the query runs here, answers the current viewport, and keeps nothing beyond an HTTP cache.
 *
 * Google Places is the obvious alternative and is **refused**: its terms forbid storing place data
 * and it needs a key, which would break this project's rule that a fresh clone runs with no
 * configuration. See docs/DATA2MAP.md.
 */

export const dynamic = "force-dynamic";

/** Only the tags this product draws, mapped to the categories the page filters by. */
const SELECTORS: Record<TrendCategory, string> = {
  cafe: 'node["amenity"="cafe"]',
  // Trà sữa is mapped in OSM as a cafe with a cuisine tag; without the tag it lands in "cafe".
  bubble_tea: 'node["amenity"="cafe"]["cuisine"~"bubble_tea|bubble tea|milk_tea|tea",i]',
  restaurant: 'node["amenity"="restaurant"]',
  bakery: 'node["shop"="bakery"]',
};

/**
 * Four kilometres or so of view, and no more.
 *
 * Smaller than the amenities route's 0.25 degrees on purpose: cafes and restaurants are denser than
 * schools and hospitals, and the same city window that answers 280 amenities in a few seconds made
 * every public mirror return 504 or time out for food and drink. The page therefore asks about the
 * view it is drawing - and about a small box around a hex when the visitor scores one.
 */
const MAX_SPAN = 0.05;

/**
 * The answer cap, higher than the amenities route's 800.
 *
 * The page asks for **the current view**, not the whole city: a 27 by 18 km query for cafes and
 * restaurants is more than a public Overpass mirror will answer inside its own limits (the first
 * attempt came back 504 from the main endpoint and timed out on both mirrors). A viewport-sized
 * question is what this endpoint is built for, which is also why the page re-asks when the visitor
 * moves the map.
 */
const POI_LIMIT = 1500;

/**
 * Per mirror, and short on purpose.
 *
 * With every mirror in the list tried in turn, the worst case is this times their number - so a
 * viewport query gets 14 s each and the page finds out reasonably quickly when Overpass is having a
 * bad day, rather than holding a request open for two minutes.
 */
const TIMEOUT_MS = 14_000;

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const bounds = readBounds(params, MAX_SPAN);

  if (!bounds.ok) return NextResponse.json({ error: bounds.error }, { status: bounds.status });

  const requested = (params.get("categories") ?? TREND_CATEGORIES.join(","))
    .split(",")
    .map((value) => value.trim())
    .filter((value) => isTrendCategory(value));

  if (requested.length === 0) return NextResponse.json({ error: "No known category requested." }, { status: 400 });

  // Two categories can share a selector (cafe and bubble tea are the same node query), and asking
  // Overpass twice for the same thing is impolite.
  const selectors = [...new Set(requested.map((category) => SELECTORS[category]))];
  const categories = new Set<TrendCategory>(requested);

  try {
    const result = await runOverpass(overpassQuery(selectors, bounds.bounds, POI_LIMIT), OVERPASS_ENDPOINTS, TIMEOUT_MS);
    const features = toPointFeatures(
      result.elements,
      (tags) => trendCategoryForPoi(tags),
      (tags) => ({ cuisine: tags.cuisine ?? null }),
    ).filter((feature) => categories.has(feature.properties.kind as TrendCategory));

    const counts: Record<string, number> = Object.fromEntries(requested.map((category) => [category, 0]));
    for (const feature of features) counts[feature.properties.kind] = (counts[feature.properties.kind] ?? 0) + 1;

    // Overpass stops at the cap without saying so; if the answer is exactly the cap, it was cut.
    const truncated = features.length >= POI_LIMIT;

    return NextResponse.json(
      {
        type: "FeatureCollection",
        features,
        counts,
        truncated,
        source: "OpenStreetMap via Overpass",
        license: OVERPASS_LICENSE,
        attribution: OVERPASS_ATTRIBUTION,
        note: "Real places, mapped by OpenStreetMap volunteers. Busy-ness is not part of this layer.",
      },
      { headers: { "cache-control": "public, s-maxage=3600, stale-while-revalidate=86400" } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: `OpenStreetMap is not answering right now (${(error as Error).message}). The heat layers still work.`,
        features: [],
      },
      { status: 503 },
    );
  }
}
