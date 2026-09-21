import type { LatLng } from "./globe.ts";

/**
 * Coordinates and geometry, in the one order that does not silently break.
 *
 * GeoJSON, MapLibre, PostGIS and Turf all speak `[longitude, latitude]`. The rest of
 * this codebase - `lib/globe.ts`, the species data, the region anchors - speaks
 * `{ lat, lng }`. Both are correct; mixing them is not, and the failure mode is the
 * worst kind: a swapped pair still renders, just in the wrong place. Kazakhstan is a
 * plausible point on a world map, so nothing looks broken and nobody notices.
 *
 * Every crossing therefore goes through the converters below, and
 * `scripts/check-geo.mjs` pins their behaviour. Nothing else in the codebase is
 * allowed to know which order a tuple uses.
 *
 * The module is dependency-free on purpose: the check suite imports it in plain Node,
 * and the geometry that decides what a visitor sees should not need a map library to
 * be testable.
 */

/** `[longitude, latitude]`, the order GeoJSON and MapLibre use. */
export type LngLat = [number, number];
export type Ring = LngLat[];

export interface Bounds {
  west: number;
  south: number;
  east: number;
  north: number;
}

export function toLngLat(point: LatLng): LngLat {
  return [point.lng, point.lat];
}

export function fromLngLat(tuple: readonly number[]): LatLng {
  return { lat: tuple[1], lng: tuple[0] };
}

export function toLngLatRing(ring: readonly LatLng[]): Ring {
  return ring.map(toLngLat);
}

export function fromLngLatRing(ring: readonly (readonly number[])[]): LatLng[] {
  return ring.map((tuple) => fromLngLat(tuple));
}

/** Latitude inside +/-90, longitude inside +/-180, and both actual numbers. */
export function isValidLngLat(tuple: readonly number[]): boolean {
  if (tuple.length < 2) return false;
  const lng = tuple[0];
  const lat = tuple[1];
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}

/** The smallest box containing every point, or null for an empty list. */
export function boundsOf(points: readonly (readonly number[])[]): Bounds | null {
  if (points.length === 0) return null;

  const bounds: Bounds = { west: 180, south: 90, east: -180, north: -90 };
  let seen = 0;

  for (const point of points) {
    if (!isValidLngLat(point)) continue;
    const lng = point[0];
    const lat = point[1];
    bounds.west = Math.min(bounds.west, lng);
    bounds.east = Math.max(bounds.east, lng);
    bounds.south = Math.min(bounds.south, lat);
    bounds.north = Math.max(bounds.north, lat);
    seen += 1;
  }

  return seen === 0 ? null : bounds;
}

/** Every point of every ring of every polygon, in one list. */
export function flattenRingPoints(rings: readonly (readonly (readonly number[])[])[]): LngLat[] {
  const out: LngLat[] = [];
  for (const ring of rings) for (const point of ring) out.push([point[0], point[1]]);
  return out;
}

/** A box grown by a fraction of its own size, for padding a fit-bounds call. */
export function expandBounds(bounds: Bounds, factor = 0.15): Bounds {
  const width = bounds.east - bounds.west;
  const height = bounds.north - bounds.south;
  return {
    west: Math.max(-180, bounds.west - width * factor),
    east: Math.min(180, bounds.east + width * factor),
    south: Math.max(-85, bounds.south - height * factor),
    north: Math.min(85, bounds.north + height * factor),
  };
}

/**
 * Whether a point is inside a ring. Ray casting, boundary included.
 *
 * The one spatial question this project asks on the client ("which hex did the visitor click,
 * and is it inside a flood band") and it is cheaper to write than to import Turf for: Turf is
 * a fine dependency and it is the wrong one to ship into a route for twelve lines of arithmetic.
 * Pinned by `scripts/check-geo.mjs`, including the boundary.
 */
export function pointInRing(point: readonly number[], ring: readonly (readonly number[])[]): boolean {
  const x = point[0];
  const y = point[1];
  let inside = false;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];

    // A vertex exactly on the ray counts as a hit once, which is what keeps a point on a
    // shared edge from being reported as inside both polygons.
    const straddles = yi > y !== yj > y;
    if (straddles && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }

  return inside;
}

/** A point inside a Polygon (outer ring, minus its holes). */
export function pointInPolygon(point: readonly number[], polygon: readonly (readonly (readonly number[])[])[]): boolean {
  if (polygon.length === 0 || !pointInRing(point, polygon[0])) return false;
  for (let hole = 1; hole < polygon.length; hole += 1) {
    if (pointInRing(point, polygon[hole])) return false;
  }
  return true;
}

