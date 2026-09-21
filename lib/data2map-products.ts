/**
 * The Data2Map catalogue.
 *
 * Data2Map is the second product surface on this infrastructure: data maps for business
 * users rather than an animal encyclopedia. The two share auth, the database, the UI kit and
 * the map stack - and nothing else. Keeping the catalogue here, as plain data, is what lets
 * the landing page, the navigation and the check suite agree about what exists without any of
 * them hard-coding a list.
 *
 * `status` is the honest field. A product is `live` only when its route exists and its data
 * has a provenance row; `scripts/check-data2map.mjs` reads this file, checks the filesystem
 * for the route, and fails if a product claims to be live without one.
 *
 * Dependency-free so the checks can import it in plain Node.
 */

export const DATA2MAP_BASE = "/data2map";

export type Data2MapProductId = "real_estate" | "trends" | "logistics" | "stories" | "agriculture";

export interface Data2MapProduct {
  id: Data2MapProductId;
  /** The route, without the module prefix duplicated anywhere else. */
  href: string;
  name: string;
  /** One line, for the card. */
  tagline: string;
  /** The paragraph under it, which says what the product actually draws. */
  detail: string;
  /** The phase that builds it, so the landing page can be honest about the order. */
  phase: "D2" | "D3" | "D4" | "D5" | "D6";
  status: "live" | "planned";
  /** Tailwind colour token for the card accent. */
  accent: "neon" | "glow" | "iris" | "solar" | "coral";
}

/**
 * In build order, which is not the order they appear in the menu.
 *
 * The order (D2, D5, D3, D4, D6) is the one the plan chose by cost: story maps reuse the 3D
 * and timeline work that already exists, while the agricultural dashboard needs a raster tile
 * pipeline the project does not have yet.
 */
export const DATA2MAP_PRODUCTS: readonly Data2MapProduct[] = [
  {
    id: "real_estate",
    href: "/data2map/real-estate",
    name: "Real Estate & Zoning",
    tagline: "Prices, parcels and what is around them",
    detail:
      "A land-price surface, zoning overlays on a satellite base, the amenities within walking distance, and the flood and pollution layers that decide whether a plot is worth it.",
    phase: "D2",
    status: "live",
    accent: "neon",
  },
  {
    id: "stories",
    href: "/data2map/stories",
    name: "Cultural & Story Maps",
    tagline: "Places with a story, told on the map",
    detail:
      "Curated, cited entries pinned to real coordinates, with the 3D viewer beside the map for the places that have a model.",
    phase: "D5",
    status: "planned",
    accent: "iris",
  },
  {
    id: "trends",
    href: "/data2map/trends",
    name: "Footfall & Trend Map",
    tagline: "How busy a place is, by hour and by week",
    detail:
      "A playable clock over footfall and population signals, for choosing a site or reading a catchment. Simulated where no open dataset exists - and labelled as simulated.",
    phase: "D3",
    status: "planned",
    accent: "solar",
  },
  {
    id: "logistics",
    href: "/data2map/logistics",
    name: "Logistics & Fleet",
    tagline: "Routes, traces and the clock",
    detail:
      "Vehicle traces animated over the road graph, with stops, dwell time and a timeline that answers where a fleet was at any hour.",
    phase: "D4",
    status: "planned",
    accent: "glow",
  },
  {
    id: "agriculture",
    href: "/data2map/agriculture",
    name: "Agri Geo-Analytics",
    tagline: "Fields, seasons and vegetation",
    detail:
      "Field boundaries with the vegetation index over the growing season, rainfall and yield estimates. The licence is settled (Copernicus, USGS); the tile pipeline is not built yet.",
    phase: "D6",
    status: "planned",
    accent: "coral",
  },
];

export function isProductId(value: string): value is Data2MapProductId {
  return DATA2MAP_PRODUCTS.some((product) => product.id === value);
}

export function productForHref(href: string): Data2MapProduct | null {
  return DATA2MAP_PRODUCTS.find((product) => product.href === href) ?? null;
}

export function liveProducts(): Data2MapProduct[] {
  return DATA2MAP_PRODUCTS.filter((product) => product.status === "live");
}

export function plannedProducts(): Data2MapProduct[] {
  return DATA2MAP_PRODUCTS.filter((product) => product.status === "planned");
}

/** The layer ids a product page may draw, in registry order. */
export function layerIdsFor(datasetProducts: readonly { id: string }[]): string[] {
  return datasetProducts.map((layer) => layer.id);
}
