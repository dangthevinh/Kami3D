"use client";

import { Map as MapIcon } from "lucide-react";
import dynamic from "next/dynamic";
import * as React from "react";

import { MountWhenVisible } from "@/components/3d/MountWhenVisible";
import { MapFallback } from "@/components/map/MapFallback";
import type { MapCanvasProps } from "@/components/map/MapCanvas";
import { Skeleton } from "@/components/ui/skeleton";
import { canCreateWebGL } from "@/lib/webgl";

/**
 * Deferred entry point for the map.
 *
 * MapLibre is around 250 kB gzipped with its style and workers - more than the entire
 * first-paint budget of a species page - so it loads exactly the way `three` does: only
 * on this route, only after the browser is idle enough to be in view, and never on the
 * server. `check:bundle` has a marker for it and fails if it appears anywhere else.
 *
 * The WebGL probe runs first. MapLibre reports a missing context by logging, which
 * leaves an empty rectangle and no explanation, so the honest answer is a panel that
 * says what happened and offers the catalogue instead.
 */

const MapCanvasView = dynamic(() => import("@/components/map/MapCanvas").then((mod) => mod.MapCanvas), {
  ssr: false,
  loading: () => <MapSkeleton />,
});

export function MapSkeleton() {
  return (
    <div className="relative h-full w-full overflow-hidden">
      <Skeleton className="absolute inset-0 rounded-[var(--radius-card)]" />
      <div className="absolute inset-0 grid place-items-center">
        <div className="flex flex-col items-center gap-2 text-white/45">
          <MapIcon className="size-6 animate-pulse text-neon/70" aria-hidden />
          <span className="text-xs">Loading the map…</span>
        </div>
      </div>
    </div>
  );
}

export interface LazyMapProps extends MapCanvasProps {
  className?: string;
  speciesCount: number;
  regionCount: number;
}

export function LazyMap({ className, speciesCount, regionCount, ...canvasProps }: LazyMapProps) {
  const [webgl, setWebgl] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    setWebgl(canCreateWebGL());
  }, []);

  if (webgl === false) {
    return (
      <div className={className}>
        <MapFallback speciesCount={speciesCount} regionCount={regionCount} />
      </div>
    );
  }

  return (
    <MountWhenVisible className={className} placeholder={<MapSkeleton />}>
      <MapCanvasView {...canvasProps} />
    </MountWhenVisible>
  );
}
