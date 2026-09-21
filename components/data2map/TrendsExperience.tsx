"use client";

import { AlertTriangle, Clock, Info, Layers } from "lucide-react";
import dynamic from "next/dynamic";
import * as React from "react";

import { LayerPanel } from "@/components/map/LayerPanel";
import { MapSkeleton } from "@/components/map/LazyMap";
import { RangeTimeline } from "@/components/map/TimelinePanel";
import { Switch } from "@/components/settings/Controls";
import { MountWhenVisible } from "@/components/3d/MountWhenVisible";
import { pointInPolygon } from "@/lib/geo";
import {
  SITE_WEIGHTS,
  TREND_CATEGORIES,
  TREND_CATEGORY_LABEL,
  assessSiteGap,
  competitorsWithin,
  dayCurve,
  hourTicks,
  peakHour,
  type TrendCategory,
} from "@/lib/data2map/footfall";
import {
  formatCount,
  legendStops,
  maxIntensity,
  metricDefinition,
  valuedCollection,
  type TrendHex,
  type TrendMetric,
  type TrendsSample,
} from "@/lib/data2map/trends";
import { cn } from "@/lib/utils";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import type { Data2MapLayer } from "@/lib/data2map";

/**
 * The trends page: a clock, a category, and a score you can argue with.
 *
 * Two datasets sit behind one hex grid and the page never lets them blur together:
 *
 *   - **population density is real** - WorldPop 2020, CC BY 4.0, summed per hex;
 *   - **hourly footfall is simulated** - CC0, and labelled as simulated in the layer hint, the
 *     clock's own message and the popup.
 *
 * The real places come from two OpenStreetMap queries, because they answer two different questions:
 *
 *   1. **what is on screen** - the current view, refetched when the visitor pans, which is what the
 *      pins are drawn from. A city-wide query is more than a public mirror will answer;
 *   2. **what is next to the hex that was clicked** - a one-kilometre box, counted live, which is
 *      what the site score's supply term is built on. Counting from the visible pins instead would
 *      make the score depend on the zoom level.
 *
 * The click handler finds the hex, counts real competitors around it, and hands the two signals to
 * `assessSiteGap` - a pure function with its own check suite that says which parts it had and which
 * it did not. The clock is Phase 16's `RangeTimeline`, parameterised for hours rather than years.
 */

const TrendsCanvasView = dynamic(
  () => import("@/components/data2map/TrendsCanvas").then((mod) => mod.TrendsCanvas),
  { ssr: false, loading: () => <MapSkeleton /> },
);

/** A radius a person actually walks: the same one the score is told about. */
const COMPETITOR_RADIUS_KM = 1;

/** Degrees around the clicked point that cover roughly that radius. */
const AROUND_BOX = { lng: 0.011, lat: 0.0105 };

/**
 * The zoom rule, said out loud.
 *
 * OpenStreetMap's public mirrors answer a viewport-sized question in seconds, and a whole-city one
 * not at all - so the places layer loads from about street level up. The heat, the clock and the
 * score all work at any zoom; only the pins wait for it.
 */
const ZOOM_HINT =
  "Zoom in to about four kilometres across and the places load from OpenStreetMap — the public mirrors answer a few kilometres at a time. The hexes, the clock and the score work at any zoom.";

type Bounds = [number, number, number, number];

export interface TrendsExperienceProps {
  sample: TrendsSample;
  layers: Data2MapLayer[];
  /** Where each layer's data comes from, straight from the registry - the panel prints it. */
  sources: Record<string, string>;
  /** Why a layer the phase brief asked for is not here, so the page says it rather than omits it. */
  omittedLayers: string[];
}

function hexAt(sample: TrendsSample, lng: number, lat: number): TrendHex | null {
  const point = [lng, lat];
  return (
    (sample.collection.features as TrendHex[]).find(
      (feature) => feature.geometry.type === "Polygon" && pointInPolygon(point, feature.geometry.coordinates as number[][][]),
    ) ?? null
  );
}

