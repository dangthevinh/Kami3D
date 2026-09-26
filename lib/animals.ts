import "server-only";

import { cache } from "react";

import { ANIMALS } from "@/data/animals";
import { ANIMAL_COLUMNS, TABLES, getSupabase } from "@/lib/supabase";
import {
  CONSERVATION_STATUSES,
  DIET_TYPES,
  REGIONS,
  SILHOUETTE_KINDS,
  TAXONOMIC_CLASSES,
  type Animal,
  type ConservationStatus,
  type DietType,
  type Region,
  type SilhouetteKind,
  type TaxonomicClass,
} from "@/types/animal";

/**
 * Single read path for animal data.
 *
 * Every function talks to Supabase when it is configured and silently falls back
 * to the bundled dataset otherwise (or if the query fails), so pages never crash
 * because of a missing key, an empty table or a network blip.
 */

const pick = <T extends readonly string[]>(allowed: T, value: unknown, fallback: T[number]): T[number] =>
  typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T[number]) : fallback;

function normaliseRow(row: Record<string, unknown>): Animal {
  const accent = Array.isArray(row.accent) && row.accent.length >= 2 ? row.accent : ["#35f0c0", "#0b3d3a"];
  const facts = Array.isArray(row.fun_facts) ? row.fun_facts.filter((f): f is string => typeof f === "string") : [];

  const length_m = Number(row.length_m ?? 1);
  const height_m = Number(row.height_m ?? 0);

  return {
    id: String(row.id),
    slug: String(row.slug),
    name: String(row.name),
    latin_name: String(row.latin_name ?? ""),
    category: pick(TAXONOMIC_CLASSES, row.category, "Mammal") as TaxonomicClass,
    habitat: String(row.habitat ?? "Unknown"),
    region: pick(REGIONS, row.region, "Africa") as Region,
    conservation_status: pick(CONSERVATION_STATUSES, row.conservation_status, "Data Deficient") as ConservationStatus,
    diet: pick(DIET_TYPES, row.diet, "Omnivore") as DietType,
    description: String(row.description ?? ""),
    fun_facts: facts,
    model_url: (row.model_url as string | null) ?? null,
    // Null means "the database has not decided", and the card falls back to the build-time index.
    // Phase 22 sets it when a model is published, so an uploaded model reaches a card without a build.
    preview_eligible: typeof row.preview_eligible === "boolean" ? row.preview_eligible : null,
    image_url: (row.image_url as string | null) ?? null,
    sound_url: (row.sound_url as string | null) ?? null,
    scale_ratio: Number(row.scale_ratio ?? Math.max(length_m, height_m)),
    weight_kg: Number(row.weight_kg ?? 0),
    length_m,
    height_m,
    lifespan_years: String(row.lifespan_years ?? "Unknown"),
    is_prehistoric: Boolean(row.is_prehistoric),
    premium: Boolean(row.premium),
    accent: [String(accent[0]), String(accent[1])] as [string, string],
    emoji: String(row.emoji ?? "🐾"),
    silhouette: pick(SILHOUETTE_KINDS, row.silhouette, "quadruped") as SilhouetteKind,
    popularity: Number(row.popularity ?? 50),
    // Only present when the row came from the database; the bundled dataset has no
    // view counts at all.
    view_count: row.view_count === null || row.view_count === undefined ? undefined : Number(row.view_count),
    created_at: row.created_at ? String(row.created_at) : undefined,
  };
}

async function queryAnimals(): Promise<Animal[]> {
  const supabase = getSupabase();
  if (!supabase) return ANIMALS;

  try {
    const { data, error } = await supabase
      .from(TABLES.animals)
      .select(ANIMAL_COLUMNS)
      .order("popularity", { ascending: false });

    if (error) throw error;
    if (!data || data.length === 0) return ANIMALS;
    return data.map((row) => normaliseRow(row as Record<string, unknown>));
  } catch (error) {
    console.warn("[kami3d] falling back to bundled dataset:", (error as Error).message);
    return ANIMALS;
  }
}

/** Deduped per request by React `cache`. */
export const getAllAnimals = cache(async (): Promise<Animal[]> => {
  const animals = await queryAnimals();
  return [...animals].sort((a, b) => b.popularity - a.popularity);
});

export const getAnimalBySlug = cache(async (slug: string): Promise<Animal | null> => {
  const animals = await getAllAnimals();
  return animals.find((animal) => animal.slug === slug) ?? null;
});

export async function getAnimalsByRegion(region: Region | "All"): Promise<Animal[]> {
  const animals = await getAllAnimals();
  if (region === "All") return animals;
  return animals.filter((animal) => animal.region === region);
}

export async function searchAnimals(term: string): Promise<Animal[]> {
  const needle = term.trim().toLowerCase();
  if (!needle) return getAllAnimals();
  const animals = await getAllAnimals();
  return animals.filter((animal) =>
    [animal.name, animal.latin_name, animal.category, animal.habitat, animal.region, animal.diet]
      .join(" ")
      .toLowerCase()
      .includes(needle),
  );
}

export async function getFeaturedAnimals(limit = 6): Promise<Animal[]> {
  const animals = await getAllAnimals();
  return animals.filter((animal) => !animal.premium).slice(0, limit);
}

/** Prehistoric species are gated behind the Phase-4 reward modal. */
export async function getPremiumAnimals(): Promise<Animal[]> {
  const animals = await getAllAnimals();
  return animals.filter((animal) => animal.premium || animal.is_prehistoric);
}

export async function getRelatedAnimals(slug: string, limit = 4): Promise<Animal[]> {
  const animals = await getAllAnimals();
  const current = animals.find((animal) => animal.slug === slug);
  if (!current) return animals.slice(0, limit);

  return animals
    .filter((animal) => animal.slug !== slug)
    .map((animal) => ({
      animal,
      // Same region beats same class beats same diet.
      score:
        (animal.region === current.region ? 3 : 0) +
        (animal.category === current.category ? 2 : 0) +
        (animal.diet === current.diet ? 1 : 0),
    }))
    .sort((a, b) => b.score - a.score || b.animal.popularity - a.animal.popularity)
    .slice(0, limit)
    .map((entry) => entry.animal);
}

export async function getRegionCounts(): Promise<Record<string, number>> {
  const animals = await getAllAnimals();
  return animals.reduce<Record<string, number>>((acc, animal) => {
    acc[animal.region] = (acc[animal.region] ?? 0) + 1;
    return acc;
  }, {});
}

export async function getStatistics() {
  const animals = await getAllAnimals();
  const threatened = animals.filter((animal) =>
    ["Critically Endangered", "Endangered", "Vulnerable"].includes(animal.conservation_status),
  ).length;

  return {
    species: animals.length,
    threatened,
    regions: new Set(animals.map((animal) => animal.region)).size,
    prehistoric: animals.filter((animal) => animal.is_prehistoric).length,
  };
}
