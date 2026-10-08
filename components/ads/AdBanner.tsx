"use client";

import * as React from "react";

import { AdSlot } from "@/components/ads/AdSlot";
import type { AdPlacementId } from "@/lib/ads";

/**
 * One ad position, drawn only when an admin switched it on (Phase 33).
 *
 * It is a client island, and that is a deliberate trade against the alternative:
 *
 *   - reading the switches on the server would mean `cookies()` (the session client) or a build-time
 *     bake, and either one costs something real: the first turns every page with a hole for an ad into a
 *     dynamic render, the second makes an admin wait for a rebuild;
 *   - so the page renders an empty box where the ad may go, the island asks `/api/ads/slots` once, and
 *     the advert appears after the page is interactive. **The ad never blocks first paint**, which is the
 *     same rule the 3D viewers follow.
 *
 * With the switch off it renders **nothing at all** - not an empty frame. A deployment that never turns
 * ads on must look exactly as it did before this phase.
 *
 * Three positions exist and none of them can cover a canvas: `sidebar` sits beside the content column,
 * `below-content` goes after the body, and `in-list` takes a cell in a grid's flow. The check suite
 * asserts that nothing under `components/3d` imports this file.
 */

interface SlotsResponse {
  checked: boolean;
  slots: { id: string; label: string; provider: "placeholder" | "adsense"; slotId: string | null; client: string | null }[];
}

/** One request per page load, however many banners are on it. */
let inflight: Promise<SlotsResponse | null> | null = null;

function loadSlots(): Promise<SlotsResponse | null> {
  if (!inflight) {
    inflight = fetch("/api/ads/slots", { headers: { accept: "application/json" } })
      .then((response) => (response.ok ? (response.json() as Promise<SlotsResponse>) : null))
      .catch(() => null);
  }
  return inflight;
}

const FORMAT: Record<AdPlacementId, "sidebar" | "in-article" | "square"> = {
  sidebar: "sidebar",
  "below-content": "in-article",
  "in-list": "square",
};

export function AdBanner({
  placement,
  className,
  note,
}: {
  placement: AdPlacementId;
  className?: string;
  note?: string;
}) {
  const [slots, setSlots] = React.useState<SlotsResponse | null>(null);

  React.useEffect(() => {
    let live = true;
    void loadSlots().then((value) => {
      if (live) setSlots(value);
    });
    return () => {
      live = false;
    };
  }, []);

  const slot = slots?.slots.find((entry) => entry.id === placement) ?? null;
  if (!slot) return null;

  return (
    <AdSlot
      format={FORMAT[placement]}
      className={className}
      note={note}
      slotId={slot.slotId}
      client={slot.client}
      provider={slot.provider}
    />
  );
}
