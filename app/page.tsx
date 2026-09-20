import { ArrowRight, Compass, Gamepad2, Headphones, Layers, Ruler, ShieldAlert, Sparkles } from "lucide-react";
import Link from "next/link";

import { AdSlot } from "@/components/ads/AdSlot";
import { AnimalCard } from "@/components/animal/AnimalCard";
import { HomeGlobe } from "@/components/explore/HomeGlobe";
import { PremiumTeaser } from "@/components/premium/PremiumTeaser";
import { Button } from "@/components/ui/button";
import { getAllAnimals, getPremiumAnimals, getRegionCounts, getStatistics } from "@/lib/animals";

export const revalidate = 300;

const FEATURES = [
  {
    icon: Layers,
    title: "Rotate real 3D models",
    body: "Orbit, zoom and pan every species — with a wireframe mode and studio lighting you control.",
  },
  {
    icon: Ruler,
    title: "Compare your size",
    body: "Stand any animal next to a human, a blue whale or a T. rex to feel how big it really is.",
  },
  {
    icon: Headphones,
    title: "Listen to the wild",
    body: "Play roars, calls and songs while the model turns, so identification sticks.",
  },
] as const;

export default async function HomePage() {
  const [animals, counts, stats, premiumAnimals] = await Promise.all([
    getAllAnimals(),
    getRegionCounts(),
    getStatistics(),
    getPremiumAnimals(),
  ]);

  const featured = animals.filter((animal) => !animal.premium).slice(0, 8);

  const statItems = [
    { label: "Species modelled", value: stats.species, icon: Compass },
    { label: "Threatened", value: stats.threatened, icon: ShieldAlert },
    { label: "Regions", value: stats.regions, icon: Sparkles },
    { label: "Prehistoric", value: stats.prehistoric, icon: Layers },
  ];

  return (
    <div className="space-y-20 pb-10 sm:space-y-24">
      {/* ---------------------------------------------------------------- Hero */}
      <section className="section-shell pt-10 sm:pt-16">
        <div className="grid items-center gap-10 lg:grid-cols-[1.02fr_1fr]">
          <div className="animate-rise">
            <span className="glass inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-neon">
              <Sparkles className="size-3" />
              3D World Wildlife Encyclopedia
            </span>

            <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
              Meet the animal kingdom
              <span className="block bg-gradient-to-r from-neon via-glow to-iris bg-clip-text text-transparent">
                in three dimensions
              </span>
            </h1>

            <p className="mt-5 max-w-xl text-base leading-relaxed text-white/65">
              Kami3D turns the encyclopedia into something you can hold. Spin a globe, open a species,
              walk around its model, check your own size against it — then prove what you learned in the
              silhouette quiz.
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

      {/* ------------------------------------------------------- Featured species */}
      <section className="section-shell">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-bold text-white sm:text-3xl">Featured species</h2>
            <p className="mt-1 text-sm text-white/55">
              Hover a card on desktop to spin a quick 3D preview — click through for the full model.
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
        <AdSlot format="leaderboard" note="Ad revenue funds new 3D scans and modeller time." />
      </section>

      {/* ------------------------------------------------------------- Prehistoric */}
      <section className="section-shell">
        <PremiumTeaser premiumAnimals={premiumAnimals} />
      </section>

      {/* -------------------------------------------------------------- Quiz call */}
      <section className="section-shell">
        <AdSlot format="in-article" note="In-article slot — kept below the fold of every 3D viewer." />
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
              Ten rounds of rotating 3D silhouettes. Earn badges, save your score, and unlock the
              collector badges on your profile.
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
