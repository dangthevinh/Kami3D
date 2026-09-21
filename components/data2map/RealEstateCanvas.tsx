"use client";

import type { Feature, FeatureCollection, Geometry } from "geojson";
import { Layer, Source } from "react-map-gl/maplibre";
import * as React from "react";

import { BaseMap } from "@/components/map/BaseMap";

/**
 * The real-estate canvas.
 *
 * Reached only through `next/dynamic`, so `react-map-gl` and MapLibre stay off the landing page
 * and off every other route. It reuses `BaseMap` - the shared surface - and adds the layers this
 * product needs, which is the arrangement the Data2Map plan asks for: new data and new pages, one
 * renderer.
 *
 * The satellite toggle is a **raster layer over the dark style**, not a second basemap: NASA
 * GIBS imagery is public domain, keyless and world-wide, which is the only kind of provider this
 * project will point at by default (see docs/DATA2MAP.md). It is daily imagery at a coarse
 * resolution, and the panel says so rather than pretending it is a survey photograph.
 */

/** NASA EOSDIS GIBS: public domain, no key, global. A fixed snapshot date, stated in the UI. */
const SATELLITE_TILES = [
  "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/2024-01-01/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg",
];

export interface RealEstateCanvasProps {
  features: FeatureCollection<Geometry>;
  amenities: FeatureCollection<Geometry> | null;
  visible: Record<string, boolean>;
  opacity: Record<string, number>;
  satellite: boolean;
  bounds: [number, number, number, number] | null;
  onPick: (point: { lng: number; lat: number; bbox: [number, number, number, number] }) => void;
}

const ZONE_COLOR = [
  "match",
  ["get", "zone"],
  "residential", "#38e0ff",
  "commercial", "#ff5d8f",
  "mixed", "#a97bff",
  "industrial", "#ffb738",
  "public", "#8a93a6",
  "green", "#35f0c0",
  "#8a93a6",
];

const FLOOD_COLOR = [
  "match",
  ["get", "level"],
  "high", "#ff5d8f",
  "medium", "#ffb738",
  "low", "#38e0ff",
  "#8a93a6",
];

function ofLayer(collection: FeatureCollection<Geometry>, layer: string): FeatureCollection<Geometry> {
  return {
    type: "FeatureCollection",
    features: collection.features.filter((feature) => (feature.properties as { layer?: string } | null)?.layer === layer),
  };
}

export function RealEstateCanvas({ features, amenities, visible, opacity, satellite, bounds, onPick }: RealEstateCanvasProps) {
  const box = React.useRef<[number, number, number, number]>([0, 0, 0, 0]);

  return (
    <BaseMap
      initialView={{ longitude: 106.744, latitude: 10.78, zoom: 11.2 }}
      bounds={bounds}
      ariaLabel="Land price, zoning, flood risk and amenities around Ho Chi Minh City"
      onPick={(map, point) => {
        const boundsNow = map.getBounds();
        box.current = [boundsNow.getWest(), boundsNow.getSouth(), boundsNow.getEast(), boundsNow.getNorth()];
        const lngLat = map.unproject([point.x, point.y]);
        onPick({ lng: lngLat.lng, lat: lngLat.lat, bbox: box.current });
      }}
    >
      {satellite ? (
        <Source id="satellite" type="raster" tiles={SATELLITE_TILES} tileSize={256}>
          <Layer id="satellite-raster" type="raster" paint={{ "raster-opacity": 0.85, "raster-saturation": -0.2 }} />
        </Source>
      ) : null}

      <Source id="zoning-source" type="geojson" data={ofLayer(features, "zoning")}>
        <Layer
          id="zoning-fill"
          type="fill"
          layout={{ visibility: visible.zoning ? "visible" : "none" }}
          paint={{ "fill-color": ZONE_COLOR as unknown as never, "fill-opacity": opacity.zoning }}
        />
        <Layer
          id="zoning-line"
          type="line"
          layout={{ visibility: visible.zoning ? "visible" : "none" }}
          paint={{ "line-color": "rgba(255,255,255,0.35)", "line-width": 0.5 }}
        />
      </Source>

      <Source id="land-price-source" type="geojson" data={ofLayer(features, "land_price")}>
        <Layer
          id="land-price-fill"
          type="fill"
          layout={{ visibility: visible.land_price ? "visible" : "none" }}
          paint={{
            // The heat ramp is the price itself: cheap land reads cool, expensive land warm.
            "fill-color": [
              "interpolate",
              ["linear"],
              ["get", "price_vnd_m2"],
              20_000_000, "#0b3d3a",
              60_000_000, "#35f0c0",
              120_000_000, "#ffb738",
              250_000_000, "#ff5d8f",
            ],
            "fill-opacity": opacity.land_price,
          }}
        />
      </Source>

      <Source id="flood-source" type="geojson" data={ofLayer(features, "flood")}>
        <Layer
          id="flood-fill"
          type="fill"
          layout={{ visibility: visible.flood ? "visible" : "none" }}
          paint={{ "fill-color": FLOOD_COLOR as unknown as never, "fill-opacity": opacity.flood }}
        />
      </Source>

      {amenities ? (
        <Source id="amenities-source" type="geojson" data={amenities}>
          <Layer
            id="amenities-points"
            type="circle"
            layout={{ visibility: visible.amenity ? "visible" : "none" }}
            paint={{
              "circle-radius": 3.5,
              "circle-color": [
                "match",
                ["get", "kind"],
                "school", "#38e0ff",
                "hospital", "#ff5d8f",
                "market", "#ffb738",
                "#35f0c0",
              ],
              "circle-opacity": opacity.amenity,
              "circle-stroke-width": 0.8,
              "circle-stroke-color": "rgba(4,6,15,0.8)",
            }}
          />
        </Source>
      ) : null}
    </BaseMap>
  );
}
