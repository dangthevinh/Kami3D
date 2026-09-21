import { distanceKm, type LatLng } from "../geo.ts";

/**
 * The 3D twin: what it draws, what it refuses to draw, and the arithmetic behind its numbers.
 *
 * The page is a digital twin in the honest sense of the phrase: geometry that **is** the city
 * (OpenStreetMap buildings extruded by their own recorded height, over a real elevation model), with
 * a **simulated** fleet moving over it, and a cockpit whose every number prints the formula it came
 * from. It is not a twin of anybody's port: this project has no port, no hardware and no telemetry,
 * and it will not draw a beautiful model of an asset it does not have.
 *
 * Three rules the module enforces, each with a test:
 *
 *   1. **buildings are measured, not styled**: a height that cannot be read comes back as `null` and
 *      is drawn as the lowest class with a note, never as a tall tower;
 *   2. **positions are simulated and labelled**: every row the pipeline writes carries its source,
 *      and the cockpit says "simulated" where a product would say "live";
 *   3. **metrics have formulas**: distance, average speed and on-time delivery are computed here, in
 *      the open, from the positions themselves - and the panel prints the formula next to the value.
 */

/** The decisions the UI and the pipeline both read, so they cannot drift apart. */
export const TWIN = {
  /** Below this zoom a city of extruded boxes is a grey smear; the flat map is better. */
  extrusionMinZoom: 14,
  /** The height the colour ramp tops out at, in metres. Taller buildings clamp. */
  maxHeightM: 120,
  /** How long raw positions are kept. Seven days is a demo; a real fleet needs a policy. */
  retentionHours: 168,
  /** The Postgres table the simulator writes and the page subscribes to. */
  positionsTable: "vehicle_positions",
  /** The Supabase Realtime channel name the page joins. */
  channel: "fleet-positions",
  /** How close a vehicle has to be to a stop for the sample to count as a delivery. */
  arrivalRadiusM: 250,
  /** Samples fetched when the page opens, so the map is not empty before the stream starts. */
  historyLimit: 240,
  /** How many samples the client keeps in memory. Past this the oldest are dropped. */
  bufferLimit: 720,
  /** Minimum gap between two samples of one vehicle, in seconds: below it, positions are ignored. */
  minSampleGapSeconds: 2,
} as const;

/**
 * The twin's layers, in the shape the shared `LayerPanel` takes.
 *
 * They are declared here rather than in the Data2Map registry because the registry describes the
 * **products** (D2-D6), and each of those datasets is tied to one; the twin is a page of the module
 * that draws three derived layers and one stream. Keeping the provenance next to the code that
 * draws it means the panel still prints a source and a licence for every switch - which is the rule
 * the registry exists to enforce.
 */
export const TWIN_LAYERS = [
  {
    id: "buildings",
    label: "Buildings (3D)",
    hint: "OpenStreetMap footprints extruded by their recorded height. Not every building carries one: those are drawn at the lowest class and counted in the panel.",
    source: "OpenStreetMap via OpenFreeMap",
    license: "ODbL 1.0",
  },
  {
    id: "terrain",
    label: "Terrain",
    hint: "Real elevation from the AWS open terrain tiles (SRTM and friends). Off by default on small screens: it costs a second download and the delta is flat.",
    source: "AWS Open Data (terrarium)",
    license: "Public domain sources",
  },
  {
    id: "vehicles",
    label: "Fleet (live)",
    hint: "Positions pushed by the simulator, streamed over Supabase Realtime. Simulated - this project has no vehicles and never collects a real one's position.",
    source: "Kami3D synthetic",
    license: "CC0",
  },
  {
    id: "routes",
    label: "Routes and stops",
    hint: "The D4 sample's tours, stops and coverage bands, drawn in three dimensions.",
    source: "Kami3D synthetic",
    license: "CC0",
  },
] as const;

export type TwinLayerId = (typeof TWIN_LAYERS)[number]["id"];

export interface HeightClass {
  id: string;
  label: string;
  from: number;
  to: number;
  color: string;
}

