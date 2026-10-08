import "server-only";

import { cache } from "react";

import { CATEGORIES, DEFAULT_CATEGORY_ID, type CatalogCategory } from "@/data/categories";
import type { CatalogEntry } from "@/data/catalog-entry";
import { assetUrl } from "@/lib/r2";
import { PLANT_ENTRIES } from "@/data/plants";
import { SPACE_ENTRIES } from "@/data/space";
import { VEHICLE_ENTRIES } from "@/data/vehicles";
import {
  animalsAsItems,
  entriesAsItems,
  landmarksAsItems,
  modernBuildingsAsItems,
  type CatalogItem,
} from "@/lib/catalog-project";

/**
 * The three catalogues that share `CatalogEntry`, and the array each one exports.
 *
 * Adding a catalogue is one line here plus its data file, its queries file and the entry in the
 * pipeline's registry - which is the whole point of the shape: a subject is data, not a phase.
 */
const ENTRIES: Record<string, { list: readonly CatalogEntry[] }> = {
  space: { list: SPACE_ENTRIES },
  plants: { list: PLANT_ENTRIES },
  vehicles: { list: VEHICLE_ENTRIES },
};
import { categoryHref } from "@/lib/catalog-links";
import { TABLES, getSupabase } from "@/lib/supabase";

/**
 * The single read path for the multi-category catalogue.
 *
 * Phase 25 added two tables and a view; this file is how the app reads them, and it follows the rule
 * `lib/animals.ts` already follows: **talk to Supabase when it is configured, fall back to the
 * bundled data when it is not** (or when the query fails). A page never crashes because a key is
 * missing or a table is empty, and the fallback is not a degraded mode - it is the same catalogue.
 *
 * Two of the five categories are not rows in `items` and never will be: the animals and the historic
 * architecture keep their own catalogues in `data/`, and the projections that turn them into the
 * common shape live in `lib/catalog-project.ts`, which is pure and therefore testable without a
 * database. This file only decides **which** of the two paths a read takes.
 *
 * The pure part is split out on purpose: this module imports `server-only`, so nothing that runs in a
 * browser may import it, while `lib/catalog-project.ts` and `lib/catalog-links.ts` are importable
 * from either side.
 */

export type { CatalogCategory, CatalogItem };
export { animalsAsItems, categoryHref, landmarksAsItems, modernBuildingsAsItems };

/** A category plus the one thing the index page needs and the table does not store: how many entries
 * it holds. Computed, never cached in a column, because a count that can drift is a count that lies. */
export interface CategoryWithCount extends CatalogCategory {
  count: number;
  href: string;
}

export const CATEGORY_COLUMNS =
  "id, name, tagline, description, icon, accent, sort_order, is_public, has_models";

export const ITEM_COLUMNS =
  "id, category_id, slug, name, latin_name, description, model_url, image_url, sound_url, scale_ratio, accent, popularity, metadata";

const asAccent = (value: unknown, fallback: [string, string]): [string, string] =>
  Array.isArray(value) && value.length >= 2 && value.every((part) => typeof part === "string")
    ? [String(value[0]), String(value[1])]
    : fallback;

const asText = (value: unknown): string | null =>
  value === null || value === undefined ? null : String(value);

function normaliseCategory(row: Record<string, unknown>): CatalogCategory {
  const seeded = CATEGORIES.find((category) => category.id === String(row.id));

  return {
    id: String(row.id),
    name: String(row.name ?? row.id),
    tagline: asText(row.tagline),
    description: asText(row.description),
    // The icon and the accent fall back to the bundled row: a column an operator left empty should
    // leave the category looking like the one the site ships, not like a broken card.
    icon: asText(row.icon) ?? seeded?.icon ?? null,
    accent: asAccent(row.accent, seeded?.accent ?? ["#35f0c0", "#0b3d3a"]),
    sort_order: Number(row.sort_order ?? 100),
    is_public: row.is_public === undefined ? true : Boolean(row.is_public),
    has_models: row.has_models === undefined ? true : Boolean(row.has_models),
  };
}

