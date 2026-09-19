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
