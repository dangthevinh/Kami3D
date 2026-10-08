import { ArrowRight, Compass, Gamepad2, Headphones, Layers, LayoutGrid, Ruler, ShieldAlert, Sparkles } from "lucide-react";
import Link from "next/link";

import { AdBanner } from "@/components/ads/AdBanner";
import { AnimalCard } from "@/components/animal/AnimalCard";
import { CategoryIcon } from "@/components/catalog/CategoryIcon";
import { HomeGlobe } from "@/components/explore/HomeGlobe";
import { PremiumTeaser } from "@/components/premium/PremiumTeaser";
import { Button } from "@/components/ui/button";
import { getAllAnimals, getPremiumAnimals, getRegionCounts, getStatistics } from "@/lib/animals";
import { getCategorySummaries } from "@/lib/catalog";

export const revalidate = 300;

const FEATURES = [
  {
    icon: Layers,
    title: "Rotate real models",
    body: "Orbit, zoom and pan any entry. Every model in the catalogue is a credited file somebody published — never a drawing — with a wireframe mode and studio lighting you control.",
  },
  {
    icon: Ruler,
    title: "Compare your size",
    body: "Stand an entry next to a human, to scale: a blue whale, a T. rex, a Saturn V or a giant sequoia.",
  },
  {
    icon: Headphones,
    title: "Hear the animals",
    body: "Play a species' call while its model turns. Each recording carries its licence, and a species with none says so rather than playing a stand-in.",
  },
] as const;

