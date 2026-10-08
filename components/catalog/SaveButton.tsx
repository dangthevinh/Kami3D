"use client";

import { Heart } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { useSavedStore } from "@/lib/saved-store";
import { cn } from "@/lib/utils";

/**
 * The heart on a catalogue item - a monument, a planet, a tree, a car.
 *
 * The animal card's `FavoriteButton` is the same control for species; this is its twin for everything
 * else, and it behaves identically on purpose: the tile flips instantly, the server is asked once, and a
 * refusal rolls the heart back rather than leaving the card claiming something that was not saved. What
 * differs is only the key: `<category>:<slug>`, because the entry is not a row in the database.
 */
export interface SaveButtonProps {
  /** `<category>:<slug>` - the catalogue item's own id. */
  itemKey: string;
  name: string;
  /** Filled button with a label (detail page) vs. a bare heart icon (cards). */
  variant?: "icon" | "labelled";
  className?: string;
}

export function SaveButton({ itemKey, name, variant = "icon", className }: SaveButtonProps) {
  const keys = useSavedStore((state) => state.keys);
  const load = useSavedStore((state) => state.load);
  const toggle = useSavedStore((state) => state.toggle);
  const lastError = useSavedStore((state) => state.lastError);
  const [justToggled, setJustToggled] = React.useState(false);

  React.useEffect(() => {
    void load();
  }, [load]);

  const active = keys.includes(itemKey);

  function onClick(event: React.MouseEvent) {
    // The card's whole tile is a link underneath this button; never navigate when saving.
    event.preventDefault();
    event.stopPropagation();
    setJustToggled(true);
    window.setTimeout(() => setJustToggled(false), 320);
    void toggle(itemKey);
  }

  return (
    <div className={cn(variant === "labelled" && "flex flex-col gap-1.5", className)}>
      <Button
        type="button"
        onClick={onClick}
        variant={active ? "iris" : "secondary"}
        size={variant === "icon" ? "icon" : "default"}
        aria-pressed={active}
        title={lastError ?? undefined}
        aria-label={active ? "Remove " + name + " from saved" : "Save " + name}
        className={cn(variant === "icon" && "size-9", lastError && "ring-2 ring-coral/60")}
      >
        <Heart className={cn("transition-transform duration-300", active && "fill-current", justToggled && "scale-125")} />
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
