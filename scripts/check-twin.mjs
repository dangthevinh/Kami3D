/**
 * Checks for the 3D twin's rules and its cockpit arithmetic.
 *
 * Three things this suite refuses to let drift: a building whose height is missing must not become a
 * tower, the metrics must be the ones the panel claims to compute, and the retention sweep must not
 * be able to delete everything (or nothing) by accident.
 *
 * Run with: npm run check:twin
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import {
  BUILDING_CLASSES,
  TWIN,
  bearingDegrees,
  buildingClassFor,
  connectionLabel,
  extrusionColorExpression,
  extrusionOpacity,
  fleetKpi,
  impliedSpeedKmh,
  interpolatePosition,
  latestByVehicle,
  retentionCutoff,
  shouldShowExtrusion,
} from "../lib/data2map/twin.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("a missing height is a missing height, not a tower", () => {
  assert.equal(buildingClassFor(null), null);
  assert.equal(buildingClassFor(undefined), null);
  assert.equal(buildingClassFor(Number.NaN), null);
  assert.equal(buildingClassFor(-4), null);

  assert.equal(buildingClassFor(0)?.id, "low");
  assert.equal(buildingClassFor(7.9)?.id, "low");
  assert.equal(buildingClassFor(8)?.id, "mid");
  assert.equal(buildingClassFor(44.9)?.id, "high");
  assert.equal(buildingClassFor(120)?.id, "supertall");
  assert.equal(buildingClassFor(999)?.id, "supertall", "the tallest class is open-ended");
});

test("the classes tile the heights without a gap", () => {
  assert.equal(BUILDING_CLASSES[0].from, 0);
  for (const [index, entry] of BUILDING_CLASSES.entries()) {
    assert.ok(entry.to > entry.from, entry.id + " is empty");
    assert.match(entry.color, /^#[0-9a-f]{6}$/i);
    if (index > 0) assert.equal(entry.from, BUILDING_CLASSES[index - 1].to, "classes must not leave a gap");
  }
  assert.equal(BUILDING_CLASSES[BUILDING_CLASSES.length - 1].to, Number.POSITIVE_INFINITY);
});

test("the extrusion ramp is driven by the tile's own height field", () => {
  const expression = extrusionColorExpression();
  assert.equal(expression[0], "interpolate");
  assert.deepEqual(expression[2], ["coalesce", ["get", "render_height"], 0]);

  const stops = expression.filter((entry, index) => index >= 3 && index % 2 === 1);
  assert.equal(stops.length, BUILDING_CLASSES.length, "one stop per class");
  assert.deepEqual(stops, [...stops].sort((a, b) => a - b), "stops must rise");
});

test("3D appears at the zoom it is useful at, and fades in", () => {
  assert.equal(shouldShowExtrusion(13.9), false);
  assert.equal(shouldShowExtrusion(TWIN.extrusionMinZoom), true);
  assert.equal(shouldShowExtrusion(Number.NaN), false);

  assert.equal(extrusionOpacity(13), 0);
  assert.equal(extrusionOpacity(TWIN.extrusionMinZoom), 0, "it fades in rather than popping");
  assert.equal(extrusionOpacity(TWIN.extrusionMinZoom + 1), 0.9);
  assert.equal(extrusionOpacity(20), 0.9, "and never goes past its ceiling");
});

test("bearings point the way a compass does", () => {
  const centre = { lng: 106.7, lat: 10.7 };
  assert.equal(bearingDegrees(centre, { lng: 106.7, lat: 10.8 }), 0);
  assert.equal(bearingDegrees(centre, { lng: 106.8, lat: 10.7 }), 90);
  assert.equal(bearingDegrees(centre, { lng: 106.7, lat: 10.6 }), 180);
  assert.equal(bearingDegrees(centre, { lng: 106.6, lat: 10.7 }), 270);
  for (let index = 0; index < 24; index += 1) {
    const angle = (index / 24) * Math.PI * 2;
    const bearing = bearingDegrees(centre, { lng: centre.lng + Math.sin(angle) * 0.1, lat: centre.lat + Math.cos(angle) * 0.1 });
    assert.ok(bearing >= 0 && bearing < 360);
  }
});

test("a dot between two pushes is interpolated, and clamped", () => {
  const from = { lng: 106.7, lat: 10.7 };
  const to = { lng: 106.8, lat: 10.8 };

  assert.deepEqual(interpolatePosition(from, to, 0), from);
  assert.deepEqual(interpolatePosition(from, to, 1), to);
  const middle = interpolatePosition(from, to, 0.5);
  assert.ok(Math.abs(middle.lng - 106.75) < 1e-9 && Math.abs(middle.lat - 10.75) < 1e-9);
  assert.deepEqual(interpolatePosition(from, to, -3), from, "clamped below");
  assert.deepEqual(interpolatePosition(from, to, 9), to, "clamped above");
  assert.deepEqual(interpolatePosition(from, to, Number.NaN), from);
});

test("speed is distance over time, and nonsense gives zero", () => {
  const a = { lng: 106.7, lat: 10.7 };
  const b = { lng: 106.709, lat: 10.7 }; // about 1 km east at this latitude
  assert.ok(Math.abs(impliedSpeedKmh(a, b, 3600) - 0.98) < 0.1, "about a kilometre in an hour");
  assert.ok(impliedSpeedKmh(a, b, 60) > 50, "the same distance in a minute is fast");
  assert.equal(impliedSpeedKmh(a, b, 0), 0);
  assert.equal(impliedSpeedKmh(a, b, -5), 0);
  assert.equal(impliedSpeedKmh(a, b, Number.NaN), 0);
});

test("the cockpit numbers come from the samples, and say so", () => {
  const points = [
    { vehicle_id: "van-01", at: "2025-06-01T08:00:00Z", lng: 106.7, lat: 10.7, speed_kmh: 20 },
    { vehicle_id: "van-01", at: "2025-06-01T08:10:00Z", lng: 106.709, lat: 10.7, speed_kmh: 24 },
    { vehicle_id: "van-02", at: "2025-06-01T08:00:00Z", lng: 106.75, lat: 10.75, speed_kmh: null },
    { vehicle_id: "van-02", at: "2025-06-01T08:20:00Z", lng: 106.759, lat: 10.75, speed_kmh: 18 },
  ];

  const kpi = fleetKpi(points);
  assert.equal(kpi.samples, 4);
  assert.equal(kpi.vehicles, 2);
  assert.ok(kpi.distanceKm > 1.5 && kpi.distanceKm < 2.2, "two kilometre-long legs, give or take");
  assert.ok(Math.abs((kpi.avgSpeedKmh ?? 0) - 20.7) < 0.1, "the null speed is ignored, not counted as zero");
  assert.equal(kpi.onTimeRatio, null, "nothing visited is not 100% on time");

  const empty = fleetKpi([]);
  assert.equal(empty.distanceKm, 0);
  assert.equal(empty.avgSpeedKmh, null);
  assert.equal(empty.vehicles, 0);
});

test("a delivery counts when a sample came close, and on time when the window says so", () => {
  const stops = [
    { id: "stop-001", lng: 106.709, lat: 10.7, window: [8, 12] },
    { id: "stop-002", lng: 106.759, lat: 10.75, window: [6, 8] },
    { id: "stop-003", lng: 107.5, lat: 11.5, window: [8, 12] },
  ];
  const points = [
    { vehicle_id: "van-01", at: "2025-06-01T08:10:00Z", lng: 106.709, lat: 10.7 }, // inside window 1
    { vehicle_id: "van-02", at: "2025-06-01T08:20:00Z", lng: 106.759, lat: 10.75 }, // late for window 2
  ];

  const kpi = fleetKpi(points, stops);
  assert.deepEqual(kpi.visitedStopIds.sort(), ["stop-001", "stop-002"], "the far stop was never visited");
  // The first sample lands at 08:10 inside its 8-12 window; the second arrives at 08:20 for a stop
  // whose window closed at 08:00, which is a delivery and a miss at the same time.
  assert.equal(kpi.onTimeStops, 1);
  assert.equal(kpi.onTimeRatio, 0.5);

  const late = fleetKpi([points[1]], stops);
  assert.equal(late.visitedStopIds.length, 1, "it was visited");
  assert.equal(late.onTimeStops, 0, "but not inside the window");
  assert.equal(late.onTimeRatio, 0);
});

test("the newest sample per vehicle is the one on the map", () => {
  const points = [
    { vehicle_id: "van-01", at: "2025-06-01T08:20:00Z", lng: 106.72, lat: 10.72 },
    { vehicle_id: "van-01", at: "2025-06-01T08:00:00Z", lng: 106.7, lat: 10.7 },
    { vehicle_id: "van-02", at: "2025-06-01T08:05:00Z", lng: 106.75, lat: 10.75 },
  ];

  const latest = latestByVehicle(points);
  assert.equal(latest.length, 2);
  assert.equal(latest.find((point) => point.vehicle_id === "van-01")?.at, "2025-06-01T08:20:00Z", "unsorted input is sorted");
  assert.equal(latestByVehicle([]).length, 0);
});

test("retention has a floor, a ceiling and no way to wipe the table", () => {
  const now = new Date("2025-06-08T00:00:00Z");
  assert.equal(retentionCutoff(now), "2025-06-01T00:00:00.000Z", "the default is seven days");
  assert.equal(retentionCutoff(now, 24), "2025-06-07T00:00:00.000Z");
  assert.throws(() => retentionCutoff(now, 0), /positive number/);
  assert.throws(() => retentionCutoff(now, Number.NaN), /positive number/);
  assert.equal(TWIN.retentionHours, 168);
});

test("the panel describes the connection in words", () => {
  assert.match(connectionLabel("live", 12), /Live: 12/);
  assert.match(connectionLabel("connecting", 0), /Connecting/);
  assert.match(connectionLabel("reconnecting", 3), /reconnecting/);
  assert.match(connectionLabel("offline", 0), /Offline/);
  assert.equal(TWIN.positionsTable, "vehicle_positions");
  assert.equal(TWIN.channel, "fleet-positions");
});

/**
 * The SQL this page depends on, checked as text.
 *
 * There is no Postgres in CI, so the guarantees are pinned the way `check:sql` pins the rest of the
 * schema: by reading the file and asserting the properties a database would have enforced. The two
 * that matter most are that the reader cannot write, and that a row cannot pretend to be real.
 */
