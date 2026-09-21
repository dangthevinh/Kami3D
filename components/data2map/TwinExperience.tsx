"use client";

import { Activity, AlertTriangle, Info, Layers, Radio, Truck } from "lucide-react";
import dynamic from "next/dynamic";
import * as React from "react";

import { LayerPanel } from "@/components/map/LayerPanel";
import { MapSkeleton } from "@/components/map/LazyMap";
import { RangeTimeline } from "@/components/map/TimelinePanel";
import { Switch } from "@/components/settings/Controls";
import { useSettings } from "@/components/settings/SettingsProvider";
import { MountWhenVisible } from "@/components/3d/MountWhenVisible";
import { DailyBars } from "@/components/stats/DailyBars";
import { Sparkline } from "@/components/stats/Sparkline";
import { publicEnv } from "@/lib/env";
import type { LogisticsSample } from "@/lib/data2map/logistics";
import {
  TWIN,
  TWIN_LAYERS,
  connectionLabel,
  fleetKpi,
  type PositionPoint,
} from "@/lib/data2map/twin";
import { cn } from "@/lib/utils";
import type { FeatureCollection, Geometry } from "geojson";
import type { StreamState } from "@/components/data2map/TwinCanvas";

/**
 * The twin's cockpit.
 *
 * Every number here is computed in front of the reader from the rows the pipeline wrote, and the
 * formula is printed beside it. That is not decoration: this page shows a moving fleet, and the
 * difference between "a demo that streams" and "a dashboard somebody trusts" is whether the number
 * can be checked.
 *
 * The Supabase client itself lives in the lazily-loaded canvas, because that is where Realtime is
 * needed. This component talks to the same tables over plain REST with the anonymous key - two
 * endpoints, no client library, and the cockpit stays cheap.
 */

const TwinCanvasView = dynamic(
  () => import("@/components/data2map/TwinCanvas").then((mod) => mod.TwinCanvas),
  { ssr: false, loading: () => <MapSkeleton /> },
);

export interface TwinExperienceProps {
  sample: LogisticsSample;
  omittedLayers: string[];
}

interface KpiRow {
  hour: string;
  vehicle_id: string;
  samples: number;
  distance_km: number;
  avg_speed_kmh: number | null;
}

/** The rollup rows, straight from Postgres with the anonymous key. */
async function fetchKpiRows(): Promise<KpiRow[]> {
  if (!publicEnv.supabaseUrl || !publicEnv.supabaseAnonKey) return [];

  const url =
    publicEnv.supabaseUrl +
    "/rest/v1/logistics_kpi_hourly?select=hour,vehicle_id,samples,distance_km,avg_speed_kmh&order=hour.desc&limit=48";

  try {
    const response = await fetch(url, {
      headers: { apikey: publicEnv.supabaseAnonKey, authorization: "Bearer " + publicEnv.supabaseAnonKey },
      cache: "no-store",
    });
    if (!response.ok) return [];
    return (await response.json()) as KpiRow[];
  } catch {
    return [];
  }
}

/** One point in a chart, in the shape the shared stats components already take. */
function toPoints(values: { label: string; value: number }[]) {
  return values.map((entry) => ({ day: entry.label, views: Math.max(0, Math.round(entry.value)) }));
}

