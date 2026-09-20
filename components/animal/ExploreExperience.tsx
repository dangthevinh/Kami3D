"use client";

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

  return (
    <div className={cn("space-y-5", className)}>
      {/* On /explore the globe *is* the region filter; the address bar follows the
          store, mirrored once by `ExploreUrlFilters`. */}
      {showGlobe ? <LazyGlobe counts={counts} species={pins} onRegionSelect={onRegionSelect} /> : null}

      {showFilters ? <FilterBar resultCount={visible.length} totalCount={animals.length} /> : null}

      <AnimalGrid animals={animals} />

      <UnlockModal premiumAnimals={premiumAnimals} />
    </div>
  );
}
