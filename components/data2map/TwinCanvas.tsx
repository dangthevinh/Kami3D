"use client";

import type { FeatureCollection, Geometry, LineString, Point } from "geojson";
import { Layer, Source } from "react-map-gl/maplibre";
import * as React from "react";

import { BaseMap } from "@/components/map/BaseMap";
import { createClient } from "@supabase/supabase-js";
import { isSupabaseConfigured, publicEnv } from "@/lib/env";
import {
  TWIN,
  extrusionColorExpression,
  extrusionOpacity,
  type PositionPoint,
} from "@/lib/data2map/twin";

/**
 * The twin canvas: a real city in three dimensions, with a simulated fleet moving through it.
 *
 * Three layers are real and one is generated, and the panel says which is which:
 *
 *   - **buildings** are OpenStreetMap footprints extruded by the height OpenMapTiles carries, on the
 *     vector source the style already loads: no model, no upload, no key;
 *   - **terrain** is real elevation from the AWS open terrain tiles, a raster-dem source;
 *   - **routes, stops and coverage bands** are the D4 sample, lifted off the ground they were drawn on;
 *   - **vehicles** are rows the simulator pushed, streamed here over Supabase Realtime.
 *
 * The stream lives in this component because this component is the one loaded lazily: the cockpit
 * beside it stays cheap, and the Supabase client only arrives with the map.
 */

const TERRAIN_TILES = [
  "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png",
];

/** Six vehicle colours, matching the traces on the D4 page. */
const VEHICLE_COLOR = [
  "match",
  ["get", "vehicle_id"],
  "van-01", "#35f0c0",
  "van-02", "#38e0ff",
  "van-03", "#ffb738",
  "van-04", "#ff5d8f",
  "van-05", "#a97bff",
  "van-06", "#7ef0a0",
  "#8a93a6",
];

export type StreamState = "connecting" | "live" | "reconnecting" | "offline";

export interface TwinCanvasProps {
  depots: FeatureCollection<Geometry>;
  stops: FeatureCollection<Geometry>;
  routes: FeatureCollection<Geometry>;
  isochrones: FeatureCollection<Geometry>;
  depotId: string | null;
  visible: Record<string, boolean>;
  opacity: Record<string, number>;
  terrain: boolean;
  /** Set to a depot id to fly the camera there; the same value twice does not move it twice. */
  focus: { depotId: string; nonce: number } | null;
  onStream: (event: { state: StreamState; points: PositionPoint[]; history: boolean }) => void;
}

/** The drone camera, for the buttons in the corner. */
const TILTS = [0, 45, 60];