function normaliseItem(row: Record<string, unknown>): CatalogItem {
  // The host is added at the read boundary, so a row that stores "/models/x.glb" and a row that stores
  // an absolute Storage URL both end up correct (lib/r2.ts, rules 2 and 4).
  const model_url = assetUrl(asText(row.model_url));

  return {
    id: String(row.id),
    category_id: String(row.category_id),
    slug: String(row.slug),
    name: String(row.name),
    latin_name: asText(row.latin_name),
    description: asText(row.description),
    model_url,
    image_url: assetUrl(asText(row.image_url)),
    sound_url: assetUrl(asText(row.sound_url)),
    scale_ratio: row.scale_ratio === null || row.scale_ratio === undefined ? null : Number(row.scale_ratio),
    accent: asAccent(row.accent, ["#35f0c0", "#0b3d3a"]),
    popularity: Number(row.popularity ?? 50),
    has_model: Boolean(model_url),
    metadata: (row.metadata as Record<string, unknown> | null) ?? {},
  };
}

/**
 * Every category that is public, in the order the site shows them.
 *
 * The bundled list is the base and the database refines it: a category an operator added appears, one
 * they unpublished disappears, and the two lists cannot disagree about the five that both know because
 * `scripts/check-catalog.mjs` compares them row by row.
 */
export const getCategories = cache(async (): Promise<CatalogCategory[]> => {
  const supabase = getSupabase();
  if (!supabase) return CATEGORIES;

  try {
    const { data, error } = await supabase
      .from(TABLES.categories)
      .select(CATEGORY_COLUMNS)
      .eq("is_public", true)
      .order("sort_order", { ascending: true });

    if (error) throw error;
    if (!data || data.length === 0) return CATEGORIES;
    return data.map((row) => normaliseCategory(row as Record<string, unknown>));
  } catch (error) {
    console.warn("[kami3d] falling back to the bundled categories:", error);
    return CATEGORIES;
  }
});

/** One category by id, or null - the page turns null into a 404 rather than an empty section. */
export const getCategory = cache(async (id: string): Promise<CatalogCategory | null> => {
  const categories = await getCategories();
  return categories.find((category) => category.id === id) ?? null;
});

/**
 * The entries of one category.
 *
 * The branch is explicit rather than generic: a "look in items, then look in data/" helper would make
 * it a puzzle to find out where a row came from, and the two projected catalogues are the whole point
 * of this phase's design.
 */
export const getCategoryItems = cache(async (categoryId: string): Promise<CatalogItem[]> => {
  if (categoryId === "animals") return animalsAsItems();
  if (categoryId === "architecture") return landmarksAsItems();
  if (categoryId === "buildings") return modernBuildingsAsItems();
  if (categoryId in ENTRIES) return entriesAsItems(categoryId, ENTRIES[categoryId].list);

  const supabase = getSupabase();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from(TABLES.items)
      .select(ITEM_COLUMNS)
      .eq("category_id", categoryId)
      .order("popularity", { ascending: false });

    if (error) throw error;
    return (data ?? []).map((row) => normaliseItem(row as Record<string, unknown>));
  } catch (error) {
    console.warn(`[kami3d] falling back to an empty "${categoryId}" category:`, error);
    return [];
  }
});

/**
 * How many entries each category holds, and the link to it.
 *
 * Read through `getCategoryItems`, the same function the pages read, so a count on the index page and
 * the number of cards on the page it links to are the same number by construction rather than by
 * coincidence.
 */
export const getCategorySummaries = cache(async (): Promise<CategoryWithCount[]> => {
  const categories = await getCategories();

  return Promise.all(
    categories.map(async (category) => ({
      ...category,
      count: (await getCategoryItems(category.id)).length,
      href: categoryHref(category.id),
    })),
  );
});

/** The category a route shows when it was given nothing: the first public one. */
export async function getDefaultCategoryId(): Promise<string> {
  const categories = await getCategories();
  return categories[0]?.id ?? DEFAULT_CATEGORY_ID;
}
