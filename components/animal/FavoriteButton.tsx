"use client";

import { Heart } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { useFavoritesStore } from "@/lib/favorites-store";
import { cn } from "@/lib/utils";

export interface FavoriteButtonProps {
  animalId: string;
  animalName: string;
  /** Filled button with a label (detail page) vs. a bare heart icon (cards). */
  variant?: "icon" | "labelled";
  className?: string;
}

export function FavoriteButton({ animalId, animalName, variant = "icon", className }: FavoriteButtonProps) {
  const ids = useFavoritesStore((state) => state.ids);
  const load = useFavoritesStore((state) => state.load);
  const toggle = useFavoritesStore((state) => state.toggle);
  const lastError = useFavoritesStore((state) => state.lastError);
  const [justToggled, setJustToggled] = React.useState(false);

  // The favourite list lives in a cookie/session, so it is synced after mount.
  React.useEffect(() => {
    void load();
  }, [load]);

  const active = ids.includes(animalId);

  function onClick(event: React.MouseEvent) {
    // Cards wrap this button in a <Link>; never navigate when hearting.
    event.preventDefault();
    event.stopPropagation();
    setJustToggled(true);
    window.setTimeout(() => setJustToggled(false), 320);
    void toggle(animalId);
  }

  return (
    <div className={cn(variant === "labelled" && "flex flex-col gap-1.5", className)}>
      <Button
        type="button"
        onClick={onClick}
        variant={active ? "iris" : "secondary"}
        size={variant === "icon" ? "icon" : "default"}
        aria-pressed={active}
        // The server's explanation (for example "the catalogue is not seeded yet")
        // is attached to the control rather than swallowed.
        title={lastError ?? undefined}
        aria-label={active ? `Remove ${animalName} from favourites` : `Save ${animalName} to favourites`}
        className={cn(
          variant === "icon" && "size-9",
          lastError && "ring-2 ring-coral/60",
        )}
      >
        <Heart
          className={cn(
            "transition-transform duration-300",
            active && "fill-current",
            justToggled && "scale-125",
          )}
        />
        {variant === "labelled" ? <span>{active ? "Saved" : "Save"}</span> : null}
      </Button>

      {lastError && variant === "labelled" ? (
        <p role="status" className="max-w-xs text-[11px] leading-relaxed text-coral">
          {lastError}
        </p>
      ) : null}
    </div>
  );
}

/** Small heart counter shown in the navbar/collection header. */
export function useFavoriteCount() {
  const ids = useFavoritesStore((state) => state.ids);
  return ids.length;
}
