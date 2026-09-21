"use client";

import { create } from "zustand";

import {
  DEFAULT_LAYER_OPACITY,
  DEFAULT_LAYER_VISIBILITY,
  EMPTY_MAP_QUERY,
  visibilityFor,
  type MapLayerId,
  type MapQuery,
} from "@/lib/map-query";

/**
 * Which layers the map is drawing, and what it is filtered to.
 *
 * `zustand@5` already holds the explore filters, so a map toggle is a second store
 * rather than a new context: the state has to be readable from the layer panel, the map
 * and the URL bar, and a context would put all three inside one provider subtree for no
 * gain. The *shape* of the state lives in `lib/map-query.ts`, which has no dependencies
 * and is therefore testable in plain Node.
 */

export * from "@/lib/map-query";

interface MapLayerStore extends MapQuery {
  visible: Record<MapLayerId, boolean>;
  opacity: Record<MapLayerId, number>;
  setVisible: (id: MapLayerId, visible: boolean) => void;
  setOpacity: (id: MapLayerId, opacity: number) => void;
  setRegion: (region: MapQuery["region"]) => void;
  setSpecies: (species: string | null) => void;
  /** Applies a parsed query, e.g. after a client-side navigation. */
  applyQuery: (query: MapQuery) => void;
  reset: () => void;
}

export const useMapLayers = create<MapLayerStore>((set) => ({
  ...EMPTY_MAP_QUERY,
  visible: { ...DEFAULT_LAYER_VISIBILITY },
  opacity: { ...DEFAULT_LAYER_OPACITY },

  setVisible: (id, visible) =>
    set((state) => ({
      visible: { ...state.visible, [id]: visible },
      // The URL list follows the switches, so the link always describes the screen.
      layers: visible ? [...new Set([...state.layers, id])] : state.layers.filter((layer) => layer !== id),
    })),

  setOpacity: (id, opacity) =>
    set((state) => ({ opacity: { ...state.opacity, [id]: Math.min(1, Math.max(0, opacity)) } })),

  setRegion: (region) => set({ region }),
  setSpecies: (species) => set({ species }),
  applyQuery: (query) => set({ ...query, visible: visibilityFor(query) }),

  reset: () =>
    set({
      ...EMPTY_MAP_QUERY,
      visible: { ...DEFAULT_LAYER_VISIBILITY },
      opacity: { ...DEFAULT_LAYER_OPACITY },
    }),
}));