const schema = readFileSync(join(root, "supabase", "schema.sql"), "utf8");
const geo = readFileSync(join(root, "lib", "geo.ts"), "utf8");

test("the positions table exists, is readable, and cannot be written by a visitor", () => {
  assert.ok(schema.includes("create table if not exists public.vehicle_positions ("), "the table is missing");
  assert.ok(/alter table public\.vehicle_positions enable row level security/.test(schema), "RLS is off");
  assert.ok(
    /on public\.vehicle_positions for select[\s\S]{0,120}?to anon, authenticated/.test(schema),
    "there is no read policy for visitors",
  );
  assert.ok(!/on public\.vehicle_positions for insert/.test(schema), "a visitor must not be able to insert");
  assert.ok(!/on public\.vehicle_positions for update/.test(schema), "nor update");
  assert.ok(!/on public\.vehicle_positions for delete/.test(schema), "nor delete");
  assert.ok(/revoke all on public\.vehicle_positions from anon, authenticated/.test(schema));
  assert.ok(/grant select on public\.vehicle_positions to anon, authenticated/.test(schema));
});

test("a row cannot pretend to be real telemetry", () => {
  assert.ok(
    /source\s+text not null default 'Kami3D synthetic' check \(source = 'Kami3D synthetic'\)/.test(schema),
    "the source column does not pin the simulator",
  );
  assert.ok(/synthetic\s+boolean not null default true check \(synthetic\)/.test(schema), "synthetic must be true");
});

