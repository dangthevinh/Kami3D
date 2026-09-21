"use client";

import type { FeatureCollection, Geometry, LineString, Point } from "geojson";
import { Layer, Source } from "react-map-gl/maplibre";
import * as React from "react";

import { BaseMap } from "@/components/map/BaseMap";
import { SATELLITE_BASEMAP } from "@/lib/map-style";
import { shiftFraction, tracePositionAt } from "@/lib/data2map/logistics";
import type { FleetProperties } from "@/lib/data2map/logistics";

/**
 * The logistics canvas.
 *
 * Three things it deliberately does **not** do:
 *
 *   1. no deck.gl. Clustering is MapLibre\'s own (`cluster: true` on a GeoJSON source), which draws
 *      the bubbles, the counts and the zoom-to-expand behaviour without a renderer the other routes
 *      do not pay for; the moving vehicles are a `circle` layer whose positions are computed here;
 *   2. no second WebGL context - this is the page\'s only canvas;
 *   3. no invented motion. A vehicle is interpolated along **the trace this project generated**, by
 *      distance, and its position is a pure function of the hour.
 *
 * The vehicle dots are eased between hours so the fleet does not hop: the clock steps once an hour,
 * the dot takes three quarters of a second to get there, and reduced motion turns the easing off.
 */

export interface LogisticsCanvasProps {
  depots: FeatureCollection<Geometry>;
  stops: FeatureCollection<Geometry>;
  fleet: FeatureCollection<Geometry>;
  isochrones: FeatureCollection<Geometry>;
  /** The depot whose coverage bands are drawn, or null for none. */
  depotId: string | null;
  hour: number;
  visible: Record<string, boolean>;
  opacity: Record<string, number>;
  satellite: boolean;
  reduceMotion: boolean;
  bounds: [number, number, number, number] | null;
  onPick: (point: { lng: number; lat: number }) => void;
}

/** One colour per vehicle, so a trace and its dot always agree. */
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

/** How long a dot takes to travel one hour of the clock. */
const EASE_MS = 750;

