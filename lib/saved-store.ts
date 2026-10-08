"use client";

import { create } from "zustand";

interface SavedState {
  keys: string[];
  status: "idle" | "loading" | "ready" | "error";
  pending: string[];
  /** Why the last toggle failed, so the UI can say something useful. */
  lastError: string | null;
  load: () => Promise<void>;
  toggle: (itemKey: string) => Promise<void>;
  isSaved: (itemKey: string) => boolean;
}

/**
 * One shared store of saved **catalogue** items, for the whole client tree.
 *
 * The animal favourites have their own store and their own table (`user_favorites`, keyed by the
 * species' uuid). This one is keyed by `<category>:<slug>`, because most of the catalogue is not a row
 * anywhere: the landmarks, planets, plants and vehicles are TypeScript data projected into the catalogue
 * shape at read time. Copying the animal store rather than generalising it is deliberate - rewriting the
 * animal favourites would mean touching rows that six other tables point at, for no gain a reader sees.
 *
 * Same behaviour as the favourites store: loaded once per session, flipped optimistically, rolled back
 * when the server refuses, and the server's own explanation is kept rather than swallowed.
 */
export const useSavedStore = create<SavedState>((set, get) => ({
  keys: [],
  status: "idle",
  pending: [],
  lastError: null,

  load: async () => {
    if (get().status === "loading" || get().status === "ready") return;
    set({ status: "loading" });
    try {
      const response = await fetch("/api/saved", { cache: "no-store" });
      if (!response.ok) throw new Error(String(response.status));
      const data = (await response.json()) as { keys?: string[] };
      set({ keys: data.keys ?? [], status: "ready" });
    } catch {
      set({ status: "error" });
    }
  },

  toggle: async (itemKey) => {
    const wasSaved = get().keys.includes(itemKey);

    set((state) => ({
      keys: wasSaved ? state.keys.filter((key) => key !== itemKey) : [...state.keys, itemKey],
      pending: [...state.pending, itemKey],
      lastError: null,
    }));

    try {
      const response = await fetch("/api/saved", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ itemKey }),
      });

      if (!response.ok) {
        const problem = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(problem?.error ?? "Request failed with " + response.status);
      }

      const data = (await response.json()) as { keys?: string[] };
      if (data.keys) set({ keys: data.keys });
    } catch (caught) {
      if (caught instanceof Error) set({ lastError: caught.message });
      set((state) => ({
        keys: wasSaved ? [...state.keys, itemKey] : state.keys.filter((key) => key !== itemKey),
      }));
    } finally {
      set((state) => ({ pending: state.pending.filter((key) => key !== itemKey) }));
    }
  },

  isSaved: (itemKey) => get().keys.includes(itemKey),
}));

/** The number of saved items, for a navbar badge or a collection header. */
export function useSavedCount() {
  return useSavedStore((state) => state.keys.length);
}
