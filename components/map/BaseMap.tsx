"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import type { Map as MapLibreMap } from "maplibre-gl";
import * as React from "react";
import Map, {
  AttributionControl,
  FullscreenControl,
  GeolocateControl,
  NavigationControl,
  ScaleControl,
  type MapRef,
} from "react-map-gl/maplibre";

import { MAP_ATTRIBUTION, mapStyleUrl } from "@/lib/map-style";
import { cn } from "@/lib/utils";

/**
 * The reusable map surface.
 *
 * MapLibre, not Mapbox: the same renderer without an account, which matters because
 * this project runs with no environment variables at all (see `lib/map-style.ts`).
 *
 * The controls are MapLibre's own - zoom, compass, geolocate, fullscreen, scale,
 * attribution - because they already handle touch, keyboard focus and the browser APIs
 * that a hand-written overlay gets wrong. The dark studio palette matches the 3D
 * canvases: a map is a lit surface, and it keeps the same surface in both themes for the
 * same reason the model viewer does.
 *
 * Nothing here fetches layers: `children` are MapLibre `<Source>`/`<Layer>` elements, so
 * a caller decides what a map draws and this component decides how a map behaves.
 */

export interface BaseMapView {
  longitude: number;
  latitude: number;
  zoom: number;
  /**
   * Camera tilt and rotation, for the pages that draw in three dimensions.
   *
   * Optional, and left out everywhere else on purpose: a tilted map is harder to read when the
   * layers are flat shapes, and only the twin page (`/data2map/twin`) puts a camera in the sky.
   */
  pitch?: number;
  bearing?: number;
}

export interface BaseMapProps {
  initialView: BaseMapView;
  /**
   * A box to fit when it changes: `[west, south, east, north]`.
   *
   * This is how a region filter and a species search move the camera - the same
   * mechanism, so the two cannot disagree about where "Africa" is.
   */
  bounds?: [number, number, number, number] | null;
  /** Fired with the map and the click point, for layer features to be picked. */
  onPick?: (map: MapLibreMap, point: { x: number; y: number }) => void;
  onBackgroundClick?: () => void;
  onReady?: (map: MapLibreMap) => void;
  className?: string;
  ariaLabel?: string;
  children?: React.ReactNode;
}

export function BaseMap({
  initialView,
  bounds = null,
  onPick,
  onBackgroundClick,
  onReady,
  className,
  ariaLabel = "Interactive map",
  children,
}: BaseMapProps) {
  const mapRef = React.useRef<MapRef>(null);

  // `bounds` identifies the camera target. Fitting on every render would fight the
  // visitor's own panning, so it fits when the box changes and never otherwise.
  const boundsKey = bounds ? bounds.map((value) => value.toFixed(3)).join(",") : "";
  React.useEffect(() => {
    if (!bounds) return;
    mapRef.current?.fitBounds(bounds, { padding: 64, duration: 900, maxZoom: 6 });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- driven by boundsKey, not by the array identity
  }, [boundsKey]);

  return (
    // The wrapper owns the box; `Map` fills it. react-map-gl takes `style`, not a
    // class name, and a map that sizes itself is a map that jumps on first paint.
    <div className={cn("relative h-full w-full", className)}>
      <Map
        ref={mapRef}
        mapStyle={mapStyleUrl()}
        initialViewState={initialView}
        attributionControl={false}
        dragRotate={false}
        touchPitch={false}
        maxPitch={0}
        reuseMaps
        style={{ width: "100%", height: "100%" }}
        onLoad={(event) => onReady?.(event.target)}
        onClick={(event) => {
          const map = event.target;
          if (onPick) onPick(map, event.point);
          else onBackgroundClick?.();
        }}
      >
        <NavigationControl position="top-right" showCompass visualizePitch={false} />
        <GeolocateControl position="top-right" trackUserLocation={false} />
        <FullscreenControl position="top-right" />
        <ScaleControl position="bottom-left" unit="metric" />
        <AttributionControl
          position="bottom-right"
          compact
          customAttribution={`${MAP_ATTRIBUTION.name} · ${MAP_ATTRIBUTION.data} (${MAP_ATTRIBUTION.license})`}
        />
        {children}
      </Map>
    </div>
  );
}