/** Four classes, because a legend nobody reads is worse than a colour that only means "taller". */
export const BUILDING_CLASSES: readonly HeightClass[] = [
  { id: "low", label: "Up to 8 m", from: 0, to: 8, color: "#20344a" },
  { id: "mid", label: "8-20 m", from: 8, to: 20, color: "#2f5d78" },
  { id: "high", label: "20-45 m", from: 20, to: 45, color: "#38a3c8" },
  { id: "tall", label: "45-120 m", from: 45, to: 120, color: "#7ef0d0" },
  { id: "supertall", label: "Over 120 m", from: 120, to: Number.POSITIVE_INFINITY, color: "#ffd166" },
];

/**
 * A height in, a class out - or `null`.
 *
 * `null` means "the vector tile did not carry a height for this building", which is common and is
 * not the same as "one storey". The renderer draws those as the lowest class *and* the panel says how
 * many there were, because a skyline where every unknown became a tower would be a fabrication.
 */
export function buildingClassFor(heightM: number | null | undefined): HeightClass | null {
  if (typeof heightM !== "number" || !Number.isFinite(heightM) || heightM < 0) return null;
  return BUILDING_CLASSES.find((entry) => heightM >= entry.from && heightM < entry.to) ?? BUILDING_CLASSES[BUILDING_CLASSES.length - 1];
}

/**
 * The MapLibre paint expression for the extrusion.
 *
 * `render_height` is the field OpenMapTiles ships. A building without one gets the lowest colour
 * rather than being hidden: an invisible city centre looks like a rendering bug, and the count of
 * unknown heights is printed in the panel instead.
 */
export function extrusionColorExpression(): unknown {
  return [
    "interpolate",
    ["linear"],
    ["coalesce", ["get", "render_height"], 0],
    0, BUILDING_CLASSES[0].color,
    8, BUILDING_CLASSES[1].color,
    20, BUILDING_CLASSES[2].color,
    45, BUILDING_CLASSES[3].color,
    120, BUILDING_CLASSES[4].color,
  ];
}

/** Whether the 3D layer should be on at this zoom. */
export function shouldShowExtrusion(zoom: number): boolean {
  return Number.isFinite(zoom) && zoom >= TWIN.extrusionMinZoom;
}

/** Fade the extrusion in over one zoom level rather than popping it on. */
export function extrusionOpacity(zoom: number): number {
  if (!Number.isFinite(zoom)) return 0;
  const fade = Math.min(1, Math.max(0, zoom - TWIN.extrusionMinZoom));
  return Math.round(fade * 0.9 * 100) / 100;
}

/** The compass bearing from one point to another, 0-360, north-up. */
export function bearingDegrees(from: LatLng, to: LatLng): number {
  const rad = Math.PI / 180;
  const y = Math.sin((to.lng - from.lng) * rad) * Math.cos(to.lat * rad);
  const x =
    Math.cos(from.lat * rad) * Math.sin(to.lat * rad) -
    Math.sin(from.lat * rad) * Math.cos(to.lat * rad) * Math.cos((to.lng - from.lng) * rad);
  return Math.round((((Math.atan2(y, x) * 180) / Math.PI) + 360) % 360);
}

/** A point a fraction of the way between two positions, used to animate a dot between pushes. */
export function interpolatePosition(from: LatLng, to: LatLng, fraction: number): LatLng {
  const clamped = Math.min(1, Math.max(0, Number.isFinite(fraction) ? fraction : 0));
  return {
    lng: from.lng + (to.lng - from.lng) * clamped,
    lat: from.lat + (to.lat - from.lat) * clamped,
  };
}

/** The speed implied by two positions and the time between them, in km/h. */
export function impliedSpeedKmh(from: LatLng, to: LatLng, seconds: number): number {
  if (!Number.isFinite(seconds) || seconds <= 0) return 0;
  return Math.round((distanceKm(from, to) / (seconds / 3600)) * 10) / 10;
}

export interface PositionPoint {
  vehicle_id: string;
  /** ISO timestamp of the sample. */
  at: string;
  lng: number;
  lat: number;
  speed_kmh?: number | null;
  heading?: number | null;
  source?: string | null;
}

