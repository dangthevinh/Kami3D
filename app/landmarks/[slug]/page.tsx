import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Compass, MapPin, Ruler, UserRound } from "lucide-react";

import { LazyModelViewer } from "@/components/3d/LazyViewers";
import { StructurePanel } from "@/components/catalog/StructurePanel";
import { describeLandmarkLicense, getLandmarkAttribution } from "@/lib/landmark-attribution";
import { getLandmarkBySlug, landmarkSlugs } from "@/lib/landmarks";
import type { ViewableModel } from "@/types/viewable";

/**
 * `/landmarks/[slug]` — one monument, in the same viewer the species use.
 *
 * The model is drawn by `ModelViewer`, which is where the floor rule lives: an anchor measured
 * across the clip the asset plays, a guard that keeps the model above the floor plane, and a stated
 * "no model yet" panel rather than a stand-in. None of that had to be written twice, which is the
 * point of `types/viewable.ts`.
 *
 * The measurements are the catalogue's own: the height is the real height in metres, and the ruler
 * prints it against a human figure. `length_m` is deliberately 0, so the viewer draws no length line
 * for a tower - a wrong number next to a right one is worse than no number.
 */

export const dynamic = "force-static";

export function generateStaticParams() {
  return landmarkSlugs().map((slug) => ({ slug }));
}

/** A year a person reads: "2560 BC" rather than "-2560". */
function formatYear(year: number): string {
  return year < 0 ? Math.abs(year) + " BC" : String(year);
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const landmark = await getLandmarkBySlug(slug);
  if (!landmark) return { title: "Landmark not found — Kami3D" };

  return {
    title: `${landmark.name} in 3D — Kami3D`,
    description: landmark.description.slice(0, 155),
    alternates: { canonical: `/landmarks/${landmark.slug}` },
  };
}

export default async function LandmarkPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const landmark = await getLandmarkBySlug(slug);
  if (!landmark) notFound();

  const attribution = getLandmarkAttribution(landmark.slug);
  const subject: ViewableModel = {
    slug: landmark.slug,
    name: landmark.name,
    model_url: landmark.model_url,
    height_m: landmark.height_m ?? 0,
    // A tower has a height and no length. 0 means "not recorded", and the ruler stays off.
    length_m: 0,
  };

  const facts: Array<{ icon: typeof Ruler; label: string; value: string }> = [
    { icon: CalendarDays, label: "Completed", value: formatYear(landmark.completed) },
    { icon: Ruler, label: "Height", value: landmark.height_m ? landmark.height_m + " m" : "not a single structure" },
    { icon: Compass, label: "Style", value: landmark.style },
    { icon: UserRound, label: "Architect", value: landmark.architect ?? "not recorded" },
  ];

  return (
    <div className="section-shell py-8">
      <Link href="/landmarks" className="inline-flex items-center gap-1.5 text-xs text-white/50 transition-colors hover:text-white">
        <ArrowLeft className="size-3.5" aria-hidden />
        All landmarks
      </Link>

      <header className="mt-4 max-w-3xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-coral">{landmark.style}</p>
        <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl">{landmark.name}</h1>
        <p className="mt-2 flex items-center gap-1.5 text-sm text-white/55">
          <MapPin className="size-4" aria-hidden />
          {landmark.city}, {landmark.country}
        </p>
        <p className="mt-3 text-sm leading-relaxed text-white/70">{landmark.description}</p>
      </header>

      <dl className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {facts.map((fact) => (
          <div key={fact.label} className="rounded-2xl bg-white/4 p-4 ring-1 ring-white/8">
            <dt className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-white/45">
              <fact.icon className="size-3.5" aria-hidden />
              {fact.label}
            </dt>
            <dd className="mt-1 text-sm font-medium text-white/85">{fact.value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-6">
        <LazyModelViewer animal={subject} />
      </div>

      {attribution ? (
        <p className="mt-3 text-[11px] leading-relaxed text-white/45">
          Model:{" "}
          {attribution.authorUrl ? (
            <a href={attribution.authorUrl} target="_blank" rel="noreferrer noopener" className="text-white/70 underline decoration-white/20 underline-offset-2 hover:text-neon">
              {attribution.author}
            </a>
          ) : (
            attribution.author
          )}
          {" — "}
          {attribution.licenseUrl ? (
            <a href={attribution.licenseUrl} target="_blank" rel="noreferrer noopener" className="text-white/70 underline decoration-white/20 underline-offset-2 hover:text-neon">
              {describeLandmarkLicense(attribution.license)}
            </a>
          ) : (
            describeLandmarkLicense(attribution.license)
          )}
          {" via "}
          {attribution.provider}
          {" · "}
          <a href={attribution.sourceUrl} target="_blank" rel="noreferrer noopener" className="underline decoration-white/20 underline-offset-2 hover:text-neon">
            source
          </a>
          {attribution.title && attribution.title !== landmark.name ? <> {" · "} listed as “{attribution.title}”</> : null}
        </p>
      ) : null}

      <section className="mt-8 max-w-3xl">
        <h2 className="font-display text-lg font-semibold text-white">What is worth knowing</h2>
        <ul className="mt-3 space-y-2">
          {landmark.fun_facts.map((fact) => (
            <li key={fact} className="flex gap-2 text-sm leading-relaxed text-white/70">
              <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-coral" />
              {fact}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs leading-relaxed text-white/40">{landmark.purpose}</p>
      </section>

      {/* Phase 29 asked for floor and furniture toggles. Measured across the catalogue, no model has
          the named parts they would need - see lib/model-structure.ts - so the page prints the count. */}
      <StructurePanel catalogue="landmarks" slug={landmark.slug} className="mt-8 max-w-3xl" />
    </div>
  );
}
