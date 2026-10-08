"use client";

import { AlertTriangle } from "lucide-react";

import { MapSkeleton } from "@/components/map/LazyMap";

/**
 * What a product page draws while its sample is on its way, and what it draws when the sample is
 * never coming.
 *
 * The maps were always client-only (`next/dynamic ssr: false`), so this is the same skeleton the
 * renderer already shows while its chunk loads - the page simply starts one step earlier now. The
 * failure branch matters more than the loading one: a sample that cannot be served is a 503 with a
 * sentence in it, and printing that sentence is the difference between a reader knowing the data is
 * missing and a reader assuming the product is broken.
 */
export function SamplePending({ label, loading, error }: { label: string; loading: boolean; error: string | null }) {
  if (error) {
    return (
      <div
        role="alert"
        className="flex items-start gap-3 rounded-2xl border border-amber-400/30 bg-amber-400/5 p-4 text-sm text-amber-100"
      >
        <AlertTriangle aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          {label} could not be loaded, so the map is not drawn. The server said: {error}
        </p>
      </div>
    );
  }

  return (
    <div aria-busy={loading} aria-live="polite">
      <span className="sr-only">Loading {label}…</span>
      <MapSkeleton />
    </div>
  );
}
