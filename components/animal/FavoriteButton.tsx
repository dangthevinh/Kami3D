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
    <Button
      type="button"
      onClick={onClick}
      variant={active ? "iris" : "secondary"}
      size={variant === "icon" ? "icon" : "default"}
      aria-pressed={active}
      aria-label={active ? `Remove ${animalName} from favourites` : `Save ${animalName} to favourites`}
      className={cn(variant === "icon" && "size-9", className)}
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
  );
}

/** Small heart counter shown in the navbar/collection header. */
export function useFavoriteCount() {
  const ids = useFavoritesStore((state) => state.ids);
  return ids.length;
}
