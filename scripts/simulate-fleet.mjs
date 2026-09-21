#!/usr/bin/env node
/**
 * The fleet simulator: the only writer of \`public.vehicle_positions\`.
 *
 *   node scripts/simulate-fleet.mjs --once                 # one sample per vehicle, now
 *   node scripts/simulate-fleet.mjs --backfill 120         # two hours of history, one a minute
 *   node scripts/simulate-fleet.mjs --loop --interval 5    # keep pushing until Ctrl-C
 *   node scripts/simulate-fleet.mjs --rollup               # refresh logistics_kpi_hourly
 *   node scripts/simulate-fleet.mjs --prune                # drop samples older than a week
 *   node scripts/simulate-fleet.mjs --status               # what is in the two tables
 *
 * ## Why a script and not a service
 *
 * A real deployment pushes positions with a service that owns the hardware: MQTT from the vehicles,
 * a queue, a worker. This project has no vehicles, no hardware and no operations team, so the
 * simulator plays that role with the smallest honest thing that fits: a script that computes where
 * each van is supposed to be **from the routes this project already generated** and writes one row
 * per vehicle per tick with the service role. docs/TWIN.md records what the production path looks
 * like (EMQX/Mosquitto → a worker → the same table) so nobody has to design it twice.
 *
 * Everything it writes is simulated, and the table enforces that: \`source\` must be the synthetic
 * string and \`synthetic\` must be true, so a real feed cannot be written here by accident.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { shiftFraction, tracePositionAt } from "../lib/data2map/logistics.ts";
import { bearingDegrees } from "../lib/data2map/twin.ts";
import { distanceKm } from "../lib/geo.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SAMPLE_FILE = join(ROOT, "data", "data2map-logistics.json");

function loadEnv() {
  const env = {};
  for (const name of [".env.local", ".env"]) {
    let text;
    try {
      text = readFileSync(join(ROOT, name), "utf8");
    } catch {
      continue;
    }
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const separator = trimmed.indexOf("=");
      const key = trimmed.slice(0, separator).trim();
      const value = trimmed.slice(separator + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = value;
      env[key] = value;
    }
  }
  return env;
}

const env = loadEnv();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (see README / .env.local).");
  process.exitCode = 2;
} else {
  const headers = {
    apikey: serviceKey,
    authorization: "Bearer " + serviceKey,
    "content-type": "application/json",
  };

  const rest = async (path, init = {}) => {
    const response = await fetch(url + path, { ...init, headers: { ...headers, ...(init.headers ?? {}) } });
    const text = await response.text();
    if (!response.ok) throw new Error(init.method + " " + path + " failed: " + response.status + " " + text.slice(0, 200));
    return text ? JSON.parse(text) : null;
  };

  /** The traces, from the same file the page draws. */
  const fleet = JSON.parse(readFileSync(SAMPLE_FILE, "utf8")).features.filter(
    (feature) => feature.properties.layer === "fleet",
  );

  if (fleet.length === 0) throw new Error("no fleet traces in " + SAMPLE_FILE);

  /** Where a vehicle is at an instant: a pure function of the clock and its own route. */
  function positionAt(vehicle, at) {
    const hour = at.getUTCHours() + at.getUTCMinutes() / 60 + at.getUTCSeconds() / 3600;
    const fraction = shiftFraction(hour, vehicle.properties.trace_start_hour, vehicle.properties.trace_end_hour);
    return tracePositionAt(vehicle.geometry, fraction);
  }

  function rowsFor(at, intervalSeconds) {
    /* eslint-disable-next-line no-var */
    var previousAt = new Date(at.getTime() - intervalSeconds * 1000);

    return fleet.map((vehicle) => {
      const here = positionAt(vehicle, at);
      const before = positionAt(vehicle, previousAt);
      const km = distanceKm(before, here);

      return {
        vehicle_id: vehicle.properties.vehicle_id,
        at: at.toISOString(),
        lng: Math.round(here.lng * 1e6) / 1e6,
        lat: Math.round(here.lat * 1e6) / 1e6,
        // The same arithmetic lib/data2map/twin.ts uses to read these rows back.
        speed_kmh: Math.round((km / (intervalSeconds / 3600)) * 100) / 100,
        heading: km < 0.001 ? null : bearingDegrees(before, here),
        source: "Kami3D synthetic",
      };
    });
  }

  async function insert(rows) {
    await rest("/rest/v1/vehicle_positions", { method: "POST", body: JSON.stringify(rows) });
    return rows.length;
  }

  const argv = process.argv.slice(2);
  const flag = (name, fallback) => {
    const index = argv.indexOf("--" + name);
    return index >= 0 && argv[index + 1] && !argv[index + 1].startsWith("--") ? Number(argv[index + 1]) : fallback;
  };

  if (argv.includes("--status")) {
    const positions = await rest("/rest/v1/vehicle_positions?select=vehicle_id,at&order=at.desc&limit=1000");
    const kpi = await rest("/rest/v1/logistics_kpi_hourly?select=hour,vehicle_id,distance_km,samples&order=hour.desc&limit=1000");
    const vehicles = new Set(positions.map((row) => row.vehicle_id));
    console.log(positions.length + " position row(s) from " + vehicles.size + " vehicle(s), " + kpi.length + " hourly KPI row(s)");
    if (positions.length > 0) {
      console.log("newest " + positions[0].at + ", oldest " + positions[positions.length - 1].at);
    }
  } else if (argv.includes("--prune")) {
    const removed = await rest("/rest/v1/rpc/prune_vehicle_positions", {
      method: "POST",
      body: JSON.stringify({ keep_hours: flag("keep", 168) }),
    });
    console.log("pruned " + removed + " position(s) older than " + flag("keep", 168) + " hours");
  } else if (argv.includes("--rollup")) {
    const written = await rest("/rest/v1/rpc/rollup_vehicle_kpi_hours", {
      method: "POST",
      body: JSON.stringify({ since_hours: flag("since", 24) }),
    });
    console.log("rolled up " + written + " hourly KPI row(s)");
  } else if (argv.includes("--backfill")) {
    const minutes = Math.max(1, flag("backfill", 60));
    const intervalSeconds = 60;
    const now = Date.now();
    let written = 0;

    for (let step = minutes; step >= 0; step -= 1) {
      const at = new Date(now - step * intervalSeconds * 1000);
      written += await insert(rowsFor(at, intervalSeconds));
    }

    const kpi = await rest("/rest/v1/rpc/rollup_vehicle_kpi_hours", {
      method: "POST",
      body: JSON.stringify({ since_hours: Math.max(2, Math.ceil(minutes / 60) + 1) }),
    });
    console.log("backfilled " + written + " simulated position(s) over " + minutes + " minute(s); rolled up " + kpi + " hourly row(s)");
  } else if (argv.includes("--loop")) {
    const intervalSeconds = Math.max(2, flag("interval", 5));
    console.log("pushing " + fleet.length + " simulated position(s) every " + intervalSeconds + "s — Ctrl-C to stop");

    const tick = async () => {
      const written = await insert(rowsFor(new Date(), intervalSeconds));
      process.stdout.write("  +" + written + " at " + new Date().toISOString() + "\r");
    };

    await tick();
    const timer = setInterval(() => {
      tick().catch((error) => console.error("\ntick failed: " + error.message));
    }, intervalSeconds * 1000);
    process.on("SIGINT", () => {
      clearInterval(timer);
      console.log("\nstopped");
      process.exit(0);
    });
  } else {
    const written = await insert(rowsFor(new Date(), Math.max(2, flag("interval", 5))));
    console.log("wrote " + written + " simulated position(s) at " + new Date().toISOString());
  }
}
