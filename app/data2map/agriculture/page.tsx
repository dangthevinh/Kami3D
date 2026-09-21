import type { Metadata } from "next";

import { AgricultureExperience } from "@/components/data2map/AgricultureExperience";
import { datasetForLayer, getData2MapRegistry, layersForProduct } from "@/lib/data2map";
import { readAgricultureSample } from "@/lib/data2map/agriculture";
import bundled from "@/data/data2map-agriculture.json";

/**
 * Read once, at build time.
 *
 * The page is a static route and stays one: the registry is fetched during `next build` (uncached,
 * so a seed is always reflected) and the output is prerendered like every other content route. See
 * `lib/supabase.ts` for why the fetch itself is the part that must not be cached.
 */
export const dynamic = "force-static";

/**
 * `/data2map/agriculture` — crop health over the Mekong Delta.
 *
 * ## What the plan expected, and what turned out to be true
 *
 * D6 was flagged as the most expensive phase because NDVI and rainfall are **rasters**, and this
 * project has no tile pipeline: the plan's advice was to build the vector half and leave the raster
 * for later. It turned out that **NASA EOSDIS GIBS already serves both as keyless WMTS tiles** -
 * MODIS NDVI 8-day composites and IMERG precipitation, public domain, world-wide - so the two layers
 * the brief asks for need no preprocessing, no storage and no bandwidth budget of ours. What GIBS
 * does not serve is *numbers*: a tile is a picture, and reading per-parcel values out of one would
 * be guessing at pixels.
 *
 * So the page draws real imagery over a **simulated sample of parcels** and keeps the two visibly
 * apart: the raster carries the colour of the region, the parcels carry the geometry, and the yield
 * beside each one is a demonstration model whose coefficients are printed in the panel. The tighter
 * Sentinel-2 raster the plan named stays planned - it is a different job, and pretending otherwise
 * would put a decoration where a measurement belongs.
 */

export const metadata: Metadata = {
  title: "Agri Geo-Analytics — Data2Map",
  description:
    "MODIS NDVI and IMERG rainfall over the Mekong Delta, a simulated sample of parcels, and a yield model that prints its own coefficients.",
  alternates: { canonical: "/data2map/agriculture" },
};

const OMITTED = [
  "Sentinel-2 at 10 m: the licence is settled (Copernicus, CC BY) but a 10 m NDVI layer needs the preprocessing pipeline this project does not have. GIBS's 250 m MODIS composite is what is drawn instead, and it is real.",
  "Real field boundaries: not published openly for Vietnam. The sample is simulated and labelled; a real parcel layer arrives through the admin upload path, the way D2's land prices do.",
  "Official provincial statistics: Vietnamese production figures are published as reports rather than as an open machine-readable dataset, so the supply shares here are simulated and say so.",
];

export default async function AgriculturePage() {
  const registry = await getData2MapRegistry();
  const layers = layersForProduct(registry, "agriculture");
  const sources = Object.fromEntries(
    layers.map((layer) => [layer.id, datasetForLayer(registry, layer)?.source ?? "no dataset yet"]),
  );
  const sample = readAgricultureSample(bundled);

  return (
    <div className="section-shell py-8">
      <header className="max-w-3xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-coral">Data2Map · D6</p>
        <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          Agri Geo-Analytics
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-white/60">
          {sample.periods.length} NASA composites of MODIS NDVI over the Mekong Delta, IMERG rainfall on the same
          clock, and {sample.fields.length} simulated parcels scored by a yield model that prints its coefficients.
        </p>
      </header>

      <div className="mt-6">
        <AgricultureExperience sample={sample} layers={layers} sources={sources} omittedLayers={OMITTED} />
      </div>
    </div>
  );
}
