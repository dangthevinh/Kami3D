"use client";

import type { Data2MapLayer } from "@/lib/data2map";
import type { LogisticsSample } from "@/lib/data2map/logistics";
import { useData2MapSample } from "@/lib/use-data2map-sample";

import { TwinExperience } from "./TwinExperience";
import { SamplePending } from "./SamplePending";

/**
 * TwinExperience, with its sample fetched instead of bundled.
 *
 * The twin reads the same logistics sample as the D4 page - one file, one reader, two products -
 * and fetches it the same way. The counts are drawn here rather than in the page header because the
 * page is static and no longer holds the file.
 *
 * Nothing about the experience changed: it still receives a fully typed sample as a prop and is only
 * mounted once that sample exists, so none of its own state or memoisation had to learn about
 * loading.
 */

export interface TwinExperienceLoaderProps {
  omittedLayers: string[];
}

export function TwinExperienceLoader({ omittedLayers }: TwinExperienceLoaderProps) {
  const { sample, loading, error } = useData2MapSample<LogisticsSample>("logistics");

  if (!sample) return <SamplePending label="the logistics sample" loading={loading} error={error} />;

  return (
    <>
      <p className="mb-4 text-xs leading-relaxed text-white/50">The city in three dimensions with {sample.depots.length} depots, {sample.stops.length} stops and {sample.vehicles.length} vans over real OpenStreetMap buildings and real elevation.</p>
      <TwinExperience sample={sample} omittedLayers={omittedLayers} />
    </>
  );
}
