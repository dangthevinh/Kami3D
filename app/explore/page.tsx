import type { Metadata } from "next";
import { Compass } from "lucide-react";

import { AdSlot } from "@/components/ads/AdSlot";
import { ExploreExperience } from "@/components/animal/ExploreExperience";
import { getAllAnimals, getRegionCounts, getStatistics } from "@/lib/animals";
import { REGIONS, type Region } from "@/types/animal";

export const metadata: Metadata = {
  title: "Explore species",
  description:
    "Filter the Kami3D encyclopedia by region, class and IUCN conservation status, then open any species in full 3D.",
};

export const revalidate = 300;

/** Only known regions are accepted from the URL, so deep links stay type-safe. */
function parseRegion(value: string | string[] | undefined): Region | "All" {
  const raw = Array.isArray(value) ? value[0] : value;
  return REGIONS.includes(raw as Region) ? (raw as Region) : "All";
}

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ region?: string; q?: string; prehistoric?: string }>;
}) {
  const params = await searchParams;
  const [animals, counts, stats] = await Promise.all([getAllAnimals(), getRegionCounts(), getStatistics()]);

  const region = parseRegion(params.region);

  return (
    <div className="section-shell space-y-6 pt-10">
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
        <ExploreExperience
          animals={animals}
          counts={counts}
          initialRegion={region}
          initialQuery={params.q ?? ""}
          initialPrehistoricOnly={params.prehistoric === "true"}
        />

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
