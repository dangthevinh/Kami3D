"use client";

import type { Data2MapLayer } from "@/lib/data2map";
import type { LogisticsSample } from "@/lib/data2map/logistics";
import { useData2MapSample } from "@/lib/use-data2map-sample";

import { LogisticsExperience } from "./LogisticsExperience";
import { SamplePending } from "./SamplePending";

/**
 * LogisticsExperience, with its sample fetched instead of bundled.
 *
 * The counts are drawn here rather than in the page header, because the page is static and no
 * longer holds the file.
 *
 * Nothing about the experience changed: it still receives a fully typed sample as a prop and is only
 * mounted once that sample exists, so none of its own state or memoisation had to learn about
 * loading.
 */

export interface LogisticsExperienceLoaderProps {
  layers: Data2MapLayer[];
  sources: Record<string, string>;
  omittedLayers: string[];
}

export function LogisticsExperienceLoader({ layers, sources, omittedLayers }: LogisticsExperienceLoaderProps) {
  const { sample, loading, error } = useData2MapSample<LogisticsSample>("logistics");

  if (!sample) return <SamplePending label="the logistics sample" loading={loading} error={error} />;

  return (
    <>
      <p className="mb-4 text-xs leading-relaxed text-white/50">{sample.depots.length} depots, {sample.stops.length} delivery stops and {sample.vehicles.length} vans across Ho Chi Minh City. Every feature is simulated and says so; the routing is real.</p>
      <LogisticsExperience sample={sample} layers={layers} sources={sources} omittedLayers={omittedLayers} />
    </>
  );
}
