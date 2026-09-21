"use client";

import { ExternalLink, Info, MousePointerClick, Search } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { LayerPanel } from "@/components/map/LayerPanel";
import { LazyMap } from "@/components/map/LazyMap";
import { Badge } from "@/components/ui/badge";
import { boundsOf, expandBounds, type Bounds } from "@/lib/geo";
import { creditFor } from "@/lib/geodata-credits";
import {
  MAP_LAYER_IDS,
  serializeMapQuery,
  useMapLayers,
  type MapLayerId,
  type MapQuery,
} from "@/lib/map-layers";
import { cn } from "@/lib/utils";
import { REGIONS } from "@/types/animal";
import type { GeodataCollection, GeodataCredits, GeodataFeature } from "@/types/geodata";

/**
 * `/map`: the habitat view.
 *
 * All of the state - which layers, which region, which species - lives in the URL, and
 * this component is what keeps the two in step. The server renders from the same query
 * (see `app/map/page.tsx`), so a shared link opens the view the sender was looking at
 * and not a default that then jumps.
 *
 * The map renderer itself is not imported here: `LazyMap` pulls it in only when the
 * visitor reaches this route and the canvas is in view, which is what keeps MapLibre out
 * of every other page first paint.
 */

export interface MapSpecies {
  slug: string;
  name: string;
  region: string;
  conservation_status: string;
  category: string;
  emoji: string;
}

export interface MapExperienceProps {
  collection: GeodataCollection;
  credits: GeodataCredits;
  species: MapSpecies[];
  /** The query the server read from the URL. */
  initialQuery: MapQuery;
  /** "database" when the shapes came from PostGIS, "bundled" in Demo Mode. */
  source: "database" | "bundled";
}

/** Which bundled `kind` a layer draws; the count behind each switch comes from it. */
const KIND_FOR_LAYER: Partial<Record<MapLayerId, string>> = {
  habitat: "habitat_current",
  historic: "habitat_historic",
  protected: "protected_area",
};

function polygonBounds(features: GeodataFeature[]): Bounds | null {
  const rings = features
    .filter((feature) => feature.geometry.type === "Polygon")
    .map((feature) => (feature.geometry.coordinates as number[][][])[0]);

  const points = rings.flat().map((point) => [point[0], point[1]] as [number, number]);
  return boundsOf(points);
}

function asTuple(bounds: Bounds | null): [number, number, number, number] | null {
  if (!bounds) return null;
  const padded = expandBounds(bounds, 0.2);
  return [padded.west, padded.south, padded.east, padded.north];
}

