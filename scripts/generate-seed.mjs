/**
 * Generates supabase/seed.sql from the bundled dataset.
 *
 * The dataset in `data/animals.ts` is the single source of truth for both Demo
 * Mode and the database, so the seed is generated rather than hand-maintained —
 * the two can never drift apart. Run with: npm run seed:generate
 */

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { ANIMALS } from "../data/animals.ts";

const here = dirname(fileURLToPath(import.meta.url));
const target = join(here, "..", "supabase", "seed.sql");

const COLUMNS = [
  "id",
  "slug",
  "name",
  "latin_name",
  "category",
  "habitat",
  "region",
  "conservation_status",
  "diet",
  "description",
  "fun_facts",
  "model_url",
  "image_url",
  "sound_url",
  "scale_ratio",
  "weight_kg",
  "length_m",
  "height_m",
  "lifespan_years",
  "is_prehistoric",
  "premium",
  "accent",
  "emoji",
  "silhouette",
  "popularity",
];

/** Postgres string literal, safe for apostrophes ("Lion's" -> 'Lion''s'). */
const sqlString = (value) => (value === null || value === undefined ? "null" : `'${String(value).replace(/'/g, "''")}'`);

const sqlTextArray = (values) =>
  values.length === 0 ? "array[]::text[]" : `array[${values.map(sqlString).join(", ")}]::text[]`;

const sqlNumber = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? String(numeric) : "0";
};

const rowValues = (animal) => [
  sqlString(animal.id),
  sqlString(animal.slug),
  sqlString(animal.name),
  sqlString(animal.latin_name),
  sqlString(animal.category),
  sqlString(animal.habitat),
  sqlString(animal.region),
  sqlString(animal.conservation_status),
  sqlString(animal.diet),
  sqlString(animal.description),
  sqlTextArray(animal.fun_facts),
  sqlString(animal.model_url),
  sqlString(animal.image_url),
  sqlString(animal.sound_url),
  sqlNumber(animal.scale_ratio),
  sqlNumber(animal.weight_kg),
  sqlNumber(animal.length_m),
  sqlNumber(animal.height_m),
  sqlString(animal.lifespan_years),
  animal.is_prehistoric ? "true" : "false",
  animal.premium ? "true" : "false",
  sqlTextArray(animal.accent),
  sqlString(animal.emoji),
  sqlString(animal.silhouette),
  sqlNumber(animal.popularity),
];

const rows = ANIMALS.map((animal) => `  (${rowValues(animal).join(", ")})`);

const updates = COLUMNS.filter((column) => column !== "id" && column !== "slug")
  .map((column) => `  ${column} = excluded.${column}`)
  .join(",\n");

const sql = `-- ===========================================================================
-- Kami3D seed data — GENERATED FILE, DO NOT EDIT BY HAND.
--
-- Regenerate with:  npm run seed:generate
-- Source of truth:  data/animals.ts
--
-- Idempotent: re-running updates each species in place (matched on slug), so it is
-- safe to apply repeatedly and safe to run after editing the dataset.
-- ===========================================================================

insert into public.animals (
${COLUMNS.map((column) => `  ${column}`).join(",\n")}
)
values
${rows.join(",\n")}
on conflict (slug) do update set
${updates};

-- Sanity check: should report ${ANIMALS.length}.
-- select count(*) as seeded_species from public.animals;

-- Sanity check: species per region.
-- select region, count(*) from public.animals group by region order by region;
`;

writeFileSync(target, sql, "utf8");
console.log(`wrote ${target} with ${ANIMALS.length} species (${sql.length} bytes)`);
