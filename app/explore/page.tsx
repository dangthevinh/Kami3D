import { Compass } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";

import { AdSlot } from "@/components/ads/AdSlot";
import { ExploreExperience } from "@/components/animal/ExploreExperience";
import { ExploreUrlFilters } from "@/components/animal/ExploreUrlFilters";
import { JsonLd } from "@/components/seo/JsonLd";
import { getAllAnimals, getRegionCounts, getStatistics } from "@/lib/animals";
import { publicEnv } from "@/lib/env";
import { breadcrumbJsonLd, collectionPageJsonLd, graph, speciesItemListJsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Explore every species in 3D",
  description:
    "The full Kami3D catalogue: 24 animals you can filter by region, class and IUCN conservation status, then open in 3D. Spin the globe to narrow the list by continent.",
  alternates: { canonical: "/explore" },
  openGraph: {
    type: "website",
    title: "Explore every species in 3D",
    description:
      "Filter 24 3D animal models by region, class and conservation status — or spin the globe and pick a continent.",
    url: `${publicEnv.siteUrl}/explore`,
    siteName: "Kami3D",
  },
  twitter: { card: "summary_large_image" },
};

/**
 * Static on purpose.
 *
 * The filters arrive as query parameters, but they are applied on the client by
 * `<ExploreUrlFilters />`, so this route is prerendered once with every species
 * in the HTML — the best possible outcome for a crawler, and one less server
 * render per visit.
 */
export const revalidate = 300;

export default async function ExplorePage() {
  const [animals, counts, stats] = await Promise.all([getAllAnimals(), getRegionCounts(), getStatistics()]);

  const jsonLd = graph([
    collectionPageJsonLd(
      publicEnv.siteUrl,
      "Kami3D — 3D World Wildlife Encyclopedia",
      "Every species in the Kami3D catalogue, filterable by region, taxonomic class and IUCN conservation status.",
      animals.length,
    ),
    speciesItemListJsonLd(publicEnv.siteUrl, "Kami3D species", animals),
    breadcrumbJsonLd(publicEnv.siteUrl, [
      { name: "Home", path: "/" },
      { name: "Explore", path: "/explore" },
    ]),
  ]);

  return (
    <div className="section-shell space-y-6 pt-10">
      <JsonLd data={jsonLd} />

      {/* Its own Suspense boundary: see the component's comment — the catalogue
          below must stay part of the prerender. */}
      <Suspense fallback={null}>
        <ExploreUrlFilters />
      </Suspense>

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-white/6 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-white/55 ring-1 ring-white/12">
            <Compass className="size-3 text-neon" />
            Encyclopedia
          </span>
          <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Explore {stats.species} species in 3D
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/55">
            Spin the globe or use the filters below. Every pin is a real region — click it and the
            catalogue narrows instantly.
          </p>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <ExploreExperience animals={animals} counts={counts} />

        <aside className="hidden xl:block">
          <div className="sticky top-24 space-y-4">
            <div className="glass rounded-[var(--radius-card)] p-4">
              <h2 className="font-display text-sm font-semibold uppercase tracking-[0.16em] text-white/50">
                Conservation snapshot
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-white/60">
                <strong className="font-semibold text-white">{stats.threatened}</strong> of {stats.species} species
                here are listed as Vulnerable, Endangered or Critically Endangered.
              </p>
            </div>
            <AdSlot format="sidebar" note="Sidebar slot — pinned beside the grid, never over the 3D viewer." />
          </div>
        </aside>
      </div>
    </div>
  );
}
