#!/usr/bin/env node
/**
 * Generates the Data2Map logistics sample: `data/data2map-logistics.json`.
 *
 *   node scripts/generate-logistics.mjs           # write the file
 *   node scripts/generate-logistics.mjs --check   # fail if it is out of date (CI)
 *
 * ## What this is, and why it has to be simulated
 *
 * Delivery addresses are **personal data**, and fleet telemetry is private by nature. There is no
 * open dataset of either, and there should not be. So every stop here is invented, every depot is a
 * plausible location rather than a real company's, and every vehicle trace is generated - the same
 * choice Phase D3 made for footfall, for a stronger reason: a leaked real dataset of this shape
 * would be a privacy incident, not a licensing one.
 *
 * The **methods** are real: the stops are routed with the same nearest-neighbour + 2-opt code the
 * page runs (`lib/data2map/routing.ts`), so the trace a visitor watches on the map is a route this
 * project actually computed, not a scribble.
 *
 * ## The isochrones
 *
 * Mapbox's Isochrone API needs an access token, which this project refuses on principle (a fresh
 * clone must run with no configuration), so coverage is drawn with Turf: a circle of the distance
 * an assumed average speed reaches in 15, 30, 45 and 60 minutes. It is **not** drive time - the
 * road bends, the river is in the way, and the page says so in those words next to the legend
 * rather than calling it a "30-minute delivery zone".
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { circle } from "@turf/turf";

import { ASSUMPTIONS, nearestNeighbour, twoOpt } from "../lib/data2map/routing.ts";
import { distanceKm } from "../lib/geo.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_FILE = join(ROOT, "data", "data2map-logistics.json");

/** Ho Chi Minh City, the same window every Data2Map product uses. */
const AREA = { west: 106.62, south: 10.7, east: 106.87, north: 10.86 };
const CENTRE = { lng: 106.703, lat: 10.776 };

const STOPS = 180;
const TRACE_START_HOUR = 7;
const TRACE_END_HOUR = 18;

const DEPOTS = [
  { id: "depot-west", name: "Bình Chánh depot (west)", lng: 106.662, lat: 10.723, synthetic: true },
  { id: "depot-centre", name: "District 4 depot (centre)", lng: 106.706, lat: 10.757, synthetic: true },
  { id: "depot-east", name: "Thủ Đức depot (east)", lng: 106.812, lat: 10.812, synthetic: true },
];

const VEHICLES = [
  { id: "van-01", name: "Van 01", capacityKg: 650, depotId: "depot-west" },
  { id: "van-02", name: "Van 02", capacityKg: 450, depotId: "depot-west" },
  { id: "van-03", name: "Van 03", capacityKg: 650, depotId: "depot-centre" },
  { id: "van-04", name: "Van 04", capacityKg: 450, depotId: "depot-centre" },
  { id: "van-05", name: "Van 05", capacityKg: 650, depotId: "depot-east" },
  { id: "van-06", name: "Van 06", capacityKg: 450, depotId: "depot-east" },
];

const ISOCHRONE_MINUTES = [15, 30, 45, 60];

const SOURCE = "Kami3D synthetic";
const STOP_NOTE =
  "Simulated delivery address. Real addresses are personal data: no open dataset of them exists, and this project would not ship one if it did.";
const FLEET_NOTE =
  "Simulated vehicle trace, generated from a route this project computed. Real fleet telemetry is private and is never collected here.";
const ISOCHRONE_NOTE =
  "Straight-line coverage at an assumed average speed, not drive time: the road bends, the river is in the way, and no routing engine was asked.";

/** Deterministic noise, so regenerating the file is a no-op in git. */
function noise(seed, index) {
  const value = Math.sin(seed * 12.9898 + index * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function seedFrom(text) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash % 1000);
}

const round = (value, places = 5) => Number(value.toFixed(places));

/** Stops clustered around the depots, because that is where a delivery round actually goes. */
function stopFeatures() {
  const features = [];

  for (let index = 0; index < STOPS; index += 1) {
    const id = `stop-${String(index + 1).padStart(3, "0")}`;
    const seed = seedFrom(id);
    // Weighted towards the centre depot, which is the busiest of the three.
    const depot = DEPOTS[seed % 5 === 0 ? 0 : seed % 5 === 1 ? 2 : 1];

    const angle = noise(seed, 1) * Math.PI * 2;
    const km = 0.4 + noise(seed, 2) ** 1.6 * 9;
    const lng = depot.lng + (Math.cos(angle) * km) / (111.32 * Math.cos((depot.lat * Math.PI) / 180));
    const lat = depot.lat + (Math.sin(angle) * km) / 110.574;

    const startHour = 8 + Math.floor(noise(seed, 3) * 8);
    const demandKg = 2 + Math.round(noise(seed, 4) * 38);

    features.push({
      type: "Feature",
      properties: {
        layer: "stop",
        stop_id: id,
        depot_id: depot.id,
        demand_kg: demandKg,
        window_start: startHour,
        window_end: Math.min(21, startHour + 4),
        distance_km: Math.round(distanceKm({ lng, lat }, depot) * 100) / 100,
        source: SOURCE,
        license: "CC0",
        synthetic: true,
        note: STOP_NOTE,
      },
      geometry: { type: "Point", coordinates: [round(Math.max(AREA.west, Math.min(AREA.east, lng))), round(Math.max(AREA.south, Math.min(AREA.north, lat)))] },
    });
  }

  return features;
}

