"use client";

import { Boxes } from "lucide-react";
import dynamic from "next/dynamic";

import { MountWhenVisible } from "@/components/3d/MountWhenVisible";
import { Skeleton } from "@/components/ui/skeleton";
import type { Animal } from "@/types/animal";

/**
 * Deferred entry points for the two heavy WebGL surfaces.
 *
 * `next/dynamic` with `ssr: false` keeps `three`, `@react-three/fiber` and
 * `@react-three/drei` out of the server render and out of the initial client
 * payload, and `MountWhenVisible` keeps the *download* from starting while the
 * species text, the fact sheet and the SEO metadata are still painting.
 *
 * A client component is required here because `ssr: false` is not allowed inside
 * a Server Component.
 */

function ViewerSkeleton({ label }: { label: string }) {
  return (
    <div className="relative h-[380px] w-full overflow-hidden rounded-[var(--radius-card)] ring-1 ring-white/10 sm:h-[500px] lg:h-[620px]">
      <Skeleton className="absolute inset-0 rounded-[var(--radius-card)]" />
      <div className="absolute inset-0 grid place-items-center">
        <div className="flex flex-col items-center gap-2 text-white/45">
          <Boxes className="size-6 animate-pulse text-neon/70" />
          <span className="text-xs">{label}</span>
        </div>
      </div>
    </div>
  );
}

function ComparisonSkeleton() {
  return (
    <div className="relative h-[360px] w-full overflow-hidden rounded-[var(--radius-card)] ring-1 ring-white/10 sm:h-[460px]">
      <Skeleton className="absolute inset-0 rounded-[var(--radius-card)]" />
      <div className="absolute inset-0 grid place-items-center text-xs text-white/45">Loading size chart…</div>
    </div>
  );
}

const ModelViewer = dynamic(() => import("@/components/3d/ModelViewer").then((mod) => mod.ModelViewer), {
  ssr: false,
  loading: () => <ViewerSkeleton label="Loading 3D viewer…" />,
});

const SizeComparison = dynamic(() => import("@/components/3d/SizeComparison").then((mod) => mod.SizeComparison), {
  ssr: false,
  loading: () => <ComparisonSkeleton />,
});

export function LazyModelViewer({ animal }: { animal: Animal }) {
  return (
    <MountWhenVisible placeholder={<ViewerSkeleton label="Loading 3D viewer…" />}>
      <ModelViewer animal={animal} />
    </MountWhenVisible>
  );
}

export function LazySizeComparison({ animal }: { animal: Animal }) {
  return (
    <MountWhenVisible placeholder={<ComparisonSkeleton />}>
      <SizeComparison animal={animal} />
    </MountWhenVisible>
  );
}
