/**
 * Checks for the logistics sample and the delivery planner.
 *
 * The data is simulated and the algorithm makes a business claim ("this plan is shorter"), so the
 * suite pins both: that the file declares itself simulated everywhere it appears - this is the one
 * dataset in the project that would be a privacy problem if it were real and unlabelled - and that
 * the planner never makes a route longer, never loses a stop and never exceeds a vehicle.
 *
 * Run with: npm run check:logistics
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import {
  ASSUMPTIONS,
  nearestNeighbour,
  orderDistanceKm,
  planCost,
  planRoutes,
  twoOpt,
} from "../lib/data2map/routing.ts";
import {
  formatDong,
  readLogisticsSample,
  shiftFraction,
  stopToRouting,
  tracePositionAt,
} from "../lib/data2map/logistics.ts";
import { pathLengthKm } from "../lib/geo.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const raw = JSON.parse(readFileSync(join(root, "data", "data2map-logistics.json"), "utf8"));
const sample = readLogisticsSample(raw);

test("the sample loads with depots, stops, vehicles and coverage bands", () => {
  assert.equal(sample.depots.length, 3);
  assert.equal(sample.stops.length, 180);
  assert.equal(sample.vehicles.length, 6);
  assert.equal(sample.isochrones.length, 12, "three depots, four bands each");
  assert.ok(sample.note.length > 40 && sample.attribution.length > 40);
});

test("every feature says it is simulated, and why", () => {
  for (const feature of sample.collection.features) {
    const properties = feature.properties;
    assert.equal(properties.synthetic, true, properties.layer + " does not declare itself simulated");
    assert.ok(properties.note.length > 30, properties.layer + " does not explain what it is");
    assert.equal(properties.license, "CC0");
  }

  // And the reader refuses a file where one of them forgets.
  const tampered = JSON.parse(JSON.stringify(raw));
  delete tampered.features[5].properties.synthetic;
  assert.throws(() => readLogisticsSample(tampered), /does not declare itself simulated/);
});

test("stops and vehicles belong to depots that exist, and inside the window", () => {
  const depotIds = new Set(sample.depots.map((depot) => depot.properties.depot_id));
  const stopIds = new Set(sample.stops.map((stop) => stop.properties.stop_id));

  for (const stop of sample.stops) {
    const [lng, lat] = stop.geometry.coordinates;
    assert.ok(depotIds.has(stop.properties.depot_id), stop.properties.stop_id + " points at a depot that is not there");
    assert.ok(lng >= sample.area.west && lng <= sample.area.east, stop.properties.stop_id + " is outside the window");
    assert.ok(lat >= sample.area.south && lat <= sample.area.north);
    assert.ok(stop.properties.demand_kg > 0);
    assert.ok(stop.properties.window_end > stop.properties.window_start);
    assert.ok(stop.properties.window_start >= 8 && stop.properties.window_end <= 21);
  }

  for (const vehicle of sample.vehicles) {
    assert.ok(depotIds.has(vehicle.properties.depot_id));
    assert.equal(vehicle.geometry.type, "LineString");
    assert.ok(vehicle.geometry.coordinates.length >= 3, "a trace is a tour, not a pair of points");
    assert.ok(vehicle.properties.stop_ids.every((id) => stopIds.has(id)));
    assert.ok(vehicle.properties.trace_end_hour > vehicle.properties.trace_start_hour);
  }
});

test("coverage bands grow with the clock and name their method", () => {
  for (const depot of sample.depots) {
    const bands = sample.isochrones
      .filter((band) => band.properties.depot_id === depot.properties.depot_id)
      .sort((a, b) => a.properties.minutes - b.properties.minutes);

    assert.deepEqual(bands.map((band) => band.properties.minutes), [15, 30, 45, 60]);

    for (const band of bands) {
      const expected = (ASSUMPTIONS.speedKmh * band.properties.minutes) / 60;
      assert.ok(Math.abs(band.properties.radius_km - expected) < 0.05, "the radius is the speed times the time");
      assert.ok(band.properties.method.includes(String(ASSUMPTIONS.speedKmh)));
      assert.ok(band.properties.note.includes("not drive time"), "a circle that claimed to be drive time would be a lie");
      assert.equal(band.geometry.coordinates[0].length, 65, "64 steps, closed");
    }

    assert.ok(bands[3].properties.radius_km > bands[0].properties.radius_km);
  }
});

/** A deterministic scatter of points in the sample window, for the algorithm tests. */
function scatter(count, seed = 7) {
  const points = [];
  for (let index = 0; index < count; index += 1) {
    const noise = (offset) => {
      const value = Math.sin((index + 1) * 12.9898 + offset * 78.233 + seed) * 43758.5453;
      return value - Math.floor(value);
    };
    points.push({ lng: 106.62 + noise(1) * 0.25, lat: 10.7 + noise(2) * 0.16 });
  }
  return points;
}

