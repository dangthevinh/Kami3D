// Relative with an explicit extension: the Node check suites run this module
// directly (type stripping, no bundler), where a "@/" alias would not resolve.
import { REGIONS, REGION_ANCHORS, type Region } from "../types/animal.ts";

/**
 * Pure spherical-math helpers for the interactive globe.
 *
 * Kami3D ships no earth texture: the globe is drawn from a procedurally
 * generated graticule so the app has zero asset dependencies (and no CORS or
 * licence questions). Pass `textureUrl` to `<InteractiveGlobe />` to swap in a
 * real equirectangular map from Supabase Storage when one is available.
 *
 * Convention: +Y is the north pole, the prime meridian faces +Z.
 */

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

export interface LatLng {
  lat: number;
  lng: number;
}

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** Convert geographic coordinates to a position on a sphere of radius `radius`. */
export function latLngToVector3(lat: number, lng: number, radius = 1): Vec3 {
  const phi = (90 - lat) * DEG2RAD;
  const theta = (lng + 180) * DEG2RAD;
  const sinPhi = Math.sin(phi);

  return {
    x: -radius * sinPhi * Math.cos(theta),
    y: radius * Math.cos(phi),
    z: radius * sinPhi * Math.sin(theta),
  };
}

/** Inverse of `latLngToVector3` (any radius; direction is what matters). */
export function vector3ToLatLng(point: Vec3): LatLng {
  const { x, y, z } = point;
  const length = Math.hypot(x, y, z) || 1;
  const nx = x / length;
  const ny = y / length;
  const nz = z / length;

  const lat = 90 - Math.acos(Math.min(1, Math.max(-1, ny))) * RAD2DEG;
  const lng = Math.atan2(nz, -nx) * RAD2DEG - 180;

  return { lat, lng: ((lng + 540) % 360) - 180 };
}

/**
 * Great-circle distance in degrees, used to snap a globe click to a region.
 *
 * Haversine rather than the spherical law of cosines: `acos` is ill-conditioned
 * near zero, and here the interesting cases are exactly the small ones — is this
 * click on the anchor or a continent away? The law of cosines answers "0.0000009°
 * away" for a point that is *on* the anchor; haversine answers zero.
 */
export function angularDistance(a: LatLng, b: LatLng): number {
  const lat1 = a.lat * DEG2RAD;
  const lat2 = b.lat * DEG2RAD;
  const dLat = lat2 - lat1;
  const dLng = (b.lng - a.lng) * DEG2RAD;

  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  return 2 * Math.asin(Math.min(1, Math.sqrt(h))) * RAD2DEG;
}

/** Nearest region to a point, or `null` when the click lands mid-ocean. */
export function nearestRegion(point: LatLng, maxDistance = 62): Region | null {
  let best: Region | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const region of REGIONS) {
    const anchor = REGION_ANCHORS[region];
    const distance = angularDistance(point, { lat: anchor.lat, lng: anchor.lng });
    if (distance < bestDistance) {
      bestDistance = distance;
      best = region;
    }
  }

  return bestDistance <= maxDistance ? best : null;
}

/* -------------------------------------------------------------------------- */
/* Camera                                                                     */
/* -------------------------------------------------------------------------- */

/** Highest the camera may sit above the horizon before the view goes vertical. */
export const MAX_CAMERA_ELEVATION = 0.92;

/**
 * Where a camera should sit to look at a region.
 *
 * The direction is the anchor itself, lifted towards the north pole by
 * `elevation` so the view has a horizon rather than looking straight down at a
 * point. Near the poles there is nothing to lift towards without tipping the view
 * over the top, so the elevation is spent only as far as the geometry allows —
 * which is why the clamp is applied after blending rather than before.
 */
export function cameraTargetFor(region: Region, distance = 3.1, elevation = 0.35): Vec3 {
  const anchor = REGION_ANCHORS[region];
  const direction = latLngToVector3(anchor.lat, anchor.lng, 1);

  const lifted = {
    x: direction.x,
    y: direction.y + elevation * (1 - Math.abs(direction.y)),
    z: direction.z,
  };

  const length = Math.hypot(lifted.x, lifted.y, lifted.z) || 1;
  let unit = { x: lifted.x / length, y: lifted.y / length, z: lifted.z / length };

  if (Math.abs(unit.y) > MAX_CAMERA_ELEVATION) {
    const budget = Math.sqrt(1 - MAX_CAMERA_ELEVATION * MAX_CAMERA_ELEVATION);
    const horizontal = Math.hypot(unit.x, unit.z) || 1;
    unit = {
      x: (unit.x / horizontal) * budget,
      y: Math.sign(unit.y) * MAX_CAMERA_ELEVATION,
      z: (unit.z / horizontal) * budget,
    };
  }

  return { x: unit.x * distance, y: unit.y * distance, z: unit.z * distance };
}

