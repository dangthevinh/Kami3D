/**
 * Where a catalogue entry leads, and what one line of it says.
 *
 * This file is deliberately **not** `lib/catalog.ts`: that one is `server-only` because it holds the
 * Supabase key path, and a grid that filters on the client cannot import it. So the two derivations
 * that both sides need live here, in a module with no imports at all.
 *
 * The rule the href function exists to keep: **a card never links to a route that would 404.** Two
 * categories have their own pages (`/animal/[slug]` and `/landmarks/[slug]`); anything else an
 * operator adds to `items` links to its category page, which exists by construction, until that
 * category gets a detail route of its own.
 */

/**
 * The route a category is read at.
 *
 * Every subject has its own page under `/categories`, including the two whose catalogues already exist
 * elsewhere: the architecture page shows the 47 monuments **with their models**, drawn by the same
 * viewer and the same cards the landmark catalogue uses. The two are different doors into one
 * catalogue, not two catalogues - the entries themselves are projected from `data/landmarks/` and are
 * never copied, which is the rule this phase runs on.
 *
 * One function, so a change of route is one edit, and so the navigation, the home page strip and the
 * category index cannot disagree about where a subject lives.
 */
export function categoryHref(id: string): string {
  return `/categories/${id}`;
}


export interface ItemLinkInput {
  category_id: string;
  slug: string;
}

export interface ItemSubtitleInput {
  category_id: string;
  latin_name?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * The categories whose entries have a detail page of their own, and where it lives.
 *
 * Two subjects can share one family of detail pages: Architecture and Modern Buildings both list
 * monuments from `data/landmarks/`, and a monument has **one** page, not one per subject it appears in.
 * Everything else links to its category page, which exists by construction.
 */
const DETAIL_PREFIX: Readonly<Record<string, string>> = {
  animals: "/animal",
  architecture: "/landmarks",
  buildings: "/landmarks",
  // The three `CatalogEntry` catalogues share one detail route, which reads the shape rather than the
  // subject. A fourth catalogue needs data, not a page.
  space: "/catalog/space",
  plants: "/catalog/plants",
  vehicles: "/catalog/vehicles",
};

/** The route an entry's card points at. */
export function itemHref(item: ItemLinkInput): string {
  const prefix = DETAIL_PREFIX[item.category_id];
  return prefix ? `${prefix}/${item.slug}` : `/categories/${item.category_id}`;
}

const text = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

/**
 * The one line under a name: what kind of thing it is and where it is from.
 *
 * Read out of `metadata`, which is the field the schema added for exactly this - a planet's type, a
 * monument's country, a species' class. It returns null rather than a stand-in word when the metadata
 * does not say, because "Unknown" under every empty card is noise dressed as information.
 */
export function itemSubtitle(item: ItemSubtitleInput): string | null {
  const metadata = item.metadata ?? {};
  const kind = text(metadata.kind);
  const place = text(metadata.country) ?? text(metadata.region) ?? text(metadata.habitat);

  if (kind && place && kind !== place) return `${kind} · ${place}`;
  return kind ?? place;
}
