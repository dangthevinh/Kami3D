/**
 * World geography for the globe, and the maths that puts it on a sphere.
 *
 * The shapes come from **Natural Earth** (naturalearthdata.com), which is public
 * domain — the same rule the 3D model pipeline enforces, applied to map data. The
 * 110m "land" layer is simplified to two decimal places (~1.1 km at the equator,
 * far finer than a 2048px texture) and committed as `public/geo/land-110m.json`.
 *
 * Everything here is pure: no canvas, no DOM. The browser draws from these
 * functions and the Node check suite verifies them, so the projection that decides
 * where Africa ends up is tested rather than eyeballed.
 */

/** One closed ring of `[longitude, latitude]` pairs, in degrees. */
export type LandRing = Array<[number, number]>;

export interface LandData {
  name: string;
  license: string;
  /** Outer rings; the 110m land layer has no holes. */
  polygons: LandRing[];
}

/**
 * Equirectangular projection onto a texture of `width` x `height`.
 *
 * Longitude -180..180 maps to x 0..width and latitude 90..-90 to y 0..height, which
 * is exactly how a texture wraps onto a three.js sphere: `u = 0` starts at -180°
 * and `v = 0` at the north pole.
 */
export function projectPoint(lon: number, lat: number, width: number, height: number): [number, number] {
  return [((lon + 180) / 360) * width, ((90 - lat) / 180) * height];
}

/** Inverse of `projectPoint`, used by the check suite to prove the round trip. */
export function unprojectPoint(x: number, y: number, width: number, height: number): [number, number] {
  return [(x / width) * 360 - 180, 90 - (y / height) * 180];
}

/** Project every ring, ready to be filled or stroked. */
export function projectLand(data: LandData, width: number, height: number): Array<Array<[number, number]>> {
  return data.polygons.map((ring) => ring.map(([lon, lat]) => projectPoint(lon, lat, width, height)));
}

/**
 * Is this coordinate on land?
 *
 * A ray-casting test in lon/lat space. Longitude is treated as a plain number
 * rather than a wrapped angle, which is correct here because Natural Earth splits
 * its polygons at the antimeridian — no ring crosses it.
 */
export function isLandAt(data: LandData, lon: number, lat: number): boolean {
  for (const ring of data.polygons) {
    let inside = false;

    for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
      const [xi, yi] = ring[i];
      const [xj, yj] = ring[j];

      // Half-open comparison avoids double-counting a vertex.
      if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
        inside = !inside;
      }
    }

    if (inside) return true;
  }

  return false;
}

/** Bounding box of every ring, in degrees. */
export function landBounds(data: LandData) {
  let west = 180;
  let east = -180;
  let south = 90;
  let north = -90;

  for (const ring of data.polygons) {
    for (const [lon, lat] of ring) {
      if (lon < west) west = lon;
      if (lon > east) east = lon;
      if (lat < south) south = lat;
      if (lat > north) north = lat;
    }
  }

  return { west, east, south, north };
}
