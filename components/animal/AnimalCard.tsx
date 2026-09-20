"use client";

import { Eye, Lock, Ruler, Sparkles } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import * as React from "react";

import { FavoriteButton } from "@/components/animal/FavoriteButton";
import { Badge } from "@/components/ui/badge";
import { cn, formatCount, formatWeight } from "@/lib/utils";
import { statusToTailwind, type Animal } from "@/types/animal";

// The 3D preview is only pulled in when a card is actually hovered.
const AnimalPreview = dynamic(() => import("@/components/3d/AnimalPreview").then((mod) => mod.AnimalPreview), {
  ssr: false,
  loading: () => null,
});

export interface AnimalCardProps {
  animal: Animal;
  /** True once the visitor passed the rewarded-video gate for premium species. */
  unlocked?: boolean;
  onLockedActivate?: () => void;
  className?: string;
}

/**
 * Species card.
 *
 * Structure note: the whole card is one overlay link (or one overlay button when
 * the species is still locked) rather than a `<Link>` wrapping the content. That
 * keeps the markup valid — an <a> must not contain the favourite <button> — while
 * still making the entire tile clickable and keyboard focusable.
 */
export function AnimalCard({ animal, unlocked = true, onLockedActivate, className }: AnimalCardProps) {
  const [previewReady, setPreviewReady] = React.useState(false);
  const [canHover, setCanHover] = React.useState(false);
  const timer = React.useRef<number | null>(null);
  const status = statusToTailwind(animal.conservation_status);
  const locked = animal.premium && !unlocked;

  React.useEffect(() => {
    // Never mount 3D on touch-only devices; the detail page is the 3D surface there.
    const query = window.matchMedia("(hover: hover) and (pointer: fine)");
    setCanHover(query.matches);
    const listener = (event: MediaQueryListEvent) => setCanHover(event.matches);
    query.addEventListener("change", listener);
    return () => query.removeEventListener("change", listener);
  }, []);

  React.useEffect(() => {
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);

  function schedulePreview() {
    if (!canHover || locked) return;
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setPreviewReady(true), 220);
  }

  function cancelPreview() {
    if (timer.current) window.clearTimeout(timer.current);
    setPreviewReady(false);
  }

  return (
    <div
      className={cn(
        "group aurora-border relative flex flex-col overflow-hidden rounded-[var(--radius-card)] bg-white/4 ring-1 ring-white/8 backdrop-blur-sm",
        "transition-all duration-300 hover:-translate-y-1 hover:bg-white/6 hover:shadow-[0_36px_70px_-40px_rgba(53,240,192,0.55)]",
        className,
      )}
      onPointerEnter={schedulePreview}
      onPointerLeave={cancelPreview}
      onFocus={schedulePreview}
      onBlur={cancelPreview}
    >
      {/* Overlay target: the single interactive element for the whole tile. */}
      {locked ? (
        <button
          type="button"
          onClick={onLockedActivate}
          className="absolute inset-0 z-10 cursor-pointer rounded-[var(--radius-card)]"
          aria-label={`${animal.name} is locked — watch a short video to unlock it`}
        />
      ) : (
        <Link
          href={`/animal/${animal.slug}`}
          className="absolute inset-0 z-10 rounded-[var(--radius-card)]"
          aria-label={`Open the ${animal.name} in 3D`}
        />
      )}

      {/* Media plate */}
      <div
        className="relative aspect-[4/3] overflow-hidden rounded-2xl ring-1 ring-inset ring-white/10"
        style={{ background: `linear-gradient(140deg, ${animal.accent[0]}2e, ${animal.accent[1]}7a 60%, #060b18)` }}
      >
        <div
          className={cn(
            "absolute inset-0 grid place-items-center transition-all duration-500",
            previewReady ? "scale-100 opacity-0" : "opacity-100",
          )}
        >
          <span
            className="text-5xl drop-shadow-[0_6px_18px_rgba(0,0,0,0.55)] transition-transform duration-500 group-hover:scale-110"
            aria-hidden
          >
            {animal.emoji}
          </span>
        </div>

        {previewReady ? (
          <div className="absolute inset-0" aria-hidden>
            <AnimalPreview kind={animal.silhouette} accent={animal.accent} className="h-full w-full" />
          </div>
        ) : null}

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-void/85 via-void/10 to-transparent" />

        <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap items-center gap-1.5">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ring-1 backdrop-blur",
              status.bg,
              status.text,
              status.ring,
            )}
          >
            <span className={cn("size-1.5 rounded-full", status.dot)} />
            {animal.conservation_status}
          </span>
        </div>

        <div className="pointer-events-none absolute right-3 top-3 flex items-center gap-1.5">
          {animal.is_prehistoric ? (
            <Badge variant="solar" className="backdrop-blur">
              <Sparkles className="size-3" />
              Prehistoric
            </Badge>
          ) : null}
          {locked ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-void/75 px-2 py-1 text-[10px] font-medium text-solar ring-1 ring-solar/35 backdrop-blur">
              <Lock className="size-3" />
              Locked
            </span>
          ) : null}
        </div>

        {/* Sits above the overlay link (z-20 > z-10) so hearting never navigates. */}
        {!locked ? (
          <div className="absolute bottom-3 right-3 z-20 opacity-0 transition-opacity duration-200 focus-within:opacity-100 group-hover:opacity-100 max-md:opacity-100">
            <FavoriteButton animalId={animal.id} animalName={animal.name} />
          </div>
        ) : null}

        {locked ? (
          <div className="pointer-events-none absolute inset-0 grid place-items-center bg-void/45 backdrop-blur-[2px]">
            <span className="inline-flex items-center gap-2 rounded-full bg-void/80 px-3.5 py-2 text-xs font-medium text-solar ring-1 ring-solar/35">
              <Lock className="size-3.5" />
              Watch to unlock
            </span>
          </div>
        ) : null}
      </div>

      {/* Copy */}
      <div className="flex flex-1 flex-col gap-2.5 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate font-display text-base font-semibold text-white transition-colors group-hover:text-neon">
              {animal.name}
            </h3>
            <p className="truncate text-xs italic text-white/45">{animal.latin_name}</p>
          </div>
          <span className="shrink-0 rounded-lg bg-white/6 px-2 py-1 text-[10px] uppercase tracking-wide text-white/55 ring-1 ring-white/10">
            {animal.category}
          </span>
        </div>

        <p className="line-clamp-2 text-xs leading-relaxed text-white/55">{animal.habitat}</p>

        <div className="mt-auto flex items-center gap-3 pt-1 text-[11px] text-white/50">
          <span className="inline-flex items-center gap-1.5">
            <Ruler className="size-3.5 text-neon/70" />
            {animal.scale_ratio} m
          </span>
          <span className="size-1 rounded-full bg-white/20" />
          <span>{formatWeight(animal.weight_kg)}</span>
          {/* Real page views from the database. Absent in Demo Mode, where there is
              no counter to read — an invented number would be worse than none. */}
          {typeof animal.view_count === "number" ? (
            <>
              <span className="size-1 rounded-full bg-white/20" />
              <span
                className="inline-flex items-center gap-1"
                title={`${animal.view_count.toLocaleString()} views`}
              >
                <Eye className="size-3.5 text-glow/70" />
                {formatCount(animal.view_count)}
              </span>
            </>
          ) : null}
          <span className="ml-auto truncate text-white/40">{animal.region}</span>
        </div>
      </div>
    </div>
  );
}