/** The Overpass answer as a collection, plus the note the panel prints under the layers. */
async function fetchPlaces(query: string, signal: AbortSignal): Promise<{ collection: FeatureCollection<Geometry>; note: string } | { error: string }> {
  try {
    const response = await fetch(`/api/data2map/pois?${query}`, { signal });
    const data = await response.json();

    // 413 is the zoom rule, not a failure: Overpass is asked a few kilometres at a time.
    if (response.status === 413) return { error: ZOOM_HINT };
    if (!response.ok) return { error: data.error ?? "Food and drink places are unavailable right now." };

    const collection: FeatureCollection<Geometry> = { type: "FeatureCollection", features: data.features ?? [] };
    const counts = (data.counts ?? {}) as Record<string, number>;
    const summary = Object.entries(counts)
      .filter(([, count]) => count > 0)
      .map(([kind, count]) => `${count} ${TREND_CATEGORY_LABEL[kind as TrendCategory]?.toLowerCase() ?? kind}`)
      .join(", ");

    return {
      collection,
      note: `${collection.features.length} places in this view, from OpenStreetMap (ODbL): ${summary || "none"}${
        data.truncated ? " — the answer was cut at the query limit, so this is a floor" : ""
      }`,
    };
  } catch (error) {
    if ((error as Error).name === "AbortError") throw error;
    return { error: "Food and drink places are unavailable right now." };
  }
}

