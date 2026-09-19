"use client";

import { SearchX } from "lucide-react";
import * as React from "react";

import { AnimalCard } from "@/components/animal/AnimalCard";
import { Button } from "@/components/ui/button";
import { useExploreStore } from "@/lib/store";
import { useUiStore } from "@/lib/ui-store";
import { useFilteredAnimals } from "@/lib/use-filtered-animals";
import { cn } from "@/lib/utils";
import type { Animal } from "@/types/animal";

/**
 * Client-side filtering over the server-provided species list.
 *
 * The full catalogue is small (tens of species) and already streamed from the
 * server component, so filtering in the browser keeps the globe, the chips and
 * the grid instantly in sync with zero network round-trips.
 */
export function AnimalGrid({ animals, className }: { animals: Animal[]; className?: string }) {
  const unlockedPremium = useExploreStore((state) => state.unlockedPremium);
  const reset = useExploreStore((state) => state.reset);
  const openReward = useUiStore((state) => state.openReward);
  const visible = useFilteredAnimals(animals);

  if (visible.length === 0) {
    return (
      <div className={cn("glass grid place-items-center gap-3 rounded-[var(--radius-card)] px-6 py-16 text-center", className)}>
        <SearchX className="size-8 text-white/35" />
        <h3 className="font-display text-lg font-semibold text-white">No species match those filters</h3>
        <p className="max-w-sm text-sm text-white/55">
          Try another region or class — or clear the filters to browse the whole encyclopedia.
        </p>
        <Button type="button" variant="secondary" onClick={reset}>
          Clear filters
        </Button>
      </div>
    );
  }

  return (
    <ul className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4", className)}>
      {visible.map((animal, index) => (
        <li
          key={animal.id}
          className="animate-rise"
          // Stagger caps out after the first row so late items are never late.
          style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
        >
          <AnimalCard
            animal={animal}
            unlocked={!animal.premium || unlockedPremium.includes(animal.slug)}
            onLockedActivate={openReward}
            className="h-full"
          />
        </li>
      ))}
    </ul>
  );
}
