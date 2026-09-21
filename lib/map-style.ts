/**
 * Where the map style comes from, and what it costs.
 *
 * **No API key, by rule.** The project runs with zero configuration (Demo Mode) and
 * `check:bundle` keeps the browser honest, so Mapbox GL - which needs an access token
 * before it will draw a single tile - was never an option. MapLibre with a keyless
 * style is the same renderer without the account.
 *
 * The default is OpenFreeMap: OpenStreetMap-derived vector tiles, no key, no cookie,
 * and attribution rendered in the corner by MapLibre itself. `NEXT_PUBLIC_MAP_STYLE_URL`
 * overrides it for a self-hosted or commercial tile provider, exactly the way
 * `NEXT_PUBLIC_DRACO_DECODER_PATH` overrides the decoder.
 */

export const DEFAULT_MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/dark";

/** Resolved once: the env var is inlined at build time by Next. */
export function mapStyleUrl(): string {
  const override = process.env.NEXT_PUBLIC_MAP_STYLE_URL;
  return override && override.trim().length > 0 ? override.trim() : DEFAULT_MAP_STYLE_URL;
}

/**
 * The style is a third-party request, so the map says who it is drawing.
 *
 * MapLibre renders the style's own `attribution` field too; this is the copy for the
 * page itself, which survives a style the visitor cannot see (no WebGL, blocked
 * network) and states the licence rather than just the name.
 */
export const MAP_ATTRIBUTION = {
  name: "OpenFreeMap",
  url: "https://openfreemap.org",
  data: "OpenStreetMap contributors",
  dataUrl: "https://www.openstreetmap.org/copyright",
  license: "ODbL 1.0",
} as const;

/**
 * The satellite overlay: NASA EOSDIS GIBS, public domain, keyless, world-wide.
 *
 * A **raster layer over the dark style**, not a second basemap. It is daily MODIS true-colour
 * imagery from a fixed snapshot date at a coarse resolution - a photograph of the ground, not a
 * survey - and every panel that offers it says so rather than letting it read as a recent
 * high-resolution image. Shared here because two Data2Map pages draw it, and one place for the
 * URL and the snapshot date is one place to update when it moves.
 */
export const SATELLITE_BASEMAP = {
  id: "satellite",
  tiles: [
    "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/2024-01-01/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg",
  ],
  tileSize: 256,
  attribution: {
    name: "NASA EOSDIS GIBS",
    url: "https://gibs.earthdata.nasa.gov",
    data: "MODIS Terra true colour",
    license: "Public domain",
    snapshot: "2024-01-01",
  },
} as const;