const depot = { lng: 106.703, lat: 10.776 };

test("nearest neighbour visits every stop exactly once", () => {
  for (const count of [1, 2, 7, 40]) {
    const points = scatter(count);
    const order = nearestNeighbour(depot, points);

    assert.equal(order.length, count);
    assert.equal(new Set(order).size, count, "a stop visited twice is a stop visited instead of another");
    assert.ok(order.every((index) => index >= 0 && index < count));
  }

  assert.deepEqual(nearestNeighbour(depot, []), []);
});

test("2-opt never makes a tour longer, and returns the same stops", () => {
  for (const count of [3, 12, 45]) {
    const points = scatter(count, count);
    const greedy = nearestNeighbour(depot, points);
    const improved = twoOpt(depot, greedy, points);

    assert.equal(improved.length, count);
    assert.deepEqual([...improved].sort((a, b) => a - b), [...greedy].sort((a, b) => a - b));

    const before = orderDistanceKm(depot, greedy, points);
    const after = orderDistanceKm(depot, improved, points);
    assert.ok(after <= before + 1e-9, "2-opt made it longer: " + before + " -> " + after);
  }

  const points = scatter(20);
  assert.deepEqual(twoOpt(depot, [], points), []);
  assert.deepEqual(twoOpt(depot, [0], points), [0]);
  assert.deepEqual(twoOpt(depot, [0, 1], points), [0, 1], "two stops have nothing to re-order");
});

test("a tour length is the sum of its legs, depot to depot", () => {
  const points = scatter(5);
  const order = [0, 1, 2, 3, 4];
  const explicit = pathLengthKm([depot, ...order.map((index) => points[index]), depot]);
  assert.ok(Math.abs(orderDistanceKm(depot, order, points) - explicit) < 1e-9);
  assert.equal(orderDistanceKm(depot, [], points), 0, "no stops is no distance");
});

test("a plan respects capacity, and reports what did not fit", () => {
  const stops = scatter(24).map((point, index) =>
    stopToRouting({
      type: "Feature",
      properties: {
        layer: "stop",
        stop_id: "s" + index,
        depot_id: "depot-a",
        demand_kg: 40,
        window_start: 8,
        window_end: 12,
        distance_km: 0,
        synthetic: true,
        note: "a stop, in a test, simulated like everything else in this file",
      },
      geometry: { type: "Point", coordinates: [point.lng, point.lat] },
    }),
  );

  const plan = planRoutes({
    depots: [{ id: "depot-a", name: "A", lng: depot.lng, lat: depot.lat }],
    vehicles: [{ id: "van-a", name: "A", capacityKg: 200, depotId: "depot-a" }],
    stops,
  });

  assert.equal(plan.routes.length, 1);
  const route = plan.routes[0];
  assert.ok(route.loadKg <= 200, "a van cannot carry more than it carries");
  assert.equal(route.stopIds.length, 5, "200 kg of capacity, 40 kg a stop");
  assert.equal(plan.unassigned.length, stops.length - 5, "what did not fit is reported, not dropped");
  assert.equal(plan.assumed.speedKmh, ASSUMPTIONS.speedKmh, "the plan carries the assumptions it used");

  // Every stop lands somewhere: on a route or in the unassigned list, never nowhere.
  const placed = new Set([...plan.routes.flatMap((entry) => entry.stopIds), ...plan.unassigned]);
  assert.equal(placed.size, stops.length);
});

