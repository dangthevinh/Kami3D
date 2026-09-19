"use client";

import { create } from "zustand";

import type { ConservationStatus, Region, TaxonomicClass } from "@/types/animal";

export type SortKey = "popularity" | "name" | "size";

export interface ExploreFilters {
  region: Region | "All";
  category: TaxonomicClass | "All";
  status: ConservationStatus | "All";
  query: string;
  sort: SortKey;
  showPrehistoric: boolean;
  /** Species unlocked by watching the Phase-4 rewarded video. */
  unlockedPremium: string[];
}

interface ExploreStore extends ExploreFilters {
  setRegion: (region: Region | "All") => void;
  setCategory: (category: TaxonomicClass | "All") => void;
  setStatus: (status: ConservationStatus | "All") => void;
  setQuery: (query: string) => void;
  setSort: (sort: SortKey) => void;
  setShowPrehistoric: (show: boolean) => void;
  unlockPremium: (slugs: string[]) => void;
  reset: () => void;
  activeFilterCount: () => number;
}

const INITIAL: ExploreFilters = {
  region: "All",
  category: "All",
  status: "All",
  query: "",
  sort: "popularity",
  showPrehistoric: true,
  unlockedPremium: [],
};

/**
 * Shared filter state for the explore experience: the 3D globe, the filter bar
 * and the animal grid are siblings, so a small store keeps them in sync without
 * prop-drilling through a Canvas boundary.
 */
export const useExploreStore = create<ExploreStore>((set, get) => ({
  ...INITIAL,
  setRegion: (region) => set({ region }),
  setCategory: (category) => set({ category }),
  setStatus: (status) => set({ status }),
  setQuery: (query) => set({ query }),
  setSort: (sort) => set({ sort }),
  setShowPrehistoric: (showPrehistoric) => set({ showPrehistoric }),
  unlockPremium: (slugs) =>
    set((state) => ({ unlockedPremium: [...new Set([...state.unlockedPremium, ...slugs])] })),
  reset: () => set({ ...INITIAL, unlockedPremium: get().unlockedPremium }),
  activeFilterCount: () => {
    const { region, category, status, query, showPrehistoric } = get();
    return (
      (region !== "All" ? 1 : 0) +
      (category !== "All" ? 1 : 0) +
      (status !== "All" ? 1 : 0) +
      (query.trim() ? 1 : 0) +
      (showPrehistoric ? 0 : 1)
    );
  },
}));
