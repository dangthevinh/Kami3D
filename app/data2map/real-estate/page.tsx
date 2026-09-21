import type { Metadata } from "next";

import { RealEstateExperience } from "@/components/data2map/RealEstateExperience";
import { getData2MapRegistry, layersForProduct } from "@/lib/data2map";
import sample from "@/data/data2map-real-estate.json";
import type { FeatureCollection, Geometry } from "geojson";

/**
 * Read once, at build time.
 *
 * The page is a static route and stays one: the registry is fetched during `next build` (uncached,
 * so a seed is always reflected) and the output is prerendered like every other content route. See
 * `lib/supabase.ts` for why the fetch itself is the part that must not be cached.
 */
export const dynamic = "force-static";

/**
 * `/data2map/real-estate` — land price, zoning, flood risk and the amenities around a plot.
 *
 * ## What is real here and what is not
 *
 * The **amenities** are real: OpenStreetMap through our own endpoint, attributed, nothing stored.
 * The **price, zoning and flood** layers are simulated, because Vietnam publishes land price
 * tables as legal documents and zoning as drawings - there is no open machine-readable layer for
 * either. Every simulated feature carries `synthetic: true` and a note, and the page prints that
 * fact rather than burying it.
 *
 * The honest shape of this product is therefore: **upload is the main path**. A real dataset
 * arrives through `/admin/geodata` (or `npm run geodata:import`), the sample steps aside layer by
 * layer, and nothing about the page changes.
 *
 * The pollution layer the plan asked for is **not here**, and the page says why: Vietnam has
 * public monitoring stations but no open polygon or raster layer, and drawing an inferred one
 * would be exactly the thing this project refuses to do.
 */

export const metadata: Metadata = {
  title: "Real Estate & Zoning — Data2Map",
  description:
    "Land prices, zoning, flood risk and the amenities around a plot, mapped for Ho Chi Minh City, with a transparent potential score.",
  alternates: { canonical: "/data2map/real-estate" },
};

const OMITTED = [
  "Air and noise pollution: Vietnam publishes monitoring stations, not polygons, and an inferred surface would be a guess dressed as data.",
  "Real land prices and zoning: published as legal documents and drawings. Upload them through /admin/geodata and this layer stops being a simulation.",
];

export default async function RealEstatePage() {
  const registry = await getData2MapRegistry();
  const layers = layersForProduct(registry, "real_estate");
  const collection = sample as unknown as FeatureCollection<Geometry> & {
    properties: { area: { west: number; south: number; east: number; north: number }; attribution: string };
  };

  return (
    <div className="section-shell py-8">
      <header className="max-w-3xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neon">Data2Map · D2</p>
        <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          Real Estate &amp; Zoning
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-white/60">
          Land price on a hex grid, zoning parcels, seasonal flood bands and the amenities within
          walking distance — with a potential score that shows every input behind it.
        </p>
      </header>

      <div className="mt-6">
        <RealEstateExperience
          features={collection}
          layers={layers}
          attribution={collection.properties.attribution}
          area={collection.properties.area}
          omittedLayers={OMITTED}
        />
      </div>
    </div>
  );
}
