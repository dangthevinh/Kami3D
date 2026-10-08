import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CategoryIcon } from "@/components/catalog/CategoryIcon";
import { CategoryNav } from "@/components/catalog/CategoryNav";
import { ItemGrid } from "@/components/catalog/ItemGrid";
import { LandmarkCard } from "@/components/landmark/LandmarkCard";
import { LandmarkGrid } from "@/components/landmark/LandmarkGrid";
import { CATEGORIES } from "@/data/categories";
import { getCategory, getCategoryItems, getCategorySummaries } from "@/lib/catalog";
import { itemPreviewMap } from "@/lib/catalog-preview";
import { previewMap } from "@/lib/landmark-preview";
import { getAllLandmarks, LANDMARK_KIND_LABELS, LANDMARK_KINDS } from "@/lib/landmarks";

/**
 * One subject, its entries, and the rail that says what else there is.
 *
 * `generateStaticParams` comes from the **bundled** list rather than from the database, because a
 * prerendered route has to exist at build time and a category an operator adds later should appear
 * without a rebuild: `dynamicParams` stays on, so an id the build did not know is rendered on demand
 * and 404s only if the table does not know it either.
 *
 * The 3D affordances are hidden for a category with `has_models = false`; nothing in the catalogue
 * uses that today, and it is in the schema because a subject with no viewer (a sound archive, say)
 * should be able to say so without a code change.
 *
 * ## Two grids, and why
 *
 * Architecture and Modern Buildings list **monuments**, and a monument's card mounts its real model on
 * hover. Those two subjects therefore render `LandmarkGrid` - the same cards, the same hover budget and
 * the same credit line the landmark catalogue uses - so a visitor who came in through the catalogue
 * gets the models, not a picture of them.
 *
 * Every other subject gets `ItemGrid`, which is a cheap card on purpose: a grid over 73 species with a
 * WebGL context behind every tile would spend the page's whole budget on hover previews.
 */

export const dynamicParams = true;

export async function generateStaticParams() {
  return CATEGORIES.filter((category) => category.is_public).map((category) => ({ id: category.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const category = await getCategory(id);
  if (!category) return { title: "Catalogue — Kami3D" };

  return {
    title: `${category.name} in 3D — Kami3D`,
    description:
      category.description ??
      `${category.name}: ${category.tagline ?? "a subject in the Kami3D catalogue"}. Every entry has a model this project sourced, licensed and credited.`,
    alternates: { canonical: `/categories/${category.id}` },
  };
}

const NOUNS: Record<string, string> = {
  animals: "species",
  architecture: "monuments",
  buildings: "buildings",
  plants: "plants",
  vehicles: "vehicles",
  space: "objects",
};

/** The subjects whose entries are monuments, and whose cards therefore draw the real model. */
const MONUMENT_SUBJECTS = new Set(["architecture", "buildings"]);

export default async function CategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const category = await getCategory(id);
  if (!category) notFound();

  // One cached read path, so the rail's counts and this page's own count are the same call rather
  // than two computations that could disagree.
  const [items, summaries] = await Promise.all([getCategoryItems(category.id), getCategorySummaries()]);

  const withModel = items.filter((item) => item.has_model).length;

  // The monuments themselves, for the two subjects that draw them. Filtered out of the one catalogue
  // rather than fetched again, because the projection above is exactly these entries.
  const monuments = MONUMENT_SUBJECTS.has(category.id)
    ? (await getAllLandmarks()).filter((landmark) => items.some((item) => item.slug === landmark.slug))
    : [];

  return (
    <div className="section-shell py-8">
      <CategoryNav categories={summaries} active={category.id} />

      <header className="mt-6 max-w-3xl">
        <div className="flex items-center gap-3">
          <span
            className="grid h-10 w-10 place-items-center rounded-xl ring-1 ring-white/12"
            style={{ background: `linear-gradient(140deg, ${category.accent[0]}33, ${category.accent[1]}66)` }}
          >
            <CategoryIcon name={category.icon} className="h-5 w-5 text-white/85" />
          </span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-coral">Catalogue</p>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl">{category.name}</h1>
          </div>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-white/60">
          {items.length === 0
            ? `${category.tagline ?? "This subject"} — nothing here yet. The category exists before its entries do, and this page says so rather than showing an empty grid.`
            : `${withModel} of ${items.length} ${NOUNS[category.id] ?? "entries"} carry a real 3D model you can open, measure and read the credit for.`}
        </p>
        {category.description && items.length > 0 ? (
          <p className="mt-2 text-sm leading-relaxed text-white/50">{category.description}</p>
        ) : null}
      </header>

      <div className="mt-6">
        {!category.has_models ? (
          <p className="rounded-2xl bg-white/4 p-6 text-sm text-white/60 ring-1 ring-white/8">
            This subject has no 3D viewer; its entries are read, not drawn.
          </p>
        ) : monuments.length > 0 ? (
          <>
            <LandmarkGrid
              landmarks={monuments satisfies React.ComponentProps<typeof LandmarkCard>["landmark"][]}
              previewable={previewMap(monuments.map((landmark) => landmark.slug))}
              kinds={LANDMARK_KINDS}
              kindLabels={LANDMARK_KIND_LABELS}
            />
            <p className="mt-5 text-sm text-white/50">
              A monument has one page, whichever subject you found it in.{" "}
              <Link href="/landmarks" className="text-neon underline-offset-4 hover:underline">
                The architecture catalogue
              </Link>{" "}
              lists the whole set with the year, the height and the source behind each figure.
            </p>
          </>
        ) : (
          <ItemGrid
            items={items}
            noun={NOUNS[category.id] ?? "entries"}
            previewable={itemPreviewMap(category.id, items.map((item) => item.slug))}
          />
        )}
      </div>
    </div>
  );
}
