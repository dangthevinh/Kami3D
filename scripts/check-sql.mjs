/**
 * Cross-checks that supabase/schema.sql, supabase/seed.sql and the TypeScript
 * dataset agree with each other.
 *
 * There is no Postgres in CI here, so instead of executing the SQL we parse it
 * (a small top-level-comma splitter is enough for these DDL shapes) and assert the
 * properties a database would have enforced:
 *
 *   - every value the dataset uses is permitted by the CHECK constraints
 *   - the seed insert covers every NOT NULL column that has no default
 *   - every table the app queries actually exists
 *
 * Run with: npm run check:sql
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { ANIMALS } from "../data/animals.ts";
import { MODEL_LICENSES } from "../lib/model-quality.ts";
import {
  ACCENT_COLORS,
  DEFAULT_USER_SETTINGS,
  GLASS_INTENSITIES,
  LANGUAGES,
  MAX_DPRS,
  MEASUREMENT_UNITS,
  QUALITY_PRESETS,
  SETTINGS_COLUMNS,
  THEME_CHOICES,
  VOLUME_RANGE,
  coerceUserSettings,
  settingsToRow,
} from "../lib/user-settings.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const schema = readFileSync(join(root, "supabase", "schema.sql"), "utf8");
const seed = readFileSync(join(root, "supabase", "seed.sql"), "utf8");
const supabaseClient = readFileSync(join(root, "lib", "supabase.ts"), "utf8");

/** Splits a body on commas that sit at parenthesis depth 0. */
function splitTopLevel(body) {
  const parts = [];
  let depth = 0;
  let current = "";
  let inString = false;

  for (let i = 0; i < body.length; i += 1) {
    const char = body[i];
    if (char === "'" && body[i - 1] !== "\\") inString = !inString;

    if (!inString) {
      if (char === "(") depth += 1;
      if (char === ")") depth -= 1;
      if (char === "," && depth === 0) {
        parts.push(current);
        current = "";
        continue;
      }
    }
    current += char;
  }
  if (current.trim()) parts.push(current);
  return parts.map((part) => part.trim()).filter(Boolean);
}

function readTable(name) {
  const start = schema.indexOf(`create table if not exists public.${name} (`);
  assert.ok(start >= 0, `table ${name} is missing from schema.sql`);

  const bodyStart = schema.indexOf("(", start) + 1;
  let depth = 1;
  let index = bodyStart;
  while (index < schema.length && depth > 0) {
    if (schema[index] === "(") depth += 1;
    if (schema[index] === ")") depth -= 1;
    index += 1;
  }

  // Comments would otherwise glue themselves onto the column definition that
  // follows them (there is no comma after a comment line).
  const body = schema
    .slice(bodyStart, index - 1)
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");

  const definitions = splitTopLevel(body);

  const columns = [];
  const checks = new Map();

  for (const definition of definitions) {
    if (/^(constraint|primary key|unique|check|foreign key)\b/i.test(definition)) continue;

    const match = definition.match(/^"?([a-z_][a-z0-9_]*)"?\s+([a-z][a-z0-9_ ]*)/i);
    if (!match) continue;

    columns.push({
      name: match[1],
      definition,
      notNull: /\bnot null\b/i.test(definition),
      hasDefault: /\bdefault\b/i.test(definition),
    });

    // check (column in ('a','b')) — inside either the column or a table constraint.
    const checkMatch = definition.match(/check \(\s*"?([a-z_][a-z0-9_]*)"?\s+in\s*\(([^)]*)\)/i);
    if (checkMatch) {
      checks.set(
        checkMatch[1],
        [...checkMatch[2].matchAll(/'([^']*)'/g)].map((entry) => entry[1]),
      );
    }
  }

  return { columns, checks };
}

const animalsTable = readTable("animals");
const columnNames = new Set(animalsTable.columns.map((column) => column.name));

test("schema defines the three tables the app queries", () => {
  const declared = [...schema.matchAll(/create table if not exists public\.([a-z_]+)/g)].map((match) => match[1]);
  const used = [...supabaseClient.matchAll(/^\s{2}\w+:\s*"([a-z_]+)"/gm)].map((match) => match[1]);

  assert.ok(used.length >= 3, `expected TABLES to declare 3 tables, found ${used.length}`);
  for (const table of used) {
    assert.ok(declared.includes(table), `lib/supabase.ts queries "${table}" but schema.sql does not create it`);
  }
});

