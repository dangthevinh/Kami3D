// Relative with the extension, like every other `lib` module a check suite imports directly: `@/` means
// nothing to plain Node, and this file exists so its projections can be tested without a database.
import { ANIMALS } from "../data/animals.ts";
import { BUILDING_ENTRIES } from "../data/buildings-entries.ts";
import { isModernBuilding } from "../data/buildings.ts";
import type { CatalogEntry } from "../data/catalog-entry.ts";
import { ALL_LANDMARKS } from "../data/landmarks/all.ts";
import type { CatalogCategory } from "../data/categories.ts";
// Same relative-with-extension rule as the imports above: this module is loaded by plain Node in
// scripts/check-catalog.mjs, where "@/…" would mean nothing.
import { assetUrl } from "./r2.ts";

/**
 * The two catalogues that are **projected**, not copied.
 *
 * `animals` and `architecture` already have their own files - 73 species in `data/animals.ts`, 48
 * monuments in `data/landmarks/` - both sourced, checked by their own suites, and read by their own
 * pages. The multi-category catalogue needs them in the same shape as an `items` row so one grid can
 * draw all three, and the wrong way to do that is to write them into `items` as well: that is a second
 * copy of the Taj Mahal, and two copies of 47 monuments is two things to keep in step.
 *
 * So they are projected here, on the read path, exactly as the SQL view `catalog_items` projects the
 * animals for a reader that wants everything in one query.
 *
 * This file is deliberately **not** `lib/catalog.ts`: that one holds the Supabase reads and imports
 * `server-only`. These two functions are pure, which is what lets a suite test them without a database,
 * and what lets the shape they produce be checked against the shape the schema stores.
 */

/** One entry in any catalogue, in the shape every grid and card reads. */
export interface CatalogItem {
  id: string;
  category_id: string;
  slug: string;
  name: string;
  latin_name: string | null;
  description: string | null;
  model_url: string | null;
  image_url: string | null;
  sound_url: string | null;
  scale_ratio: number | null;
  accent: [string, string];
  popularity: number;
  /** True when a file the viewer can draw is attached. A card with a model and a card without one look
   * different on purpose - the second is not a broken version of the first. */
  has_model: boolean;
  metadata: Record<string, unknown>;
}

export type { CatalogCategory };

/**
 * The landmarks as catalogue items.
 *
 * Nothing is invented: every field is copied from `data/landmarks/`, which is the file that records
 * where each number came from, and the fields that only a monument has - the year, the height, the
 * style, the architect, the country - travel in `metadata`, the same way the SQL view carries what is
 * true of an animal and not of a planet.
 *
 * The id is `<category>:<slug>` rather than the landmark's own, because a landmark has no uuid: its
 * identity in this repository is its slug, and the prefix keeps it distinct from an `items` row that
 * happens to share the name.
 */
export function landmarksAsItems(categoryId = "architecture"): CatalogItem[] {
  return ALL_LANDMARKS.map((landmark) => ({
    id: `${categoryId}:${landmark.slug}`,
    category_id: categoryId,
    slug: landmark.slug,
    name: landmark.name,
    latin_name: null,
    description: landmark.description,
    model_url: assetUrl(landmark.model_url),
    image_url: null,
    sound_url: null,
    scale_ratio: landmark.height_m,
    accent: [landmark.accent[0], landmark.accent[1]],
    popularity: landmark.popularity,
    has_model: Boolean(landmark.model_url),
    metadata: {
      kind: landmark.kind,
      city: landmark.city,
      country: landmark.country,
      completed: landmark.completed,
      height_m: landmark.height_m,
      style: landmark.style,
      architect: landmark.architect,
      purpose: landmark.purpose,
      fun_facts: landmark.fun_facts,
    },
  }));
}

