import type { Metadata } from "next";
import Link from "next/link";

import { CategoryIcon } from "@/components/catalog/CategoryIcon";
import { ItemCard } from "@/components/catalog/ItemCard";
import { getCategories } from "@/lib/catalog";
import { itemHref, itemSubtitle } from "@/lib/catalog-links";
import { itemPreviewMap } from "@/lib/catalog-preview";
import { previewMap } from "@/lib/landmark-preview";
import { searchCatalogue } from "@/lib/search";

/**
 * `/search?q=` — one box for every catalogue.
 *
 * The page reads the query on the **server**, which makes it the one dynamic content route in the
 * catalogue half of the site: there are as many pages as there are queries and they must not be
 * prerendered into a set of parameterised URLs (the Next.js docs are explicit that search parameters do
 * not generate static routes, and a sitemap of every search nobody has run is noise). Everything it
 * reads is cached per request, so a query costs one pass over the catalogues and no database write.
 *
 * Two behaviours are deliberate:
 *
 *   - **an empty query is a directory, not an error.** A visitor who lands here with nothing typed gets
 *     the six subjects with their counts, which is a better answer than "no results";
 *   - **nothing matched is said plainly**, with the number of subjects searched and the list of them, so
 *     "we do not have that" cannot be confused with "the search is broken".
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Search — Kami3D",
  description: "Search every Kami3D catalogue: species, monuments, buildings, planets, plants and vehicles.",
  robots: { index: false },
};

const WHERE_LABELS: Record<string, string> = {
  name: "name",
  subtitle: "classification",
  fact: "fact",
  description: "description",
};

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();
  const [groups, categories] = await Promise.all([searchCatalogue(query), getCategories()]);

  const total = groups.reduce((sum, group) => sum + group.hits.length, 0);

  return (
    <div className="section-shell py-8">
      <header className="max-w-3xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-coral">Search</p>
        <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          {query ? `Results for “${query}”` : "Every catalogue, one box"}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-white/60">
          {query
            ? total > 0
              ? `${total} match${total === 1 ? "" : "es"} across ${groups.length} of ${categories.length} subjects.`
              : `Nothing matches “${query}”. ${categories.length} subjects were searched — the list below is everything this site holds.`
            : `${categories.length} subjects: species, monuments, modern buildings, planets, plants and vehicles. Type in the box above, or open one below.`}
        </p>
      </header>

      {query && total === 0 ? (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <li key={category.id}>
              <Link
                href={`/categories/${category.id}`}
                className="flex items-center gap-3 rounded-[var(--radius-card)] bg-white/4 p-4 text-sm text-white/80 ring-1 ring-white/8 transition-colors hover:bg-white/6 hover:text-white"
              >
                <CategoryIcon name={category.icon} className="size-4 text-neon" />
                {category.name}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-8 space-y-10">
        {groups.map((group) => {
          const slugs = group.hits.map((hit) => hit.item.slug);
          // Architecture's entries are the landmark catalogue's, so they use its preview index; every
          // other subject uses the index its own pipeline wrote.
          const previewable = group.category.id === "architecture" ? previewMap(slugs) : itemPreviewMap(group.category.id, slugs);

          return (
            <section key={group.category.id}>
              <header className="flex flex-wrap items-end justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span
                    className="grid size-9 place-items-center rounded-lg ring-1 ring-white/12"
                    style={{ background: `linear-gradient(140deg, ${group.category.accent[0]}33, ${group.category.accent[1]}66)` }}
                  >
                    <CategoryIcon name={group.category.icon} className="size-4 text-white/85" />
                  </span>
                  <div>
                    <h2 className="font-display text-lg font-semibold text-white">{group.category.name}</h2>
                    <p className="text-xs text-white/45">
                      {group.hits.length} match{group.hits.length === 1 ? "" : "es"}
                    </p>
                  </div>
                </div>
                <Link
                  href={`/categories/${group.category.id}`}
                  className="text-xs text-white/55 underline-offset-4 hover:text-white hover:underline"
                >
                  Open {group.category.name}
                </Link>
              </header>

              <ul className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {group.hits.map((hit) => (
                  <li key={hit.item.id}>
                    <ItemCard
                      item={hit.item}
                      href={itemHref(hit.item)}
                      subtitle={
                        hit.where === "fact" || hit.where === "description"
                          ? `${WHERE_LABELS[hit.where]}: ${hit.snippet ?? itemSubtitle(hit.item) ?? ""}`
                          : itemSubtitle(hit.item)
                      }
                      previewable={previewable[hit.item.slug] === true}
                      className="h-full"
                    />
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      {!query ? (
        <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <li key={category.id}>
              <Link
                href={`/categories/${category.id}`}
                className="group flex h-full flex-col gap-2 rounded-[var(--radius-card)] bg-white/4 p-5 ring-1 ring-white/8 transition-all duration-300 hover:-translate-y-1 hover:bg-white/6"
                style={{ backgroundImage: `linear-gradient(140deg, ${category.accent[0]}1f, transparent 60%)` }}
              >
                <CategoryIcon name={category.icon} className="size-5 text-white/85" />
                <span className="font-display text-base font-semibold text-white">{category.name}</span>
                {category.tagline ? <span className="text-sm text-white/50">{category.tagline}</span> : null}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
