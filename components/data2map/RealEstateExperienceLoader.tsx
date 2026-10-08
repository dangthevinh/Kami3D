"use client";

import type { Data2MapLayer } from "@/lib/data2map";
import type { RealEstateSample } from "@/lib/data2map/real-estate";
import { useData2MapSample } from "@/lib/use-data2map-sample";

import { RealEstateExperience } from "./RealEstateExperience";
import { SamplePending } from "./SamplePending";

/**
 * RealEstateExperience, with its sample fetched instead of bundled.
 *
 * The counts are drawn here rather than in the page header, because the page is static and no
 * longer holds the file. This is also the point where the sample is finally checked: the page used
 * to cast the imported JSON, and `readRealEstateSample` now refuses a file that has lost its area
 * or its attribution.
 *
 * Nothing about the experience changed: it still receives a fully typed sample as a prop and is only
 * mounted once that sample exists, so none of its own state or memoisation had to learn about
 * loading.
 */

export interface RealEstateExperienceLoaderProps {
  layers: Data2MapLayer[];
  omittedLayers: string[];
}

export function RealEstateExperienceLoader({ layers, omittedLayers }: RealEstateExperienceLoaderProps) {
  const { sample, loading, error } = useData2MapSample<RealEstateSample>("real-estate");

  if (!sample) return <SamplePending label="the real-estate sample" loading={loading} error={error} />;

  return (
    <>
      <p className="mb-4 text-xs leading-relaxed text-white/50">{sample.collection.features.length} simulated features - land price on a hex grid, zoning parcels and seasonal flood bands - with the amenities fetched from OpenStreetMap per view.</p>
      <RealEstateExperience
        features={sample.collection}
        layers={layers}
        attribution={sample.attribution}
        area={sample.area}
        omittedLayers={omittedLayers}
      />
    </>
  );
}
