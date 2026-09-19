"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

import { LazyGlobe } from "@/components/3d/LazyGlobe";
import type { Region } from "@/types/animal";

/**
 * Home-page globe: picking a region routes straight into the filtered explore
 * view, so the landing page stays a launcher and /explore stays the deep surface.
 */
export function HomeGlobe({ counts }: { counts: Record<string, number> }) {
  const router = useRouter();

  const handleRegionSelect = React.useCallback(
    (region: Region) => {
      router.push(`/explore?region=${encodeURIComponent(region)}`);
    },
    [router],
  );

  return <LazyGlobe counts={counts} onRegionSelect={handleRegionSelect} className="animate-rise" />;
}
