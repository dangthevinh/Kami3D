"use client";

import { ExternalLink, Info, MousePointerClick, Search } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { LayerPanel } from "@/components/map/LayerPanel";
import { LazyMap } from "@/components/map/LazyMap";
import { RiskBreakdownList, RiskLegend, RiskPanel, type RiskRow } from "@/components/map/RiskPanel";
import { PathPlayer, RangeTimeline } from "@/components/map/TimelinePanel";
import { useSettings } from "@/components/settings/SettingsProvider";
import { describeGap, formatYear, frameForYear, yearsWithRanges, type TimelineEvent } from "@/lib/timeline";
import type { MigrationRoute } from "@/types/migration";
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
import type { Feature, FeatureCollection, Geometry } from "geojson";

import { assessRisk, type ObservationBucket } from "@/lib/risk";
import { REGIONS } from "@/types/animal";
import type { GeodataCollection, GeodataCredits, GeodataFeature } from "@/types/geodata";
import type { ThreatImpactRow, ThreatPoint } from "@/lib/threats";

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
  /** The spatial join: how much of each species range a threat overlaps. */
  impact: ThreatImpactRow[];
  /** Dated, cited annotations for the timeline. */
  events: TimelineEvent[];
  /** Derived seasonal paths, with the method and coherence that produced them. */
  routes: MigrationRoute[];
}

/** Which bundled `kind` a layer draws; the count behind each switch comes from it. */
const KIND_FOR_LAYER: Partial<Record<MapLayerId, string>> = {
  habitat: "habitat_current",
  historic: "habitat_historic",
  protected: "protected_area",
  occurrence: "occurrence",
};

/** The IUCN categories, in the order the Red List lists them. */
const STATUS_FILTERS = ["Critically Endangered", "Endangered", "Vulnerable", "Near Threatened", "Least Concern"] as const;

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

