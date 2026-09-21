"use client";

import type { Feature, FeatureCollection, Geometry } from "geojson";
import type { Map as MapLibreMap } from "maplibre-gl";
import { Layer, Source } from "react-map-gl/maplibre";
import * as React from "react";

import { BaseMap } from "@/components/map/BaseMap";
import type { MapLayerId } from "@/lib/map-query";
import type { GeodataFeature } from "@/types/geodata";

/**
 * The layers the map actually draws.
 *
 * This module is the reason `react-map-gl` and MapLibre stay off the initial bundle: it
 * is only ever reached through `next/dynamic` in `LazyMap.tsx`, so a visitor on `/`,
 * `/explore` or a species page never downloads a map renderer. `check:bundle` fails if
 * that stops being true.
 *
 * Colours are literal hex rather than the CSS accent token: MapLibre paints in WebGL and
 * cannot read a custom property. The map therefore keeps the product's dark palette
 * whatever accent the visitor chose, exactly as the 3D canvases do.
 */

const LAYER_PAINT: Record<MapLayerId, string> = {
  habitat: "#35f0c0",
  historic: "#a97bff",
  occurrence: "#ffb738",
  protected: "#38e0ff",
  pressure: "#ff5d8f",
};

/** Which bundled `kind` each polygon toggle draws. */
const KIND_FOR_LAYER: Partial<Record<MapLayerId, string>> = {
  habitat: "habitat_current",
  historic: "habitat_historic",
  protected: "protected_area",
};

/**
 * Observation density, as a heatmap.
 *
 * MapLibre draws this itself, and that is a deliberate departure from the plan's
 * `Deck.gl HeatmapLayer`: deck.gl is several hundred kilobytes for a layer the renderer
 * already has, on a project whose whole first-paint budget is 165 kB. The plan's own
 * constraint is that a heavy library has to earn its place; this one would not. If Phase
 * 16 needs arc or trip layers - which MapLibre genuinely cannot draw - that trade is worth
 * revisiting.
 *
 * The colours are the product palette, and the ramp starts fully transparent so the
 * habitat polygons underneath stay readable.
 */
const HEATMAP_COLOR = [
  "interpolate",
  ["linear"],
  ["heatmap-density"],
  0,
  "rgba(4, 6, 15, 0)",
  0.15,
  "rgba(56, 224, 255, 0.35)",
  0.4,
  "rgba(53, 240, 192, 0.65)",
  0.7,
  "rgba(255, 183, 56, 0.85)",
  1,
  "rgba(255, 93, 143, 0.95)",
];

export interface MapCanvasProps {
  features: GeodataFeature[];
  /** Threat centroids with severity: a city is a dot at world zoom. */
  threats?: FeatureCollection<Geometry> | null;
  visible: Record<MapLayerId, boolean>;
  opacity: Record<MapLayerId, number>;
  /** The species to highlight, or null. */
  selectedSlug: string | null;
  /** A region to fit, or null for the whole world. */
  regionBounds: [number, number, number, number] | null;
  onSelect: (slug: string | null) => void;
  onReady?: () => void;
}

/**
 * A FeatureCollection MapLibre will accept.
 *
 * The cast is the one place this codebase admits that our hand-written GeoJSON types
 * and the renderer's are structurally the same without being nominally so: the shape is
 * validated at both ends (the generator and `check-geo` refuse an invalid ring) and
 * `lib/geodata.ts` strips the `crs` member RFC 7946 removed.
 */
function collectionOf(features: GeodataFeature[], kind: string): FeatureCollection<Geometry> {
  return {
    type: "FeatureCollection",
    features: features.filter((feature) => feature.properties.kind === kind) as unknown as Feature<Geometry>[],
  };
}

