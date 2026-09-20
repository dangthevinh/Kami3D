"use client";

import * as React from "react";

import { useExploreStore } from "@/lib/store";
import type { Animal } from "@/types/animal";

/**
 * Single implementation of the catalogue filter, shared by the grid (which
 * renders the result) and the filter bar (which reports the count). Keeping it
 * in one hook guarantees the number shown always matches the number rendered.
 */
export function useFilteredAnimals(animals: Animal[]): Animal[] {
  const region = useExploreStore((state) => state.region);
  const category = useExploreStore((state) => state.category);
  const status = useExploreStore((state) => state.status);
  const query = useExploreStore((state) => state.query);
  const sort = useExploreStore((state) => state.sort);
  const showPrehistoric = useExploreStore((state) => state.showPrehistoric);
  const prehistoricOnly = useExploreStore((state) => state.prehistoricOnly);

  return React.useMemo(() => {
    const needle = query.trim().toLowerCase();

    const filtered = animals.filter((animal) => {
      if (!showPrehistoric && animal.is_prehistoric) return false;
      if (prehistoricOnly && !animal.is_prehistoric) return false;
      if (region !== "All" && animal.region !== region) return false;
      if (category !== "All" && animal.category !== category) return false;
      if (status !== "All" && animal.conservation_status !== status) return false;
      if (!needle) return true;

      return [animal.name, animal.latin_name, animal.category, animal.habitat, animal.diet, animal.region]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });

    switch (sort) {
      case "name":
        return filtered.sort((a, b) => a.name.localeCompare(b.name));
      case "size":
        return filtered.sort((a, b) => b.scale_ratio - a.scale_ratio);
      default:
        return filtered.sort((a, b) => b.popularity - a.popularity);
    }
  }, [animals, category, prehistoricOnly, query, region, showPrehistoric, sort, status]);
}