export function TwinExperience({ sample, omittedLayers }: TwinExperienceProps) {
  const reduceMotion = useSettings().settings.reduceMotion;

  const [visible, setVisible] = React.useState<Record<string, boolean>>({
    buildings: true,
    terrain: true,
    vehicles: true,
    routes: true,
  });
  const [opacity, setOpacity] = React.useState<Record<string, number>>({
    buildings: 0.85,
    terrain: 0.5,
    vehicles: 0.95,
    routes: 0.8,
  });
  // Terrain costs a second download and the delta is flat, so small screens start without it.
  const [terrain, setTerrain] = React.useState(() =>
    typeof window === "undefined" ? false : window.innerWidth >= 1024,
  );
  const [depotId, setDepotId] = React.useState(sample.depots[0]?.properties.depot_id ?? "");
  const [focus, setFocus] = React.useState<{ depotId: string; nonce: number } | null>(null);
  const [hour, setHour] = React.useState(new Date().getUTCHours());
  const [clockMode, setClockMode] = React.useState<"live" | "hour">("live");

  const [stream, setStream] = React.useState<{ state: StreamState; points: PositionPoint[]; history: boolean }>({
    state: "connecting",
    points: [],
    history: false,
  });
  const [kpiRows, setKpiRows] = React.useState<KpiRow[]>([]);

  const onStream = React.useCallback(
    (event: { state: StreamState; points: PositionPoint[]; history: boolean }) => setStream(event),
    [],
  );

  React.useEffect(() => {
    let cancelled = false;
    fetchKpiRows().then((rows) => {
      if (!cancelled) setKpiRows(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [stream.points.length]);

  /** The stops, in the shape the KPI function counts against. */
  const stopRefs = React.useMemo(
    () =>
      sample.stops.map((stop) => ({
        id: stop.properties.stop_id,
        lng: stop.geometry.coordinates[0],
        lat: stop.geometry.coordinates[1],
        window: [stop.properties.window_start, stop.properties.window_end] as [number, number],
      })),
    [sample],
  );

  const points = clockMode === "live" ? stream.points : stream.points.filter((point) => new Date(point.at).getUTCHours() === hour);
  const kpi = React.useMemo(() => fleetKpi(points, stopRefs), [points, stopRefs]);

  /** Samples per minute in the buffer, for the sparkline. */
  const perMinute = React.useMemo(() => {
    const buckets = new Map<string, number>();
    for (const point of stream.points) {
      const minute = point.at.slice(0, 16);
      buckets.set(minute, (buckets.get(minute) ?? 0) + 1);
    }

    return toPoints(
      [...buckets.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .slice(-30)
        .map(([minute, count]) => ({ label: minute.slice(11), value: count })),
    );
  }, [stream.points]);

  /** Kilometres per hour, from the SQL rollup rather than from this browser. */
  const hourly = React.useMemo(() => {
    const buckets = new Map<string, number>();
    for (const row of kpiRows) {
      const label = row.hour.slice(11, 13);
      buckets.set(label, (buckets.get(label) ?? 0) + Number(row.distance_km));
    }

    return toPoints(
      Array.from({ length: 24 }, (_, index) => {
        const label = String(index).padStart(2, "0");
        return { label, value: buckets.get(label) ?? 0 };
      }),
    );
  }, [kpiRows]);

  const rollupTotals = React.useMemo(() => {
    const distance = kpiRows.reduce((sum, row) => sum + Number(row.distance_km), 0);
    const samples = kpiRows.reduce((sum, row) => sum + row.samples, 0);
    const speeds = kpiRows.map((row) => row.avg_speed_kmh).filter((value): value is number => typeof value === "number");
    return {
      distance: Math.round(distance * 10) / 10,
      samples,
      avgSpeed: speeds.length === 0 ? null : Math.round((speeds.reduce((sum, value) => sum + value, 0) / speeds.length) * 10) / 10,
      hours: new Set(kpiRows.map((row) => row.hour)).size,
    };
  }, [kpiRows]);

  const layerEntries = TWIN_LAYERS.map((layer) => ({ ...layer }));

  return (
    <div className="grid gap-4 lg:grid-cols-[22rem_minmax(0,1fr)]">
      <aside className="space-y-4">
        <div className="glass rounded-[var(--radius-card)] p-4">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">Stream</h2>
            <span
              className={cn(
                "flex items-center gap-1 text-[10px]",
                stream.state === "live" ? "text-neon" : stream.state === "offline" ? "text-coral" : "text-solar",
              )}
            >
              <Radio className="size-3" aria-hidden />
              {stream.state}
            </span>
          </div>
          <p className="mt-2 text-[10px] leading-relaxed text-white/55">{connectionLabel(stream.state, stream.points.length)}</p>
          <p className="mt-2 text-[10px] leading-relaxed text-white/35">
            Pushed by <code className="text-white/60">npm run fleet:simulate -- --loop</code> into{" "}
            <code className="text-white/60">{TWIN.positionsTable}</code>, streamed over Supabase Realtime. Positions are
            simulated; the table refuses anything else.
          </p>
        </div>

        <div className="glass rounded-[var(--radius-card)] p-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">Cockpit</h2>
          <ul className="mt-3 grid grid-cols-2 gap-3 text-[10px]">
            <li>
              <span className="block tabular-nums text-lg font-semibold text-white/90">{kpi.vehicles}</span>
              <span className="text-white/45">vehicles in this window</span>
            </li>
            <li>
              <span className="block tabular-nums text-lg font-semibold text-white/90">{kpi.distanceKm}</span>
              <span className="text-white/45">km, from the samples</span>
            </li>
            <li>
              <span className="block tabular-nums text-lg font-semibold text-white/90">{kpi.avgSpeedKmh ?? "—"}</span>
              <span className="text-white/45">km/h average</span>
            </li>
            <li>
              <span className="block tabular-nums text-lg font-semibold text-white/90">
                {kpi.onTimeRatio === null ? "—" : Math.round(kpi.onTimeRatio * 100) + "%"}
              </span>
              <span className="text-white/45">delivered inside the window</span>
            </li>
          </ul>

          <p className="mt-3 flex items-start gap-2 text-[10px] leading-relaxed text-white/35">
            <Info className="mt-0.5 size-3 shrink-0" aria-hidden />
            km = the haversine between consecutive samples of the same vehicle. Average speed = the mean of the samples&apos;
            own speeds. A delivery counts when a sample comes within {TWIN.arrivalRadiusM} m of the stop, and it is on time
            when that sample falls inside the customer&apos;s two-hour window. The same formulas run in SQL for the rollup below.
          </p>
        </div>

        <div className="glass rounded-[var(--radius-card)] p-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">This buffer</h2>
          <p className="mt-1 text-[10px] text-white/45">Simulated samples per minute, last 30 minutes</p>
          <Sparkline
            points={perMinute}
            width={220}
            height={38}
            className="mt-2 w-full"
            label={"Simulated fleet samples per minute, " + perMinute.length + " minute(s) in this buffer"}
          />

          <h3 className="mt-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">Hourly rollup</h3>
          <p className="mt-1 text-[10px] text-white/45">
            Kilometres per hour, from <code className="text-white/60">logistics_kpi_hourly</code> — the same formula, executed
            in Postgres
          </p>
          <DailyBars
            points={hourly}
            height={40}
            label={"Kilometres per hour from the SQL rollup: " + hourly.map((entry) => entry.day + ": " + entry.views).join(", ")}
          />
          <ul className="mt-2 space-y-1 text-[10px] text-white/55">
            <li className="flex justify-between gap-2">
              <span>Rolled-up distance</span>
              <span className="tabular-nums text-white/80">{rollupTotals.distance} km</span>
            </li>
            <li className="flex justify-between gap-2">
              <span>Samples in the rollup</span>
              <span className="tabular-nums text-white/80">{rollupTotals.samples}</span>
            </li>
            <li className="flex justify-between gap-2">
              <span>Average speed</span>
              <span className="tabular-nums text-white/80">{rollupTotals.avgSpeed ?? "—"} km/h</span>
            </li>
            <li className="flex justify-between gap-2">
              <span>Hours covered</span>
              <span className="tabular-nums text-white/80">{rollupTotals.hours}</span>
            </li>
          </ul>
        </div>


        <div className="glass rounded-[var(--radius-card)] p-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">Depot</h2>
          <label className="mt-3 block text-[10px] uppercase tracking-wide text-white/35" htmlFor="twin-depot">
            Coverage bands and the camera target
          </label>
          <select
            id="twin-depot"
            value={depotId}
            onChange={(event) => setDepotId(event.target.value)}
            className="mt-1 h-9 w-full rounded-full bg-white/6 px-3 text-xs text-white/85 outline-none ring-1 ring-white/10 focus-visible:ring-neon/60"
          >
            {sample.depots.map((depot) => (
              <option key={depot.properties.depot_id} value={depot.properties.depot_id} className="bg-abyss text-white">
                {depot.properties.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setFocus({ depotId, nonce: Date.now() })}
            className="mt-2 w-full rounded-full bg-white/8 px-3 py-1.5 text-[11px] text-white/80 ring-1 ring-white/15 transition-colors hover:bg-white/12 hover:text-white"
          >
            Fly to this depot
          </button>
        </div>

        <div className="glass rounded-[var(--radius-card)] p-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">Clock</h2>
          <div className="mt-3 flex gap-1.5">
            {(["live", "hour"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setClockMode(mode)}
                aria-pressed={clockMode === mode}
                className={cn(
                  "flex-1 rounded-full px-2 py-1 text-[10px] ring-1 transition-colors",
                  clockMode === mode ? "bg-neon/20 text-neon ring-neon/40" : "text-white/60 ring-white/15 hover:text-white",
                )}
              >
                {mode === "live" ? "Live buffer" : "One hour of history"}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[10px] leading-relaxed text-white/45">
            {clockMode === "live"
              ? "Everything the buffer holds. The clock below still moves the cockpit to an hour of stored history."
              : "Only the samples inside the selected hour are drawn and counted."}
          </p>
        </div>

        <RangeTimeline
          years={Array.from({ length: 24 }, (_, tick) => tick)}
          year={hour}
          onYear={(next) => {
            setHour(next);
            setClockMode("hour");
          }}
          events={[]}
          gapMessage="Positions are simulated: no real vehicle is tracked here, here or anywhere else in this project. The panel says so on every row."
          reduceMotion={reduceMotion}
          format={(value) => String(value).padStart(2, "0") + ":00 UTC"}
          labels={{
            heading: "Hour of day",
            aria: "Hour of day",
            play: "Play the day",
            pause: "Pause the day",
            reset: "Back to midnight",
            span: (count) => count + " hours of stored history",
            empty: "The clock selects an hour of stored positions; the live stream keeps running underneath.",
          }}
          stepMs={800}
        />

        <LayerPanel<"buildings" | "terrain" | "vehicles" | "routes">
          layers={layerEntries}
          visible={visible}
          opacity={opacity}
          available={{
            buildings: 1,
            terrain: 1,
            vehicles: stream.points.length,
            routes: sample.stops.length,
          }}
          onToggle={(id, next) => setVisible((current) => ({ ...current, [id]: next }))}
          onOpacity={(id, next) => setOpacity((current) => ({ ...current, [id]: next }))}
        />

        <div className="glass rounded-[var(--radius-card)] p-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">Terrain and base</h2>
          <div className="mt-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-white/85">Real elevation</p>
              <p className="mt-0.5 text-[10px] leading-relaxed text-white/45">
                AWS open terrain tiles (SRTM and friends), public domain sources. Off on small screens because the delta is
                flat and the download is not free.
              </p>
            </div>
            <Switch label="Terrain" checked={terrain} onChange={setTerrain} setting="satellite" />
          </div>
        </div>

        <div className="glass rounded-[var(--radius-card)] p-4 text-[10px] leading-relaxed text-white/45">
          <p className="flex items-center gap-2 text-[11px] font-medium text-white/70">
            <Activity className="size-3.5 text-neon" aria-hidden />
            What is real here, and what is not
          </p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li>
              <span className="text-white/70">Real:</span> the buildings (OpenStreetMap footprints and their recorded heights,
              ODbL, through OpenFreeMap&apos;s keyless tiles) and the elevation.
            </li>
            <li>
              <span className="text-white/70">Simulated:</span> the fleet, its positions, its speeds and the deliveries those
              samples imply. Retention is {TWIN.retentionHours / 24} days, and the anonymous key can read the stream but never
              write to it.
            </li>
            <li>
              <span className="text-white/70">Not drawn:</span> real telemetry, traffic, models of buildings that this project
              does not have, and 3D Tiles that need an account.
            </li>
          </ul>
        </div>

        {omittedLayers.length > 0 ? (
          <div className="glass rounded-[var(--radius-card)] p-4 text-[10px] leading-relaxed text-white/45">
            <p className="font-medium text-white/70">Not drawn</p>
            <ul className="mt-1 list-inside list-disc space-y-1">
              {omittedLayers.map((entry) => (
                <li key={entry}>{entry}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <p className="flex items-start gap-2 text-[10px] leading-relaxed text-white/30">
          <Layers className="mt-0.5 size-3 shrink-0" aria-hidden />
          {sample.attribution}
        </p>
      </aside>

      <div className="relative h-[460px] overflow-hidden rounded-[var(--radius-card)] ring-1 ring-white/10 sm:h-[560px] lg:h-[680px]">
        <MountWhenVisible className="h-full w-full" placeholder={<MapSkeleton />}>
          <TwinCanvasView
            depots={{ type: "FeatureCollection", features: sample.depots } as unknown as FeatureCollection<Geometry>}
            stops={{ type: "FeatureCollection", features: sample.stops } as unknown as FeatureCollection<Geometry>}
            routes={{ type: "FeatureCollection", features: sample.vehicles } as unknown as FeatureCollection<Geometry>}
            isochrones={{ type: "FeatureCollection", features: sample.isochrones } as unknown as FeatureCollection<Geometry>}
            depotId={depotId}
            visible={visible}
            opacity={opacity}
            terrain={terrain}
            focus={focus}
            onStream={onStream}
          />
        </MountWhenVisible>

        <p className="pointer-events-none absolute bottom-3 right-3 z-10 max-w-[16rem] rounded-full bg-void/70 px-3 py-1.5 text-right text-[10px] text-white/55 backdrop-blur">
          <Truck className="mr-1 inline size-3" aria-hidden />
          Simulated fleet · {stream.points.length} sample(s) in the buffer · Real OSM buildings
        </p>
      </div>
    </div>
  );
}