export interface FleetKpi {
  /** Kilometres travelled between consecutive samples of the same vehicle. */
  distanceKm: number;
  /** Mean of the samples' own speeds, ignoring nulls. */
  avgSpeedKmh: number | null;
  /** Samples in this window - the denominator of everything above. */
  samples: number;
  vehicles: number;
  /** Stops a sample came within `arrivalRadiusM` of, by id. */
  visitedStopIds: string[];
  /** How many of those visits happened inside the customer's window. */
  onTimeStops: number;
  /** On-time visits as a fraction of the stops visited, or null when nothing was visited. */
  onTimeRatio: number | null;
}

function byVehicle(points: readonly PositionPoint[]): Map<string, PositionPoint[]> {
  const grouped = new Map<string, PositionPoint[]>();
  for (const point of points) {
    const list = grouped.get(point.vehicle_id) ?? [];
    list.push(point);
    grouped.set(point.vehicle_id, list);
  }
  for (const list of grouped.values()) list.sort((a, b) => a.at.localeCompare(b.at));
  return grouped;
}

export interface StopRef extends LatLng {
  id: string;
  window: [number, number];
}

/**
 * Everything the cockpit shows, from the rows on the page's own client.
 *
 * Deliberately computed in the app rather than in a SQL view: the numbers are small, and a formula
 * a reader can check next to the value it produced is worth more than one hidden in a migration.
 * The SQL rollup exists for the same numbers over longer windows.
 */
export function fleetKpi(points: readonly PositionPoint[], stops: readonly StopRef[] = []): FleetKpi {
  const grouped = byVehicle(points);
  let distance = 0;
  let speedSum = 0;
  let speedCount = 0;

  for (const list of grouped.values()) {
    for (let index = 1; index < list.length; index += 1) {
      distance += distanceKm(list[index - 1], list[index]);
    }
    for (const point of list) {
      if (typeof point.speed_kmh === "number" && Number.isFinite(point.speed_kmh)) {
        speedSum += point.speed_kmh;
        speedCount += 1;
      }
    }
  }

  const visited = new Set<string>();
  let onTime = 0;

  for (const stop of stops) {
    const hit = points.find((point) => distanceKm(point, stop) * 1000 <= TWIN.arrivalRadiusM);
    if (!hit) continue;

    visited.add(stop.id);
    const hour = new Date(hit.at).getUTCHours();
    if (hour >= stop.window[0] && hour < stop.window[1]) onTime += 1;
  }

  return {
    distanceKm: Math.round(distance * 100) / 100,
    avgSpeedKmh: speedCount === 0 ? null : Math.round((speedSum / speedCount) * 10) / 10,
    samples: points.length,
    vehicles: grouped.size,
    visitedStopIds: [...visited],
    onTimeStops: onTime,
    onTimeRatio: visited.size === 0 ? null : Math.round((onTime / visited.size) * 100) / 100,
  };
}

/** The cutoff a retention sweep uses, as an ISO timestamp. */
export function retentionCutoff(now: Date, hours: number = TWIN.retentionHours): string {
  if (!Number.isFinite(hours) || hours <= 0) throw new Error("retention must be a positive number of hours");
  return new Date(now.getTime() - hours * 3600 * 1000).toISOString();
}

/** The latest sample per vehicle - what the map draws when the stream is quiet. */
export function latestByVehicle(points: readonly PositionPoint[]): PositionPoint[] {
  return [...byVehicle(points).values()].map((list) => list[list.length - 1]);
}

/** How the panel writes a connection state, in words rather than colours. */
export function connectionLabel(state: "connecting" | "live" | "reconnecting" | "offline", samples: number): string {
  if (state === "live") return `Live: ${samples} sample(s) from the simulator.`;
  if (state === "connecting") return "Connecting to the position stream…";
  if (state === "reconnecting") return "Lost the stream — reconnecting. The stored samples below are still readable.";
  return "Offline: the simulator is not running. Stored samples are shown instead.";
}
