"use client";

import { CalendarDays, MapPin, Ruler } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import * as React from "react";

import { SaveButton } from "@/components/catalog/SaveButton";
import { ShareButton } from "@/components/catalog/ShareButton";
import { previewImageFor } from "@/lib/model-previews";
import { cn, formatHeight } from "@/lib/utils";

/**
 * One landmark, as a card.
 *
 * The same rule the species cards follow: **the real model, or the plate**. A landmark whose file is
 * missing, or whose file is outside the hover budget in `lib/model-preview.ts`, shows the gradient
 * plate and nothing else - there is no drawn stand-in for a building any more than there was one for
 * an animal.
 *
 * The model is mounted on hover only, and unmounted when the pointer leaves, so a grid of sixteen
 * monuments never spins up sixteen WebGL contexts.
 */

const AnimalModelPreview = dynamic(
  () => import("@/components/3d/AnimalModelPreview").then((mod) => mod.AnimalModelPreview),
  { ssr: false, loading: () => null },
);

/** A hover that lingers this long is a hover that meant it. */
const HOVER_DELAY_MS = 260;

export interface LandmarkCardProps {
  landmark: {
    slug: string;
    name: string;
    city: string;
    country: string;
    completed: number;
    height_m: number | null;
    style: string;
    kind: string;
    model_url: string | null;
    accent: [string, string];
  };
  /** Inside the hover budget, decided on the server from the credit manifest. */
  previewable: boolean;
  className?: string;
}

const KIND_LABELS: Record<string, string> = {
  tower: "Tower",
  temple: "Temple",
  castle: "Castle",
  monument: "Monument",
  ruin: "Ruin",
  bridge: "Bridge",
};

/** A year a person reads: "2560 BC" rather than "-2560". */
export function formatYear(year: number): string {
  return year < 0 ? Math.abs(year) + " BC" : String(year);
}

export function LandmarkCard({ landmark, previewable, className }: LandmarkCardProps) {
  const [requested, setRequested] = React.useState(false);
  const [ready, setReady] = React.useState(false);
  const [canHover, setCanHover] = React.useState(false);
  const timer = React.useRef<number | null>(null);

  React.useEffect(() => {
    setCanHover(window.matchMedia?.("(hover: hover)").matches ?? false);
  }, []);

  const realModel = Boolean(landmark.model_url) && previewable;
  const showModel = requested && realModel;
  const covered = showModel && ready;
  /** The monument's rendered likeness, shown without fetching the model itself (lib/model-previews.ts). */
  const preview = previewImageFor(landmark.model_url);
  // Discovered rather than looked up — see lib/model-previews.ts for why there is no index in the client.
  const [previewBroken, setPreviewBroken] = React.useState(false);

  const cancelTimer = () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
  };

  const schedule = () => {
    if (!canHover || !realModel) return;
    cancelTimer();
    timer.current = window.setTimeout(() => setRequested(true), HOVER_DELAY_MS);
  };

  const cancel = () => {
    cancelTimer();
    setRequested(false);
  };

  React.useEffect(() => cancelTimer, []);

  return (
    /**
     * One overlay link over the whole tile, the way `AnimalCard` is built - not a `<Link>` wrapped
     * around the content, because an `<a>` may not contain the save and share buttons. They sit above
     * the overlay (`z-40 > z-10`), so saving a monument never opens it.
     */
    <div
      className={cn(
        "group aurora-border relative flex flex-col overflow-hidden rounded-[var(--radius-card)] bg-white/4 ring-1 ring-white/8 backdrop-blur-sm",
        "transition-all duration-300 hover:-translate-y-1 hover:bg-white/6 hover:shadow-[0_36px_70px_-40px_rgba(53,240,192,0.45)]",
        className,
      )}
      onPointerEnter={schedule}
      onPointerLeave={cancel}
      onFocus={schedule}
      onBlur={cancel}
    >
      <Link
        href={`/landmarks/${landmark.slug}`}
        aria-label={`Open ${landmark.name} in 3D`}
        className="absolute inset-0 z-10 rounded-[var(--radius-card)]"
      />
      <div
        className="relative aspect-[4/3] overflow-hidden rounded-2xl ring-1 ring-inset ring-white/10"
        style={{ background: `linear-gradient(140deg, ${landmark.accent[0]}2e, ${landmark.accent[1]}7a 60%, #060b18)` }}
      >
        {/* The plate: the monument's own picture on its gradient, until a live file covers it. */}
        <div className={cn("absolute inset-0 transition-all duration-500", covered ? "scale-105 opacity-0" : "opacity-100")}>
          {preview && !previewBroken ? (
            <img
              src={preview}
              alt=""
              aria-hidden
              loading="lazy"
              decoding="async"
              width={512}
              height={512}
              onError={() => setPreviewBroken(true)}
              className="size-full object-contain p-4 drop-shadow-[0_18px_30px_rgba(0,0,0,0.5)] transition-transform duration-500 group-hover:scale-[1.06]"
            />
          ) : (
            <span className="grid size-full place-items-center font-display text-6xl font-semibold text-white/25 transition-transform duration-500 group-hover:scale-110" aria-hidden>
              {landmark.name.slice(0, 1)}
            </span>
          )}
        </div>

        {showModel ? (
          <div className="absolute inset-0" aria-hidden>
            <AnimalModelPreview
              url={landmark.model_url as string}
              label={landmark.name + " in 3D"}
              className="h-full w-full"
              onReady={() => setReady(true)}
            />
          </div>
        ) : null}

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-void/85 via-void/10 to-transparent" />

        {/* Above the overlay link, so neither control navigates. */}
        <div className="absolute bottom-3 right-3 z-40 flex items-center gap-1.5 opacity-0 transition-opacity duration-200 focus-within:opacity-100 group-hover:opacity-100 max-md:opacity-100">
          <ShareButton
            href={`/landmarks/${landmark.slug}`}
            title={landmark.name}
            text={landmark.name + ", " + landmark.city + " — " + landmark.style}
          />
          <SaveButton itemKey={`architecture:${landmark.slug}`} name={landmark.name} />
        </div>

        <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white/80 ring-1 ring-white/15 backdrop-blur">
            {KIND_LABELS[landmark.kind] ?? landmark.kind}
          </span>
          {!realModel ? (
            <span className="rounded-full bg-white/8 px-2.5 py-1 text-[11px] text-white/45 ring-1 ring-white/10 backdrop-blur">
              no 3D model yet
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="font-display text-base font-semibold leading-snug text-white">{landmark.name}</h3>
        <p className="flex items-center gap-1.5 text-xs text-white/50">
          <MapPin className="size-3.5" aria-hidden />
          {landmark.city}, {landmark.country}
        </p>
        <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-xs text-white/45">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="size-3.5" aria-hidden />
            {formatYear(landmark.completed)}
          </span>
          {landmark.height_m ? (
            <span className="inline-flex items-center gap-1.5">
              <Ruler className="size-3.5" aria-hidden />
              {formatHeight(landmark.height_m)} tall
            </span>
          ) : null}
          <span className="truncate text-white/35">{landmark.style}</span>
        </div>
      </div>
    </div>
  );
}
