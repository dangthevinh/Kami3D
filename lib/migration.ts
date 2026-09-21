import type { LngLat } from "@/lib/geo";

/**
 * Where a moving dot is, and how far along the route it has got.
 *
 * The animation is a `requestAnimationFrame` loop over one number, and this module is the
 * only place that number turns into a position. Keeping it pure means the motion can be
 * tested (`scripts/check-timeline.mjs`) instead of being watched: a dot that stutters, jumps
 * backwards or divides by zero between two identical points is a thing to catch in Node.
 *
 * The route is a LineString of monthly centroids - not a tracked flight path - and the dot
 * moves along it by **distance**, not by vertex index. Moving by index would crawl through
 * the closely-spaced summer stops and sprint through the winter gap.
 */

const EARTH_RADIUS_KM = 6371.0088;
const rad = Math.PI / 180;

/** Distance between two `[lng, lat]` points, in kilometres. */
export function distanceKm(a: LngLat, b: LngLat): number {
  const dLat = (b[1] - a[1]) * rad;
  const dLng = (b[0] - a[0]) * rad;
  const lat1 = a[1] * rad;
  const lat2 = b[1] * rad;

  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** The total length of a route, in kilometres. */
export function routeLengthKm(coordinates: readonly LngLat[]): number {
  let total = 0;
  for (let index = 1; index < coordinates.length; index += 1) {
    total += distanceKm(coordinates[index - 1], coordinates[index]);
  }
  return total;
}

export interface RoutePosition {
  /** The interpolated point, `[lng, lat]`. */
  point: LngLat;
  /** How far along the route, 0-1. */
  progress: number;
  /** The index of the stop just passed. */
  stopIndex: number;
  /** Kilometres travelled so far. */
  travelledKm: number;
}

/**
 * The point `progress` of the way along the route, measured by distance.
 *
 * A route of fewer than two points, or one whose points are all identical, has no length to
 * travel: it returns the first point with progress 0 rather than dividing by zero.
 */
export function pointAlongLine(coordinates: readonly LngLat[], progress: number): RoutePosition | null {
  if (coordinates.length === 0) return null;
  if (coordinates.length === 1) {
    return { point: coordinates[0], progress: 0, stopIndex: 0, travelledKm: 0 };
  }

  const clamped = Math.min(1, Math.max(0, Number.isFinite(progress) ? progress : 0));
  const total = routeLengthKm(coordinates);
  if (total === 0) return { point: coordinates[0], progress: 0, stopIndex: 0, travelledKm: 0 };

  const target = total * clamped;
  let travelled = 0;

  for (let index = 1; index < coordinates.length; index += 1) {
    const segment = distanceKm(coordinates[index - 1], coordinates[index]);
    if (travelled + segment >= target || index === coordinates.length - 1) {
      const remaining = segment === 0 ? 0 : (target - travelled) / segment;
      const ratio = Math.min(1, Math.max(0, remaining));

      return {
        point: [
          coordinates[index - 1][0] + (coordinates[index][0] - coordinates[index - 1][0]) * ratio,
          coordinates[index - 1][1] + (coordinates[index][1] - coordinates[index - 1][1]) * ratio,
        ],
        progress: clamped,
        stopIndex: ratio >= 1 ? index : index - 1,
        travelledKm: Math.min(total, travelled + segment * ratio),
      };
    }

    travelled += segment;
  }

  return { point: coordinates[coordinates.length - 1], progress: 1, stopIndex: coordinates.length - 1, travelledKm: total };
}

/** How fast the dot should move: a full route in `seconds`, independent of its length. */
export function progressPerSecond(durationSeconds: number): number {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) return 0;
  return 1 / durationSeconds;
}

/** The next progress value, wrapping at the end so a loop can run for ever. */
export function advanceProgress(progress: number, perSecond: number, deltaSeconds: number): number {
  const next = progress + perSecond * Math.max(0, deltaSeconds);
  if (!Number.isFinite(next)) return 0;
  return next > 1 ? next % 1 : next;
}
