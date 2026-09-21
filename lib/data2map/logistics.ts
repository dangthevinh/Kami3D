import type { Feature, FeatureCollection, LineString, Point, Polygon } from "geojson";

import { distanceKm, pathLengthKm, type LatLng } from "../geo.ts";

/**
 * The logistics sample, and the two small pieces of maths the page needs from it.
 *
 * The file is generated (`npm run logistics:generate`) and every feature in it is simulated: real
 * delivery addresses are personal data and real fleet telemetry is private, so this is a demo whose
 * *methods* are real - the routes in it were computed by `lib/data2map/routing.ts`, the same code
 * the page re-runs when the visitor asks it to plan a day.
 *
 * `readLogisticsSample` refuses a file whose features do not declare themselves simulated. That is
 * a stronger rule than the other products need, and it is deliberate: this is the one dataset in
 * the project that would be a privacy problem if it were real and unlabelled.
 */

export interface LogisticsAssumptions {
  speedKmh: number;
  serviceMinutes: number;
  costPerKm: number;
  costPerHour: number;
  isochroneNote: string;
  stops: number;
  vehicles: number;
  depots: number;
}

export interface DepotProperties {
  layer: "depot";
  depot_id: string;
  name: string;
  synthetic: true;
  note: string;
}

export interface StopProperties {
  layer: "stop";
  stop_id: string;
  depot_id: string;
  demand_kg: number;
  window_start: number;
  window_end: number;
  distance_km: number;
  synthetic: true;
  note: string;
}

export interface FleetProperties {
  layer: "fleet";
  vehicle_id: string;
  name: string;
  capacity_kg: number;
  depot_id: string;
  stop_ids: string[];
  distance_km: number;
  trace_start_hour: number;
  trace_end_hour: number;
  synthetic: true;
  note: string;
}

export interface IsochroneProperties {
  layer: "isochrone";
  depot_id: string;
  minutes: number;
  radius_km: number;
  method: string;
  synthetic: true;
  note: string;
}

export interface LogisticsSample {
  area: { west: number; south: number; east: number; north: number };
  centre: LatLng;
  note: string;
  attribution: string;
  assumptions: LogisticsAssumptions;
  collection: FeatureCollection;
  depots: Feature<Point, DepotProperties>[];
  stops: Feature<Point, StopProperties>[];
  vehicles: Feature<LineString, FleetProperties>[];
  isochrones: Feature<Polygon, IsochroneProperties>[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function readLogisticsSample(raw: unknown): LogisticsSample {
  if (!isRecord(raw) || raw.type !== "FeatureCollection" || !Array.isArray(raw.features)) {
    throw new Error("logistics sample: not a FeatureCollection");
  }

  const properties = isRecord(raw.properties) ? raw.properties : {};
  const area = properties.area;
  if (!isRecord(area)) throw new Error("logistics sample: no area");
  if (!isRecord(properties.assumptions)) throw new Error("logistics sample: no assumptions block to print");

  const features = raw.features as Feature[];
  const ofLayer = <P, G extends Feature["geometry"]>(layer: string) =>
    features.filter((feature) => (feature.properties as { layer?: string } | null)?.layer === layer) as Feature<G, P>[];

  for (const feature of features) {
    const props = feature.properties as { synthetic?: boolean; note?: string; layer?: string } | null;
    if (props?.synthetic !== true) throw new Error(`logistics sample: ${props?.layer ?? "a"} feature does not declare itself simulated`);
    if (!props.note || props.note.length < 20) throw new Error(`logistics sample: ${props.layer} feature does not explain what it is`);
  }

  const depots = ofLayer<DepotProperties, Point>("depot");
  const stops = ofLayer<StopProperties, Point>("stop");
  const vehicles = ofLayer<FleetProperties, LineString>("fleet");
  const isochrones = ofLayer<IsochroneProperties, Polygon>("isochrone");

  if (depots.length === 0 || stops.length === 0 || vehicles.length === 0) {
    throw new Error("logistics sample: a page about routes needs depots, stops and vehicles");
  }

  return {
    area: {
      west: Number(area.west),
      south: Number(area.south),
      east: Number(area.east),
      north: Number(area.north),
    },
    centre: isRecord(properties.centre) ? { lng: Number(properties.centre.lng), lat: Number(properties.centre.lat) } : { lng: 0, lat: 0 },
    note: typeof properties.note === "string" ? properties.note : "",
    attribution: typeof properties.attribution === "string" ? properties.attribution : "",
    assumptions: properties.assumptions as unknown as LogisticsAssumptions,
    collection: { type: "FeatureCollection", features },
    depots,
    stops,
    vehicles,
    isochrones,
  };
}

/** A stop, in the shape the routing module takes, so the page does not carry two vocabularies. */
export function stopToRouting(stop: Feature<Point, StopProperties>) {
  return {
    id: stop.properties.stop_id,
    lng: stop.geometry.coordinates[0],
    lat: stop.geometry.coordinates[1],
    demandKg: stop.properties.demand_kg,
    window: [stop.properties.window_start, stop.properties.window_end] as [number, number],
  };
}

/** Where a vehicle is at a fraction of its shift, by distance along its own trace. */
export function tracePositionAt(line: LineString, fraction: number): LatLng {
  const points = line.coordinates.map(([lng, lat]) => ({ lng, lat }));
  if (points.length === 0) return { lng: 0, lat: 0 };
  if (points.length === 1) return points[0];

  const clamped = Math.min(1, Math.max(0, Number.isFinite(fraction) ? fraction : 0));
  const total = pathLengthKm(points);
  if (total <= 0) return points[0];

  let travelled = clamped * total;

  for (let i = 1; i < points.length; i += 1) {
    const leg = distanceKm(points[i - 1], points[i]);
    if (travelled <= leg || i === points.length - 1) {
      const ratio = leg === 0 ? 0 : Math.min(1, travelled / leg);
      return {
        lng: points[i - 1].lng + (points[i].lng - points[i - 1].lng) * ratio,
        lat: points[i - 1].lat + (points[i].lat - points[i - 1].lat) * ratio,
      };
    }
    travelled -= leg;
  }

  return points[points.length - 1];
}

/** How far through its shift a vehicle is at a given hour, 0 to 1. */
export function shiftFraction(hour: number, startHour: number, endHour: number): number {
  if (!Number.isFinite(hour) || endHour <= startHour) return 0;
  return Math.min(1, Math.max(0, (hour - startHour) / (endHour - startHour)));
}

/** Dong, written the way a Vietnamese reader reads money. */
export function formatDong(value: number): string {
  if (!Number.isFinite(value)) return "—";
  if (Math.abs(value) >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)} tỷ ₫`;
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} tr ₫`;
  return `${Math.round(value / 1000)}k ₫`;
}
