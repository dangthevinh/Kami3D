"use client";

import { MapPinned } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { AnimalGrid } from "@/components/animal/AnimalGrid";
import { FilterBar } from "@/components/animal/FilterBar";
import { LazyGlobe } from "@/components/3d/LazyGlobe";
import { UnlockModal } from "@/components/premium/UnlockModal";
import { topSpeciesByRegion } from "@/lib/globe";
import { useExploreStore } from "@/lib/store";
import { useFilteredAnimals } from "@/lib/use-filtered-animals";
import { cn } from "@/lib/utils";
import type { Animal, Region } from "@/types/animal";

export interface ExploreExperienceProps {
  animals: Animal[];
  /** Species per region, rendered on the globe pins. */
  counts: Record<string, number>;
  showGlobe?: boolean;
  showFilters?: boolean;
  onRegionSelect?: (region: Region) => void;
  className?: string;
}

/**
 * The full explore surface: globe + filters + grid + the premium gate, wired to
 * one shared filter store so a click anywhere updates everything at once.
 *
 * URL-driven filters live in `<ExploreUrlFilters />`, which the page renders
 * beside this component — reading search params here would trade the
 * server-rendered catalogue for a client-only one.
 */
export function ExploreExperience({
  animals,
  counts,
  showGlobe = true,
  showFilters = true,
  onRegionSelect,
  className,
}: ExploreExperienceProps) {
  const visible = useFilteredAnimals(animals);
  const premiumAnimals = React.useMemo(() => animals.filter((animal) => animal.premium), [animals]);
  const pins = React.useMemo(() => topSpeciesByRegion(animals), [animals]);
  // The globe is the region picker here, and the map is where the same region is
  // drawn as an area. The hand-off is one-way and goes through the URL - the map reads
  // `?region=`, so a link carries the filter and nothing has to be kept in step.
  const region = useExploreStore((state) => state.region);

  return (
    <div className={cn("space-y-5", className)}>
      {/* On /explore the globe *is* the region filter; the address bar follows the
          store, mirrored once by `ExploreUrlFilters`. */}
      {showGlobe ? (
        <div className="space-y-3">
          <LazyGlobe counts={counts} species={pins} onRegionSelect={onRegionSelect} />
          <div className="flex justify-end">
            <Link
              href={region === "All" ? "/map" : `/map?region=${encodeURIComponent(region)}`}
              className="inline-flex items-center gap-2 rounded-full bg-white/6 px-3.5 py-2 text-xs font-medium text-white/75 ring-1 ring-white/10 transition-colors hover:bg-white/12 hover:text-white"
            >
              <MapPinned className="size-3.5 text-neon" aria-hidden />
              {region === "All" ? "See the habitat map" : `See ${region} on the map`}
            </Link>
          </div>
        </div>
      ) : null}

      {showFilters ? <FilterBar resultCount={visible.length} totalCount={animals.length} /> : null}

      <AnimalGrid animals={animals} />

      <UnlockModal premiumAnimals={premiumAnimals} />
    </div>
  );
}
