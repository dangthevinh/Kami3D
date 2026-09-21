"use client";

import type { FeatureCollection, Geometry } from "geojson";
import { Layer, Source } from "react-map-gl/maplibre";
import * as React from "react";

import { BaseMap } from "@/components/map/BaseMap";
import { SATELLITE_BASEMAP } from "@/lib/map-style";
import { heatExpression } from "@/lib/data2map/trends";
import type { TrendHexProperties } from "@/lib/data2map/trends";

/**
 * The trends canvas: a hex grid under a layer of real places.
 *
 * Reached only through `next/dynamic`, so MapLibre stays off every other route, and drawn with the
 * shared `BaseMap` surface - the same arrangement as the real-estate page. There is no deck.gl
 * here: a `fill` layer over Turf-built hexes draws the heat, and a `circle` layer draws the
 * food-and-drink POIs. See docs/DATA2MAP.md for why that decision is recorded rather than implied.
 *
 * The colour ramp is scaled to the largest value on screen, so a quiet hour still has a readable
 * shape instead of going uniformly dark.
 */

export interface TrendsCanvasProps {
  hexes: FeatureCollection<Geometry, TrendHexProperties & { value: number }>;
  max: number;
  pois: FeatureCollection<Geometry> | null;
  visible: Record<string, boolean>;
  opacity: Record<string, number>;
  satellite: boolean;
  bounds: [number, number, number, number] | null;
  onPick: (point: { lng: number; lat: number }) => void;
  /**
   * The box the visitor is looking at, reported on load and after every pan or zoom.
   *
   * Food and drink places are fetched per view - ODbL asks that a derived database not be
   * accumulated, and a viewport-sized question is the only one the public mirrors answer for a
   * dense city - so the page needs to know when the view changed.
   */
  onView?: (bounds: [number, number, number, number]) => void;
}

/** One colour per category, so the pins read as a legend without a legend. */
const CATEGORY_COLOR = [
  "match",
  ["get", "kind"],
  "cafe", "#38e0ff",
  "bubble_tea", "#a97bff",
  "restaurant", "#ffb738",
  "bakery", "#35f0c0",
  "#8a93a6",
];

export function TrendsCanvas({ hexes, max, pois, visible, opacity, satellite, bounds, onPick, onView }: TrendsCanvasProps) {
  // The heat is one layer with two metrics behind it: whichever of the two switches is on decides
  // which numbers the fill is coloured by, and the panel makes them exclusive.
  const heatVisible = Boolean(visible.population || visible.footfall);
  const heatOpacity = visible.footfall ? opacity.footfall : opacity.population;

  const expression = React.useMemo(() => heatExpression(max), [max]);

  return (
    <BaseMap
      initialView={{ longitude: 106.744, latitude: 10.78, zoom: 11.2 }}
      bounds={bounds}
      ariaLabel="Population density, footfall by hour and food-and-drink places in Ho Chi Minh City"
      onReady={(map) => {
        const report = () => {
          const box = map.getBounds();
          onView?.([box.getWest(), box.getSouth(), box.getEast(), box.getNorth()]);
        };
        report();
        map.on("moveend", report);
      }}
      onPick={(map, point) => {
        const lngLat = map.unproject([point.x, point.y]);
        onPick({ lng: lngLat.lng, lat: lngLat.lat });
      }}
    >
      {satellite ? (
        <Source id="satellite" type="raster" tiles={SATELLITE_BASEMAP.tiles as unknown as string[]} tileSize={SATELLITE_BASEMAP.tileSize}>
          <Layer id="satellite-raster" type="raster" paint={{ "raster-opacity": 0.75, "raster-saturation": -0.25 }} />
        </Source>
      ) : null}

      <Source id="trend-hex-source" type="geojson" data={hexes}>
        <Layer
          id="trend-hex-fill"
          type="fill"
          layout={{ visibility: heatVisible ? "visible" : "none" }}
          paint={{ "fill-color": expression as unknown as never, "fill-opacity": heatOpacity }}
        />
        <Layer
          id="trend-hex-line"
          type="line"
          layout={{ visibility: heatVisible ? "visible" : "none" }}
          paint={{ "line-color": "rgba(255,255,255,0.12)", "line-width": 0.4 }}
        />
      </Source>

      {pois ? (
        <Source id="trend-poi-source" type="geojson" data={pois}>
          <Layer
            id="trend-poi-points"
            type="circle"
            layout={{ visibility: visible.competitor ? "visible" : "none" }}
            paint={{
              "circle-radius": 3.2,
              "circle-color": CATEGORY_COLOR as unknown as never,
              "circle-opacity": opacity.competitor,
              "circle-stroke-width": 0.8,
              "circle-stroke-color": "rgba(4,6,15,0.8)",
            }}
          />
        </Source>
      ) : null}
    </BaseMap>
  );
}
