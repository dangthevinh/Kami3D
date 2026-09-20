// Relative with an explicit extension: the Node check suite runs this module
// directly (type stripping, no bundler), where a "@/" alias would not resolve.
import { projectLand, type LandData } from "./earth-map.ts";

/**
 * Draws the world map that wraps the globe.
 *
 * Rendered to a canvas rather than shipped as a photo for two reasons: the palette
 * is the product's own (deep ocean, muted land, a neon coastline) instead of a
 * satellite photo that fights the dark theme, and the only data that has to travel
 * is 76 KB of public-domain geometry rather than a multi-megabyte image.
 *
 * The canvas is one equirectangular frame, which is exactly what a three.js sphere
 * expects: `u` runs -180° -> 180° left to right and `v` runs the north pole ->
 * south pole top to bottom.
 */

const OCEAN = {
  pole: "#050b18",
  equator: "#0b2440",
  shelf: "#123a5c",
};

const LAND = {
  north: "#2f6b57",
  equator: "#3d8a63",
  south: "#275445",
};

const COAST = "rgba(53, 240, 192, 0.55)";
const GRID = "rgba(79, 216, 255, 0.16)";

export interface EarthTextureOptions {
  /** Texture width in pixels; height is always half. */
  width?: number;
  /** Draw the latitude/longitude lattice on top of the map. */
  graticule?: boolean;
  /** Soft green outline along every coast. Costs a shadow pass. */
  coastlineGlow?: boolean;
}

export function createEarthCanvas(data: LandData, options: EarthTextureOptions = {}): HTMLCanvasElement {
  const width = options.width ?? 2048;
  const height = Math.round(width / 2);
  const { graticule = true, coastlineGlow = true } = options;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  /* --- Ocean ------------------------------------------------------------- */
  // Brightest at the equator, darkest at the poles, which reads as depth once it
  // is wrapped around a lit sphere.
  const ocean = ctx.createLinearGradient(0, 0, 0, height);
  ocean.addColorStop(0, OCEAN.pole);
  ocean.addColorStop(0.5, OCEAN.equator);
  ocean.addColorStop(1, OCEAN.pole);
  ctx.fillStyle = ocean;
  ctx.fillRect(0, 0, width, height);

  /* --- Land -------------------------------------------------------------- */
  const rings = projectLand(data, width, height);

  // One path, filled once: the nonzero winding rule then handles every island and
  // the polygons Natural Earth already split at the antimeridian.
  ctx.beginPath();
  for (const ring of rings) {
    ctx.moveTo(ring[0][0], ring[0][1]);
    for (let i = 1; i < ring.length; i += 1) {
      ctx.lineTo(ring[i][0], ring[i][1]);
    }
    ctx.closePath();
  }

  const land = ctx.createLinearGradient(0, 0, 0, height);
  land.addColorStop(0, LAND.north);
  land.addColorStop(0.5, LAND.equator);
  land.addColorStop(1, LAND.south);
  ctx.fillStyle = land;
  ctx.fill();

  // Continental shelf: a wider, fainter stroke sitting just outside the coast.
  if (coastlineGlow) {
    ctx.save();
    ctx.strokeStyle = "rgba(56, 224, 255, 0.22)";
    ctx.lineWidth = Math.max(2, width * 0.0035);
    ctx.lineJoin = "round";
    ctx.stroke();
    ctx.restore();
  }

  ctx.save();
  ctx.strokeStyle = COAST;
  ctx.lineWidth = Math.max(1, width * 0.0009);
  ctx.lineJoin = "round";
  if (coastlineGlow) {
    ctx.shadowColor = "rgba(53, 240, 192, 0.85)";
    ctx.shadowBlur = width * 0.004;
  }
  ctx.stroke();
  ctx.restore();

  /* --- Graticule --------------------------------------------------------- */
  if (graticule) {
    ctx.save();
    ctx.strokeStyle = GRID;
    ctx.lineWidth = Math.max(1, width * 0.0007);

    for (let lon = -180; lon <= 180; lon += 15) {
      const x = ((lon + 180) / 360) * width;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    for (let lat = -75; lat <= 75; lat += 15) {
      const y = ((90 - lat) / 180) * height;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // The equator earns a line of its own.
    ctx.strokeStyle = "rgba(53, 240, 192, 0.3)";
    ctx.lineWidth = Math.max(1.5, width * 0.0012);
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();
    ctx.restore();
  }

  return canvas;
}
