import type { Metadata } from "next";
import Link from "next/link";

import { CategoryIcon } from "@/components/catalog/CategoryIcon";
import { getCategorySummaries } from "@/lib/catalog";

/**
 * `/categories` - the index over the catalogues.
 *
 * Phase 25 turned one encyclopedia into a site that holds several subjects, and this is the page that
 * says which ones exist. It reads the same `getCategorySummaries()` a category page reads, so the
 * number on a card and the number of cards behind it are the same number rather than two counts that
 * drift apart.
 *
 * The empty ones are shown with a zero and a sentence, not hidden and not padded with filler. Three of
 * the five hold nothing yet; that is the true state of this repository, and a page that pretended
 * otherwise would be the first place a visitor caught it lying.
 */

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Catalogue — Kami3D",
  description:
    "Every subject Kami3D holds in 3D: animals, historic architecture, and the categories being built behind them.",
  alternates: { canonical: "/categories" },
};

export default async function CategoriesPage() {
  const categories = await getCategorySummaries();
  const total = categories.reduce((sum, category) => sum + category.count, 0);
  const ready = categories.filter((category) => category.count > 0);

  return (
    <div className="section-shell py-8">
      <header className="max-w-3xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-coral">Catalogue</p>
        <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          Every subject, in one place
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-white/60">
          {total} entries across {categories.length} subjects, {ready.length} of them with something real in them.
          Each entry is a model this project sourced, licensed and credited, or it is not shown at all.
        </p>
      </header>

      <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => (
          <li key={category.id}>
            <Link
              href={category.href}
              className="group aurora-border flex h-full flex-col gap-3 overflow-hidden rounded-[var(--radius-card)] bg-white/4 p-5 ring-1 ring-white/8 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:bg-white/6"
              style={{ backgroundImage: `linear-gradient(140deg, ${category.accent[0]}1f, transparent 55%)` }}
            >
              <span
                className="grid h-10 w-10 place-items-center rounded-xl ring-1 ring-white/12"
                style={{ background: `linear-gradient(140deg, ${category.accent[0]}33, ${category.accent[1]}66)` }}
              >
                <CategoryIcon name={category.icon} className="h-5 w-5 text-white/85" />
              </span>

              <div>
                <h2 className="font-display text-lg font-semibold text-white">{category.name}</h2>
                {category.tagline ? <p className="text-sm text-white/55">{category.tagline}</p> : null}
              </div>

              {category.description ? (
                <p className="text-sm leading-relaxed text-white/50">{category.description}</p>
              ) : null}

              <p className="mt-auto text-xs font-medium uppercase tracking-wide text-white/40">
                {category.count > 0 ? `${category.count} entries` : "Being built"}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