export function LogisticsCanvas({
  depots,
  stops,
  fleet,
  isochrones,
  depotId,
  hour,
  visible,
  opacity,
  satellite,
  reduceMotion,
  bounds,
  onPick,
}: LogisticsCanvasProps) {
  // The eased clock: the hour the dots are drawn at, which catches up with `hour` over EASE_MS.
  const [shownHour, setShownHour] = React.useState(hour);

  React.useEffect(() => {
    if (reduceMotion) {
      setShownHour(hour);
      return;
    }

    const from = shownHour;
    const started = performance.now();
    let frame = requestAnimationFrame(function step(now) {
      const progress = Math.min(1, (now - started) / EASE_MS);
      setShownHour(from + (hour - from) * progress);
      if (progress < 1) frame = requestAnimationFrame(step);
    });

    return () => cancelAnimationFrame(frame);
    // `shownHour` is the animation\'s own output: re-running on it would restart the ease every frame.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hour, reduceMotion]);

  /** Where every vehicle is at the drawn hour. Pure, and recomputed on the clock only. */
  const vehicles = React.useMemo(() => {
    const features = fleet.features
      .filter((feature): feature is typeof feature & { geometry: LineString } => feature.geometry.type === "LineString")
      .map((feature) => {
        const properties = feature.properties as unknown as FleetProperties;
        const fraction = shiftFraction(shownHour, properties.trace_start_hour, properties.trace_end_hour);
        const position = tracePositionAt(feature.geometry, fraction);

        return {
          type: "Feature" as const,
          properties: { ...properties, on_shift: fraction > 0 && fraction < 1 },
          geometry: { type: "Point" as const, coordinates: [position.lng, position.lat] },
        };
      });

    return { type: "FeatureCollection" as const, features };
  }, [fleet, shownHour]);

  const bands = React.useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: isochrones.features.filter((feature) => (feature.properties as { depot_id?: string } | null)?.depot_id === depotId),
    }),
    [isochrones, depotId],
  );

  return (
    <BaseMap
      initialView={{ longitude: 106.744, latitude: 10.78, zoom: 11.2 }}
      bounds={bounds}
      ariaLabel="Depots, delivery stops, coverage bands and vehicle traces around Ho Chi Minh City"
      onPick={(map, point) => {
        const lngLat = map.unproject([point.x, point.y]);
        onPick({ lng: lngLat.lng, lat: lngLat.lat });
      }}
    >
      {satellite ? (
        <Source id="satellite" type="raster" tiles={SATELLITE_BASEMAP.tiles as unknown as string[]} tileSize={SATELLITE_BASEMAP.tileSize}>
          <Layer id="satellite-raster" type="raster" paint={{ "raster-opacity": 0.7, "raster-saturation": -0.3 }} />
        </Source>
      ) : null}

      {/* Widest band first, so the 15-minute zone is drawn on top of the 60-minute one. */}
      <Source id="isochrone-source" type="geojson" data={bands}>
        <Layer
          id="isochrone-fill"
          type="fill"
          layout={{ visibility: visible.isochrone && depotId ? "visible" : "none" }}
          paint={{
            "fill-color": ["match", ["get", "minutes"], 15, "#35f0c0", 30, "#38e0ff", 45, "#ffb738", "#ff5d8f"],
            "fill-opacity": ["case", ["==", ["get", "minutes"], 15], opacity.isochrone * 0.5, opacity.isochrone * 0.18],
          }}
        />
        <Layer
          id="isochrone-line"
          type="line"
          layout={{ visibility: visible.isochrone && depotId ? "visible" : "none" }}
          paint={{ "line-color": "rgba(255,255,255,0.35)", "line-width": 0.6, "line-dasharray": [2, 2] }}
        />
      </Source>

      <Source id="stop-source" type="geojson" data={stops} cluster clusterRadius={45} clusterMaxZoom={14}>
        <Layer
          id="stop-clusters"
          type="circle"
          layout={{ visibility: visible.stop ? "visible" : "none" }}
          filter={["has", "point_count"]}
          paint={{
            "circle-color": ["step", ["get", "point_count"], "#38e0ff", 20, "#35f0c0", 50, "#ffb738"],
            "circle-opacity": opacity.stop,
            "circle-radius": ["step", ["get", "point_count"], 12, 20, 16, 50, 22],
            "circle-stroke-width": 1,
            "circle-stroke-color": "rgba(4,6,15,0.7)",
          }}
        />
        {/* The count on the bubble, in the style's own default font - naming a font the style may
            not ship is how a map ends up with silent blank labels. */}
        <Layer
          id="stop-cluster-count"
          type="symbol"
          layout={{
            visibility: visible.stop ? "visible" : "none",
            "text-field": ["get", "point_count_abbreviated"],
            "text-size": 11,
            "text-allow-overlap": true,
          }}
          filter={["has", "point_count"]}
          paint={{ "text-color": "#04060f" }}
        />
        <Layer
          id="stop-points"
          type="circle"
          layout={{ visibility: visible.stop ? "visible" : "none" }}
          filter={["!", ["has", "point_count"]]}
          paint={{
            "circle-radius": 3.2,
            "circle-color": "#38e0ff",
            "circle-opacity": opacity.stop,
            "circle-stroke-width": 0.8,
            "circle-stroke-color": "rgba(4,6,15,0.8)",
          }}
        />
      </Source>

      <Source id="fleet-source" type="geojson" data={fleet}>
        <Layer
          id="fleet-lines"
          type="line"
          layout={{ visibility: visible.fleet ? "visible" : "none", "line-cap": "round" }}
          paint={{
            "line-color": VEHICLE_COLOR as unknown as never,
            "line-width": 1.6,
            "line-opacity": opacity.fleet * 0.7,
            "line-dasharray": [3, 2],
          }}
        />
      </Source>

      <Source id="vehicle-source" type="geojson" data={vehicles}>
        <Layer
          id="vehicle-dots"
          type="circle"
          layout={{ visibility: visible.fleet ? "visible" : "none" }}
          paint={{
            "circle-radius": 6,
            "circle-color": VEHICLE_COLOR as unknown as never,
            "circle-opacity": opacity.fleet,
            "circle-stroke-width": 1.5,
            "circle-stroke-color": "rgba(4,6,15,0.9)",
          }}
        />
      </Source>

      <Source id="depot-source" type="geojson" data={depots}>
        <Layer
          id="depot-points"
          type="circle"
          layout={{ visibility: visible.depot ? "visible" : "none" }}
          paint={{
            "circle-radius": ["case", ["==", ["get", "depot_id"], depotId ?? ""], 9, 6.5],
            "circle-color": "#a97bff",
            "circle-opacity": opacity.depot,
            "circle-stroke-width": 1.5,
            "circle-stroke-color": "#04060f",
          }}
        />
      </Source>
    </BaseMap>
  );
}
