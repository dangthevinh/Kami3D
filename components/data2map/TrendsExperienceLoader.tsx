"use client";

import type { Data2MapLayer } from "@/lib/data2map";
import type { TrendsSample } from "@/lib/data2map/trends";
import { useData2MapSample } from "@/lib/use-data2map-sample";

import { TrendsExperience } from "./TrendsExperience";
import { SamplePending } from "./SamplePending";

/**
 * TrendsExperience, with its sample fetched instead of bundled.
 *
 * The hex count is drawn here rather than in the page header: the page is static and no longer
 * holds the file. The places layer was never part of the sample anyway - it comes from
 * `/api/data2map/pois` when the map moves.
 *
 * Nothing about the experience changed: it still receives a fully typed sample as a prop and is only
 * mounted once that sample exists, so none of its own state or memoisation had to learn about
 * loading.
 */

export interface TrendsExperienceLoaderProps {
  layers: Data2MapLayer[];
  sources: Record<string, string>;
  omittedLayers: string[];
}

export function TrendsExperienceLoader({ layers, sources, omittedLayers }: TrendsExperienceLoaderProps) {
  const { sample, loading, error } = useData2MapSample<TrendsSample>("trends");

  if (!sample) return <SamplePending label="the trends sample" loading={loading} error={error} />;

  return (
    <>
      <p className="mb-4 text-xs leading-relaxed text-white/50">{sample.collection.features.length} hexes over Ho Chi Minh City, real WorldPop counts under a simulated hour-by-hour footfall index, with the food and drink places fetched from OpenStreetMap per view.</p>
      <TrendsExperience sample={sample} layers={layers} sources={sources} omittedLayers={omittedLayers} />
    </>
  );
}