export default async function HomePage() {
  const [animals, counts, stats, premiumAnimals, categories] = await Promise.all([
    getAllAnimals(),
    getRegionCounts(),
    getStatistics(),
    getPremiumAnimals(),
    getCategorySummaries(),
  ]);

  const featured = animals.filter((animal) => !animal.premium).slice(0, 8);

  // Counted rather than written down: the home page said "three more subjects are being built" long after
  // Space, Plants and Vehicles had entries, and a hard-coded number is how that happens.
  const subjects = categories.length;
  const subjectsWithEntries = categories.filter((category) => category.count > 0).length;

  const statItems = [
    { label: "Subjects", value: subjects, icon: LayoutGrid },
    { label: "Species modelled", value: stats.species, icon: Compass },
    { label: "Threatened", value: stats.threatened, icon: ShieldAlert },
    { label: "Regions", value: stats.regions, icon: Sparkles },
  ];

  return (
    <div className="space-y-20 pb-10 sm:space-y-24">
      {/* ---------------------------------------------------------------- Hero */}
      <section className="section-shell pt-10 sm:pt-16">
        <div className="grid items-center gap-10 lg:grid-cols-[1.02fr_1fr]">
          <div className="animate-rise">
            <span className="glass inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-neon">
              <Sparkles className="size-3" />
              3D world encyclopedia
            </span>

            <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
              Meet the world
              <span className="block bg-gradient-to-r from-neon via-glow to-iris bg-clip-text text-transparent">
                in three dimensions
              </span>
            </h1>

            {/* The hero says what the whole site holds, not what it started as: animals, space, plants,
                vehicles and the built world all live here, and a visitor who only reads this paragraph
                should still know that. */}
            <p className="mt-5 max-w-xl text-base leading-relaxed text-white/65">
              Kami3D turns the encyclopedia into something you can hold. Spin the globe, then open a
              species, a planet, a plant, a machine or a monument, turn its real model in your hands, and
              check your own size against it — and prove what you learned in the silhouette quiz.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Button asChild size="lg">
                <Link href="/explore">
                  Start exploring
                  <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link href="/quiz">
                  <Gamepad2 />
                  Play the quiz
                </Link>
              </Button>
            </div>

            <dl className="mt-9 grid max-w-lg grid-cols-2 gap-3 sm:grid-cols-4">
              {statItems.map((item) => (
                <div key={item.label} className="glass rounded-2xl px-3.5 py-3">
                  <dt className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-white/45">
                    <item.icon className="size-3 text-neon/80" />
                    {item.label}
                  </dt>
                  <dd className="mt-0.5 font-display text-2xl font-bold tabular-nums text-white">{item.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <HomeGlobe counts={counts} animals={animals} />
        </div>
      </section>

      {/* ------------------------------------------------------------ Feature notes */}
      <section className="section-shell">
        <div className="grid gap-4 sm:grid-cols-3">
          {FEATURES.map((feature) => (
            <article key={feature.title} className="glass rounded-[var(--radius-card)] p-5">
              <span className="grid size-10 place-items-center rounded-xl bg-neon/12 text-neon ring-1 ring-neon/25">
                <feature.icon className="size-5" />
              </span>
              <h2 className="mt-3.5 font-display text-base font-semibold text-white">{feature.title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-white/55">{feature.body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------------- The catalogue */}
      {/* Phase 25: the site holds more than one subject now, and the home page says which ones.
          The counts come from the same reader the category pages use, so a card that says "48
          entries" cannot point at a page holding a different number. */}
      <section className="section-shell">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-bold text-white sm:text-3xl">More than one world</h2>
            <p className="mt-1 text-sm text-white/55">
              Animals came first; Space, Plants, Vehicles, Modern Buildings and Architecture followed —{" "}
              {subjectsWithEntries} subjects of {subjects} hold entries today. Each card says how many it
              holds, and a subject with none says so rather than opening an empty page.
            </p>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/categories">
              All subjects
              <ArrowRight />
            </Link>
          </Button>
        </header>

        <ul className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
          {categories.map((category) => (
            <li key={category.id}>
              <Link
                href={category.href}
                className="group flex h-full flex-col gap-2 rounded-[var(--radius-card)] bg-white/4 p-4 ring-1 ring-white/8 transition-all duration-300 hover:-translate-y-1 hover:bg-white/6"
                style={{ backgroundImage: `linear-gradient(140deg, ${category.accent[0]}1f, transparent 60%)` }}
              >
                <span
                  className="grid size-9 place-items-center rounded-lg ring-1 ring-white/12"
                  style={{ background: `linear-gradient(140deg, ${category.accent[0]}33, ${category.accent[1]}66)` }}
                >
                  <CategoryIcon name={category.icon} className="size-4 text-white/85" />
                </span>
                <span className="font-display text-sm font-semibold text-white">{category.name}</span>
                <span className="text-xs text-white/45">
                  {category.count > 0 ? `${category.count} entries` : "Being built"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* ------------------------------------------------------- Featured species */}
      <section className="section-shell">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-bold text-white sm:text-3xl">Featured species</h2>
            <p className="mt-1 text-sm text-white/55">
              Hover a card on desktop to spin a quick 3D preview. Click through for the full model, its
              measurements, its range and the source behind every figure.
            </p>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/explore">
              View all {stats.species}
              <ArrowRight />
            </Link>
          </Button>
        </header>

        <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {featured.map((animal, index) => (
            <li key={animal.id} className="animate-rise" style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}>
              <AnimalCard animal={animal} className="h-full" />
            </li>
          ))}
        </ul>
      </section>

      <section className="section-shell">
        <AdBanner placement="below-content" note="Ad revenue funds new 3D scans and modeller time." />
      </section>

      {/* ------------------------------------------------------------- Prehistoric */}
      <section className="section-shell">
        <PremiumTeaser premiumAnimals={premiumAnimals} />
      </section>

      {/* -------------------------------------------------------------- Quiz call */}
      <section className="section-shell">
        <AdBanner placement="below-content" note="Kept below the fold of every 3D viewer." />
      </section>

      <section className="section-shell">
        <div className="glass relative overflow-hidden rounded-[var(--radius-card)] px-6 py-10 text-center sm:px-12">
          <div
            className="pointer-events-none absolute inset-0 opacity-50"
            style={{
              backgroundImage:
                "radial-gradient(45% 60% at 20% 0%, rgba(53,240,192,0.25), transparent 70%), radial-gradient(45% 60% at 80% 100%, rgba(56,224,255,0.22), transparent 70%)",
            }}
          />
          <div className="relative mx-auto max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/6 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-white/60 ring-1 ring-white/12">
              <Gamepad2 className="size-3 text-neon" />
              Silhouette quiz
            </span>
            <h2 className="mt-4 font-display text-3xl font-bold text-white sm:text-4xl">
              Can you name the animal from its shadow?
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-white/60">
              Ten rounds of rotating 3D silhouettes, drawn from the species catalogue. Earn badges, save
              your score, and collect them on your profile.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg">
                <Link href="/quiz">
                  Start a round
                  <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/profile">See my badges</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
