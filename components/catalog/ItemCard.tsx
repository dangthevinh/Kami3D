"use client";

import { Ruler } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import * as React from "react";

import { SaveButton } from "@/components/catalog/SaveButton";
import { ShareButton } from "@/components/catalog/ShareButton";
import type { CatalogItem } from "@/lib/catalog-project";
import { previewImageFor } from "@/lib/model-previews";
import { cn } from "@/lib/utils";

/**
 * The real .glb, mounted only while this card is hovered or focused.
 *
 * Lazy for the reason every other viewer in this project is lazy: `three`, `@react-three/fiber` and the
 * DRACO decoder are the largest things the site can ship, and a grid of tiles must not download them
 * before a visitor has asked for one.
 */
const AnimalModelPreview = dynamic(
  () => import("@/components/3d/AnimalModelPreview").then((mod) => mod.AnimalModelPreview),
  { ssr: false, loading: () => null },
);

/** How long the pointer rests on a card before the model is fetched. */
const HOVER_DELAY_MS = 180;

/**
 * One catalogue entry, with the same controls the species card carries.
 *
 * This card used to be a plain `<Link>` around a plate. It is now built the way `AnimalCard` is built,
 * for the reason that component states in its own comment: **the whole tile is one overlay link**, not a
 * link wrapped around the content, because an `<a>` may not contain the save and share buttons. The
 * buttons sit above the overlay (`z-40 > z-10`) so hearting a monument never opens it.
 *
 * What a visitor gets, and what they get it from:
 *
 *   the model      the real file, on hover or on the first tap of a touch screen - the same 3D preview
 *                  the species cards use, torn down when the pointer leaves
 *   saving         a heart, stored by `<category>:<slug>` (see `SaveButton`)
 *   sharing        the system share sheet where there is one, the clipboard otherwise
 *   the numbers    the catalogue's own: a recorded size, and the line about what the thing is
 *
 * A card whose entry has no model, or whose file is outside the hover budget, keeps its plate - and the
 * plate is honest about being one: a monogram on the entry's own gradient, never a drawn stand-in.
 */

export interface ItemCardProps {
  item: CatalogItem;
  /** Where the card links. The caller decides, so a card never points at a route that would 404. */
  href: string;
  /** The line under the name: "Planet · Solar System", "Tree · Fagaceae". */
  subtitle?: string | null;
  /** May this card fetch its file on hover? Decided on the server from the credit manifest. */
  previewable?: boolean;
  className?: string;
}

export function ItemCard({ item, href, subtitle, previewable = false, className }: ItemCardProps) {
  const [requested, setRequested] = React.useState(false);
  const [ready, setReady] = React.useState(false);
  const [canHover, setCanHover] = React.useState(false);
  /** Set by the first tap on a touch screen: it previews the model instead of navigating. */
  const [touchArmed, setTouchArmed] = React.useState(false);
  const timer = React.useRef<number | null>(null);

  React.useEffect(() => {
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

  const realModel = Boolean(item.model_url) && previewable;
  const showModel = requested && realModel;
  const covered = showModel && ready;
  /** The entry's rendered likeness, shown without fetching the model itself (lib/model-previews.ts). */
  const preview = previewImageFor(item.model_url);
  // Discovered rather than looked up — see lib/model-previews.ts for why there is no index in the client.
  const [previewBroken, setPreviewBroken] = React.useState(false);

  function schedulePreview() {
    if (!canHover || !realModel) return;
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setRequested(true), HOVER_DELAY_MS);
  }

  function cancelPreview() {
    // A touch pointer "leaves" the moment the finger lifts, which would cancel the preview the tap just
    // asked for. Only a device that can actually hover gets to cancel by leaving.
    if (!canHover) return;
    if (timer.current) window.clearTimeout(timer.current);
    setRequested(false);
    setReady(false);
  }

  /**
   * On a touch screen the overlay opens the entry - unless the tap is the one that asks for the model.
   * First tap previews, second tap follows the link: the same order a hover gives a mouse.
   */
  function onOverlayClick(event: React.MouseEvent<HTMLAnchorElement>) {
    if (canHover || !realModel || touchArmed) return;
    event.preventDefault();
    setTouchArmed(true);
    setRequested(true);
  }

  /** The recorded size, in metres, when the catalogue has one. 0 and null both mean "not recorded". */
  const size = item.scale_ratio && item.scale_ratio > 0 ? item.scale_ratio : null;

  return (
    <div
      className={cn(
        "group aurora-border relative flex flex-col overflow-hidden rounded-[var(--radius-card)] bg-white/4 ring-1 ring-white/8 backdrop-blur-sm",
        "transition-all duration-300 hover:-translate-y-1 hover:bg-white/6 hover:shadow-[0_36px_70px_-40px_rgba(53,240,192,0.45)]",
        className,
      )}
      onPointerEnter={schedulePreview}
      onPointerLeave={cancelPreview}
      onFocus={schedulePreview}
      onBlur={cancelPreview}
    >
      {/* Overlay target: the single interactive element for the whole tile. */}
      <Link
        href={href}
        onClick={onOverlayClick}
        className="absolute inset-0 z-10 rounded-[var(--radius-card)]"
        aria-label={realModel ? "Open " + item.name + " in 3D" : "Open " + item.name}
      />

      <div
        className="relative aspect-[4/3] overflow-hidden rounded-2xl ring-1 ring-inset ring-white/10"
        style={{ background: `linear-gradient(140deg, ${item.accent[0]}2e, ${item.accent[1]}7a 60%, #060b18)` }}
      >
        {/* The plate: the model's own picture on the entry's gradient, until a live file covers it. */}
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
            <span className="grid size-full place-items-center font-display text-5xl font-semibold text-white/25 transition-transform duration-500 group-hover:scale-110" aria-hidden>
              {item.name.slice(0, 1)}
            </span>
          )}
        </div>

        {showModel ? (
          <div className="absolute inset-0" aria-hidden>
            <AnimalModelPreview
              url={item.model_url as string}
              label={item.name + " in 3D"}
              className="h-full w-full"
              onReady={() => setReady(true)}
            />
          </div>
        ) : null}

        {item.has_model ? (
          <span className="pointer-events-none absolute right-2.5 top-2.5 rounded-full bg-void/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/75 ring-1 ring-white/15 backdrop-blur">
            3D
          </span>
        ) : null}

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-void/85 via-void/10 to-transparent" />

        {/* Sits above the overlay link (z-40 > z-10) so saving or sharing never navigates. */}
        <div className="absolute bottom-3 right-3 z-40 flex items-center gap-1.5 opacity-0 transition-opacity duration-200 focus-within:opacity-100 group-hover:opacity-100 max-md:opacity-100">
          <ShareButton href={href} title={item.name} text={item.description ? item.description.slice(0, 120) : undefined} />
          <SaveButton itemKey={item.id} name={item.name} />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <h3 className="truncate font-display text-base font-semibold leading-tight text-white transition-colors group-hover:text-neon">
          {item.name}
        </h3>
        {subtitle ? <p className="truncate text-xs text-white/50">{subtitle}</p> : null}

        <div className="mt-auto flex items-center gap-3 pt-1 text-[11px] text-white/50">
          {size ? (
            <span className="inline-flex items-center gap-1.5">
              <Ruler className="size-3.5 text-neon/70" />
              {size} m
            </span>
          ) : null}
          {item.latin_name ? <span className="truncate italic">{item.latin_name}</span> : null}
        </div>
      </div>
    </div>
  );
}
