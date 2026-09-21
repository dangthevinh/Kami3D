import type { Metadata } from "next";

import { TwinExperience } from "@/components/data2map/TwinExperience";
import { readLogisticsSample } from "@/lib/data2map/logistics";
import bundled from "@/data/data2map-logistics.json";

/**
 * Read once, at build time.
 *
 * The page is a static route: the ships, the routes and the stops are bundled data, and the only
 * thing that moves is the stream, which the client subscribes to after the page has painted. See
 * `lib/supabase.ts` for why the registry read on the other Data2Map pages is uncached.
 */
export const dynamic = "force-static";

/**
 * `/data2map/twin` — the module in three dimensions.
 *
 * ## What this page is, and what it refuses to be
 *
 * The brief for D7 came from a 图扑 software demo of a port "digital twin": a beautiful 3D model of a
 * facility, with 2D dashboards beside it and data streaming in. What that demo actually is, is a
 * **commercial closed-source WebGL engine** - its core is a single ~1 MB `ht.js` loaded by a script
 * tag, sold under a licence - drawing models the vendor built. This project adopts the composition
 * and refuses the engine: the geometry here is **real** (OpenStreetMap footprints extruded by their
 * own recorded height, over real elevation), the fleet is **simulated and labelled**, and the
 * streaming is Postgres. See `docs/TWIN.md` for the full comparison table.
 *
 * ## The three layers that are real, and the one that is not
 *
 * | Layer | Source | Real? |
 * | --- | --- | --- |
 * | Buildings | OpenStreetMap footprints via OpenFreeMap, extruded with \`render_height\` | **real**, ODbL |
 * | Terrain | AWS open terrain tiles (SRTM and friends) | **real**, public-domain sources |
 * | Routes, stops, coverage | the D4 logistics sample | simulated, CC0 |
 * | Vehicles | \`vehicle_positions\`, written by the simulator | simulated, CC0 - and the table enforces it |
 */

export const metadata: Metadata = {
  title: "Digital twin — Data2Map",
  description:
    "Central Ho Chi Minh City in three dimensions: real OpenStreetMap buildings and elevation, with a simulated delivery fleet streamed live from Postgres.",
  alternates: { canonical: "/data2map/twin" },
};

const OMITTED = [
  "Real fleet telemetry: a real vehicle's position is personal data about its driver. The stream here is generated, every row says so, and the table refuses anything else.",
  "Live traffic: no open traffic layer exists for Vietnamese cities.",
  "3D Tiles and commercial city models: Cesium ion and Google's photorealistic tiles need an access token, so the buildings are extruded from OpenStreetMap instead.",
  "Building interiors and BIM: there is no open dataset of them for this city, and shipping an invented one would be the mistake Phase 12 banned.",
];

export default function TwinPage() {
  const sample = readLogisticsSample(bundled);

  return (
    <div className="section-shell py-8">
      <header className="max-w-3xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-iris">Data2Map · D7</p>
        <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          Digital twin
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-white/60">
          The city in three dimensions — {sample.depots.length} depots, {sample.stops.length} stops and{" "}
          {sample.vehicles.length} vans over real OpenStreetMap buildings and real elevation, with the fleet's
          positions pushed into Postgres and streamed back through Supabase Realtime. The buildings are real; the
          fleet is simulated, and says so on every row.
        </p>
      </header>

      <div className="mt-6">
        <TwinExperience sample={sample} omittedLayers={OMITTED} />
      </div>
    </div>
  );
}
