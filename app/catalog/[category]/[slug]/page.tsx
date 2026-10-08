import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { LazyModelViewer } from "@/components/3d/LazyViewers";
import { CategoryIcon } from "@/components/catalog/CategoryIcon";
import { CategoryNav } from "@/components/catalog/CategoryNav";
import { ItemSpecs } from "@/components/catalog/ItemSpecs";
import { StructurePanel } from "@/components/catalog/StructurePanel";
import { UnlockGate } from "@/components/unlock/UnlockGate";
import { getCatalogCredit } from "@/lib/catalog-attribution";
import { catalogContentId } from "@/lib/unlock";
import { getCategory, getCategoryItems, getCategorySummaries } from "@/lib/catalog";
import type { ViewableModel } from "@/types/viewable";

/**
 * `/catalog/[category]/[slug]` — one entry of space, plants or vehicles.
 *
 * One route for three catalogues, because they share `CatalogEntry`: a page that reads a shape rather
 * than a subject is what lets a fourth catalogue be data. Everything that makes this project's model
 * pages what they are comes from the same places the species and landmark pages get it - the viewer,
 * the floor rule, the credit manifest, the DRACO decoder - and nothing here is a second implementation
 * of any of them.
 *
 * The animals and the landmarks are deliberately **not** served here: they have their own routes with
 * their own fields (conservation status, a range map, an architect), and a second URL for one lion is
 * how a site ends up with two of everything. `itemHref` in `lib/catalog-links.ts` is the one place that
 * decides, and it points each category at the page it really has.
 *
 * The measurements are the catalogue's own. A tree has a height a person can stand next to, so the
 * ruler is drawn; a planet's diameter in kilometres is not a measurement a human figure helps with, so
 * the viewer is given 0 and draws no ruler at all - a wrong line next to a right one is worse than no
 * line.
 */

export const dynamicParams = true;

/** The catalogues this route serves. Anything else 404s, on purpose. */
const SERVED = new Set(["space", "plants", "vehicles"]);

export async function generateStaticParams() {
  const params = [];
  for (const category of SERVED) {
    for (const item of await getCategoryItems(category)) params.push({ category, slug: item.slug });
  }
  return params;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}): Promise<Metadata> {
  const { category, slug } = await params;
  if (!SERVED.has(category)) return { title: "Catalogue — Kami3D" };
  const item = (await getCategoryItems(category)).find((entry) => entry.slug === slug);
  if (!item) return { title: "Catalogue — Kami3D" };

  return {
    title: `${item.name} in 3D — Kami3D`,
    description: item.description ? item.description.slice(0, 155) : undefined,
    alternates: { canonical: `/catalog/${category}/${item.slug}` },
  };
}

/** Metres, or 0 when the catalogue does not record one - the viewer reads 0 as "no ruler". */
function metres(item: { metadata: Record<string, unknown> }, keys: string[]): number {
  for (const key of keys) {
    const value = item.metadata[key];
    if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  }
  return 0;
}

export default async function CatalogItemPage({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}) {
  const { category: categoryId, slug } = await params;
  if (!SERVED.has(categoryId)) notFound();

  const category = await getCategory(categoryId);
  if (!category) notFound();

  const [items, summaries] = await Promise.all([getCategoryItems(categoryId), getCategorySummaries()]);
  const item = items.find((entry) => entry.slug === slug);
  if (!item) notFound();

  const credit = getCatalogCredit(categoryId, item.slug);
  const facts = Array.isArray(item.metadata.facts) ? (item.metadata.facts as string[]) : [];
  const source = typeof item.metadata.source === "string" ? item.metadata.source : null;
  const subtitle = typeof item.metadata.subtitle === "string" ? item.metadata.subtitle : null;

  const subject: ViewableModel = {
    slug: item.slug,
    name: item.name,
    model_url: item.model_url,
    height_m: metres(item, ["height_m", "max_height_m"]),
    length_m: metres(item, ["length_m"]),
  };

  return (
    <div className="section-shell py-8">
      <CategoryNav categories={summaries} active={category.id} />

      <Link
        href={`/categories/${category.id}`}
        className="mt-6 inline-flex items-center gap-2 text-sm text-white/55 transition-colors hover:text-white"
      >
        <ArrowLeft className="size-4" />
        All {category.name.toLowerCase()}
      </Link>

      <header className="mt-4 max-w-3xl">
        <div className="flex items-center gap-3">
          <span
            className="grid size-10 place-items-center rounded-xl ring-1 ring-white/12"
            style={{ background: `linear-gradient(140deg, ${category.accent[0]}33, ${category.accent[1]}66)` }}
          >
            <CategoryIcon name={category.icon} className="size-5 text-white/85" />
          </span>
          <div>
            {subtitle ? (
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-coral">{subtitle}</p>
            ) : null}
            <h1 className="font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl">{item.name}</h1>
          </div>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-white/60">{item.description}</p>
      </header>

      <div className="mt-6">
        {item.model_url ? (
          // Phase 33: an admin can mark a catalogue entry as locked. The gate is a client island so this
          // page stays prerendered; it renders the viewer only once the server says the entry is open.
          <UnlockGate contentId={catalogContentId(categoryId, item.slug)}>
            <LazyModelViewer animal={subject} />
          </UnlockGate>
        ) : (
          <p className="rounded-2xl bg-white/4 p-6 text-sm text-white/60 ring-1 ring-white/8">
            This entry has no 3D model yet. It is listed without one rather than shown with a stand-in.
          </p>
        )}
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_1fr]">
        <section>
          <h2 className="font-display text-lg font-semibold text-white">What is known</h2>
          <ul className="mt-3 space-y-2">
            {facts.map((fact) => (
              <li key={fact} className="flex gap-3 text-sm leading-relaxed text-white/70">
                <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-neon/70" />
                <span>{fact}</span>
              </li>
            ))}
          </ul>
          {source ? <p className="mt-4 text-xs text-white/40">Figures checked against {source}.</p> : null}
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-white">Specifications</h2>
          <ItemSpecs metadata={item.metadata} className="mt-3" />
          <StructurePanel catalogue={categoryId} slug={item.slug} className="mt-6" />
        </section>
      </div>

      {credit ? (
        <section className="mt-8 rounded-2xl bg-white/4 p-5 text-sm ring-1 ring-white/8">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-white/70">Model credit</h2>
          <p className="mt-2 text-white/70">
            {credit.title} by {credit.author} — {credit.license} via {credit.provider}.
          </p>
          {credit.generated ? (
            <p className="mt-2 rounded-xl bg-amber-400/10 px-3 py-2 text-xs text-amber-200/90 ring-1 ring-amber-400/25">
              This model was generated by {credit.generated.provider} from a text description — a reconstruction,
              not a scan or a hand-built model of the real thing.
            </p>
          ) : null}
          <p className="mt-2 flex flex-wrap gap-4 text-xs text-white/45">
            {credit.sourceUrl ? (
              <a href={credit.sourceUrl} rel="noopener noreferrer" target="_blank" className="underline-offset-4 hover:underline">
                Source
              </a>
            ) : null}
            {credit.licenseUrl ? (
              <a href={credit.licenseUrl} rel="noopener noreferrer" target="_blank" className="underline-offset-4 hover:underline">
                Licence
              </a>
            ) : null}
            {credit.faceCount ? <span>{credit.faceCount.toLocaleString("en-GB")} triangles</span> : null}
          </p>
        </section>
      ) : null}
    </div>
  );
}
