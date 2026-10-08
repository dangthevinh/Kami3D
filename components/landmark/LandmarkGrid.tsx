"use client";

import * as React from "react";

import { LandmarkCard } from "@/components/landmark/LandmarkCard";
import { cn } from "@/lib/utils";

/**
 * The grid, and the one filter worth having.
 *
 * Filtering happens here rather than in the URL because the page is static: a search-param filter
 * would make it render on every request, and this is a page of sixteen cards. When the catalogue is
 * big enough to need a shareable filter, that is the moment to make it dynamic - not before.
 */

export interface LandmarkGridProps {
  landmarks: React.ComponentProps<typeof LandmarkCard>["landmark"][];
  /** slug -> may a card fetch it on hover. Decided on the server from the credit manifest. */
  previewable: Record<string, boolean>;
  kinds: readonly string[];
  kindLabels: Record<string, string>;
}

export function LandmarkGrid({ landmarks, previewable, kinds, kindLabels }: LandmarkGridProps) {
  const [kind, setKind] = React.useState<string>("all");
  const shown = kind === "all" ? landmarks : landmarks.filter((landmark) => landmark.kind === kind);

  const chip = (value: string, label: string) => (
    <button
      key={value}
      type="button"
      onClick={() => setKind(value)}
      aria-pressed={kind === value}
      className={cn(
        "rounded-full px-3 py-1.5 text-xs transition-colors",
        kind === value ? "bg-white/12 text-white ring-1 ring-white/20" : "text-white/55 hover:bg-white/8 hover:text-white",
      )}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Filter by kind">
        {chip("all", "All " + landmarks.length)}
        {kinds.map((value) => chip(value, kindLabels[value] ?? value))}
      </div>

      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((landmark) => (
          <li key={landmark.slug}>
            <LandmarkCard landmark={landmark} previewable={previewable[landmark.slug] === true} className="h-full" />
          </li>
        ))}
      </ul>
    </div>
  );
}
