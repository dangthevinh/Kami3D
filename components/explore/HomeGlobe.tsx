"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

import { LazyGlobe } from "@/components/3d/LazyGlobe";
import { topSpeciesByRegion } from "@/lib/globe";
import type { Animal, Region } from "@/types/animal";

/**
 * Home-page globe: picking a region routes straight into the filtered explore
 * view, so the landing page stays a launcher and /explore stays the deep surface.
 *
 * The pins also carry the three most-opened species of each region, which makes the
 * globe a way *into* the encyclopedia rather than only a filter over it.
 */
export function HomeGlobe({ counts, animals }: { counts: Record<string, number>; animals: Animal[] }) {
  const router = useRouter();

  const handleRegionSelect = React.useCallback(
    (region: Region) => {
      router.push(`/explore?region=${encodeURIComponent(region)}`);
    },
    [router],
  );

  const species = React.useMemo(() => topSpeciesByRegion(animals), [animals]);

  return <LazyGlobe counts={counts} species={species} onRegionSelect={handleRegionSelect} className="animate-rise" />;
}
