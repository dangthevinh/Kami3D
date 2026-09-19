import { ArrowLeft, ArrowRight, Gamepad2, MapPin, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AdSlot } from "@/components/ads/AdSlot";
import { AnimalCard } from "@/components/animal/AnimalCard";
import { FavoriteButton } from "@/components/animal/FavoriteButton";
import { InfoPanel } from "@/components/animal/InfoPanel";
import { SoundButton } from "@/components/animal/SoundButton";
import { LazyModelViewer, LazySizeComparison } from "@/components/3d/LazyViewers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getAllAnimals, getAnimalBySlug, getRelatedAnimals } from "@/lib/animals";
import { describeLicense, getModelAttribution } from "@/lib/attribution";
import { publicEnv } from "@/lib/env";
import { cn, formatLength, formatWeight } from "@/lib/utils";
import { REGION_ANCHORS, statusToTailwind } from "@/types/animal";

/** Pre-render every species at build time and refresh the data every 5 minutes. */
export const revalidate = 300;

export async function generateStaticParams() {
  const animals = await getAllAnimals();
  return animals.map((animal) => ({ slug: animal.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const animal = await getAnimalBySlug(slug);
  if (!animal) return { title: "Species not found" };

  const title = `${animal.name} in 3D`;
  const description = `${animal.name} (${animal.latin_name}) — ${animal.conservation_status}. ${animal.description}`.slice(0, 300);

  return {
    title,
    description,
    keywords: [animal.name, animal.latin_name, animal.category, animal.region, "3D model", "conservation"],
    alternates: { canonical: `/animal/${animal.slug}` },
    openGraph: {
      type: "article",
      title,
      description,
      url: `${publicEnv.siteUrl}/animal/${animal.slug}`,
      siteName: "Kami3D",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function AnimalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const animal = await getAnimalBySlug(slug);
  if (!animal) notFound();

  const related = await getRelatedAnimals(animal.slug, 4);
  const status = statusToTailwind(animal.conservation_status);
  const anchor = REGION_ANCHORS[animal.region];
  // Credited whenever a real model is in use — the licence may require it.
  const attribution = animal.model_url ? getModelAttribution(animal.slug) : null;

  // Structured data: helps search engines render a rich result for the species.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Taxon",
    name: animal.name,
    alternateName: animal.latin_name,
    description: animal.description,
    url: `${publicEnv.siteUrl}/animal/${animal.slug}`,
    isPartOf: { "@type": "Collection", name: "Kami3D 3D World Wildlife Encyclopedia" },
    conservationStatus: animal.conservation_status,
    taxonRank: "species",
  };

  return (
    <article className="section-shell space-y-8 pt-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-white/45">
        <Link href="/" className="transition-colors hover:text-neon">
          Home
        </Link>
        <span>/</span>
        <Link href="/explore" className="transition-colors hover:text-neon">
          Explore
        </Link>
        <span>/</span>
        <span className="truncate text-white/70">{animal.name}</span>
      </nav>

      <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ring-1",
                status.bg,
                status.text,
                status.ring,
              )}
            >
              <span className={cn("size-1.5 rounded-full", status.dot)} />
              {animal.conservation_status}
            </span>
            <Badge variant="neon">{animal.category}</Badge>
            <Badge variant="iris">{animal.diet}</Badge>
            {animal.is_prehistoric ? (
              <Badge variant="solar">
                <Sparkles className="size-3" />
                Prehistoric
              </Badge>
            ) : null}
          </div>

          <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
            {animal.name}
          </h1>
          <p className="mt-1.5 text-sm italic text-white/50">{animal.latin_name}</p>

          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-white/55">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="size-3.5 text-neon/80" />
              {anchor.label} · {animal.habitat}
            </span>
            <span>{formatLength(animal.length_m)} long</span>
            {animal.height_m > 0 ? <span>{formatLength(animal.height_m)} tall</span> : null}
            <span>{formatWeight(animal.weight_kg)}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <FavoriteButton animalId={animal.id} animalName={animal.name} variant="labelled" />
          <SoundButton soundUrl={animal.sound_url} animalName={animal.name} />
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <div>
            <LazyModelViewer animal={animal} />

            {attribution ? (
              <p className="mt-2 px-1 text-[11px] leading-relaxed text-white/40">
                3D model:{" "}
                <a
                  href={attribution.sourceUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-white/60 underline decoration-white/20 underline-offset-2 transition-colors hover:text-neon"
                >
                  {attribution.title}
                </a>
                {attribution.author ? (
                  <>
                    {" by "}
                    <a
                      href={attribution.authorUrl ?? attribution.sourceUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-white/60 underline decoration-white/20 underline-offset-2 transition-colors hover:text-neon"
                    >
                      {attribution.author}
                    </a>
                  </>
                ) : null}
                {" — "}
                {attribution.licenseUrl ? (
                  <a
                    href={attribution.licenseUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-white/60 underline decoration-white/20 underline-offset-2 transition-colors hover:text-neon"
                  >
                    {describeLicense(attribution.license)}
                  </a>
                ) : (
                  describeLicense(attribution.license)
                )}
                {" via "}
                {attribution.provider}
              </p>
            ) : null}
          </div>

          <section className="glass rounded-[var(--radius-card)] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-base font-semibold text-white">See it at true scale</h2>
                <p className="text-xs text-white/55">
                  {animal.name} rendered beside a human, a blue whale and a T. rex — measurements are exact.
                </p>
              </div>
              <Button asChild variant="secondary" size="sm">
                <Link href="/quiz">
                  <Gamepad2 />
                  Quiz me
                </Link>
              </Button>
            </div>
            <div className="mt-4">
              <LazySizeComparison animal={animal} />
            </div>
          </section>

          <AdSlot format="in-article" note="Placed below the 3D surfaces so it never covers the model." />
        </div>

        <aside className="space-y-5">
          <InfoPanel animal={animal} />
          <AdSlot format="sidebar" note="Sidebar slot — outside every canvas." />
        </aside>
      </div>

      {related.length > 0 ? (
        <section className="pt-4">
          <header className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="font-display text-xl font-bold text-white sm:text-2xl">Related species</h2>
            <Button asChild variant="ghost" size="sm">
              <Link href="/explore">
                <ArrowLeft />
                Back to explore
                <ArrowRight />
              </Link>
            </Button>
          </header>
          <ul className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((item) => (
              <li key={item.id}>
                <AnimalCard animal={item} className="h-full" />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  );
}