export function TwinCanvas({
  depots,
  stops,
  routes,
  isochrones,
  depotId,
  visible,
  opacity,
  terrain,
  focus,
  onStream,
}: TwinCanvasProps) {
  const mapRef = React.useRef<{ setTerrain: (value: unknown) => void; easeTo: (options: Record<string, unknown>) => void; getSource: (id: string) => unknown } | null>(null);
  const [tilt, setTilt] = React.useState(55);
  const [points, setPoints] = React.useState<PositionPoint[]>([]);
  const [state, setState] = React.useState<StreamState>("connecting");
  const [history, setHistory] = React.useState(false);

  /** Everything the stream produces is reported up, once per batch rather than once per row. */
  React.useEffect(() => {
    onStream({ state, points, history });
  }, [state, points, history, onStream]);

  /** The initial history, then the live channel. Both use the **anonymous** key: read-only. */
  React.useEffect(() => {
    if (!isSupabaseConfigured) {
      setState("offline");
      return;
    }

    // The anonymous key: this client can read the stream and nothing else. The table has no insert
    // policy, so a visitor cannot write a position even by accident.
    const client = createClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, { auth: { persistSession: false } });
    let cancelled = false;

    client
      .from(TWIN.positionsTable)
      .select("vehicle_id,at,lng,lat,speed_kmh,heading,source")
      .order("at", { ascending: false })
      .limit(TWIN.historyLimit)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data) {
          setState("reconnecting");
          return;
        }
        setPoints((data as PositionPoint[]).slice().reverse());
        setHistory(data.length > 0);
      });

    const channel = client
      .channel(TWIN.channel)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: TWIN.positionsTable },
        (payload) => {
          const row = payload.new as PositionPoint;
          setState("live");
          setPoints((current) => {
            const next = [...current, row];
            return next.length > TWIN.bufferLimit ? next.slice(next.length - TWIN.bufferLimit) : next;
          });
        },
      )
      .subscribe((status) => {
        if (cancelled) return;
        if (status === "SUBSCRIBED") setState("live");
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") setState("reconnecting");
        else if (status === "CLOSED") setState("offline");
      });

    return () => {
      cancelled = true;
      void client.removeChannel(channel);
    };
  }, []);

  /** Terrain is added and removed imperatively: it is one call, and it needs the map instance. */
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    try {
      map.setTerrain(terrain && map.getSource("terrain-dem") ? { source: "terrain-dem", exaggeration: 1.1 } : null);
    } catch {
      // The style may not have the source yet on a cold start; the next toggle picks it up.
    }
  }, [terrain]);

  /** Fly to a depot when the panel asks for one. */
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map || !focus) return;

    const feature = depots.features.find((entry) => (entry.properties as { depot_id?: string } | null)?.depot_id === focus.depotId);
    const coordinates = feature?.geometry.type === "Point" ? (feature.geometry.coordinates as [number, number]) : null;
    if (!coordinates) return;

    map.easeTo({ center: coordinates, zoom: 15.4, pitch: tilt, duration: 900 });
    // `tilt` is read but not a trigger: the fly happens once per request, not once per slider move.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus, depots]);

  /** The vehicles right now, and the trail each one has left in this buffer. */
  const vehiclePoints = React.useMemo(() => {
    const latest = new Map<string, PositionPoint>();
    for (const point of points) latest.set(point.vehicle_id, point);

    return {
      type: "FeatureCollection" as const,
      features: [...latest.values()].map((point) => ({
        type: "Feature" as const,
        properties: { vehicle_id: point.vehicle_id, speed_kmh: point.speed_kmh ?? null, at: point.at },
        geometry: { type: "Point" as const, coordinates: [point.lng, point.lat] },
      })),
    };
  }, [points]);

  const trails = React.useMemo(() => {
    const byVehicle = new Map<string, PositionPoint[]>();
    for (const point of points) {
      const list = byVehicle.get(point.vehicle_id) ?? [];
      list.push(point);
      byVehicle.set(point.vehicle_id, list);
    }

    const features = [...byVehicle.entries()]
      .filter(([, list]) => list.length >= 2)
      .map(([vehicleId, list]) => ({
        type: "Feature" as const,
        properties: { vehicle_id: vehicleId },
        geometry: { type: "LineString" as const, coordinates: list.map((point) => [point.lng, point.lat]) },
      }));

    return { type: "FeatureCollection" as const, features };
  }, [points]);

  const bands = React.useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: isochrones.features.filter((feature) => (feature.properties as { depot_id?: string } | null)?.depot_id === depotId),
    }),
    [isochrones, depotId],
  );

  return (
    <div className="relative h-full w-full">
      <BaseMap
        initialView={{ longitude: 106.703, latitude: 10.776, zoom: 15.2, pitch: 55, bearing: -22 }}
        ariaLabel="A 3D twin of central Ho Chi Minh City with the simulated delivery fleet moving through it"
        onReady={(map) => {
          mapRef.current = map as unknown as typeof mapRef.current;
        }}
      >
        <Source id="terrain-dem" type="raster-dem" tiles={TERRAIN_TILES} tileSize={256} encoding="terrarium" maxzoom={15}>
          <Layer
            id="terrain-hillshade"
            type="hillshade"
            layout={{ visibility: terrain ? "visible" : "none" }}
            paint={{ "hillshade-shadow-color": "#04060f", "hillshade-highlight-color": "#1b2f3f", "hillshade-exaggeration": 0.4 }}
          />
        </Source>

        {/* The city, extruded from the style’s own vector tiles. */}
        <Layer
          id="twin-buildings"
          type="fill-extrusion"
          source="openmaptiles"
          // The dash in `source-layer` is why this is spread rather than written as an attribute.
          {...{ "source-layer": "building" }}
          minzoom={TWIN.extrusionMinZoom}
          layout={{ visibility: visible.buildings ? "visible" : "none" }}
          paint={{
            "fill-extrusion-color": extrusionColorExpression() as unknown as never,
            "fill-extrusion-height": ["coalesce", ["get", "render_height"], 4] as unknown as never,
            "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], 0] as unknown as never,
            "fill-extrusion-opacity": extrusionOpacity(15) * opacity.buildings,
          }}
        />

        <Source id="twin-isochrone" type="geojson" data={bands}>
          <Layer
            id="twin-isochrone-fill"
            type="fill"
            layout={{ visibility: visible.routes && depotId ? "visible" : "none" }}
            paint={{
              "fill-color": ["match", ["get", "minutes"], 15, "#35f0c0", 30, "#38e0ff", 45, "#ffb738", "#ff5d8f"],
              "fill-opacity": ["case", ["==", ["get", "minutes"], 15], opacity.routes * 0.35, opacity.routes * 0.1],
            }}
          />
        </Source>

        <Source id="twin-routes" type="geojson" data={routes}>
          <Layer
            id="twin-route-lines"
            type="line"
            layout={{ visibility: visible.routes ? "visible" : "none", "line-cap": "round" }}
            paint={{ "line-color": "#8a93a6", "line-width": 1.4, "line-opacity": opacity.routes * 0.8, "line-dasharray": [3, 2] }}
          />
        </Source>

        <Source id="twin-stops" type="geojson" data={stops} cluster clusterRadius={48} clusterMaxZoom={15}>
          <Layer
            id="twin-stop-clusters"
            type="circle"
            layout={{ visibility: visible.routes ? "visible" : "none" }}
            filter={["has", "point_count"]}
            paint={{
              "circle-color": ["step", ["get", "point_count"], "#38e0ff", 20, "#35f0c0", 50, "#ffb738"],
              "circle-opacity": opacity.routes * 0.75,
              "circle-radius": ["step", ["get", "point_count"], 12, 20, 16, 50, 22],
              "circle-stroke-width": 1,
              "circle-stroke-color": "rgba(4,6,15,0.7)",
            }}
          />
          <Layer
            id="twin-stop-points"
            type="circle"
            layout={{ visibility: visible.routes ? "visible" : "none" }}
            filter={["!", ["has", "point_count"]]}
            paint={{
              "circle-radius": 3,
              "circle-color": "#38e0ff",
              "circle-opacity": opacity.routes,
              "circle-stroke-width": 0.8,
              "circle-stroke-color": "rgba(4,6,15,0.8)",
            }}
          />
        </Source>

        <Source id="twin-route-depots" type="geojson" data={depots}>
          <Layer
            id="twin-depot-points"
            type="circle"
            layout={{ visibility: visible.routes ? "visible" : "none" }}
            paint={{
              "circle-radius": ["case", ["==", ["get", "depot_id"], depotId ?? ""], 9, 6],
              "circle-color": "#a97bff",
              "circle-opacity": opacity.routes,
              "circle-stroke-width": 1.5,
              "circle-stroke-color": "#04060f",
            }}
          />
        </Source>

        <Source id="twin-trails" type="geojson" data={trails}>
          <Layer
            id="twin-trail-lines"
            type="line"
            layout={{ visibility: visible.vehicles ? "visible" : "none", "line-cap": "round" }}
            paint={{ "line-color": VEHICLE_COLOR as unknown as never, "line-width": 2, "line-opacity": opacity.vehicles * 0.5 }}
          />
        </Source>

        <Source id="twin-vehicles" type="geojson" data={vehiclePoints}>
          <Layer
            id="twin-vehicle-dots"
            type="circle"
            layout={{ visibility: visible.vehicles ? "visible" : "none" }}
            paint={{
              "circle-radius": 7,
              "circle-color": VEHICLE_COLOR as unknown as never,
              "circle-opacity": opacity.vehicles,
              "circle-stroke-width": 1.6,
              "circle-stroke-color": "#04060f",
            }}
          />
        </Source>
      </BaseMap>

      {/* The camera, and the state of the stream, in words. */}
      <div className="absolute left-3 top-3 z-10 flex flex-wrap items-center gap-1.5">
        {TILTS.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              setTilt(value);
              mapRef.current?.easeTo({ pitch: value, duration: 700 });
            }}
            aria-pressed={tilt === value}
            className={
              "rounded-full px-2.5 py-1 text-[10px] ring-1 backdrop-blur transition-colors " +
              (tilt === value ? "bg-neon/20 text-neon ring-neon/40" : "bg-void/70 text-white/60 ring-white/15 hover:text-white")
            }
          >
            {value}°
          </button>
        ))}
      </div>

      <p className="pointer-events-none absolute bottom-3 left-3 z-10 rounded-full bg-void/70 px-3 py-1.5 text-[10px] text-white/55 backdrop-blur">
        {state === "live" ? "Streaming" : state === "connecting" ? "Connecting" : state === "reconnecting" ? "Reconnecting" : "Offline"}
        {" · "}{vehiclePoints.features.length} vehicle(s){" · "}
        {history ? "history loaded" : "no history yet"}
      </p>
    </div>
  );
}