test("animals table exposes every field the Animal type needs", () => {
  const REQUIRED = [
    "id", "slug", "name", "latin_name", "category", "habitat", "region", "conservation_status",
    "diet", "description", "fun_facts", "model_url", "image_url", "sound_url", "scale_ratio",
    "weight_kg", "length_m", "height_m", "lifespan_years", "is_prehistoric", "premium", "accent",
    "emoji", "silhouette", "popularity",
  ];

  const missing = REQUIRED.filter((column) => !columnNames.has(column));
  assert.deepEqual(missing, [], `schema is missing columns: ${missing.join(", ")}`);
});

test("every enum value in the dataset is allowed by a CHECK constraint", () => {
  const failures = [];
  const mapped = { category: "category", region: "region", conservation_status: "conservation_status", diet: "diet", silhouette: "silhouette" };

  for (const [field, column] of Object.entries(mapped)) {
    const allowed = animalsTable.checks.get(column);
    assert.ok(allowed?.length, `schema has no CHECK for animals.${column}`);

    for (const animal of ANIMALS) {
      if (!allowed.includes(animal[field])) {
        failures.push(`${animal.slug}: ${field}="${animal[field]}" is not permitted by the constraint`);
      }
    }
  }

  assert.deepEqual(failures, [], failures.slice(0, 8).join(" | "));
});

test("popularity stays inside the constrained range", () => {
  const outOfRange = ANIMALS.filter((animal) => animal.popularity < 1 || animal.popularity > 100).map((a) => a.slug);
  assert.deepEqual(outOfRange, [], `popularity must be 1..100: ${outOfRange.join(", ")}`);
});

test("seed.sql inserts into every NOT NULL column that has no default", () => {
  // Search for the closing paren *after* the insert, not from byte 0 (the file
  // header comment contains brackets of its own).
  const insertStart = seed.indexOf("insert into public.animals (");
  const insertEnd = seed.indexOf(")", insertStart);

  const insertColumns = seed
    .slice(insertStart, insertEnd)
    .split(/[\n,]/)
    .map((token) => token.trim())
    .filter((token) => /^[a-z_][a-z0-9_]*$/.test(token));

  assert.ok(insertColumns.length > 0, "could not read the seed column list");

  for (const column of insertColumns) {
    assert.ok(columnNames.has(column), `seed writes "${column}", which the schema does not define`);
  }

  const required = animalsTable.columns
    .filter((column) => column.notNull && !column.hasDefault && column.name !== "search_vector")
    .map((column) => column.name);

  const missing = required.filter((column) => !insertColumns.includes(column));
  assert.deepEqual(missing, [], `seed omits NOT NULL columns without defaults: ${missing.join(", ")}`);
});

