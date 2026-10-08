"use client";

import type { Data2MapLayer } from "@/lib/data2map";
import type { AgricultureSample } from "@/lib/data2map/agriculture";
import { useData2MapSample } from "@/lib/use-data2map-sample";

import { AgricultureExperience } from "./AgricultureExperience";
import { SamplePending } from "./SamplePending";

/**
 * AgricultureExperience, with its sample fetched instead of bundled.
 *
 * The count line is drawn here rather than in the page header, because the page is static and no
 * longer knows how many parcels the file holds. Every number below comes from the sample that
 * actually arrived - which is the point: the header used to be able to say "28 composites" about a
 * file that had been edited to hold 27.
 *
 * Nothing about the experience changed: it still receives a fully typed sample as a prop and is only
 * mounted once that sample exists, so none of its own state or memoisation had to learn about
 * loading.
 */

export interface AgricultureExperienceLoaderProps {
  layers: Data2MapLayer[];
  sources: Record<string, string>;
  omittedLayers: string[];
}

export function AgricultureExperienceLoader({ layers, sources, omittedLayers }: AgricultureExperienceLoaderProps) {
  const { sample, loading, error } = useData2MapSample<AgricultureSample>("agriculture");

  if (!sample) return <SamplePending label="the agriculture sample" loading={loading} error={error} />;

  return (
    <>
      <p className="mb-4 text-xs leading-relaxed text-white/50">{sample.periods.length} NASA composites of MODIS NDVI, {sample.fields.length} sampled parcels across {sample.provinces.length} provinces, and a yield model that prints its own coefficients.</p>
      <AgricultureExperience sample={sample} layers={layers} sources={sources} omittedLayers={omittedLayers} />
    </>
  );
}
