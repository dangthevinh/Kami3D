"use client";

import * as React from "react";

import { isAdsEnabled, publicEnv } from "@/lib/env";
import { cn } from "@/lib/utils";

/**
 * Ad placement holder.
 *
 * Design rules baked in here:
 *  - the slot always reserves its exact height (no layout shift, no CLS penalty)
 *  - slots are never positioned over a `<canvas>` or in the sticky nav, so an
 *    advert can never cover the 3D viewer
 *  - with no `NEXT_PUBLIC_ADSENSE_CLIENT` configured it renders a labelled
 *    placeholder instead of empty space, which keeps the layout reviewable
 *
 * Drop your network's snippet into the marked block once an account is approved.
 */

type AdFormat = "leaderboard" | "in-article" | "sidebar" | "square";

const FORMATS: Record<AdFormat, { label: string; box: string; size: string; slot: string }> = {
  leaderboard: { label: "Leaderboard", box: "h-[90px] sm:h-[90px]", size: "728 × 90", slot: "1234567890" },
  "in-article": { label: "In-article", box: "min-h-[110px]", size: "Responsive", slot: "1234567891" },
  sidebar: { label: "Sidebar", box: "h-[600px] max-h-[70vh]", size: "300 × 600", slot: "1234567892" },
  square: { label: "Square", box: "aspect-square", size: "250 × 250", slot: "1234567893" },
};

export interface AdSlotProps {
  format?: AdFormat;
  className?: string;
  /** Shown under the placeholder in Demo Mode, e.g. "Funds new 3D scans". */
  note?: string;
  /**
   * Phase 33: the ad unit id, from the admin-controlled placement row.
   *
   * The format's own id is a fallback for the pages that predate the placement table. Passing the real
   * one matters: an AdSense unit is identified by (client, slot), so a placeholder id would ask Google
   * for a unit that does not exist and render an empty box with no explanation.
   */
  slotId?: string | null;
  /** Phase 33: the client id, when the caller already has it (the slots route sends it). */
  client?: string | null;
  /** Phase 33: "placeholder" draws the labelled box on purpose; "adsense" asks the network. */
  provider?: "placeholder" | "adsense";
}

export function AdSlot({ format = "in-article", className, note, slotId = null, client = null, provider }: AdSlotProps) {
  const config = FORMATS[format];
  const pushed = React.useRef(false);

  // Which unit to ask for: what the placement said, else the format's own id. A caller that passes
  // neither is the pre-Phase-33 behaviour, kept so those five pages keep working unchanged.
  const resolvedClient = client ?? publicEnv.adsenseClient;
  const resolvedSlot = slotId ?? config.slot;
  const wantsNetwork = provider ? provider === "adsense" : isAdsEnabled;
  const canAskNetwork = wantsNetwork && resolvedClient.length > 0 && resolvedSlot.length > 0;

  React.useEffect(() => {
    if (!canAskNetwork || pushed.current) return;
    pushed.current = true;
    try {
      // @ts-expect-error - injected by the AdSense script tag
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // Blocked by an ad blocker: the reserved box simply stays empty.
    }
  }, [canAskNetwork]);

  return (
    <aside
      aria-label={`Advertisement (${config.label})`}
      className={cn(
        "relative flex w-full flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-white/12 bg-white/2 text-center",
        config.box,
        className,
      )}
    >
      <span className="absolute left-2 top-2 text-[9px] uppercase tracking-[0.2em] text-white/25">Ad</span>

      {canAskNetwork ? (
        // --- Production: Google AdSense -------------------------------------
        <ins
          className="adsbygoogle block w-full"
          style={{ display: "block" }}
          data-ad-client={resolvedClient}
          data-ad-slot={resolvedSlot}
          data-ad-format={format === "in-article" ? "fluid" : "auto"}
          data-full-width-responsive="true"
        />
      ) : (
        <div className="px-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-white/35">
            {config.label} · {config.size}
          </p>
          <p className="mt-1 max-w-xs text-[11px] leading-relaxed text-white/25">
            {note ??
              (wantsNetwork
                ? "AdSense is configured but this position has no usable unit id, so nothing is served."
                : "Placeholder — an admin can switch a real position on in /admin/ads.")}
          </p>
        </div>
      )}
    </aside>
  );
}