/**
 * The region a camera is looking at, given its position on a sphere centred on the
 * globe. Used by the keyboard: Enter picks whatever is facing the visitor.
 */
export function regionFacingCamera(position: Vec3, maxDistance = 62): Region | null {
  const length = Math.hypot(position.x, position.y, position.z) || 1;
  const point = vector3ToLatLng({ x: position.x / length, y: position.y / length, z: position.z / length });
  return nearestRegion(point, maxDistance);
}

/**
 * The most-viewed species per region, capped per region.
 *
 * Pure and sorted, so the globe's tooltips and their tests agree on what "top"
 * means: views first, then the catalogue's own popularity as a tie-break for the
 * many species that have never been opened.
 */
export interface GlobePin {
  slug: string;
  name: string;
  views: number;
}

export function topSpeciesByRegion<
  T extends { region: string; slug: string; name: string; view_count?: number | null; popularity: number },
>(animals: readonly T[], limitPerRegion = 3): Record<string, GlobePin[]> {
  const grouped: Record<string, GlobePin[]> = {};

  const ranked = [...animals].sort(
    (a, b) => (b.view_count ?? 0) - (a.view_count ?? 0) || b.popularity - a.popularity,
  );

  for (const animal of ranked) {
    const list = grouped[animal.region] ?? (grouped[animal.region] = []);
    if (list.length < limitPerRegion) {
      list.push({ slug: animal.slug, name: animal.name, views: animal.view_count ?? 0 });
    }
  }

  return grouped;
}

/** All region anchors with their unit-sphere positions precomputed. */
export function regionMarkers(radius = 1) {
  return REGIONS.map((region) => ({
    region,
    anchor: REGION_ANCHORS[region],
    position: latLngToVector3(REGION_ANCHORS[region].lat, REGION_ANCHORS[region].lng, radius),
  }));
}

function drawDot(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string, alpha: number) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, size, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Equirectangular graticule drawn to a canvas: dot lattice + meridian/parallel
 * lines on a deep-ocean gradient. Returned as a texture by the globe component.
 */
export function createGraticuleCanvas(size = 2048): HTMLCanvasElement {
  const height = size / 2;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  // Ocean base: brighter around the equator, darker at the poles.
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#08101f");
  gradient.addColorStop(0.5, "#0d2440");
  gradient.addColorStop(1, "#08101f");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, height);

  const toX = (lng: number) => ((lng + 180) / 360) * size;
  const toY = (lat: number) => ((90 - lat) / 180) * height;

  // Dot lattice every 5 degrees.
  for (let lat = -85; lat <= 85; lat += 5) {
    for (let lng = -180; lng < 180; lng += 5) {
      const major = lat % 15 === 0 && lng % 15 === 0;
      drawDot(ctx, toX(lng), toY(lat), major ? 2.1 : 1.15, "#7ef3d8", major ? 0.5 : 0.22);
    }
  }

  // Meridians every 15 degrees.
  ctx.lineWidth = 1.4;
  for (let lng = -180; lng <= 180; lng += 15) {
    const x = toX(lng);
    const major = lng % 45 === 0;
    ctx.globalAlpha = major ? 0.3 : 0.14;
    ctx.strokeStyle = "#4fd8ff";
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  // Parallels every 15 degrees, plus a highlighted equator.
  for (let lat = -75; lat <= 75; lat += 15) {
    const y = toY(lat);
    if (lat === 0) {
      ctx.globalAlpha = 0.55;
      ctx.strokeStyle = "#35f0c0";
      ctx.lineWidth = 3;
    } else {
      ctx.globalAlpha = lat % 45 === 0 ? 0.26 : 0.13;
      ctx.strokeStyle = "#4fd8ff";
      ctx.lineWidth = 1.4;
    }
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y);
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
  return canvas;
}

/** Soft radial sprite used for the atmosphere glow and hotspot halos. */
export function createGlowCanvas(size = 256, color = "53, 240, 192"): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, `rgba(${color}, 0.9)`);
  gradient.addColorStop(0.35, `rgba(${color}, 0.35)`);
  gradient.addColorStop(0.7, `rgba(${color}, 0.08)`);
  gradient.addColorStop(1, `rgba(${color}, 0)`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  return canvas;
}
