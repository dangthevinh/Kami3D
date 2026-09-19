"use client";

import { create } from "zustand";

interface FavoritesState {
  ids: string[];
  status: "idle" | "loading" | "ready" | "error";
  pending: string[];
  /** Why the last toggle failed, so the UI can say something useful. */
  lastError: string | null;
  load: () => Promise<void>;
  toggle: (animalId: string) => Promise<void>;
  isFavorite: (animalId: string) => boolean;
}

/**
 * One shared favourites store for the whole client tree: the nav badge, every
 * card and the detail page all read the same list, and `/api/favorites` is hit
 * once per session instead of once per card.
 */
export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  ids: [],
  status: "idle",
  pending: [],
  lastError: null,

  load: async () => {
    if (get().status === "loading" || get().status === "ready") return;
    set({ status: "loading" });
    try {
      const response = await fetch("/api/favorites", { cache: "no-store" });
      if (!response.ok) throw new Error(`${response.status}`);
      const data = (await response.json()) as { ids?: string[] };
      set({ ids: data.ids ?? [], status: "ready" });
    } catch {
      set({ status: "error" });
    }
  },

  toggle: async (animalId) => {
    const wasFavorite = get().ids.includes(animalId);

    // Optimistic: the heart flips instantly, then reconciles with the server.
    set((state) => ({
      ids: wasFavorite ? state.ids.filter((id) => id !== animalId) : [...state.ids, animalId],
      pending: [...state.pending, animalId],
      lastError: null,
    }));

    try {
      const response = await fetch("/api/favorites", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ animalId }),
      });

      if (!response.ok) {
        // The server explains why (409 = the catalogue is not seeded yet, 502 =
        // database trouble); surface it rather than failing mutely.
        const problem = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(problem?.error ?? `Request failed with ${response.status}`);
      }

      const data = (await response.json()) as { ids?: string[] };
      if (data.ids) set({ ids: data.ids });
    } catch (caught) {
      if (caught instanceof Error) set({ lastError: caught.message });
      // Roll back on failure so the UI never lies about persisted state.
      set((state) => ({
        ids: wasFavorite ? [...state.ids, animalId] : state.ids.filter((id) => id !== animalId),
      }));
    } finally {
      set((state) => ({ pending: state.pending.filter((id) => id !== animalId) }));
    }
  },

  isFavorite: (animalId) => get().ids.includes(animalId),
}));
