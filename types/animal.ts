/**
 * Kami3D domain model.
 *
 * These types mirror the Supabase schema in `supabase/schema.sql` exactly, so the
 * same objects flow from Postgres -> server components -> client components
 * without a translation layer.
 */

export const CONSERVATION_STATUSES = [
  "Extinct",
  "Extinct in the Wild",
  "Critically Endangered",
  "Endangered",
  "Vulnerable",
  "Near Threatened",
  "Least Concern",
  "Data Deficient",
] as const;
export type ConservationStatus = (typeof CONSERVATION_STATUSES)[number];

/** Short, UI-friendly form of a status ("EN", "VU", ...). */
export const STATUS_ABBR: Record<ConservationStatus, string> = {
  Extinct: "EX",
  "Extinct in the Wild": "EW",
  "Critically Endangered": "CR",
  Endangered: "EN",
  Vulnerable: "VU",
  "Near Threatened": "NT",
  "Least Concern": "LC",
  "Data Deficient": "DD",
};

/** Tailwind classes per status, used by badges and card accents. */
export const STATUS_STYLE: Record<ConservationStatus, { text: string; bg: string; ring: string; dot: string }> = {
  Extinct: { text: "text-slate-300", bg: "bg-slate-500/12", ring: "ring-slate-400/30", dot: "bg-slate-400" },
  "Extinct in the Wild": { text: "text-slate-300", bg: "bg-slate-500/12", ring: "ring-slate-400/30", dot: "bg-slate-400" },
  "Critically Endangered": { text: "text-red-300", bg: "bg-red-500/12", ring: "ring-red-400/35", dot: "bg-red-400" },
  Endangered: { text: "text-orange-300", bg: "bg-orange-500/12", ring: "ring-orange-400/35", dot: "bg-orange-400" },
  Vulnerable: { text: "text-amber-300", bg: "bg-amber-500/12", ring: "ring-amber-400/35", dot: "bg-amber-400" },
  "Near Threatened": { text: "text-lime-300", bg: "bg-lime-500/12", ring: "ring-lime-400/35", dot: "bg-lime-400" },
  "Least Concern": { text: "text-emerald-300", bg: "bg-emerald-500/12", ring: "ring-emerald-400/35", dot: "bg-emerald-400" },
  "Data Deficient": { text: "text-sky-300", bg: "bg-sky-500/12", ring: "ring-sky-400/35", dot: "bg-sky-400" },
};

export const REGIONS = [
  "Africa",
  "Asia",
  "Europe",
  "North America",
  "South America",
  "Oceania",
  "Antarctica",
  "Oceans",
] as const;
export type Region = (typeof REGIONS)[number];

/** Rough lat/lng anchor per region — drives the hotspots on the 3D globe. */
export const REGION_ANCHORS: Record<Region, { lat: number; lng: number; label: string; blurb: string }> = {
  Africa: { lat: 3, lng: 21, label: "Africa", blurb: "Savanna, Congo basin & the Nile" },
  Asia: { lat: 34, lng: 100, label: "Asia", blurb: "Himalaya, rainforest & steppe" },
  Europe: { lat: 50, lng: 14, label: "Europe", blurb: "Boreal forest & alpine peaks" },
  "North America": { lat: 45, lng: -100, label: "North America", blurb: "Arctic tundra to desert" },
  "South America": { lat: -12, lng: -60, label: "South America", blurb: "Amazonia & the Andes" },
  Oceania: { lat: -25, lng: 134, label: "Oceania", blurb: "Outback, reefs & islands" },
  Antarctica: { lat: -78, lng: 0, label: "Antarctica", blurb: "Polar ice & Southern Ocean" },
  Oceans: { lat: -10, lng: -140, label: "Oceans", blurb: "Open water, deep sea & reefs" },
};

export const DIET_TYPES = ["Carnivore", "Herbivore", "Omnivore", "Insectivore", "Piscivore", "Filter Feeder"] as const;
export type DietType = (typeof DIET_TYPES)[number];

export const TAXONOMIC_CLASSES = [
  "Mammal",
  "Bird",
  "Reptile",
  "Amphibian",
  "Fish",
  "Insect",
  "Arachnid",
  "Cephalopod",
] as const;
export type TaxonomicClass = (typeof TAXONOMIC_CLASSES)[number];

/**
 * Which procedural mesh rig to build when a species has no uploaded .glb yet.
 * Every animal therefore renders in 3D from day one, and a real `model_url`
 * transparently takes over once a modeller uploads one.
 */
export const SILHOUETTE_KINDS = [
  "quadruped",
  "biped",
  "theropod",
  "bird",
  "marine",
  "whale",
  "serpent",
  "insect",
] as const;
export type SilhouetteKind = (typeof SILHOUETTE_KINDS)[number];

export interface Animal {
  id: string;
  slug: string;
  name: string;
  latin_name: string;
  category: TaxonomicClass;
  habitat: string;
  region: Region;
  conservation_status: ConservationStatus;
  diet: DietType;
  description: string;
  fun_facts: string[];
  /** Public URL of a DRACO-compressed .glb. `null` -> procedural mesh is used. */
  model_url: string | null;
  image_url: string | null;
  /** Public URL of an .mp3/.ogg call. `null` -> the sound button is disabled. */
  sound_url: string | null;
  /** Real-world size in metres, used verbatim by SizeComparison. */
  scale_ratio: number;
  weight_kg: number;
  length_m: number;
  height_m: number;
  lifespan_years: string;
  /** Locked behind the "watch a short video" reward modal (Phase 4). */
  is_prehistoric: boolean;
  premium: boolean;
  /** Two hex colours driving the card gradient + procedural material. */
  accent: [string, string];
  emoji: string;
  silhouette: SilhouetteKind;
  /** 0-100, drives the "popularity" sort on the home page. */
  popularity: number;
  /**
   * Real page views, counted in the database.
   *
   * Optional because it is runtime data, not catalogue data: the bundled dataset
   * and the SQL seed deliberately do not carry it, so it is `undefined` in Demo
   * Mode and the UI omits the figure rather than showing a fabricated zero.
   */
  view_count?: number;
  created_at?: string;
}

export interface Favorite {
  id: string;
  user_id: string;
  animal_id: string;
  created_at: string;
}

export interface QuizScore {
  id: string;
  user_id: string;
  score: number;
  total_questions: number;
  mode: QuizMode;
  badges_unlocked: string[];
  created_at: string;
}

export const QUIZ_MODES = ["silhouette", "sound"] as const;
export type QuizMode = (typeof QUIZ_MODES)[number];

export interface Badge {
  id: string;
  name: string;
  description: string;
  emoji: string;
  /** Score threshold (as a fraction of the round) that unlocks this badge. */
  threshold: number;
}

export const BADGES: Badge[] = [
  { id: "first-steps", name: "First Steps", description: "Finish your first Kami3D quiz round.", emoji: "🐾", threshold: 0 },
  { id: "sharp-eye", name: "Sharp Eye", description: "Score 50% or more in a single round.", emoji: "👁️", threshold: 0.5 },
  { id: "field-biologist", name: "Field Biologist", description: "Score 80% or more in a single round.", emoji: "🔬", threshold: 0.8 },
  { id: "perfect-specimen", name: "Perfect Specimen", description: "Get a flawless 100% round.", emoji: "🏆", threshold: 1 },
];

export function statusToTailwind(status: ConservationStatus) {
  return STATUS_STYLE[status] ?? STATUS_STYLE["Data Deficient"];
}