/**
 * The buildings subject, in two streams that arrive at one grid.
 *
 * **The curated stream.** The entries of `data/landmarks/` that `data/buildings.ts` says were built
 * with modern engineering, listed as their own subject. One monument can therefore appear in two
 * subjects - the Eiffel Tower is in Architecture and in Buildings - and that is the point rather than a
 * duplication: the readers are asking different questions, and both arrive at the same entry, the same
 * model and the same detail page.
 *
 * **The harvested stream.** `data/buildings-entries.ts`, grown by
 * `scripts/harvest-catalogue-entries.mjs --catalogue=buildings` and filled by the model pipeline. Those
 * entries are *kinds* of structure rather than named monuments, they have their own models under
 * `public/models/buildings/`, and they are served by the shared `/catalog/buildings/[slug]` page.
 *
 * The two are concatenated here rather than written into one file because they are held to different
 * standards and are found in different ways - see the header of `data/buildings-entries.ts`.
 *
 * **A curated slug always wins.** The harvested list is checked against it rather than trusted: a
 * search for "suspension bridge" can return the Golden Gate, and an entry for it here would give the
 * site a second page for one bridge - the failure this whole design exists to avoid. The guard is one
 * line, and `scripts/check-catalog.mjs` asserts the two streams never name the same slug.
 */
export function modernBuildingsAsItems(categoryId = "buildings"): CatalogItem[] {
  const curated = landmarksAsItems("architecture")
    .filter((item) => isModernBuilding(item.slug))
    .map((item) => ({ ...item, id: `${categoryId}:${item.slug}`, category_id: categoryId }));

  const taken = new Set(curated.map((item) => item.slug));
  const harvested = entriesAsItems(categoryId, BUILDING_ENTRIES).filter((item) => !taken.has(item.slug));

  return [...curated, ...harvested];
}

/**
 * A `CatalogEntry` catalogue as catalogue items - the projection space, plants and vehicles all use.
 *
 * These three catalogues are **not** projections of another catalogue the way Architecture is: their
 * data lives in `data/space.ts`, `data/plants.ts` and `data/vehicles.ts` and this is the only shape it
 * is read in. The function is still a projection rather than a second source of truth: it copies the
 * fields a card and a grid need and **invents nothing** - what it does not copy travels in `metadata`,
 * which is where a planet's mass and a plant's family live.
 */
export function entriesAsItems(categoryId: string, entries: readonly CatalogEntry[]): CatalogItem[] {
  return entries.map((entry) => ({
    id: `${categoryId}:${entry.slug}`,
    category_id: categoryId,
    slug: entry.slug,
    name: entry.name,
    latin_name: typeof entry.metadata?.scientific_name === "string" ? entry.metadata.scientific_name : null,
    description: entry.description,
    model_url: assetUrl(entry.model_url),
    image_url: null,
    sound_url: null,
    scale_ratio: typeof entry.metadata?.length_m === "number" ? (entry.metadata.length_m as number) : null,
    accent: [entry.accent[0], entry.accent[1]],
    popularity: entry.popularity,
    has_model: Boolean(entry.model_url),
    metadata: { ...entry.metadata, facts: entry.facts, subtitle: entry.subtitle },
  }));
}

/** The animals as catalogue items, for the same reason and with the same shape. */
export function animalsAsItems(categoryId = "animals"): CatalogItem[] {
  return ANIMALS.map((animal) => ({
    id: `${categoryId}:${animal.slug}`,
    category_id: categoryId,
    slug: animal.slug,
    name: animal.name,
    latin_name: animal.latin_name,
    description: animal.description,
    model_url: assetUrl(animal.model_url),
    image_url: assetUrl(animal.image_url),
    sound_url: assetUrl(animal.sound_url),
    scale_ratio: animal.scale_ratio,
    accent: [animal.accent[0], animal.accent[1]],
    popularity: animal.popularity,
    has_model: Boolean(animal.model_url),
    metadata: {
      kind: animal.category,
      habitat: animal.habitat,
      region: animal.region,
      conservation_status: animal.conservation_status,
      diet: animal.diet,
      weight_kg: animal.weight_kg,
      length_m: animal.length_m,
      height_m: animal.height_m,
      lifespan_years: animal.lifespan_years,
      is_prehistoric: animal.is_prehistoric,
      fun_facts: animal.fun_facts,
    },
  }));
}