export function MapExperience({ collection, credits, species, initialQuery, source }: MapExperienceProps) {
  const visible = useMapLayers((state) => state.visible);
  const opacity = useMapLayers((state) => state.opacity);
  const layers = useMapLayers((state) => state.layers);
  const region = useMapLayers((state) => state.region);
  const selectedSlug = useMapLayers((state) => state.species);
  const setVisible = useMapLayers((state) => state.setVisible);
  const setOpacity = useMapLayers((state) => state.setOpacity);
  const setRegion = useMapLayers((state) => state.setRegion);
  const setSpecies = useMapLayers((state) => state.setSpecies);
  const applyQuery = useMapLayers((state) => state.applyQuery);

  const [query, setQuery] = React.useState("");

  // The server already rendered the defaults, so the URL is applied once on mount.
  React.useEffect(() => {
    applyQuery(initialQuery);
  }, [applyQuery, initialQuery]);

  // Every later change writes back with replaceState rather than a router navigation:
  // the layers are drawn on the client, and a round trip would re-render a page that
  // has not changed.
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const search = serializeMapQuery({ layers, region, species: selectedSlug });
    window.history.replaceState(null, "", `/map${search}`);
  }, [layers, region, selectedSlug]);

  const features = collection.features;

  const available = React.useMemo(() => {
    const counts = Object.fromEntries(MAP_LAYER_IDS.map((id) => [id, 0])) as Record<MapLayerId, number>;
    for (const feature of features) {
      for (const [id, kind] of Object.entries(KIND_FOR_LAYER)) {
        if (feature.properties.kind === kind) counts[id as MapLayerId] += 1;
      }
    }
    return counts;
  }, [features]);

  const mapBounds = React.useMemo((): [number, number, number, number] | null => {
    if (selectedSlug) {
      const own = features.filter(
        (feature) => feature.properties.slug === selectedSlug && feature.properties.kind === "habitat_current",
      );
      const bounds = asTuple(polygonBounds(own));
      if (bounds) return bounds;
    }

    if (region) {
      const inRegion = features.filter(
        (feature) => feature.properties.region === region && feature.properties.kind === "habitat_current",
      );
      return asTuple(polygonBounds(inRegion));
    }

    return null;
  }, [features, region, selectedSlug]);

  const selected = selectedSlug ? species.find((entry) => entry.slug === selectedSlug) ?? null : null;
  const selectedFeature = selectedSlug
    ? features.find((feature) => feature.properties.slug === selectedSlug) ?? null
    : null;

  const matches = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (needle.length < 2) return [];
    return species.filter((entry) => entry.name.toLowerCase().includes(needle)).slice(0, 6);
  }, [query, species]);

  const regionsWithData = React.useMemo(() => {
    const present = new Set(features.map((feature) => feature.properties.region));
    return REGIONS.filter((entry) => present.has(entry));
  }, [features]);

  return (
    <div className="section-shell py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neon">Map</p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Habitat ranges
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/55">
            {source === "database"
              ? "Drawn from PostGIS: one polygon per species, filterable by region."
              : "Drawn from the bundled sample: one polygon per species, filterable by region."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-white/6 px-3 py-1.5 text-[11px] text-white/55 ring-1 ring-white/10">
            {features.length} shapes
          </span>
          <span className="rounded-full bg-white/6 px-3 py-1.5 text-[11px] text-white/55 ring-1 ring-white/10">
            {source === "database" ? "PostGIS" : "bundled sample"}
          </span>
        </div>
      </header>

      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="relative h-[420px] overflow-hidden rounded-[var(--radius-card)] ring-1 ring-white/10 sm:h-[540px] lg:h-[620px]">
          <LazyMap
            className="h-full w-full"
            features={features}
            visible={visible}
            opacity={opacity}
            selectedSlug={selectedSlug}
            regionBounds={mapBounds}
            onSelect={setSpecies}
            speciesCount={species.length}
            regionCount={regionsWithData.length}
          />

          <p className="pointer-events-none absolute bottom-3 left-3 z-10 flex items-center gap-1.5 rounded-full bg-void/70 px-3 py-1.5 text-[10px] text-white/55 backdrop-blur">
            <MousePointerClick className="size-3" aria-hidden />
            Click a shape to open the species
          </p>
        </div>

        <aside className="space-y-4">
          <div className="glass rounded-[var(--radius-card)] p-4">
            <label htmlFor="map-species-search" className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">
              Find a species
            </label>
            <div className="relative mt-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-white/35" aria-hidden />
              <input
                id="map-species-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Lion, panda, axolotl"
                className="h-9 w-full rounded-full bg-white/6 pl-9 pr-3 text-xs text-white/85 outline-none ring-1 ring-white/10 placeholder:text-white/30 focus-visible:ring-neon/60"
              />
            </div>

            {matches.length > 0 ? (
              <ul className="mt-2 space-y-1">
                {matches.map((entry) => (
                  <li key={entry.slug}>
                    <button
                      type="button"
                      onClick={() => {
                        setSpecies(entry.slug);
                        setQuery("");
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs text-white/70 transition-colors hover:bg-white/8 hover:text-white"
                    >
                      <span aria-hidden>{entry.emoji}</span>
                      {entry.name}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="glass rounded-[var(--radius-card)] p-4">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">Region</h2>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setRegion(null);
                  setSpecies(null);
                }}
                aria-pressed={region === null}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11px] transition-colors",
                  region === null ? "bg-white/14 text-white ring-1 ring-neon/40" : "text-white/55 hover:text-white",
                )}
              >
                Whole world
              </button>
              {regionsWithData.map((entry) => (
                <button
                  key={entry}
                  type="button"
                  onClick={() => {
                    setRegion(entry);
                    setSpecies(null);
                  }}
                  aria-pressed={region === entry}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[11px] transition-colors",
                    region === entry ? "bg-white/14 text-white ring-1 ring-neon/40" : "text-white/55 hover:text-white",
                  )}
                >
                  {entry}
                </button>
              ))}
            </div>
          </div>

          <LayerPanel
            visible={visible}
            opacity={opacity}
            available={available}
            onToggle={setVisible}
            onOpacity={setOpacity}
          />

          {selected ? (
            <div className="glass rounded-[var(--radius-card)] p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-white">
                    <span aria-hidden className="mr-1.5">{selected.emoji}</span>
                    {selected.name}
                  </p>
                  <p className="mt-0.5 text-[11px] text-white/45">
                    {selected.region} · {selected.conservation_status}
                  </p>
                </div>
                <Badge variant="neon">
                  {selectedFeature?.properties.year === null ? "present" : String(selectedFeature?.properties.year)}
                </Badge>
              </div>

              {selectedFeature?.properties.area_km2 ? (
                <p className="mt-3 text-xs text-white/55">
                  Shape area: {Math.round(Number(selectedFeature.properties.area_km2)).toLocaleString("en-US")} km2
                </p>
              ) : null}

              {selectedFeature?.properties.note ? (
                <p className="mt-3 flex items-start gap-2 rounded-xl bg-solar/10 px-3 py-2 text-[11px] leading-relaxed text-solar ring-1 ring-solar/20">
                  <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                  {String(selectedFeature.properties.note)}
                </p>
              ) : null}

              <p className="mt-3 text-[10px] leading-relaxed text-white/35">
                {creditFor(credits, String(selectedFeature?.properties.source ?? ""))}
              </p>

              <Link
                href={`/animal/${selected.slug}`}
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-neon hover:text-white"
              >
                Open the 3D model
                <ExternalLink className="size-3" aria-hidden />
              </Link>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
