"use client";

import { AlertTriangle, Info, Layers, Route, Truck } from "lucide-react";
import dynamic from "next/dynamic";
import * as React from "react";

import { LayerPanel } from "@/components/map/LayerPanel";
import { MapSkeleton } from "@/components/map/LazyMap";
import { RangeTimeline } from "@/components/map/TimelinePanel";
import { Switch } from "@/components/settings/Controls";
import { useSettings } from "@/components/settings/SettingsProvider";
import { MountWhenVisible } from "@/components/3d/MountWhenVisible";
import { ASSUMPTIONS, planCost, planRoutes, type RouteStrategy } from "@/lib/data2map/routing";
import { formatDong, stopToRouting, type LogisticsSample } from "@/lib/data2map/logistics";
import { cn } from "@/lib/utils";
import type { FeatureCollection, Geometry } from "geojson";
import type { Data2MapLayer } from "@/lib/data2map";

/**
 * The logistics page: coverage, a fleet on a clock, and a plan you can compare.
 *
 * The three claims the panel makes are all computed in front of the visitor rather than baked into
 * the sample file: the coverage bands come from the depot that is selected, the vehicle positions
 * are a function of the hour, and the saving is the difference between the same stops planned two
 * ways - as the work arrived, and with nearest-neighbour plus 2-opt. All three run through
 * `lib/data2map/routing.ts`, which is a pure module with its own check suite.
 *
 * What it is not is a dispatch system, and the panel says that: there is no live traffic, no
 * one-way streets, no driver shifts and not one real address. Real addresses are personal data;
 * real telemetry is private. This page ships neither, and says so where a demo would ship a
 * realistic-looking lie.
 */

const LogisticsCanvasView = dynamic(
  () => import("@/components/data2map/LogisticsCanvas").then((mod) => mod.LogisticsCanvas),
  { ssr: false, loading: () => <MapSkeleton /> },
);

const STRATEGIES: { id: RouteStrategy; label: string; hint: string }[] = [
  { id: "file", label: "As the orders came", hint: "The baseline: every van in the order its stops were booked." },
  { id: "greedy", label: "Nearest first", hint: "Nearest neighbour from the depot - fast, and about a fifth worse than optimal." },
  { id: "2opt", label: "Nearest + 2-opt", hint: "The greedy tour, then every crossing swapped until nothing improves it." },
];

export interface LogisticsExperienceProps {
  sample: LogisticsSample;
  layers: Data2MapLayer[];
  sources: Record<string, string>;
  omittedLayers: string[];
}

/** The sample's typed features, as the plain collection the canvas draws. */
function layerCollection(features: { type: string }[]): FeatureCollection<Geometry> {
  return { type: "FeatureCollection", features } as unknown as FeatureCollection<Geometry>;
}