test("the plan is shorter than the order the work arrived in", () => {
  const stops = sample.stops.filter((stop) => stop.properties.depot_id === "depot-centre").map(stopToRouting);

  const depots = sample.depots.map((entry) => ({
    id: entry.properties.depot_id,
    name: entry.properties.name,
    lng: entry.geometry.coordinates[0],
    lat: entry.geometry.coordinates[1],
  }));
  const vehicles = sample.vehicles.map((entry) => ({
    id: entry.properties.vehicle_id,
    name: entry.properties.name,
    capacityKg: entry.properties.capacity_kg,
    depotId: entry.properties.depot_id,
  }));

  const unplanned = planRoutes({ depots, stops, vehicles, strategy: "file" });
  const greedy = planRoutes({ depots, stops, vehicles, strategy: "greedy" });
  const planned = planRoutes({ depots, stops, vehicles, strategy: "2opt" });

  assert.ok(planned.totalDistanceKm <= greedy.totalDistanceKm + 1e-9);
  assert.ok(planned.totalDistanceKm < unplanned.totalDistanceKm, "the whole point of the planner");
  assert.equal(planned.unassigned.length, 0, "the sample has room for its own stops");

  // The claim the panel prints, computed the same way the panel computes it.
  const saved = planCost(unplanned) - planCost(planned);
  assert.ok(saved > 0, "planning a day should save something");
  assert.ok(planned.totalMinutes > 0);
});

test("cost rises with distance and time", () => {
  const base = planCost({ totalDistanceKm: 100, totalMinutes: 300 });
  assert.ok(planCost({ totalDistanceKm: 200, totalMinutes: 300 }) > base);
  assert.ok(planCost({ totalDistanceKm: 100, totalMinutes: 600 }) > base);
  assert.equal(planCost({ totalDistanceKm: 0, totalMinutes: 0 }), 0);
});

test("a vehicle moves along its own trace, by distance, not by vertex", () => {
  const trace = {
    type: "LineString",
    coordinates: [
      [106.7, 10.7],
      [106.7, 10.8],
      [106.9, 10.8],
    ],
  };

  const start = tracePositionAt(trace, 0);
  const end = tracePositionAt(trace, 1);
  const middle = tracePositionAt(trace, 0.5);

  assert.ok(Math.abs(start.lng - 106.7) < 1e-9 && Math.abs(start.lat - 10.7) < 1e-9);
  assert.ok(Math.abs(end.lng - 106.9) < 1e-9 && Math.abs(end.lat - 10.8) < 1e-9);

  // Both legs are about 11 km, so halfway is the corner - not the midpoint of the vertex list.
  // The legs are 11 km and 22 km, so halfway is two thirds of the way along the *second* leg -
  // which is the point of interpolating by distance rather than by vertex index.
  const corner = { lng: 106.7, lat: 10.8 };
  const total = pathLengthKm([{ lng: 106.7, lat: 10.7 }, corner, { lng: 106.9, lat: 10.8 }]);
  // Along the trace, not the straight line from the start: that is what "by distance" means.
  const travelled = pathLengthKm([{ lng: 106.7, lat: 10.7 }, corner, middle]);
  assert.ok(Math.abs(travelled - total / 2) < 0.05, "halfway along the trace, measured in kilometres");
  assert.ok(Math.abs(middle.lat - 10.8) < 0.001, "and on the second leg, not the corner");
  assert.ok(middle.lng > 106.7 && middle.lng < 106.9);

  assert.deepEqual(tracePositionAt(trace, -5), start, "clamped at the start");
  assert.deepEqual(tracePositionAt({ type: "LineString", coordinates: [] }, 0.5), { lng: 0, lat: 0 });
  assert.deepEqual(
    tracePositionAt({ type: "LineString", coordinates: [[106.7, 10.7], [106.7, 10.7]] }, 0.5),
    { lng: 106.7, lat: 10.7 },
    "a trace with no length does not divide by zero",
  );
});

test("the shift fraction is clamped to a working day", () => {
  assert.equal(shiftFraction(6, 7, 18), 0);
  assert.equal(shiftFraction(7, 7, 18), 0);
  assert.equal(shiftFraction(12.5, 7, 18), 0.5);
  assert.equal(shiftFraction(19, 7, 18), 1);
  assert.equal(shiftFraction(12, 18, 7), 0, "a backwards shift is not a shift");
  assert.equal(shiftFraction(Number.NaN, 7, 18), 0);
});

test("money is written the way a person reads it", () => {
  assert.equal(formatDong(0), "0k ₫");
  assert.equal(formatDong(450_000), "450k ₫");
  assert.equal(formatDong(2_400_000), "2.4 tr ₫");
  assert.equal(formatDong(3_200_000_000), "3.2 tỷ ₫");
  assert.equal(formatDong(Number.NaN), "—");
});