test("seed.sql contains exactly one value tuple per species", () => {
  const valuesStart = seed.indexOf("\nvalues\n") + "\nvalues\n".length;
  const valuesEnd = seed.indexOf("\non conflict");
  const tuples = seed.slice(valuesStart, valuesEnd).match(/^ {2}\(/gm) ?? [];

  assert.equal(tuples.length, ANIMALS.length, "seed tuple count must match the dataset length");
  assert.ok(seed.includes("on conflict (slug) do update"), "seed must be idempotent (upsert on slug)");
});

test("seed escapes apostrophes rather than breaking the statement", () => {
  const valuesStart = seed.indexOf("\nvalues\n");
  const body = seed.slice(valuesStart, seed.indexOf("\non conflict"));
  const oddQuotes = (body.match(/'/g) ?? []).length % 2;

  assert.equal(oddQuotes, 0, "seed contains an unbalanced single quote");
  assert.ok(!/''''/.test(body), "seed contains a suspiciously escaped quote sequence");
});

/* -------------------------------------------------------------------------- */
/* Phase 11 — user_settings                                                   */
/* -------------------------------------------------------------------------- */

const settingsTable = readTable("user_settings");
const settingsColumns = new Map(settingsTable.columns.map((column) => [column.name, column]));

test("user_settings has a column for every preference the app can set", () => {
  const missing = Object.values(SETTINGS_COLUMNS).filter((column) => !settingsColumns.has(column));
  assert.deepEqual(missing, [], `schema is missing settings columns: ${missing.join(", ")}`);
});

test("every settings column is NOT NULL with a default, so a partial insert works", () => {
  const fragile = Object.values(SETTINGS_COLUMNS).filter((column) => {
    const definition = settingsColumns.get(column);
    // A preference the client always sends still needs a default: the row is
    // created by an upsert of whichever group the visitor touched first.
    return !definition || !definition.notNull || !definition.hasDefault;
  });

  assert.deepEqual(fragile, [], `these columns have no default: ${fragile.join(", ")}`);
});

test("the schema's defaults are the model's defaults", () => {
  const mismatches = [];

  for (const [key, column] of Object.entries(SETTINGS_COLUMNS)) {
    const definition = settingsColumns.get(column)?.definition ?? "";
    const match = definition.match(/default\s+('([^']*)'|[a-z0-9.]+)/i);
    const declared = match ? (match[2] ?? match[1]) : null;
    const expected = String(DEFAULT_USER_SETTINGS[key]);

    if (declared !== expected) mismatches.push(`${column}: schema says ${declared}, model says ${expected}`);
  }

  assert.deepEqual(mismatches, [], mismatches.join(" | "));
});

test("every enum preference's CHECK allows exactly the values the model can produce", () => {
  const mapped = {
    theme: THEME_CHOICES,
    accent_color: ACCENT_COLORS,
    glass_intensity: GLASS_INTENSITIES,
    quality_preset: QUALITY_PRESETS,
    language: LANGUAGES,
    measurement_unit: MEASUREMENT_UNITS,
  };

  for (const [column, allowed] of Object.entries(mapped)) {
    const declared = settingsTable.checks.get(column);
    assert.ok(declared?.length, `schema has no CHECK for user_settings.${column}`);
    assert.deepEqual([...declared].sort(), [...allowed].sort(), `user_settings.${column} CHECK drifted from the model`);
  }
});

test("max_dpr and the volumes are constrained to the ranges the model clamps to", () => {
  const dpr = settingsColumns.get("max_dpr")?.definition ?? "";
  const dprValues = (dpr.match(/check\s*\(\s*max_dpr\s+in\s*\(([^)]*)\)/i)?.[1] ?? "")
    .split(",")
    .map((entry) => Number(entry.trim()))
    .filter((entry) => Number.isFinite(entry));
  assert.deepEqual(dprValues, [...MAX_DPRS], "max_dpr CHECK drifted from MAX_DPRS");

  for (const column of ["master_volume", "animal_volume"]) {
    const definition = settingsColumns.get(column)?.definition ?? "";
    const range = definition.match(/check\s*\(\s*\w+\s+between\s+(-?\d+)\s+and\s+(-?\d+)\s*\)/i);
    assert.ok(range, `user_settings.${column} has no range CHECK`);
    assert.equal(Number(range[1]), VOLUME_RANGE.min, `${column} lower bound`);
    assert.equal(Number(range[2]), VOLUME_RANGE.max, `${column} upper bound`);
  }
});

test("a whole settings row the app builds only names real columns", () => {
  const row = settingsToRow(coerceUserSettings({ masterVolume: 5000 }), "user_2abc");
  const unknown = Object.keys(row).filter((column) => column !== "user_id" && !settingsColumns.has(column));

  assert.deepEqual(unknown, [], `the app writes columns the schema does not have: ${unknown.join(", ")}`);
  assert.equal(row.master_volume, VOLUME_RANGE.max);
});

test("user_settings is owner-only for all four verbs, and update re-checks the owner", () => {
  assert.ok(
    /alter table public\.user_settings enable row level security/.test(schema),
    "user_settings must have RLS enabled",
  );

  for (const verb of ["select", "insert", "update", "delete"]) {
    const policy = new RegExp(
      `on public\\.user_settings for ${verb}\\b[\\s\\S]{0,400}?user_id = public\\.current_user_id\\(\\)`,
      "i",
    );
    assert.ok(policy.test(schema), `user_settings has no ${verb} policy restricted to its owner`);
  }

  const update = schema.slice(schema.indexOf("on public.user_settings for update"));
  const body = update.slice(0, update.indexOf(";"));
  assert.ok(/using \(/.test(body) && /with check \(/.test(body), "the update policy needs both USING and WITH CHECK");
});

test("anon cannot read or write user_settings", () => {
  assert.ok(
    /revoke all on public\.user_settings from anon/.test(schema),
    "user_settings must revoke the anon role explicitly",
  );
  assert.ok(!/grant[^;]*on public\.user_settings[^;]*to anon/.test(schema), "anon must not be granted user_settings");
});

test("user_settings reuses the shared updated_at trigger instead of writing its own", () => {
  assert.ok(
    /create trigger user_settings_touch[\s\S]{0,160}execute function public\.set_updated_at\(\)/.test(schema),
    "user_settings must reuse public.set_updated_at()",
  );
});

test("the identity helper every owner policy uses is defined once and granted", () => {
  assert.ok(/create or replace function public\.current_user_id\(\)/.test(schema), "current_user_id() is missing");
  assert.ok(
    /grant execute on function public\.current_user_id\(\) to anon, authenticated/.test(schema),
    "current_user_id() must be executable by authenticated (and anon, which has no rows to see)",
  );
});


/* -------------------------------------------------------------------------- */
/* Phase 12 — model_assets                                                    */
/* -------------------------------------------------------------------------- */

const modelTable = readTable("model_assets");
const modelColumns = new Set(modelTable.columns.map((column) => column.name));
const fetchModelsSource = readFileSync(join(root, "scripts", "fetch-models.mjs"), "utf8");

test("model_assets has every column the pipeline records", () => {
  const required = [
    "id", "animal_id", "provider", "sketchfab_uid", "title", "license", "source_url", "attribution",
    "face_count", "download_count", "like_count", "file_size_bytes", "storage_path", "public_url",
    "quality_score", "is_primary", "downloaded_at", "created_at",
  ];

  const missing = required.filter((column) => !modelColumns.has(column));
  assert.deepEqual(missing, [], `schema is missing model_assets columns: ${missing.join(", ")}`);
});

test("every model_assets column is mentioned by the pipeline that writes it", () => {
  // A column renamed on one side and not the other is a runtime 400 from PostgREST,
  // which is exactly the kind of breakage a check should catch instead of a deploy.
  const written = [
    "animal_id", "provider", "sketchfab_uid", "title", "license", "source_url", "attribution",
    "face_count", "download_count", "like_count", "file_size_bytes", "storage_path", "public_url",
    "quality_score", "is_primary",
  ];

  const missing = written.filter((column) => !fetchModelsSource.includes(column));
  assert.deepEqual(missing, [], `scripts/fetch-models.mjs never names: ${missing.join(", ")}`);
});

test("the licence CHECK allows exactly the values lib/model-quality.ts can produce", () => {
  const declared = modelTable.checks.get("license");
  assert.ok(declared?.length, "model_assets.license has no CHECK");
  assert.deepEqual([...declared].sort(), [...MODEL_LICENSES].sort());
});

test("quality_score is documented as 0-100 and constrained to it", () => {
  const definition = modelTable.columns.find((column) => column.name === "quality_score")?.definition ?? "";
  assert.ok(/not null/i.test(definition), "quality_score must be not null: an unscored model is a bug");
  assert.ok(/>=\s*0/.test(definition) && /<=\s*100/.test(definition), `quality_score range missing: ${definition}`);
  assert.ok(
    /comment on column public\.model_assets\.quality_score is/.test(schema),
    "the 0-100 scale has to be written down, or every reader invents their own",
  );
});

test("no count in model_assets can be negative", () => {
  for (const column of ["face_count", "download_count", "like_count"]) {
    const definition = modelTable.columns.find((entry) => entry.name === column)?.definition ?? "";
    assert.ok(/check \(\s*\w+ is null or \w+ >= 0\s*\)/i.test(definition), `${column} has no non-negative CHECK`);
  }

  const size = modelTable.columns.find((entry) => entry.name === "file_size_bytes")?.definition ?? "";
  assert.ok(/file_size_bytes > 0/i.test(size), "file_size_bytes must be positive when present");
  assert.ok(/bigint/i.test(size), "a 4 GB scan does not fit in an integer");
});

test("a row cannot be de-duplicated twice, and only one model per species is primary", () => {
  assert.ok(
    /constraint model_assets_unique_source unique \(animal_id, source_url\)/.test(schema),
    "re-running the pipeline must update a row, not add one",
  );
  assert.ok(
    /create unique index if not exists model_assets_primary_idx on public\.model_assets \(animal_id\) where is_primary/.test(schema),
    "animals.model_url can only express one primary model per species",
  );
});

test("model credits are public to read and impossible to write from a browser", () => {
  assert.ok(/alter table public\.model_assets enable row level security/.test(schema), "RLS must be on");
  assert.ok(
    /on public\.model_assets for select[\s\S]{0,120}?to anon, authenticated[\s\S]{0,80}?using \(true\)/.test(schema),
    "model_assets must have a public SELECT policy",
  );

  for (const verb of ["insert", "update", "delete"]) {
    assert.ok(
      !new RegExp(`on public\\.model_assets for ${verb}`).test(schema),
      `model_assets must have no ${verb} policy: a browser cannot forge a credit`,
    );
  }

  assert.ok(/grant select on public\.model_assets to anon, authenticated/.test(schema), "anon must be able to read credits");
  assert.ok(!/grant[^;]*insert[^;]*on public\.model_assets/.test(schema), "no write grant on model_assets");
  // Supabase hands every new table in `public` to anon and authenticated by default, so
  // the read grant has to be paired with a revoke or the browser keeps DELETE and UPDATE
  // (RLS still refuses them, but a privilege nobody needs is a privilege nobody audits).
  assert.ok(
    /revoke all on public\.model_assets from anon, authenticated/.test(schema),
    "the platform default grants must be revoked before granting SELECT",
  );
});


test("the owner is an admin by default, and the identity function never raises", () => {
  // Two properties that a deployment depends on and that no runtime check would catch:
  //
  //  1. an admin by *email*. A Clerk id and a Supabase id look nothing alike, so a default written
  //     as an id would be wrong for whichever provider the deployment uses. app_admins.email is
  //     compared against the request's own JWT claim, and one default row ships with the schema so a
  //     fresh deployment has a console instead of an INSERT to look up first.
  //  2. current_user_id() must not raise. Supabase's auth.uid() casts the sub claim to uuid, so a
  //     Clerk session ("user_…") or an unparseable claim made it throw - inside is_admin() and
  //     inside every policy that uses it. A policy that raises fails the query rather than denying
  //     the row. Measured against the real database before the fix: both inputs raised 22P02.
  assert.ok(/alter table public\.app_admins add column if not exists email text/.test(schema), "app_admins can be keyed by email");

  const insert = /insert into public\.app_admins \(user_id, email, note\)[\s\S]*?on conflict \(user_id\) do nothing/.exec(schema);
  assert.ok(insert, "the default admin row ships with the schema");
  assert.ok(insert[0].includes("kaiovinh@gmail.com"), "and it is the project owner's address");

  // The file defines it twice (the P0.1 original, then the guarded replacement) and Postgres keeps
  // the last one, so the test reads the last one too: a schema is a sequence, not a document.
  const start = schema.lastIndexOf("create or replace function public.current_user_id()");
  assert.ok(start > 0, "current_user_id() is defined");
  const identity = [schema.slice(start, schema.indexOf("$$;", start))];
  assert.ok(identity[0].includes("language plpgsql"), "the last definition is plpgsql, so a cast can be guarded");
  assert.ok(!/select \(select auth\.uid\(\)\)::text/.test(identity[0]), "it must not cast auth.uid() unguarded");
  assert.ok(/exception when others then[\s\S]*?sub := null/.test(identity[0]), "an unparseable claim is null, not an error");
  assert.ok(/return \(sub::uuid\)::text/.test(identity[0]), "a uuid sub is still returned as text, exactly as before");

  assert.ok(
    /create or replace function public\.is_admin\(\)[\s\S]*?or \(a\.email is not null and lower\(a\.email\) = public\.current_user_email\(\)\)/.test(schema),
    "is_admin() checks the email as well as the id",
  );
  assert.ok(
    /create or replace function public\.current_user_email\(\)/.test(schema),
    "and the email comes from a function of its own, so a bad claim cannot reach the policy",
  );
});