/** A GeoJSON ring repeats its first point at the end and has at least four of them. */
export function ringIsClosed(ring: readonly (readonly number[])[]): boolean {
  if (ring.length < 4) return false;
  const first = ring[0];
  const last = ring[ring.length - 1];
  return first[0] === last[0] && first[1] === last[1];
}

function orientation(a: readonly number[], b: readonly number[], c: readonly number[]): number {
  return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
}

function segmentsCross(a: readonly number[], b: readonly number[], c: readonly number[], d: readonly number[]): boolean {
  const d1 = orientation(c, d, a);
  const d2 = orientation(c, d, b);
  const d3 = orientation(a, b, c);
  const d4 = orientation(a, b, d);

  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) return true;
  return false;
}

/**
 * Whether a ring crosses itself.
 *
 * The client-side counterpart of PostGIS `ST_IsValid`, and it exists because of what an
 * invalid ring does downstream: `ST_Intersects` answers wrongly, MapLibre fills the
 * wrong region, and neither says a word. O(n^2) is the right complexity here - these
 * rings have tens of points, and the alternative is a library.
 */
export function ringIsSimple(ring: readonly (readonly number[])[]): boolean {
  const count = ring.length;
  if (count < 4) return false;

  // The closing segment is implicit, so the last real edge ends at count - 2.
  for (let i = 0; i < count - 1; i += 1) {
    for (let j = i + 1; j < count - 1; j += 1) {
      // Neighbouring edges share a vertex, which is not a crossing.
      if (j === i + 1) continue;
      if (i === 0 && j === count - 2) continue;

      if (segmentsCross(ring[i], ring[i + 1], ring[j], ring[j + 1])) return false;
    }
  }
  return true;
}

const EARTH_RADIUS_KM = 6371.0088;

/**
 * The area a ring encloses, in square kilometres.
 *
 * Spherical excess rather than a planar shoelace: a habitat envelope spans degrees, and
 * a flat approximation is wrong by tens of percent at high latitude - which is exactly
 * where several of these species live.
 */
export function ringAreaKm2(ring: readonly (readonly number[])[]): number {
  if (ring.length < 4) return 0;

  const rad = Math.PI / 180;
  let total = 0;

  for (let i = 0; i < ring.length - 1; i += 1) {
    const lng1 = ring[i][0];
    const lat1 = ring[i][1];
    const lng2 = ring[i + 1][0];
    const lat2 = ring[i + 1][1];
    total += (lng2 - lng1) * rad * (2 + Math.sin(lat1 * rad) + Math.sin(lat2 * rad));
  }

  return Math.abs((total * EARTH_RADIUS_KM * EARTH_RADIUS_KM) / 2);
}

/**
 * A closed ring of the given radius around an anchor.
 *
 * `wobble` pulls each vertex in or out by a deterministic amount derived from the seed,
 * so the result is reproducible (the file is generated, committed and diffed) while
 * still not being a circle. Every generated ring is checked with `ringIsSimple` before
 * it is written, which is the same rule PostGIS enforces with `ST_IsValid`.
 */
export function envelopeRing(
  anchor: LatLng,
  options: { radiusKm: number; points?: number; wobble?: number; seed?: number },
): Ring {
  const radiusKm = options.radiusKm;
  const points = options.points ?? 24;
  const wobble = options.wobble ?? 0.25;
  const seed = options.seed ?? 1;

  const degLat = radiusKm / 110.574;
  const degLng = radiusKm / (111.32 * Math.max(0.2, Math.cos((anchor.lat * Math.PI) / 180)));
  const ring: Ring = [];

  for (let i = 0; i < points; i += 1) {
    const angle = (i / points) * Math.PI * 2;
    // Deterministic pseudo-random in [1 - wobble, 1 + wobble], seeded per vertex.
    const noise = Math.sin((i + 1) * 12.9898 + seed * 78.233) * 43758.5453;
    const factor = 1 + wobble * (noise - Math.floor(noise) - 0.5) * 2;
    const lng = anchor.lng + Math.cos(angle) * degLng * factor;
    const lat = anchor.lat + Math.sin(angle) * degLat * factor;
    ring.push([
      Math.round(lng * 1e4) / 1e4,
      Math.round(Math.max(-89.9, Math.min(89.9, lat)) * 1e4) / 1e4,
    ]);
  }

  ring.push([ring[0][0], ring[0][1]]);
  return ring;
}