export function LogisticsExperience({ sample, layers, sources, omittedLayers }: LogisticsExperienceProps) {
  const reduceMotion = useSettings().settings.reduceMotion;

  const [depotId, setDepotId] = React.useState(sample.depots[0]?.properties.depot_id ?? "");
  const [vehicleId, setVehicleId] = React.useState(sample.vehicles[0]?.properties.vehicle_id ?? "");
  const [hour, setHour] = React.useState(9);
  const [strategy, setStrategy] = React.useState<RouteStrategy>("2opt");
  const [satellite, setSatellite] = React.useState(false);
  const [visible, setVisible] = React.useState<Record<string, boolean>>(() =>
    Object.fromEntries(layers.map((layer) => [layer.id, layer.defaultVisible])),
  );
  const [opacity, setOpacity] = React.useState<Record<string, number>>(() =>
    Object.fromEntries(layers.map((layer) => [layer.defaultOpacity])),
  );

  const routingDepots = React.useMemo(
    () =>
      sample.depots.map((entry) => ({
        id: entry.properties.depot_id,
        name: entry.properties.name,
        lng: entry.geometry.coordinates[0],
        lat: entry.geometry.coordinates[1],
      })),
    [sample],
  );
  const routingVehicles = React.useMemo(
    () =>
      sample.vehicles.map((entry) => ({
        id: entry.properties.vehicle_id,
        name: entry.properties.name,
        capacityKg: entry.properties.capacity_kg,
        depotId: entry.properties.depot_id,
      })),
    [sample],
  );
  const routingStops = React.useMemo(() => sample.stops.map(stopToRouting), [sample]);

  /** Three plans over the same stops, so the comparison is honest by construction. */
  const plans = React.useMemo(
    () => ({
      file: planRoutes({ depots: routingDepots, stops: routingStops, vehicles: routingVehicles, strategy: "file" }),
      greedy: planRoutes({ depots: routingDepots, stops: routingStops, vehicles: routingVehicles, strategy: "greedy" }),
      planned: planRoutes({ depots: routingDepots, stops: routingStops, vehicles: routingVehicles, strategy: "2opt" }),
    }),
    [routingDepots, routingStops, routingVehicles],
  );

  const plan = strategy === "file" ? plans.file : strategy === "greedy" ? plans.greedy : plans.planned;
  const baseline = plans.file;
  const savedKm = Math.max(0, baseline.totalDistanceKm - plan.totalDistanceKm);
  const savedDong = Math.max(0, planCost(baseline) - planCost(plan));

  const stopsOf = React.useMemo(() => new Map(sample.stops.map((stop) => [stop.properties.stop_id, stop])), [sample]);
  const route = plan.routes.find((entry) => entry.vehicleId === vehicleId) ?? plan.routes[0] ?? null;

  const available = {
    depot: sample.depots.length,
    stop: sample.stops.length,
    fleet: sample.vehicles.length,
    isochrone: sample.isochrones.length,
  };

  const entry = (layer: Data2MapLayer) => ({
    id: layer.id,
    label: layer.label,
    hint: layer.hint,
    source: sources[layer.id] ?? "no dataset yet",
    license: "CC0",
  });

  return (
    <div className="grid gap-4 lg:grid-cols-[22rem_minmax(0,1fr)]">
      <aside className="space-y-4">
        <div className="glass rounded-[var(--radius-card)] p-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">Depot</h2>
          <label className="mt-3 block text-[10px] uppercase tracking-wide text-white/35" htmlFor="depot">
            Which depot is this day planned from
          </label>
          <select
            id="depot"
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
          <p className="mt-2 text-[10px] leading-relaxed text-white/45">
            {sample.isochrones.filter((band) => band.properties.depot_id === depotId).length} coverage bands, 15 to 60
            minutes. They are circles at {ASSUMPTIONS.speedKmh} km/h, not drive time — the road bends and the river is in
            the way.
          </p>
        </div>

        <RangeTimeline
          years={Array.from({ length: 24 }, (_, tick) => tick)}
          year={hour}
          onYear={setHour}
          events={[]}
          gapMessage="Vehicle positions are simulated: each dot moves along a trace this project computed, and no real fleet is tracked here."
          reduceMotion={reduceMotion}
          format={(value) => String(value).padStart(2, "0") + ":00"}
          labels={{
            heading: "Hour of day",
            aria: "Hour of day",
            play: "Play the shift",
            pause: "Pause the shift",
            reset: "Back to midnight",
            span: (count) => count + " hours",
            empty: "The shift runs from " + sample.vehicles[0]?.properties.trace_start_hour + ":00 to " + sample.vehicles[0]?.properties.trace_end_hour + ":00.",
          }}
          stepMs={800}
        />

        <div className="glass rounded-[var(--radius-card)] p-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">Plan</h2>
          <div className="mt-3 space-y-2">
            {STRATEGIES.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setStrategy(option.id)}
                aria-pressed={strategy === option.id}
                className={cn(
                  "w-full rounded-xl px-3 py-2 text-left ring-1 transition-colors",
                  strategy === option.id ? "bg-neon/15 ring-neon/40" : "ring-white/10 hover:bg-white/5",
                )}
              >
                <span className={cn("text-[11px] font-medium", strategy === option.id ? "text-neon" : "text-white/80")}>
                  {option.label}
                </span>
                <span className="mt-0.5 block text-[10px] leading-relaxed text-white/45">{option.hint}</span>
              </button>
            ))}
          </div>

          <ul className="mt-4 space-y-1.5 text-[10px]">
            <li className="flex justify-between gap-2">
              <span className="text-white/60">Stops on the plan</span>
              <span className="tabular-nums text-white/80">{plan.routes.reduce((sum, r) => sum + r.stopIds.length, 0)}</span>
            </li>
            <li className="flex justify-between gap-2">
              <span className="text-white/60">Vans used</span>
              <span className="tabular-nums text-white/80">
                {plan.routes.length} of {sample.vehicles.length}
              </span>
            </li>
            <li className="flex justify-between gap-2">
              <span className="text-white/60">Distance</span>
              <span className="tabular-nums text-white/80">{plan.totalDistanceKm.toLocaleString("en-US")} km</span>
            </li>
            <li className="flex justify-between gap-2">
              <span className="text-white/60">Driving + service</span>
              <span className="tabular-nums text-white/80">
                {Math.floor(plan.totalMinutes / 60)}h {String(plan.totalMinutes % 60).padStart(2, "0")}m
              </span>
            </li>
            <li className="flex justify-between gap-2">
              <span className="text-white/60">Estimated cost</span>
              <span className="tabular-nums text-white/80">{formatDong(planCost(plan))}</span>
            </li>
            {strategy !== "file" ? (
              <li className="flex justify-between gap-2">
                <span className="text-white/60">Saved against the booking order</span>
                <span className="tabular-nums text-neon">
                  {formatDong(savedDong)} · {Math.round(savedKm).toLocaleString("en-US")} km
                </span>
              </li>
            ) : null}
          </ul>

          {plan.unassigned.length > 0 ? (
            <p className="mt-3 flex items-start gap-2 rounded-xl bg-coral/10 px-3 py-2 text-[10px] leading-relaxed text-coral ring-1 ring-coral/20">
              <AlertTriangle className="mt-0.5 size-3 shrink-0" aria-hidden />
              {plan.unassigned.length} stop(s) did not fit any van. They are listed as unassigned rather than dropped: a
              plan that quietly loses deliveries is worse than one that says so.
            </p>
          ) : null}

          <p className="mt-3 flex items-start gap-2 text-[10px] leading-relaxed text-white/35">
            <Info className="mt-0.5 size-3 shrink-0" aria-hidden />
            Straight-line distances at {ASSUMPTIONS.speedKmh} km/h, {ASSUMPTIONS.serviceMinutes} minutes at each door,
            {" "}{formatDong(ASSUMPTIONS.costPerKm)}/km and {formatDong(ASSUMPTIONS.costPerHour)}/hour. No live traffic, no
            one-way streets, no driver shifts — a starting plan, not a dispatch system.
          </p>
        </div>

        <div className="glass rounded-[var(--radius-card)] p-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">Runs</h2>
          <ul className="mt-3 space-y-1.5">
            {plan.routes.map((entry) => {
              const vehicle = sample.vehicles.find((item) => item.properties.vehicle_id === entry.vehicleId);
              return (
                <li key={entry.vehicleId}>
                  <button
                    type="button"
                    onClick={() => setVehicleId(entry.vehicleId)}
                    aria-pressed={entry.vehicleId === vehicleId}
                    className={cn(
                      "w-full rounded-xl px-3 py-2 text-left ring-1 transition-colors",
                      entry.vehicleId === vehicleId ? "bg-white/10 ring-white/25" : "ring-white/10 hover:bg-white/5",
                    )}
                  >
                    <span className="flex items-center gap-2 text-[11px] font-medium text-white/85">
                      <Truck className="size-3 text-glow" aria-hidden />
                      {vehicle?.properties.name ?? entry.vehicleId}
                      <span className="ml-auto tabular-nums text-[10px] text-white/45">
                        {entry.loadKg}/{vehicle?.properties.capacity_kg ?? "?"} kg
                      </span>
                    </span>
                    <span className="mt-0.5 block text-[10px] text-white/45">
                      {entry.stopIds.length} stops · {entry.distanceKm} km · {entry.travelMinutes + entry.serviceMinutes} min
                      {entry.conflicts > 0 ? " · " + entry.conflicts + " window overlap(s)" : ""}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          {route ? (
            <div className="mt-3 border-t border-white/10 pt-3">
              <p className="flex items-center gap-2 text-[10px] uppercase tracking-wide text-white/35">
                <Route className="size-3" aria-hidden />
                {route.stopIds.length} stops in this order
              </p>
              <ol className="mt-2 space-y-1 text-[10px] leading-relaxed text-white/60">
                {route.stopIds.map((id, index) => {
                  const stop = stopsOf.get(id);
                  return (
                    <li key={id} className="flex justify-between gap-2">
                      <span>
                        <span className="tabular-nums text-white/35">{index + 1}.</span> {id}
                      </span>
                      <span className="shrink-0 tabular-nums text-white/45">
                        {stop ? stop.properties.demand_kg + " kg · " + stop.properties.window_start + "–" + stop.properties.window_end + "h" : ""}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </div>
          ) : null}
        </div>

        <LayerPanel<"depot" | "stop" | "fleet" | "isochrone">
          layers={layers.map(entry)}
          visible={visible}
          opacity={opacity}
          available={available}
          onToggle={(id, next) => setVisible((current) => ({ ...current, [id]: next }))}
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

        <p className="flex items-start gap-2 text-[10px] leading-relaxed text-white/30">
          <Layers className="mt-0.5 size-3 shrink-0" aria-hidden />
          {sample.attribution}
        </p>
      </aside>

      <div className="relative h-[460px] overflow-hidden rounded-[var(--radius-card)] ring-1 ring-white/10 sm:h-[560px] lg:h-[640px]">
        <MountWhenVisible className="h-full w-full" placeholder={<MapSkeleton />}>
          <LogisticsCanvasView
            depots={layerCollection(sample.depots)}
            stops={layerCollection(sample.stops)}
            fleet={layerCollection(sample.vehicles)}
            isochrones={layerCollection(sample.isochrones)}
            depotId={depotId}
            hour={hour}
            visible={visible}
            opacity={opacity}
            satellite={satellite}
            reduceMotion={reduceMotion}
            bounds={null}
            onPick={() => undefined}
          />
        </MountWhenVisible>

        <p className="pointer-events-none absolute bottom-3 left-3 z-10 rounded-full bg-void/70 px-3 py-1.5 text-[10px] text-white/55 backdrop-blur">
          Simulated fleet · {sample.vehicles.length} vans · clock at {String(hour).padStart(2, "0")}:00
        </p>
      </div>
    </div>
  );
}