export function TrendsExperience({ sample, layers, sources, omittedLayers }: TrendsExperienceProps) {
  const [visible, setVisible] = React.useState<Record<string, boolean>>(() =>
    Object.fromEntries(layers.map((layer) => [layer.id, layer.defaultVisible])),
  );
  const [opacity, setOpacity] = React.useState<Record<string, number>>(() =>
    Object.fromEntries(layers.map((layer) => [layer.id, layer.defaultOpacity])),
  );
  const [category, setCategory] = React.useState<TrendCategory>("cafe");
  const [hour, setHour] = React.useState(8);
  const [satellite, setSatellite] = React.useState(false);

  const [view, setView] = React.useState<Bounds | null>(null);
  const [places, setPlaces] = React.useState<FeatureCollection<Geometry> | null>(null);
  const [placesNote, setPlacesNote] = React.useState<string | null>(ZOOM_HINT);

  const [picked, setPicked] = React.useState<{ lng: number; lat: number } | null>(null);
  const [around, setAround] = React.useState<FeatureCollection<Geometry> | null>(null);
  const [aroundNote, setAroundNote] = React.useState<string | null>(null);
  const [aroundLoading, setAroundLoading] = React.useState(false);

  // The two heat layers are one layer with two metrics: whichever switch is on decides the colour.
  const metric: TrendMetric = visible.footfall && !visible.population ? "footfall" : "density";
  const definition = metricDefinition(metric);

  /** What is on screen: refetched after a pause, so panning does not fire a query per frame. */
  React.useEffect(() => {
    if (!view) return;

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      const query = `west=${view[0]}&south=${view[1]}&east=${view[2]}&north=${view[3]}`;

      fetchPlaces(query, controller.signal)
        .then((result) => {
          if ("error" in result) {
            setPlaces(null);
            setPlacesNote(result.error);
            return;
          }
          setPlaces(result.collection);
          setPlacesNote(result.note);
        })
        .catch(() => undefined);
    }, 500);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [view]);

  /** What is around the clicked hex: a small box, counted live, and the basis of the score. */
  React.useEffect(() => {
    if (!picked) {
      setAround(null);
      setAroundNote(null);
      return;
    }

    const controller = new AbortController();
    const box = {
      west: picked.lng - AROUND_BOX.lng,
      east: picked.lng + AROUND_BOX.lng,
      south: picked.lat - AROUND_BOX.lat,
      north: picked.lat + AROUND_BOX.lat,
    };

    setAroundLoading(true);
    fetchPlaces(`west=${box.west}&south=${box.south}&east=${box.east}&north=${box.north}`, controller.signal)
      .then((result) => {
        if ("error" in result) {
          setAround(null);
          setAroundNote(result.error);
          return;
        }
        setAround(result.collection);
        setAroundNote(null);
      })
      .catch(() => undefined)
      .finally(() => setAroundLoading(false));

    return () => controller.abort();
  }, [picked]);

  const available = React.useMemo(
    () => ({
      footfall: sample.collection.features.length,
      population: sample.collection.features.length,
      competitor: (places?.features ?? []).length,
    }),
    [sample, places],
  );

  const hexes = React.useMemo(() => valuedCollection(sample, metric, category, hour), [sample, metric, category, hour]);
  const max = React.useMemo(() => maxIntensity(sample, metric, category, hour), [sample, metric, category, hour]);

  const selection = React.useMemo(() => {
    if (!picked) return null;
    const hex = hexAt(sample, picked.lng, picked.lat);
    if (!hex) return null;

    const points = (around?.features ?? [])
      .filter((feature: Feature<Geometry>) => (feature.properties as { kind?: string } | null)?.kind === category)
      .map((feature: Feature<Geometry>) =>
        feature.geometry.type === "Point" ? (feature.geometry.coordinates as number[]) : null,
      )
      .filter((coordinates): coordinates is number[] => coordinates !== null);

    const nearby = competitorsWithin([picked.lng, picked.lat], points, COMPETITOR_RADIUS_KM);

    return {
      hex: hex.properties,
      nearby,
      categoryTotal: points.length,
      breakdown: assessSiteGap({
        populationDensity: hex.properties.density_per_km2,
        footfallIndex: hex.properties.footfall_index,
        competitors: around === null ? null : nearby,
        competitorsAtSaturation: 12,
      }),
    };
  }, [picked, sample, around, category]);

  const entry = (layer: Data2MapLayer) => ({
    id: layer.id,
    label: layer.label,
    hint: layer.hint,
    source: sources[layer.id] ?? "no dataset yet",
    license: layer.id === "competitor" ? "ODbL" : layer.id === "population" ? "CC BY 4.0" : "CC0",
  });

  return (
    <div className="grid gap-4 lg:grid-cols-[22rem_minmax(0,1fr)]">
      <aside className="space-y-4">
        <RangeTimeline
          years={hourTicks()}
          year={hour}
          onYear={setHour}
          events={[]}
          gapMessage={
            metric === "footfall"
              ? "Simulated hourly footfall (CC0): no open dataset of hourly footfall exists for Vietnam, so this is the shape of a city rather than a measurement."
              : "Population density is a 2020 snapshot, so the clock and the category do not change it. Switch on the hourly footfall layer to use them."
          }
          reduceMotion={false}
          format={(value) => `${String(value).padStart(2, "0")}:00`}
          labels={{
            heading: "Hour of day",
            aria: "Hour of day",
            play: "Play the day",
            pause: "Pause the day",
            reset: "Back to midnight",
            span: (count) => `${count} hours`,
            empty: "The clock steps through the day; the numbers underneath it are the simulated footfall index.",
          }}
          stepMs={900}
        />

        <div className="glass rounded-[var(--radius-card)] p-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">Premises</h2>
          <label className="mt-3 block text-[10px] uppercase tracking-wide text-white/35" htmlFor="trend-category">
            Type of business
          </label>
          <select
            id="trend-category"
            value={category}
            onChange={(event) => setCategory(event.target.value as TrendCategory)}
            className="mt-1 h-9 w-full rounded-full bg-white/6 px-3 text-xs text-white/85 outline-none ring-1 ring-white/10 focus-visible:ring-neon/60"
          >
            {TREND_CATEGORIES.map((entryId) => (
              <option key={entryId} value={entryId} className="bg-abyss text-white">
                {TREND_CATEGORY_LABEL[entryId]}
              </option>
            ))}
          </select>
          <p className="mt-2 text-[10px] leading-relaxed text-white/45">
            {TREND_CATEGORY_LABEL[category]} peaks at {String(peakHour(category)).padStart(2, "0")}:00 in the simulated
            profile. The competitors counted under the heat are real places tagged{" "}
            {category === "bakery"
              ? "shop=bakery"
              : category === "bubble_tea"
                ? "amenity=cafe with a tea cuisine"
                : `amenity=${category}`}{" "}
            in OpenStreetMap.
          </p>
        </div>

        <LayerPanel<"population" | "footfall" | "competitor">
          layers={layers.map(entry)}
          visible={visible}
          opacity={opacity}
          available={available}
          onToggle={(id, next) => {
            setVisible((current) => {
              if (id === "population") return { ...current, population: next, footfall: next ? false : current.footfall };
              if (id === "footfall") return { ...current, footfall: next, population: next ? false : current.population };
              return { ...current, [id]: next };
            });
          }}
          onOpacity={(id, next) => setOpacity((current) => ({ ...current, [id]: next }))}
        />

        <div className="glass rounded-[var(--radius-card)] p-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">Base</h2>
          <div className="mt-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-white/85">Satellite imagery</p>
              <p className="mt-0.5 text-[10px] leading-relaxed text-white/45">
                NASA GIBS, public domain — daily imagery from a 2024-01-01 snapshot, not a survey photograph.
              </p>
            </div>
            <Switch label="Satellite imagery" checked={satellite} onChange={setSatellite} setting="satellite" />
          </div>
        </div>

        <div className="glass rounded-[var(--radius-card)] p-4">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">{definition.label}</h2>
            <span className={cn("text-[10px]", definition.synthetic ? "text-solar" : "text-glow")}>
              {definition.synthetic ? "simulated" : "real"}
            </span>
          </div>
          <div className="mt-3 flex h-2 overflow-hidden rounded-full">
            {["#0b1220", "#123b53", "#1f7f8c", "#35f0c0", "#ffb738", "#ff5d8f"].map((color) => (
              <span key={color} className="flex-1" style={{ backgroundColor: color }} />
            ))}
          </div>
          <p className="mt-2 flex justify-between text-[10px] tabular-nums text-white/45">
            {legendStops(max).map((stop) => (
              <span key={stop.value}>{stop.label}</span>
            ))}
          </p>
          <p className="mt-2 text-[10px] leading-relaxed text-white/45">
            {definition.unit} · {definition.source} · {definition.license}
            {metric === "footfall"
              ? ` · ${TREND_CATEGORY_LABEL[category]} profile at ${String(hour).padStart(2, "0")}:00`
              : ""}
          </p>
        </div>

        {picked && selection ? (
          <div className="glass rounded-[var(--radius-card)] p-4">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">This hex</h2>
              <span className="text-[10px] tabular-nums text-white/45">{selection.hex.hex_id}</span>
            </div>

            <ul className="mt-3 space-y-1.5 text-[10px]">
              <li className="flex justify-between gap-2">
                <span className="text-white/60">Population</span>
                <span className="tabular-nums text-white/80">
                  {formatCount(selection.hex.population)}{" "}
                  <span className="text-white/35">WorldPop {selection.hex.population_year}</span>
                </span>
              </li>
              <li className="flex justify-between gap-2">
                <span className="text-white/60">Density</span>
                <span className="tabular-nums text-white/80">{formatCount(selection.hex.density_per_km2)} /km²</span>
              </li>
              <li className="flex justify-between gap-2">
                <span className="text-white/60">Footfall index</span>
                <span className="tabular-nums text-solar">
                  {selection.hex.footfall_index} <span className="text-white/35">simulated</span>
                </span>
              </li>
              <li className="flex justify-between gap-2">
                <span className="text-white/60">
                  {TREND_CATEGORY_LABEL[category]} within {COMPETITOR_RADIUS_KM} km
                </span>
                <span className="tabular-nums text-white/80">
                  {aroundLoading
                    ? "counting…"
                    : around === null
                      ? "not available"
                      : `${selection.nearby} of ${selection.categoryTotal} in the box`}
                </span>
              </li>
            </ul>

            {/* The day the simulated profile gives this hex, so the clock has something to point at. */}
            <div className="mt-3">
              <p className="text-[10px] text-white/45">Simulated day at this hex</p>
              <div className="mt-1.5 flex h-10 items-end gap-[2px]" aria-hidden>
                {hourTicks().map((tick) => {
                  const value = dayCurve(category, selection.hex.footfall_index, tick);
                  const top = Math.max(1, dayCurve(category, 100, peakHour(category)));
                  return (
                    <span
                      key={tick}
                      style={{ height: `${Math.max(4, (value / top) * 100)}%` }}
                      className={cn("flex-1 rounded-sm", tick === hour ? "bg-solar" : "bg-white/20")}
                    />
                  );
                })}
              </div>
            </div>

            <div className="mt-4 flex items-baseline justify-between gap-2">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">Site gap</h3>
              <span className={cn("text-lg font-semibold tabular-nums", selection.breakdown.band.textClass)}>
                {selection.breakdown.score ?? "—"}
              </span>
            </div>
            <p className={cn("text-[11px]", selection.breakdown.band.textClass)}>{selection.breakdown.band.label}</p>

            <ul className="mt-2 space-y-1 text-[10px] text-white/55">
              <li>
                Demand {selection.breakdown.parts.demand === null ? "—" : Math.round(selection.breakdown.parts.demand * 100)}%
                {selection.breakdown.demandSource === "population"
                  ? " from real population density"
                  : selection.breakdown.demandSource === "footfall"
                    ? " from the simulated footfall index"
                    : ""}
              </li>
              <li>
                Supply {selection.breakdown.parts.supply === null ? "—" : Math.round(selection.breakdown.parts.supply * 100)}% from{" "}
                {around === null ? "a layer that did not load" : "real competitors, counted around this hex"}
              </li>
              <li>Access — not scored: nobody publishes a walkability polygon for this city.</li>
            </ul>

            {selection.breakdown.missing.length > 0 ? (
              <p className="mt-3 flex items-start gap-2 rounded-xl bg-solar/10 px-3 py-2 text-[10px] leading-relaxed text-solar ring-1 ring-solar/20">
                <AlertTriangle className="mt-0.5 size-3 shrink-0" aria-hidden />
                Scored on {Math.round(selection.breakdown.coverage * 100)}% of the weight: {selection.breakdown.missing.join(", ")} missing.
              </p>
            ) : null}

            <p className="mt-3 flex items-start gap-2 text-[10px] leading-relaxed text-white/35">
              <Info className="mt-0.5 size-3 shrink-0" aria-hidden />
              A Kami3D index, not a market study: demand {SITE_WEIGHTS.demand}, supply {SITE_WEIGHTS.supply}, access{" "}
              {SITE_WEIGHTS.access}. Demand and the competitor count are real; the footfall index is simulated.
            </p>
          </div>
        ) : (
          <div className="glass rounded-[var(--radius-card)] p-4 text-[10px] leading-relaxed text-white/45">
            <p className="flex items-center gap-2 text-[11px] font-medium text-white/70">
              <Clock className="size-3.5 text-neon" aria-hidden />
              Click a hex
            </p>
            <p className="mt-2">
              The panel then shows what is inside it: the real population count, the simulated footfall index, the real{" "}
              {TREND_CATEGORY_LABEL[category].toLowerCase()} places within {COMPETITOR_RADIUS_KM} km, and the gap score
              built from them.
            </p>
          </div>
        )}

        {placesNote ? (
          <p className="flex items-start gap-2 text-[10px] leading-relaxed text-white/40">
            <Layers className="mt-0.5 size-3 shrink-0" aria-hidden />
            {placesNote}
          </p>
        ) : null}

        {aroundNote ? (
          <p className="flex items-start gap-2 text-[10px] leading-relaxed text-solar/80">
            <AlertTriangle className="mt-0.5 size-3 shrink-0" aria-hidden />
            {aroundNote} The score above is built without the supply term, and says so.
          </p>
        ) : null}

        {omittedLayers.length > 0 ? (
          <div className="glass rounded-[var(--radius-card)] p-4 text-[10px] leading-relaxed text-white/45">
            <p className="font-medium text-white/70">Not drawn</p>
            <ul className="mt-1 list-inside list-disc space-y-1">
              {omittedLayers.map((entryText) => (
                <li key={entryText}>{entryText}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <p className="text-[10px] leading-relaxed text-white/30">{sample.attribution}</p>
      </aside>

      <div className="relative h-[460px] overflow-hidden rounded-[var(--radius-card)] ring-1 ring-white/10 sm:h-[560px] lg:h-[640px]">
        <MountWhenVisible className="h-full w-full" placeholder={<MapSkeleton />}>
          <TrendsCanvasView
            hexes={hexes}
            max={max}
            pois={places}
            visible={visible}
            opacity={opacity}
            satellite={satellite}
            bounds={null}
            onView={setView}
            onPick={({ lng, lat }) => setPicked({ lng, lat })}
          />
        </MountWhenVisible>

        <p className="pointer-events-none absolute bottom-3 left-3 z-10 rounded-full bg-void/70 px-3 py-1.5 text-[10px] text-white/55 backdrop-blur">
          {definition.synthetic ? "Simulated layer" : "Real layer"} · {definition.source} · click a hex to score it
        </p>
      </div>
    </div>
  );
}
