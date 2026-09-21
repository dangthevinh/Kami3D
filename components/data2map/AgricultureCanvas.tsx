"use client";

import type { FeatureCollection, Geometry } from "geojson";
import { Layer, Source } from "react-map-gl/maplibre";
import * as React from "react";

import { BaseMap } from "@/components/map/BaseMap";
import { NDVI_CLASSES, NDVI_NODATA_COLOR } from "@/lib/data2map/ndvi";

/**
 * The agriculture canvas: real rasters, simulated parcels, and no confusion between them.
 *
 * The **raster is the measurement** - NASA GIBS tiles of the MODIS NDVI 8-day composite and of IMERG
 * rainfall, keyless and public domain, with the date taken from the season slider. The **parcels are
 * a sample**, coloured by the NDVI class of the simulated series at the same period, and the legend
 * marks "no reading" as an absence rather than as green.
 *
 * The tile URL is built from the period the page is on, so the raster and the clock cannot disagree.
 * No deck.gl: a `raster` source and two `fill` layers are all this needs.
 */

/** Public domain, keyless, world-wide: the same provider D2 uses for its satellite base. */
const GIBS = "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best";

export function ndviTileUrl(date: string): string {
  return GIBS + "/MODIS_Terra_NDVI_8Day/default/" + date + "/GoogleMapsCompatible_Level9/{z}/{y}/{x}.png";
}

export function rainTileUrl(date: string): string {
  return GIBS + "/IMERG_Precipitation_Rate/default/" + date + "/GoogleMapsCompatible_Level6/{z}/{y}/{x}.png";
}

export interface AgricultureCanvasProps {
  provinces: FeatureCollection<Geometry>;
  fields: FeatureCollection<Geometry>;
  /** The 8-day composite the raster is drawn for. */
  date: string;
  visible: Record<string, boolean>;
  opacity: Record<string, number>;
  bounds: [number, number, number, number] | null;
  onPickField: (fieldId: string | null) => void;
}

/** The class palette, in the order the legend prints it, plus the absence of a reading. */
const FIELD_COLOR = [
  "match",
  ["get", "class_id"],
  ...NDVI_CLASSES.flatMap((entry) => [entry.id, entry.color]),
  NDVI_NODATA_COLOR,
];

export function AgricultureCanvas({ provinces, fields, date, visible, opacity, bounds, onPickField }: AgricultureCanvasProps) {
  return (
    <BaseMap
      initialView={{ longitude: 105.6, latitude: 9.95, zoom: 8.4 }}
      bounds={bounds}
      ariaLabel="Crop health over the Mekong Delta: NDVI and rainfall rasters with a sample of parcels"
      onPick={(map, point) => {
        // The parcel under the pointer, so a click selects what the visitor is looking at. The
        // point BaseMap hands over is the event's own, which MapLibre accepts and its types do not.
        const hits = map.queryRenderedFeatures(point as never, { layers: ["field-fill"] });
        const id = hits[0]?.properties?.field_id;
        onPickField(typeof id === "string" ? id : null);
      }}
    >
      {visible.rain ? (
        <Source id="rain-source" type="raster" tiles={[rainTileUrl(date)]} tileSize={256} key={date + "-rain"}>
          <Layer id="rain-raster" type="raster" paint={{ "raster-opacity": opacity.rain, "raster-saturation": 0.3 }} />
        </Source>
      ) : null}

      {visible.ndvi ? (
        <Source id="ndvi-source" type="raster" tiles={[ndviTileUrl(date)]} tileSize={256} key={date + "-ndvi"}>
          <Layer id="ndvi-raster" type="raster" paint={{ "raster-opacity": opacity.ndvi }} />
        </Source>
      ) : null}

      <Source id="province-source" type="geojson" data={provinces}>
        <Layer
          id="province-fill"
          type="fill"
          layout={{ visibility: visible.province ? "visible" : "none" }}
          paint={{ "fill-color": "#38e0ff", "fill-opacity": opacity.province * 0.08 }}
        />
        <Layer
          id="province-line"
          type="line"
          layout={{ visibility: visible.province ? "visible" : "none" }}
          paint={{ "line-color": "rgba(255,255,255,0.45)", "line-width": 0.7, "line-dasharray": [3, 2] }}
        />
      </Source>

      <Source id="field-source" type="geojson" data={fields}>
        <Layer
          id="field-fill"
          type="fill"
          layout={{ visibility: visible.field ? "visible" : "none" }}
          paint={{ "fill-color": FIELD_COLOR as unknown as never, "fill-opacity": opacity.field }}
        />
        <Layer
          id="field-line"
          type="line"
          layout={{ visibility: visible.field ? "visible" : "none" }}
          paint={{ "line-color": "rgba(4,6,15,0.65)", "line-width": 0.5 }}
        />
      </Source>
    </BaseMap>
  );
}
