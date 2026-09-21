import type { Metadata } from "next";

import { TrendsExperience } from "@/components/data2map/TrendsExperience";
import { datasetForLayer, getData2MapRegistry, layersForProduct } from "@/lib/data2map";
import { readTrendsSample } from "@/lib/data2map/trends";
import bundled from "@/data/data2map-trends.json";

/**
 * Read once, at build time.
 *
 * The page is a static route and stays one: the registry is fetched during `next build` (uncached,
 * so a seed is always reflected) and the output is prerendered like every other content route. See
 * `lib/supabase.ts` for why the fetch itself is the part that must not be cached.
 */
export const dynamic = "force-static";

/**
 * `/data2map/trends` — population density, footfall by hour, and where the gap is.
 *
 * ## What is real here and what is not
 *
 * **Population is real**: WorldPop 2020, 100 m gridded counts under CC BY 4.0, summed per hex by
 * `npm run trends:fetch` and committed to `data/data2map-trends.json`. **The food-and-drink places
 * are real**: OpenStreetMap through our own endpoint, attributed, nothing stored. **Hourly footfall
 * is simulated** - CC0, and labelled as simulated in the layer hint, in the clock's own note and in
 * the popup - because no open dataset of hourly footfall exists for Vietnam.
 *
 * The page the phase brief asked for promised "real-time hotspots" and a Google Places feed. Neither
 * survives contact with the data: Google's terms forbid storing place data and need a key, and
 * nobody publishes hourly footfall. So the real half is real, the invented half says so, and the
 * site-selection score prints which of the two each of its inputs came from.
 */

export const metadata: Metadata = {
  title: "Footfall & Trend Map — Data2Map",
  description:
    "Population density per hex, footfall by hour of day, and a market-gap score for choosing where to open in Ho Chi Minh City.",
  alternates: { canonical: "/data2map/trends" },
};

const OMITTED = [
  "Live or near-real-time footfall: nobody publishes it for Vietnam, and a screen of numbers that looks live is the one thing this page must not fake.",
  "Traffic volume: there is no open traffic-count layer for Vietnamese cities, so the dashboard ships without the congestion layer the brief asked for rather than with an invented one.",
];

export default async function TrendsPage() {
  const registry = await getData2MapRegistry();
  const layers = layersForProduct(registry, "trends");
  // The panel prints each layer's source and licence, so it reads them from the registry rather than
  // hard-coding a second copy of the provenance here.
  const sources = Object.fromEntries(
    layers.map((layer) => [layer.id, datasetForLayer(registry, layer)?.source ?? "no dataset yet"]),
  );
  const sample = readTrendsSample(bundled);

  return (
    <div className="section-shell py-8">
      <header className="max-w-3xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-solar">Data2Map · D3</p>
        <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          Footfall &amp; Trend Map
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-white/60">
          {sample.collection.features.length} hexes over Ho Chi Minh City: real population counts from
          WorldPop, food and drink places from OpenStreetMap, and a simulated hour-by-hour footfall index
          over the top — with the clock, the category and the gap score all saying where their numbers
          came from.
        </p>
      </header>

      <div className="mt-6">
        <TrendsExperience sample={sample} layers={layers} sources={sources} omittedLayers={OMITTED} />
      </div>
    </div>
  );
}
