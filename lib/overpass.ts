import type { Feature, Point } from "geojson";

/**
 * Talking to OpenStreetMap's Overpass API.
 *
 * Two Data2Map pages draw real POIs from OSM - amenities on the real-estate page, food and drink
 * on the trends page - and both need the same three things: a bounded query, a list of mirrors to
 * try when the main endpoint is busy, and elements turned into GeoJSON with the provenance kept.
 * That machinery lives here once, so a fix to the mirror list is a fix for both.
 *
 * The licence shapes all of it. ODbL is fine to display with attribution and is **not** something
 * to accumulate into a private database, so nothing here caches to disk, nothing is seeded into a
 * table, and both routes answer per view with a shared HTTP cache. See docs/DATA2MAP.md.
 */

/**
 * Overpass mirrors, tried in order.
 *
 * The public instances are shared and get busy - the main endpoint answered 504 during this build
 * - which is not a reason to show an empty layer when a mirror is a line of configuration away.
 * `OVERPASS_URL` still wins, because a self-hosted instance is the right answer at scale.
 */
export const OVERPASS_ENDPOINTS: readonly string[] = [
  process.env.OVERPASS_URL,
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  // Added after a day when the three above answered 504 or nothing at all while this one was
  // healthy: a mirror list is only resilience if it has more than one working entry in it.
  //
  // Deliberately **not** `overpass.osm.ch`: it is a regional extract, and it answered a district of
  // Ho Chi Minh City with an empty set that looked exactly like "there are no cafes here". See the
  // empty-answer rule in `runOverpass`.
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
].filter((value): value is string => typeof value === "string" && value.length > 0);

export const OVERPASS_ATTRIBUTION = "© OpenStreetMap contributors (ODbL 1.0)";
export const OVERPASS_LICENSE = "ODbL";

export interface OverpassBounds {
  west: number;
  south: number;
  east: number;
  north: number;
}

const MAX_ELEMENTS = 800;

/**
 * The query, as a string.
 *
 * `out center` because a way (a shop mapped as a building outline) has no coordinate of its own,
 * and "somewhere in this building" is the honest answer for a shop.
 */
export function overpassQuery(selectors: readonly string[], bounds: OverpassBounds, limit = MAX_ELEMENTS): string {
  if (selectors.length === 0) throw new Error("an Overpass query needs at least one selector");

  const bbox = `${bounds.south},${bounds.west},${bounds.north},${bounds.east}`;
  return `[out:json][timeout:20];(${selectors.map((selector) => `${selector}(${bbox});`).join("")});out center ${limit};`;
}

export type BoundsResult = { ok: true; bounds: OverpassBounds } | { ok: false; status: number; error: string };

/**
 * A bounding box from query parameters, or the reason it is not one.
 *
 * A view too large is refused rather than clamped: Overpass is somebody else's server, and
 * quietly answering a smaller box than the visitor is looking at would put a wrong layer on
 * screen - the failure mode this project keeps designing against.
 */
export function readBounds(params: URLSearchParams, maxSpan: number): BoundsResult {
  const numbers = ["west", "south", "east", "north"].map((key) => Number(params.get(key)));
  const [west, south, east, north] = numbers;

  if (numbers.some((value) => !Number.isFinite(value))) {
    return { ok: false, status: 400, error: "A bounding box is required: west, south, east, north." };
  }
  if (east <= west || north <= south) {
    return { ok: false, status: 400, error: "That bounding box is empty." };
  }
  if (east - west > maxSpan || north - south > maxSpan) {
    return { ok: false, status: 413, error: "That view is too large to ask OpenStreetMap for. Zoom in a little." };
  }

  return { ok: true, bounds: { west, south, east, north } };
}

/** The shape Overpass actually returns, narrowed to what is read here. */
export interface OverpassElement {
  id: number;
  type?: string;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements?: OverpassElement[];
}

export type PointProperties = { kind: string; name: string | null; osm_id: number } & Record<string, unknown>;

/**
 * Elements in, points out.
 *
 * Anything without a coordinate is dropped rather than guessed at, and `kind` comes from the
 * caller's own mapping so an unknown tag never reaches the map as an unlabelled dot.
 */
export function toPointFeatures(
  elements: readonly OverpassElement[],
  kindOf: (tags: Record<string, string>) => string | null,
  propertiesOf?: (tags: Record<string, string>) => Record<string, unknown>,
): Feature<Point, PointProperties>[] {
  const features: Feature<Point, PointProperties>[] = [];

  for (const element of elements) {
    const lat = element.lat ?? element.center?.lat;
    const lng = element.lon ?? element.center?.lon;
    if (typeof lat !== "number" || typeof lng !== "number") continue;

    const tags = element.tags ?? {};
    const kind = kindOf(tags);
    if (!kind) continue;

    features.push({
      type: "Feature",
      properties: { kind, name: tags.name ?? null, osm_id: element.id, ...(propertiesOf?.(tags) ?? {}) },
      geometry: { type: "Point", coordinates: [lng, lat] },
    });
  }

  return features;
}

export interface OverpassResult {
  elements: OverpassElement[];
  /** Which mirror answered, for the log and the response header. */
  endpoint: string;
  failures: string[];
}

/**
 * Runs a query against the mirrors in turn.
 *
 * Throws only when every endpoint failed, and the error carries each failure: a layer that is
 * empty because Overpass is down must say so rather than look like a city with no restaurants.
 */
export async function runOverpass(
  body: string,
  endpoints: readonly string[] = OVERPASS_ENDPOINTS,
  timeoutMs = 20_000,
): Promise<OverpassResult> {
  const failures: string[] = [];
  let empty: OverpassResult | null = null;

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          "user-agent": "Kami3D/1.0 (+https://github.com/dangthevinh/Kami3D)",
        },
        body: `data=${encodeURIComponent(body)}`,
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (!response.ok) throw new Error(`${response.status}`);

      const data = (await response.json()) as OverpassResponse;
      const result = { elements: data.elements ?? [], endpoint, failures };

      // An empty answer is retried against the other mirrors before it is believed. Most Overpass
      // instances carry the whole planet, but some are regional extracts, and one of those answers
      // "nothing here" for the rest of the world - which is indistinguishable from a real empty
      // answer unless there is a second opinion. An empty set from *every* mirror is the answer.
      if (result.elements.length === 0) {
        empty = empty ?? result;
        continue;
      }

      return result;
    } catch (error) {
      failures.push(`${new URL(endpoint).host}: ${(error as Error).message}`);
    }
  }

  if (empty) return empty;
  throw new Error(failures.join("; ") || "no Overpass endpoint is configured");
}
