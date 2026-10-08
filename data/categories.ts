/**
 * The subjects the catalogue can hold, bundled.
 *
 * This file is the **demo-mode twin** of the seed at the end of the Phase 25 block in
 * `supabase/schema.sql`: the same five rows, the same ids, the same order. Every other catalogue in
 * this project works this way - `data/animals.ts` is what the site reads when Supabase is not
 * configured - and a category list is exactly the kind of data a reader should see on a fresh clone
 * with no `.env.local` at all.
 *
 * Two rows are special and the code that reads this file has to know it:
 *
 *   - **animals** is projected, never copied. Its 73 species live in `data/animals.ts` and in
 *     `public.animals`, and the SQL view `catalog_items` unions them with `items` rather than
 *     duplicating them. `lib/catalog.ts` reads the same catalogue here.
 *   - **architecture** is the same shape of exception: its 47 entries are in `data/landmarks/` and
 *     are read from there, not re-typed as rows. Writing them into `items` as well would give the
 *     site two copies of the Taj Mahal to keep in step, which is the failure this design exists to
 *     avoid.
 *   - **buildings** is the third, and it is the one catalogue that is **half projected and half
 *     harvested**. Its named monuments are the modern subset of the same 48, selected by the rule in
 *     `data/buildings.ts` - a different question about the same catalogue (how it was built rather than
 *     when), so the two subjects share entries, models and detail pages on purpose. Its other half is
 *     `data/buildings-entries.ts`: kinds of structure rather than named monuments, grown by
 *     `scripts/harvest-catalogue-entries.mjs --catalogue=buildings` and served by the shared
 *     `/catalog/buildings/[slug]` page. A curated slug always wins, so the two halves cannot name the
 *     same building.
 *
 * The other three are empty on purpose. A category with no entries is a section being built, and the
 * page says so out loud rather than showing an empty grid.
 */

export interface CatalogCategory {
  id: string;
  name: string;
  tagline: string | null;
  description: string | null;
  /** A lucide icon name, resolved by the component - the database does not know about glyphs either. */
  icon: string | null;
  accent: [string, string];
  sort_order: number;
  is_public: boolean;
  /** False for a catalogue with no 3D viewer, so the UI can hide the model affordances. */
  has_models: boolean;
}

/**
 * Ordered the way the site shows them. `sort_order` is the database's copy of the same decision, and
 * `scripts/check-catalog.mjs` fails if the two lists ever disagree about an id or about this order.
 */
export const CATEGORIES: CatalogCategory[] = [
  {
    id: "animals",
    name: "Animals",
    tagline: "The encyclopedia it started as",
    description:
      "73 species, each with a real 3D model, its measurements, its range and the sources behind every number.",
    icon: "PawPrint",
    accent: ["#35f0c0", "#0b3d3a"],
    sort_order: 10,
    is_public: true,
    has_models: true,
  },
  {
    id: "space",
    name: "Space",
    tagline: "Planets, moons and the machines we sent",
    description: null,
    icon: "Rocket",
    accent: ["#8ab4ff", "#131a3a"],
    sort_order: 20,
    is_public: true,
    has_models: true,
  },
  {
    id: "plants",
    name: "Plants",
    tagline: "Trees, flowers, fungi and their uses",
    description: null,
    icon: "Sprout",
    accent: ["#7ee787", "#0f2a17"],
    sort_order: 30,
    is_public: true,
    has_models: true,
  },
  {
    id: "vehicles",
    name: "Vehicles",
    tagline: "Machines that move people",
    description: null,
    icon: "Car",
    accent: ["#ffb457", "#301a05"],
    sort_order: 40,
    is_public: true,
    has_models: true,
  },
  {
    id: "buildings",
    name: "Modern Buildings",
    tagline: "Skyscrapers, towers and the structures of the machine age",
    description:
      "Two halves of one subject. Eleven named monuments built from 1889 on, in steel, reinforced concrete or suspension - the tallest tower of 1889 and the tallest of 2009, two great steel bridges, an opera house, a mosque and three skyscrapers - each one a monument from the architecture catalogue asked a different question: not when it was built, but how. And a harvested half: kinds of structure rather than named buildings, each with a credited model and a source named on the page.",
    icon: "Building2",
    accent: ["#c9d6e4", "#1b2531"],
    sort_order: 50,
    is_public: true,
    has_models: true,
  },
  {
    id: "architecture",
    name: "Architecture",
    tagline: "Monuments that outlived their builders",
    description:
      "47 historic structures in 30 countries, with the year, the height and the source behind each figure, and a credited CC BY model for 46 of them.",
    icon: "Landmark",
    accent: ["#e9dcc3", "#2b2419"],
    sort_order: 60,
    is_public: true,
    has_models: true,
  },
];

/** The category every page falls back to when an id is not one of the five. */
export const DEFAULT_CATEGORY_ID = "animals";
