"use client";

import * as React from "react";

import { AnimalGrid } from "@/components/animal/AnimalGrid";
import { FilterBar } from "@/components/animal/FilterBar";
import { LazyGlobe } from "@/components/3d/LazyGlobe";
import { UnlockModal } from "@/components/premium/UnlockModal";
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
  /** Deep-link support: /explore?region=Africa&q=tiger&prehistoric=true */
  initialRegion?: Region | "All";
  initialQuery?: string;
  initialPrehistoricOnly?: boolean;
  onRegionSelect?: (region: Region) => void;
  className?: string;
}

/**
 * The full explore surface: globe + filters + grid + the premium gate, wired to
 * one shared filter store so a click anywhere updates everything at once.
 */
export function ExploreExperience({
  animals,
  counts,
  showGlobe = true,
  showFilters = true,
  initialRegion,
  initialQuery,
  initialPrehistoricOnly = false,
  onRegionSelect,
  className,
}: ExploreExperienceProps) {
  const setRegion = useExploreStore((state) => state.setRegion);
  const setQuery = useExploreStore((state) => state.setQuery);
  const setShowPrehistoric = useExploreStore((state) => state.setShowPrehistoric);
  const appliedInitial = React.useRef(false);

  // Apply URL-driven filters exactly once, so later user input is never clobbered.
  React.useEffect(() => {
    if (appliedInitial.current) return;
    appliedInitial.current = true;
    if (initialRegion) setRegion(initialRegion);
    if (initialQuery) setQuery(initialQuery);
    if (initialPrehistoricOnly) setShowPrehistoric(true);
  }, [initialPrehistoricOnly, initialQuery, initialRegion, setQuery, setRegion, setShowPrehistoric]);

  const visible = useFilteredAnimals(animals);
  const premiumAnimals = React.useMemo(() => animals.filter((animal) => animal.premium), [animals]);

  return (
    <div className={cn("space-y-5", className)}>
      {showGlobe ? <LazyGlobe counts={counts} onRegionSelect={onRegionSelect} /> : null}

      {showFilters ? (
        <FilterBar resultCount={visible.length} totalCount={animals.length} />
      ) : null}

      <AnimalGrid animals={animals} />

      <UnlockModal premiumAnimals={premiumAnimals} />
    </div>
  );
}
