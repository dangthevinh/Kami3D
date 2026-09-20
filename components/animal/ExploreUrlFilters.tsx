"use client";

import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";

import { useExploreStore } from "@/lib/store";
import { REGIONS, type Region } from "@/types/animal";

/**
 * Deep links into the catalogue: `/explore?region=Africa&q=tiger&prehistoric=true`.
 *
 * This is a component of its own, wrapped in its own `<Suspense>`, for one
 * reason: `useSearchParams()` makes the client tree *up to the nearest Suspense
 * boundary* render on the client, and if that boundary were around the catalogue
 * itself the species grid — 24 internal links a crawler should follow — would
 * disappear from the prerendered HTML. Boundary here, nothing to lose: this
 * component renders nothing at all.
 *
 * The filters themselves are applied to the shared store after hydration, once
 * per distinct query string, so later interaction with the filter bar is never
 * overwritten.
 *
 * This component is also the **only** writer of the other direction. The globe and
 * the filter bar just set the store; a single effect mirrors the region back into
 * the address bar. Letting each control write the URL itself produced two
 * `router.replace` calls racing for the same history entry, and one of them lost:
 * the address bar kept a region the visitor had just cleared.
 */
export function ExploreUrlFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const region = useExploreStore((state) => state.region);
  const setRegion = useExploreStore((state) => state.setRegion);
  const setQuery = useExploreStore((state) => state.setQuery);
  const setShowPrehistoric = useExploreStore((state) => state.setShowPrehistoric);
  const setPrehistoricOnly = useExploreStore((state) => state.setPrehistoricOnly);
  const applied = React.useRef<string | null>(null);

  React.useEffect(() => {
    const key = searchParams.toString();
    if (applied.current === key) return;
    applied.current = key;

    const region = searchParams.get("region");
    if (region && (REGIONS as readonly string[]).includes(region)) setRegion(region as Region);

    const query = searchParams.get("q");
    if (query) setQuery(query);

    // `prehistoric=true` means "only prehistoric species" — the footer links to
    // exactly that, and before this it silently showed the whole catalogue.
    if (searchParams.get("prehistoric") === "true") {
      setShowPrehistoric(true);
      setPrehistoricOnly(true);
    }
  }, [searchParams, setPrehistoricOnly, setQuery, setRegion, setShowPrehistoric]);

  // Store → URL. Skipped until the deep link above has been applied, so a
  // pre-filtered entry never gets rewritten to the default view on mount.
  React.useEffect(() => {
    if (applied.current === null) return;

    const wanted = region === "All" ? null : region;
    const current = searchParams.get("region");
    if (current === wanted) return;

    router.replace(wanted ? `/explore?region=${encodeURIComponent(wanted)}` : "/explore", { scroll: false });
  }, [region, router, searchParams]);

  return null;
}