export function MapExperience({
  collection,
  credits,
  species,
  initialQuery,
  source,
  impact,
  events,
  routes,
}: MapExperienceProps) {
  const reduceMotion = useSettings().settings.reduceMotion;
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
  const [mode, setMode] = React.useState<"ranges" | "path">("ranges");
  const [mobilePanel, setMobilePanel] = React.useState<"filters" | "layers" | "risk" | "time">("time");
  const [progress, setProgress] = React.useState(0);

  /**
   * The timeline, and the year it is showing.
   *
   * The default is the most recent year with a published shape, because that is the map
   * every other page links to. `year` only narrows the *range* layer: occurrence, threat
   * and path layers are not dated in this data, and pretending otherwise would be a worse
   * lie than a simpler control.
   */
  const years = React.useMemo(() => yearsWithRanges(collection.features), [collection.features]);
  const [year, setYear] = React.useState<number | null>(null);
  const activeYear = year ?? years[years.length - 1] ?? new Date().getUTCFullYear();

  const frame = React.useMemo(
    () => frameForYear({ features: collection.features, events, year: activeYear, window: 2 }),
    [collection.features, events, activeYear],
  );

  const [routeSlug, setRouteSlug] = React.useState<string | null>(null);
  const route = React.useMemo(
    () => routes.find((entry) => entry.slug === routeSlug) ?? routes[0] ?? null,
    [routes, routeSlug],
  );
  const [statuses, setStatuses] = React.useState<string[]>([]);
  const [categories, setCategories] = React.useState<string[]>([]);

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

  const allFeatures = collection.features;

  const categoriesInData = React.useMemo(
    () => [...new Set(allFeatures.map((feature) => feature.properties.category).filter(Boolean))].sort() as string[],
    [allFeatures],
  );

  /**
   * The shapes the map draws after the filters.
   *
   * The selected species is always included: clicking a shape and then narrowing the filter
   * must not make the thing you just clicked disappear.
   */
  const features = React.useMemo(() => {
    const matching = allFeatures.filter((feature) => {
      const props = feature.properties;
      // The timeline dates the habitat layer only; occurrences, threats and paths are not
      // dated in this data, and hiding them behind a year would be an invention.
      if (mode === "ranges" && (props.kind === "habitat_current" || props.kind === "habitat_historic")) {
        const own = props.year;
        const value = own === null || own === undefined ? new Date().getUTCFullYear() : Number(own);
        if (value !== activeYear) return false;
      }
      if (region && props.region !== region) return false;
      if (statuses.length > 0 && !statuses.includes(String(props.conservation_status))) return false;
      if (categories.length > 0 && !categories.includes(String(props.category))) return false;
      return true;
    });

    if (selectedSlug && !matching.some((feature) => feature.properties.slug === selectedSlug)) {
      matching.push(...allFeatures.filter((feature) => feature.properties.slug === selectedSlug));
    }

    return matching;
  }, [allFeatures, region, statuses, categories, selectedSlug, mode, activeYear]);

  const available = React.useMemo(() => {
    const counts = Object.fromEntries(MAP_LAYER_IDS.map((id) => [id, 0])) as Record<MapLayerId, number>;
    for (const feature of features) {
      for (const [id, kind] of Object.entries(KIND_FOR_LAYER)) {
        if (feature.properties.kind !== kind) continue;
        // A shape counts as one shape - except the occurrence layer, where the useful
        // number is how many records it holds, not how many species it covers.
        const points = Array.isArray(feature.geometry.coordinates[0]) && feature.geometry.type === "MultiPoint"
          ? feature.geometry.coordinates.length
          : 1;
        counts[id as MapLayerId] += points;
      }
    }
    return counts;
  }, [features]);

  /**
   * What the observation layer actually contains, across whatever is on screen.
   *
   * The constraint this exists for: a heatmap of sightings must not read as a map of how
   * many animals there are. So the count, the years and the licence travel with the layer
   * and are printed next to it, from the same properties the pipeline recorded.
   */
  const observation = React.useMemo(() => {
    const rows = features.filter((feature) => feature.properties.kind === "occurrence");
    if (rows.length === 0) return null;

    const records = rows.reduce((sum, feature) => sum + Number(feature.properties.records ?? feature.geometry.coordinates.length ?? 0), 0);
    const years = rows.map((feature) => [Number(feature.properties.year_min ?? 0), Number(feature.properties.year_max ?? 0)]);

    return {
      records,
      species: rows.length,
      from: Math.min(...years.map(([min]) => min)) || null,
      to: Math.max(...years.map(([, max]) => max)) || null,
      license: rows.some((feature) => feature.properties.license === "CC-BY") ? "CC-BY" : "CC0",
      source: rows[0].properties.source,
      note: String(rows[0].properties.note ?? ""),
    };
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

  /**
   * The risk index for every species, from the inputs this page actually holds.
   *
   * `assessRisk` is pure and tested (`npm run check:risk`); this only gathers what it
   * needs: the IUCN category from the catalogue, the range area from the habitat shape, the
   * overlapping share from the PostGIS join, and the observation trend from the year
   * buckets GBIF left in the occurrence properties. Anything missing stays missing.
   */
  const riskRows = React.useMemo<RiskRow[]>(() => {
    const impactBySlug = new Map(impact.map((row) => [row.slug, row]));
    const areaBySlug = new Map<string, number>();
    const bucketsBySlug = new Map<string, ObservationBucket[]>();

    for (const feature of collection.features) {
      const props = feature.properties;
      if (props.kind === "habitat_current" && typeof props.area_km2 === "number") {
        areaBySlug.set(props.slug, props.area_km2);
      }
      if (props.kind === "occurrence" && Array.isArray(props.buckets)) {
        bucketsBySlug.set(props.slug, props.buckets as ObservationBucket[]);
      }
    }

    return species
      .map((entry) => {
        const hit = impactBySlug.get(entry.slug);
        return {
          slug: entry.slug,
          name: entry.name,
          breakdown: assessRisk({
            conservationStatus: entry.conservation_status,
            rangeAreaKm2: areaBySlug.get(entry.slug) ?? null,
            threatenedFraction: hit ? Number(hit.threatened_fraction) : null,
            worstSeverity: hit ? Number(hit.worst_severity) : null,
            observationBuckets: bucketsBySlug.get(entry.slug) ?? null,
          }),
        };
      })
      .filter((row) => row.breakdown.score !== null)
      .sort((a, b) => (b.breakdown.score ?? 0) - (a.breakdown.score ?? 0));
  }, [collection.features, impact, species]);

  /**
   * The threat layer arrives on demand, the first time the switch is flipped.
   *
   * It is a few hundred kilobytes of centroids, and most visits never show it: fetching it
   * with the page would make everyone pay for a layer they did not ask for. `loadingThreats`
   * exists so the switch can say it is working rather than appear broken.
   */
  const [threatPoints, setThreatPoints] = React.useState<ThreatPoint[] | null>(null);
  const [loadingThreats, setLoadingThreats] = React.useState(false);

  React.useEffect(() => {
    if (!visible.pressure || threatPoints !== null || loadingThreats) return;

    setLoadingThreats(true);
    let cancelled = false;

    fetch("/api/threats", { cache: "force-cache" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { features?: ThreatPoint[] } | null) => {
        if (!cancelled) setThreatPoints(data?.features ?? []);
      })
      .catch(() => {
        if (!cancelled) setThreatPoints([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingThreats(false);
      });

    return () => {
      cancelled = true;
    };
  }, [visible.pressure, threatPoints, loadingThreats]);

  const routeCollection = React.useMemo<FeatureCollection<Geometry> | null>(
    () =>
      route
        ? {
            type: "FeatureCollection",
            features: [
              {
                type: "Feature",
                properties: {},
                geometry: { type: "LineString", coordinates: route.coordinates },
              } as Feature<Geometry>,
            ],
          }
        : null,
    [route],
  );

  const stopCollection = React.useMemo<FeatureCollection<Geometry> | null>(
    () =>
      route
        ? {
            type: "FeatureCollection" as const,
            features: route.stops.map(
              (stop) =>
                ({
                  type: "Feature",
                  properties: { month: stop.month, records: stop.records },
                  geometry: { type: "Point", coordinates: stop.coordinates },
                }) as Feature<Geometry>,
            ),
          }
        : null,
    [route],
  );

  const threatCollection = React.useMemo(
    () => ({ type: "FeatureCollection" as const, features: threatPoints ?? [] }),
    [threatPoints],
  );

  const selected = selectedSlug ? species.find((entry) => entry.slug === selectedSlug) ?? null : null;
  const selectedRisk = selectedSlug ? riskRows.find((row) => row.slug === selectedSlug) ?? null : null;
  const selectedFeature = selectedSlug
    ? features.find((feature) => feature.properties.slug === selectedSlug) ?? null
    : null;

  /**
   * One panel at a time on a phone; everything at once on a laptop.
   *
   * A map, a timeline and four panels do not fit on a phone screen together, and a
   * collapsed panel the visitor cannot find is the same as a missing feature - so the
   * panels are tabs on small screens and a column on large ones.
   */
  const panelClass = (name: typeof mobilePanel) =>
    cn(mobilePanel === name ? "block" : "hidden", "lg:block");

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
            threats={threatPoints && threatPoints.length > 0 ? threatCollection : null}
            route={route && mode === "path" ? routeCollection : null}
            routeProgress={route && mode === "path" ? progress : null}
            stops={route && mode === "path" ? stopCollection : null}
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

          {visible.occurrence && observation ? (
            <div className="pointer-events-none absolute left-3 top-3 z-10 max-w-xs rounded-2xl bg-void/75 p-3 text-[10px] leading-relaxed text-white/60 backdrop-blur ring-1 ring-white/10">
              <p className="text-[11px] font-semibold text-white/85">Observation density</p>
              <p className="mt-1">
                {observation.records.toLocaleString("en-US")} records across {observation.species} species
                {observation.from && observation.to ? `, ${observation.from}-${observation.to}` : ""}
              </p>
              <p className="mt-1 text-white/40">
                {observation.source} · {observation.license} · where the species has been recorded, not how
                many there are
              </p>
            </div>
          ) : null}
        </div>

        <aside className="space-y-4">
          <div className="glass rounded-[var(--radius-card)] p-1.5" role="group" aria-label="Map mode">
            <div className="grid grid-cols-2 gap-1.5">
              {(["ranges", "path"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={mode === value}
                  onClick={() => setMode(value)}
                  className={cn(
                    "rounded-xl px-3 py-2 text-xs font-medium transition-colors",
                    mode === value ? "bg-white/14 text-white ring-1 ring-neon/40" : "text-white/60 hover:bg-white/8 hover:text-white",
                  )}
                >
                  {value === "ranges" ? "Ranges & timeline" : "Seasonal path"}
                </button>
              ))}
            </div>
          </div>

          {/* Mobile tabs: the same panels, one at a time. */}
          <div className="glass flex gap-1 rounded-full p-1 lg:hidden" role="tablist" aria-label="Panels">
            {(["time", "filters", "layers", "risk"] as const).map((value) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={mobilePanel === value}
                onClick={() => setMobilePanel(value)}
                className={cn(
                  "flex-1 rounded-full px-2 py-1.5 text-[11px] capitalize transition-colors",
                  mobilePanel === value ? "bg-white/14 text-white" : "text-white/55",
                )}
              >
                {value}
              </button>
            ))}
          </div>

          <div className={panelClass("time")}>
            {mode === "ranges" ? (
              <RangeTimeline
                years={years}
                year={activeYear}
                onYear={setYear}
                events={frame.events}
                gapMessage={describeGap(frame, formatYear)}
                reduceMotion={reduceMotion}
              />
            ) : (
              <PathPlayer
                routes={routes}
                slug={routeSlug}
                onSlug={setRouteSlug}
                reduceMotion={reduceMotion}
                progress={progress}
                onProgress={setProgress}
                speciesName={(slug) => species.find((entry) => entry.slug === slug)?.name ?? slug}
              />
            )}
          </div>

          <div className={cn("space-y-4", panelClass("filters"))}>
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

          <div className="glass rounded-[var(--radius-card)] p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">Filters</h2>
              {statuses.length + categories.length > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    setStatuses([]);
                    setCategories([]);
                  }}
                  className="text-[11px] text-neon hover:text-white"
                >
                  Clear
                </button>
              ) : null}
            </div>

            <p className="mt-2 text-[10px] uppercase tracking-wide text-white/30">Conservation status</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {STATUS_FILTERS.map((status) => {
                const active = statuses.includes(status);
                return (
                  <button
                    key={status}
                    type="button"
                    aria-pressed={active}
                    onClick={() =>
                      setStatuses((current) =>
                        active ? current.filter((entry) => entry !== status) : [...current, status],
                      )
                    }
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[11px] transition-colors",
                      active ? "bg-white/14 text-white ring-1 ring-neon/40" : "text-white/55 hover:text-white",
                    )}
                  >
                    {status}
                  </button>
                );
              })}
            </div>

            <p className="mt-3 text-[10px] uppercase tracking-wide text-white/30">Class</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {categoriesInData.map((category) => {
                const active = categories.includes(category);
                return (
                  <button
                    key={category}
                    type="button"
                    aria-pressed={active}
                    onClick={() =>
                      setCategories((current) =>
                        active ? current.filter((entry) => entry !== category) : [...current, category],
                      )
                    }
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[11px] transition-colors",
                      active ? "bg-white/14 text-white ring-1 ring-neon/40" : "text-white/55 hover:text-white",
                    )}
                  >
                    {category}
                  </button>
                );
              })}
            </div>
          </div>

          </div>

          <div className={cn("space-y-4", panelClass("layers"))}>
            <RiskLegend />

            <LayerPanel
            visible={visible}
            opacity={opacity}
            available={available}
            onToggle={setVisible}
              onOpacity={setOpacity}
            />
          </div>

          <div className={panelClass("risk")}>
            <RiskPanel rows={riskRows} selectedSlug={selectedSlug} onSelect={setSpecies} />
          </div>

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

              {selectedRisk ? (
                <div className="mt-3 border-t border-white/10 pt-3">
                  <p className="flex items-baseline justify-between text-[11px]">
                    <span className="font-medium text-white/75">Risk index</span>
                    <span className={cn("tabular-nums", selectedRisk.breakdown.band.textClass)}>
                      {selectedRisk.breakdown.score ?? "-"} · {selectedRisk.breakdown.band.label}
                    </span>
                  </p>
                  <RiskBreakdownList breakdown={selectedRisk.breakdown} />
                  <p className="mt-2 text-[10px] text-white/30">
                    Built from {Math.round(selectedRisk.breakdown.coverage * 100)}% of the index weight.
                  </p>
                </div>
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