/**
 * One trace per vehicle: the route its six stops were put in by the same solver the page uses.
 *
 * The polyline is what the map animates a dot along; `trace_start_hour` and `trace_end_hour` say
 * when the shift runs, and the page interpolates between them rather than inventing a new position.
 */
function fleetFeatures(stopFeatures) {
  return VEHICLES.map((vehicle, vehicleIndex) => {
    const depot = DEPOTS.find((entry) => entry.id === vehicle.depotId);
    const own = stopFeatures
      .filter((feature) => feature.properties.depot_id === vehicle.depotId)
      .sort((a, b) => a.properties.stop_id.localeCompare(b.properties.stop_id))
      .slice(vehicleIndex % 2 === 0 ? 0 : 6, vehicleIndex % 2 === 0 ? 6 : 12);

    const points = own.map((feature) => ({ lng: feature.geometry.coordinates[0], lat: feature.geometry.coordinates[1] }));
    const greedy = nearestNeighbour(depot, points);
    const order = twoOpt(depot, greedy, points);
    const tour = [depot, ...order.map((index) => points[index]), depot];

    return {
      type: "Feature",
      properties: {
        layer: "fleet",
        vehicle_id: vehicle.id,
        name: vehicle.name,
        capacity_kg: vehicle.capacityKg,
        depot_id: vehicle.depotId,
        stop_ids: order.map((index) => own[index].properties.stop_id),
        distance_km: Math.round(tour.reduce((sum, point, index) => (index === 0 ? 0 : sum + distanceKm(tour[index - 1], point)), 0) * 100) / 100,
        trace_start_hour: TRACE_START_HOUR,
        trace_end_hour: TRACE_END_HOUR,
        source: SOURCE,
        license: "CC0",
        synthetic: true,
        note: FLEET_NOTE,
      },
      geometry: { type: "LineString", coordinates: tour.map((point) => [round(point.lng), round(point.lat)]) },
    };
  });
}

/** The coverage bands: Turf circles, with the method written into every feature. */
function isochroneFeatures() {
  const features = [];

  for (const depot of DEPOTS) {
    for (const minutes of ISOCHRONE_MINUTES) {
      const radiusKm = (ASSUMPTIONS.speedKmh * minutes) / 60;
      const band = circle([depot.lng, depot.lat], radiusKm, { steps: 64, units: "kilometers" });

      features.push({
        type: "Feature",
        properties: {
          layer: "isochrone",
          depot_id: depot.id,
          minutes,
          radius_km: Math.round(radiusKm * 10) / 10,
          method: `Turf circle at ${ASSUMPTIONS.speedKmh} km/h average speed`,
          source: SOURCE,
          license: "CC0",
          synthetic: true,
          note: ISOCHRONE_NOTE,
        },
        geometry: { type: "Polygon", coordinates: band.geometry.coordinates.map((ring) => ring.map(([lng, lat]) => [round(lng), round(lat)])) },
      });
    }
  }

  return features;
}

export function buildSample() {
  const stops = stopFeatures();
  const features = [
    ...DEPOTS.map((depot) => ({
      type: "Feature",
      properties: {
        layer: "depot",
        depot_id: depot.id,
        name: depot.name,
        source: SOURCE,
        license: "CC0",
        synthetic: true,
        note: "Simulated depot at a plausible location - not any company's real facility.",
      },
      geometry: { type: "Point", coordinates: [depot.lng, depot.lat] },
    })),
    ...stops,
    ...fleetFeatures(stops),
    ...isochroneFeatures(),
  ];

  return {
    type: "FeatureCollection",
    properties: {
      area: AREA,
      centre: CENTRE,
      note: "Simulated depots, delivery stops and vehicle traces for Ho Chi Minh City. Every feature carries `synthetic: true` and a note saying what it is; the routing methods are the real ones this project computes with.",
      attribution: "Simulated logistics sample generated by Kami3D (CC0). Not a real order book, and not telemetry from anybody's fleet.",
      assumptions: {
        ...ASSUMPTIONS,
        isochroneNote: ISOCHRONE_NOTE,
        stops: STOPS,
        vehicles: VEHICLES.length,
        depots: DEPOTS.length,
      },
    },
    features,
  };
}

const check = process.argv.includes("--check");
const collection = buildSample();
const json = `${JSON.stringify(collection)}\n`;

if (check) {
  const current = existsSync(OUT_FILE) ? readFileSync(OUT_FILE, "utf8") : "";
  if (current !== json) {
    console.error("data/data2map-logistics.json is out of date - run npm run logistics:generate");
    process.exitCode = 1;
  } else {
    console.log(`${collection.features.length} feature(s), up to date`);
  }
} else {
  writeFileSync(OUT_FILE, json);
  console.log(`Wrote ${collection.features.length} feature(s) to ${OUT_FILE.replace(ROOT + "/", "")}`);
}
