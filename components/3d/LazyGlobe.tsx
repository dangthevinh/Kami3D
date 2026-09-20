"use client";

import { Globe2 } from "lucide-react";
import dynamic from "next/dynamic";

import { MountWhenVisible } from "@/components/3d/MountWhenVisible";
import { Skeleton } from "@/components/ui/skeleton";
import type { GlobePin } from "@/lib/globe";
import type { Region } from "@/types/animal";

/**
 * Deferred entry point for the interactive globe.
 *
 * The globe is the hero of the landing page, but it is also the only thing there
 * that needs `three` (~300 KB gzipped with R3F and drei). Deferring it keeps the
 * hero copy, statistics and SEO text on a small initial bundle and streams the 3D
 * in behind a skeleton — which is exactly what a visitor on a slow connection
 * should get. `MountWhenVisible` adds the second half of that promise: the
 * skeleton is also what a visitor sees while the browser is still busy painting
 * the page.
 */

/** Exported so the pre-mount placeholder and the loading state are identical. */
export function GlobeSkeleton() {
  return (
    <div className="relative h-[340px] w-full overflow-hidden rounded-[var(--radius-card)] sm:h-[440px] lg:h-[560px]">
      <Skeleton className="absolute inset-0 rounded-[var(--radius-card)]" />
      <div className="absolute inset-0 grid place-items-center">
        <div className="flex flex-col items-center gap-2 text-white/45">
          <Globe2 className="size-6 animate-pulse text-neon/70" />
          <span className="text-xs">Loading the globe…</span>
        </div>
      </div>
    </div>
  );
}

const InteractiveGlobe = dynamic(
  () => import("@/components/3d/InteractiveGlobe").then((mod) => mod.InteractiveGlobe),
  { ssr: false, loading: () => <GlobeSkeleton /> },
);

export interface LazyGlobeProps {
  counts?: Record<string, number>;
  /** Most-opened species per region, shown on the map pins. */
  species?: Record<string, GlobePin[]>;
  onRegionSelect?: (region: Region) => void;
  className?: string;
}

export function LazyGlobe({ counts = {}, species = {}, onRegionSelect, className }: LazyGlobeProps) {
  return (
    <MountWhenVisible className={className} placeholder={<GlobeSkeleton />}>
      <InteractiveGlobe counts={counts} species={species} onRegionSelect={onRegionSelect} />
    </MountWhenVisible>
  );
}
