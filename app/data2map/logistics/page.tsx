import type { Metadata } from "next";

import { LogisticsExperience } from "@/components/data2map/LogisticsExperience";
import { datasetForLayer, getData2MapRegistry, layersForProduct } from "@/lib/data2map";
import { readLogisticsSample } from "@/lib/data2map/logistics";
import bundled from "@/data/data2map-logistics.json";

/**
 * Read once, at build time.
 *
 * The page is a static route and stays one: the registry is fetched during `next build` (uncached,
 * so a seed is always reflected) and the output is prerendered like every other content route. See
 * `lib/supabase.ts` for why the fetch itself is the part that must not be cached.
 */
export const dynamic = "force-static";

/**
 * `/data2map/logistics` — coverage, a fleet on a clock, and a plan you can compare.
 *
 * ## What is real here and what is not
 *
 * **Everything on the map is simulated, and the page says so on every feature.** That is a stronger
 * rule than the other products need, and it is deliberate: a real delivery address is personal data
 * and a real vehicle trace is somebody's private telemetry. There is no open dataset of either, and
 * this project would not ship one if there were.
 *
 * **The methods are real.** The traces were generated with the same nearest-neighbour + 2-opt code
 * the page re-runs in the browser (`lib/data2map/routing.ts`, 13 checks), the coverage bands are Turf
 * circles at a stated speed, and clustering is MapLibre's own. Mapbox's Isochrone API was refused -
 * it needs an access token, which breaks the rule that a fresh clone runs with no configuration - so
 * the bands are labelled "straight-line coverage at an assumed speed, not drive time" everywhere they
 * appear, including inside the GeoJSON.
 */

export const metadata: Metadata = {
  title: "Logistics & Fleet — Data2Map",
  description:
    "Depot coverage in 15/30/45/60 minutes, clustered delivery stops, a simulated fleet on an hour clock and a plan compared against the booking order.",
  alternates: { canonical: "/data2map/logistics" },
};

const OMITTED = [
  "Live traffic: there is no open traffic layer for Vietnamese cities, so the page ships without the congestion layer the brief asked for rather than with an invented one.",
  "The road graph: routes are drawn straight from stop to stop. A real road network means a self-hosted OSRM or Valhalla instance, which is new infrastructure rather than a phase.",
  "Real addresses and real vehicle positions: personal and private data respectively. This page will never show either, and the sample is labelled simulated on every feature.",
];

export default async function LogisticsPage() {
  const registry = await getData2MapRegistry();
  const layers = layersForProduct(registry, "logistics");
  const sources = Object.fromEntries(
    layers.map((layer) => [layer.id, datasetForLayer(registry, layer)?.source ?? "no dataset yet"]),
  );
  const sample = readLogisticsSample(bundled);

  return (
    <div className="section-shell py-8">
      <header className="max-w-3xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-glow">Data2Map · D4</p>
        <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          Logistics &amp; Fleet
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-white/60">
          {sample.depots.length} depots, {sample.stops.length} delivery stops and {sample.vehicles.length} vans across
          Ho Chi Minh City — coverage bands by the hour, clustered drops, and a plan compared against the order the
          work arrived in. Every feature is simulated and says so; the routing is real.
        </p>
      </header>

      <div className="mt-6">
        <LogisticsExperience sample={sample} layers={layers} sources={sources} omittedLayers={OMITTED} />
      </div>
    </div>
  );
}