export function MapCanvas({
  features,
  threats = null,
  visible,
  opacity,
  selectedSlug,
  regionBounds,
  onSelect,
  onReady,
}: MapCanvasProps) {
  const [ready, setReady] = React.useState(false);

  function pick(map: MapLibreMap, point: { x: number; y: number }) {
    const hits = map.queryRenderedFeatures([point.x, point.y]);
    const match = hits.find((hit) => typeof (hit.properties as { slug?: unknown } | null)?.slug === "string");
    const slug = (match?.properties as { slug?: unknown } | undefined)?.slug;
    onSelect(typeof slug === "string" ? slug : null);
  }

  return (
    <BaseMap
      initialView={{ longitude: 12, latitude: 18, zoom: 1.4 }}
      bounds={regionBounds}
      onPick={pick}
      ariaLabel="World map of habitat ranges"
      onReady={() => {
        setReady(true);
        onReady?.();
      }}
    >
      {(["habitat", "historic", "protected"] as const).map((id) => {
        const kind = KIND_FOR_LAYER[id];
        if (!kind) return null;
        const shown = visible[id];

        return (
          <Source key={id} id={`${id}-source`} type="geojson" data={collectionOf(features, kind)}>
            <Layer
              id={`${id}-fill`}
              type="fill"
              layout={{ visibility: shown ? "visible" : "none" }}
              paint={{
                "fill-color": LAYER_PAINT[id],
                "fill-opacity": opacity[id] * (selectedSlug ? 0.35 : 1),
              }}
            />
            <Layer
              id={`${id}-line`}
              type="line"
              layout={{ visibility: shown ? "visible" : "none" }}
              paint={{ "line-color": LAYER_PAINT[id], "line-width": 1, "line-opacity": shown ? 0.75 : 0 }}
            />
          </Source>
        );
      })}

      {/* Threats are drawn as points sized by severity: 1 662 city outlines would be a
          megabyte of coordinates to show what a dot already shows at this zoom. The
          impact numbers behind the risk index come from the real polygons, in SQL. */}
      {visible.pressure && threats ? (
        <Source id="threat-source" type="geojson" data={threats}>
          <Layer
            id="threat-points"
            type="circle"
            paint={{
              "circle-radius": [
                "interpolate",
                ["linear"],
                ["zoom"],
                0,
                ["*", 2.5, ["get", "severity"]],
                6,
                ["*", 5, ["get", "severity"]],
              ],
              "circle-color": [
                "interpolate",
                ["linear"],
                ["get", "severity"],
                1,
                "#35f0c0",
                3,
                "#ffb738",
                5,
                "#ff5d8f",
              ],
              "circle-opacity": opacity.pressure,
              "circle-stroke-width": 0.4,
              "circle-stroke-color": "rgba(255,255,255,0.4)",
            }}
          />
        </Source>
      ) : null}

      {/* Threats are drawn as points sized by severity: 1 662 city outlines would be about
          a megabyte of coordinates to show what a dot already shows at this zoom. The impact
          numbers behind the risk index come from the real polygons, in SQL. */}
      {visible.pressure && threats ? (
        <Source id="threat-source" type="geojson" data={threats}>
          <Layer
            id="threat-points"
            type="circle"
            paint={{
              "circle-radius": ["*", 2.5, ["get", "severity"]],
              "circle-color": [
                "interpolate",
                ["linear"],
                ["get", "severity"],
                1,
                "#35f0c0",
                3,
                "#ffb738",
                5,
                "#ff5d8f",
              ],
              "circle-opacity": opacity.pressure,
              "circle-stroke-width": 0.4,
              "circle-stroke-color": "rgba(255,255,255,0.4)",
            }}
          />
        </Source>
      ) : null}

      {visible.occurrence ? (
        <Source id="occurrence-source" type="geojson" data={collectionOf(features, "occurrence")}>
          <Layer
            id="occurrence-heat"
            type="heatmap"
            paint={{
              // Weight is per point: the pipeline already thinned duplicates, so every
              // dot standing here is a real record.
              "heatmap-weight": 1,
              "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 0, 0.6, 6, 1.4],
              "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 10, 4, 22, 8, 38],
              "heatmap-opacity": opacity.occurrence,
              // Spread because MapLibre wants a mutable expression, and this one is a constant.
              "heatmap-color": [...HEATMAP_COLOR] as unknown as never,
            }}
          />
        </Source>
      ) : null}

      {/* The highlighted species is drawn on top, so a selection is never hidden
          underneath a neighbour that happens to be painted later. */}
      {selectedSlug ? (
        <Source
          id="selected-source"
          type="geojson"
          data={collectionOf(
            features.filter((feature) => feature.properties.slug === selectedSlug),
            "habitat_current",
          )}
        >
          <Layer id="selected-fill" type="fill" paint={{ "fill-color": "#ffffff", "fill-opacity": 0.18 }} />
          <Layer id="selected-line" type="line" paint={{ "line-color": "#ffffff", "line-width": 2 }} />
        </Source>
      ) : null}

      {!ready ? null : null}
    </BaseMap>
  );
}
