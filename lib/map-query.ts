import { REGIONS, type Region } from "../types/animal.ts";

/**
 * The map's state, as a URL.
 *
 * The layer toggles live in a zustand store (`lib/map-layers.ts`), but the *shape* of
 * what a map view is - which layers, which region, which species - is defined here and
 * nowhere else. Two reasons it is a separate, dependency-free module:
 *
 *   1. it is user input. `?layers=habitat,../../etc/passwd` has to come out of the
 *      parser as a valid query or nothing, and that is a thing to test;
 *   2. the server renders `/map` from the same query the client hydrates with, so the
 *      definition of "what is on screen" cannot live inside a `"use client"` store.
 *
 * `scripts/check-map.mjs` pins the round trip.
 */

/** Every layer the product can draw. The ids are the API: they appear in the URL. */
export interface MapLayerDefinition {
  id: MapLayerId;
  label: string;
  hint: string;
  /** Where the data comes from, printed next to the switch. */
  source: string;
  license: string;
  /** Set when the layer exists in the panel but has no data behind it yet. */
  unavailable?: string;
}

const LAYER_IDS = ["habitat", "historic", "occurrence", "protected", "pressure"] as const;
export type MapLayerId = (typeof LAYER_IDS)[number];

/**
 * Every layer the product can draw. The ids are the API: they appear in the URL.
 *
 * Each one carries its source and licence because a map layer without provenance is a
 * claim without a citation - and the two layers with no usable source say so in the panel
 * (`unavailable`) rather than being quietly missing.
 */
export const MAP_LAYERS: readonly MapLayerDefinition[] = [
  { id: "habitat", label: "Habitat range", source: "Kami3D demo envelopes", license: "CC0", hint: "The area each species is recorded in. Currently generated envelopes, not published ranges." },
  { id: "historic", label: "Historic range", source: "Kami3D demo envelopes", license: "CC0", hint: "A range as it was in the past, for the species where we have one." },
  { id: "occurrence", label: "Observation density", source: "GBIF occurrence search", license: "CC0 / CC BY 4.0", hint: "Where the species has actually been recorded. Not how many there are." },
  { id: "protected", label: "Protected areas", source: "WDPA (refused)", license: "Non-commercial", unavailable: "WDPA is non-commercial and this site carries advertising, so the layer is not drawn.", hint: "Parks and reserves." },
  { id: "pressure", label: "Urban expansion", source: "Natural Earth urban areas", license: "Public domain", hint: "Severity-1 to 5 urban extent, used as a coarse stand-in for human pressure on a range." },
];

// Compile-time guard: a layer id that has no definition, or a definition with no id,
// stops the build rather than reaching the panel as an unlabelled switch.
export type MapLayerIdsAreComplete = MapLayerId extends (typeof MAP_LAYERS)[number]["id"] ? true : never;

export const MAP_LAYER_IDS: readonly MapLayerId[] = MAP_LAYERS.map((layer) => layer.id);

/** Habitat alone on a first visit: the map has to be readable before it is busy. */
export const DEFAULT_LAYER_VISIBILITY: Record<MapLayerId, boolean> = {
  habitat: true,
  historic: false,
  occurrence: false,
  protected: false,
  pressure: false,
};

export const DEFAULT_LAYER_OPACITY: Record<MapLayerId, number> = {
  habitat: 0.45,
  historic: 0.3,
  occurrence: 0.6,
  protected: 0.35,
  pressure: 0.4,
};

export interface MapQuery {
  /** Layers explicitly turned on, in URL order. Empty means "the defaults". */
  layers: MapLayerId[];
  region: Region | null;
  /** One species to highlight and fly to, when a link asked for one. */
  species: string | null;
}

export const EMPTY_MAP_QUERY: MapQuery = { layers: [], region: null, species: null };

function isLayerId(value: string): value is MapLayerId {
  return (MAP_LAYER_IDS as readonly string[]).includes(value);
}

function isRegion(value: string): value is Region {
  return (REGIONS as readonly string[]).includes(value);
}

/**
 * Reads `?layers=habitat,occurrence&species=lion&region=Africa`.
 *
 * Unknown layers, unknown regions, duplicates and nonsense are dropped rather than
 * thrown: this is a URL, and a link written by an older version of the app should still
 * open a map instead of an error page.
 */
export function parseMapQuery(search: string): MapQuery {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);

  const layers = [
    ...new Set(
      (params.get("layers") ?? "")
        .split(",")
        .map((part) => part.trim())
        .filter((part) => part.length > 0 && isLayerId(part)),
    ),
  ] as MapLayerId[];

  const region = params.get("region");
  const species = (params.get("species") ?? "").trim();

  return {
    layers,
    region: region !== null && isRegion(region) ? region : null,
    species: species.length > 0 && species.length <= 64 ? species : null,
  };
}

/**
 * The same query as a string, leaving the defaults out.
 *
 * A link to the map as it opens carries nothing; a link to a filtered map carries only
 * what differs, which keeps shared URLs short and stable enough to diff.
 */
export function serializeMapQuery(query: MapQuery): string {
  const params = new URLSearchParams();

  const layers = query.layers.filter(isLayerId);
  if (layers.length > 0) params.set("layers", layers.join(","));
  if (query.region && isRegion(query.region)) params.set("region", query.region);
  if (query.species) params.set("species", query.species);

  const serialised = params.toString();
  return serialised.length > 0 ? `?${serialised}` : "";
}

/** The visibility map a query implies: the layers it names, or the defaults. */
export function visibilityFor(query: MapQuery): Record<MapLayerId, boolean> {
  if (query.layers.length === 0) return { ...DEFAULT_LAYER_VISIBILITY };

  const visibility = Object.fromEntries(MAP_LAYER_IDS.map((id) => [id, false])) as Record<MapLayerId, boolean>;
  for (const id of query.layers) visibility[id] = true;
  return visibility;
}

/** True when the query says nothing, which is what the bare `/map` link means. */
export function isDefaultMapQuery(query: MapQuery): boolean {
  return serializeMapQuery(query).length === 0;
}
