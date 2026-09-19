"use client";

import { create } from "zustand";

interface UiState {
  rewardOpen: boolean;
  openReward: () => void;
  closeReward: () => void;
}

/** Cross-tree UI flags (the rewarded-video modal can be opened from any card). */
export const useUiStore = create<UiState>((set) => ({
  rewardOpen: false,
  openReward: () => set({ rewardOpen: true }),
  closeReward: () => set({ rewardOpen: false }),
}));
