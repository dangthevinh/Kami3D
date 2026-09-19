"use client";

import { Globe2 } from "lucide-react";
import dynamic from "next/dynamic";

import { Skeleton } from "@/components/ui/skeleton";
import type { Region } from "@/types/animal";

/**
 * Deferred entry point for the interactive globe.
 *
 * The globe is the hero of the landing page, but it is also the only thing there
 * that needs `three` (~300 KB gzipped with R3F and drei). Deferring it keeps the
 * hero copy, statistics and SEO text on a small initial bundle and streams the 3D
 * in behind a skeleton — which is exactly what a visitor on a slow connection
 * should get.
 */

const InteractiveGlobe = dynamic(
  () => import("@/components/3d/InteractiveGlobe").then((mod) => mod.InteractiveGlobe),
  {
    ssr: false,
    loading: () => (
      <div className="relative h-[340px] w-full overflow-hidden rounded-[var(--radius-card)] sm:h-[440px] lg:h-[560px]">
        <Skeleton className="absolute inset-0 rounded-[var(--radius-card)]" />
        <div className="absolute inset-0 grid place-items-center">
          <div className="flex flex-col items-center gap-2 text-white/45">
            <Globe2 className="size-6 animate-pulse text-neon/70" />
            <span className="text-xs">Loading the globe…</span>
          </div>
        </div>
      </div>
    ),
  },
);

export interface LazyGlobeProps {
  counts?: Record<string, number>;
  onRegionSelect?: (region: Region) => void;
  className?: string;
}

export function LazyGlobe({ counts = {}, onRegionSelect, className }: LazyGlobeProps) {
  return <InteractiveGlobe counts={counts} onRegionSelect={onRegionSelect} className={className} />;
}