test("retention exists, has a floor, and matches the constant the app uses", () => {
  assert.ok(/create or replace function public\.prune_vehicle_positions\(keep_hours integer default 168\)/.test(schema));
  assert.ok(schema.includes("keep_hours must be positive"), "the sweep must refuse a zero window");
  assert.ok(schema.includes("default 168"), "the SQL default and TWIN.retentionHours must agree: " + TWIN.retentionHours);
});

test("the rollup and the page measure distance the same way", () => {
  assert.ok(/create or replace function public\.haversine_km\(/.test(schema), "the SQL haversine is missing");
  assert.ok(schema.includes("6371.0088"), "the rollup must use the same earth radius as lib/geo.ts");
  assert.ok(geo.includes("6371.0088"), "lib/geo.ts changed its radius without the SQL following");
  assert.ok(/create or replace function public\.rollup_vehicle_kpi_hours/.test(schema));
  assert.ok(schema.includes("public.haversine_km(prev_lng, prev_lat, lng, lat)"), "the rollup must call it");
});

test("the stream is published, and the kpi table is readable but not writable", () => {
  assert.ok(/alter publication supabase_realtime add table public\.vehicle_positions/.test(schema), "the page subscribes to nothing");
  assert.ok(schema.includes("create table if not exists public.logistics_kpi_hourly"));
  assert.ok(/alter table public\.logistics_kpi_hourly enable row level security/.test(schema));
  assert.ok(!/on public\.logistics_kpi_hourly for insert/.test(schema), "the rollup writes with the service role only");
  assert.ok(/grant select on public\.logistics_kpi_hourly to anon, authenticated/.test(schema));
});
