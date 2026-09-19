#!/usr/bin/env node
/**
 * Pushes the catalogue into Supabase without anyone opening the SQL editor.
 *
 *   npm run db:status     # what is in the database right now
 *   npm run db:seed       # create/update the 24 species (idempotent)
 *
 * Two ways in, auto-detected, because they need different credentials:
 *
 *   1. SUPABASE_ACCESS_TOKEN (a personal access token, "sbp_…") — runs
 *      `supabase/seed.sql` verbatim through the Management API. Closest to what
 *      you would paste into the SQL editor, and it can also run schema.sql.
 *   2. SUPABASE_SERVICE_ROLE_KEY — inserts through PostgREST with the
 *      `Prefer: resolution=merge-duplicates` upsert, so re-running is safe.
 *
 * Both live in .env.local, which is gitignored: no credential ever reaches the
 * repository, and the anon key cannot do this by design (it has no INSERT grant on
 * `animals`, and RLS denies it on personal tables).
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { ANIMALS } from "../data/animals.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/* -------------------------------------------------------------------------- */
/* Environment                                                                */
/* -------------------------------------------------------------------------- */

function loadEnvFiles() {
  for (const name of [".env.local", ".env"]) {
    const file = join(ROOT, name);
    if (!existsSync(file)) continue;

    for (const line of readFileSync(file, "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const separator = trimmed.indexOf("=");
      if (separator === -1) continue;

      const key = trimmed.slice(0, separator).trim();
      let value = trimmed.slice(separator + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = value;
    }
  }
}

loadEnvFiles();

const projectUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const accessToken = process.env.SUPABASE_ACCESS_TOKEN ?? "";

const projectRef = projectUrl.match(/^https:\/\/([a-z0-9]+)\.supabase\.co$/)?.[1] ?? null;

const flags = new Set(process.argv.slice(2));
const statusOnly = flags.has("--status");
const dryRun = flags.has("--dry-run");

/* -------------------------------------------------------------------------- */
/* Row shape                                                                  */
/* -------------------------------------------------------------------------- */

/** Mirrors the column list in supabase/schema.sql and the generated seed. */
function toRow(animal) {
  return {
    id: animal.id,
    slug: animal.slug,
    name: animal.name,
    latin_name: animal.latin_name,
    category: animal.category,
    habitat: animal.habitat,
    region: animal.region,
    conservation_status: animal.conservation_status,
    diet: animal.diet,
    description: animal.description,
    fun_facts: animal.fun_facts,
    model_url: animal.model_url,
    image_url: animal.image_url,
    sound_url: animal.sound_url,
    scale_ratio: animal.scale_ratio,
    weight_kg: animal.weight_kg,
    length_m: animal.length_m,
    height_m: animal.height_m,
    lifespan_years: animal.lifespan_years,
    is_prehistoric: animal.is_prehistoric,
    premium: animal.premium,
    accent: animal.accent,
    emoji: animal.emoji,
    silhouette: animal.silhouette,
    popularity: animal.popularity,
  };
}

/* -------------------------------------------------------------------------- */
/* Commands                                                                   */
/* -------------------------------------------------------------------------- */

async function reportStatus() {
  if (!projectUrl || !anonKey) {
    console.error("NEXT_PUBLIC_SUPABASE_URL and a public key are required to read the database.");
    return 2;
  }

  const response = await fetch(`${projectUrl}/rest/v1/animals?select=slug,region,premium`, {
    headers: { apikey: anonKey },
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    const body = await response.text();
    if (body.includes("PGRST205") || response.status === 404) {
      console.log("The animals table does not exist yet — run supabase/schema.sql first.");
      return 1;
    }
    console.error(`Could not read the catalogue: ${response.status} ${body.slice(0, 200)}`);
    return 1;
  }

  const rows = await response.json();
  console.log(`Database holds ${rows.length} of ${ANIMALS.length} species.`);

  if (rows.length === 0) {
    console.log("Nothing seeded yet. Favourites will be rejected by the foreign key until this is fixed.");
    console.log("Run: npm run db:seed");
  } else {
    const byRegion = rows.reduce((acc, row) => ({ ...acc, [row.region]: (acc[row.region] ?? 0) + 1 }), {});
    console.log("By region:", byRegion);
  }
  return rows.length === ANIMALS.length ? 0 : 1;
}

/** Path 1: run the generated SQL through the Management API. */
async function seedViaManagementApi() {
  const sql = readFileSync(join(ROOT, "supabase", "seed.sql"), "utf8");

  if (dryRun) {
    console.log(`Would POST ${sql.length} bytes of SQL to the Management API for project ${projectRef}.`);
    return 0;
  }

  const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: "POST",
    headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
    body: JSON.stringify({ query: sql }),
    signal: AbortSignal.timeout(120_000),
  });

  const body = await response.text();
  if (!response.ok) {
    console.error(`Management API refused the query (${response.status}): ${body.slice(0, 300)}`);
    return 1;
  }

  console.log("Ran supabase/seed.sql through the Management API.");
  return 0;
}

/** Path 2: upsert through PostgREST with the service role. */
async function seedViaRest() {
  const rows = ANIMALS.map(toRow);

  if (dryRun) {
    console.log(`Would upsert ${rows.length} species through PostgREST.`);
    return 0;
  }

  const response = await fetch(`${projectUrl}/rest/v1/animals?on_conflict=slug`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      authorization: `Bearer ${serviceKey}`,
      "content-type": "application/json",
      // Idempotent: matched on slug, existing rows are updated in place.
      prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(rows),
    signal: AbortSignal.timeout(120_000),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error(`Upsert failed (${response.status}): ${body.slice(0, 400)}`);
    if (body.includes("PGRST205")) console.error("The animals table does not exist — run supabase/schema.sql first.");
    return 1;
  }

  console.log(`Upserted ${rows.length} species through PostgREST.`);
  return 0;
}

/* -------------------------------------------------------------------------- */

if (statusOnly) {
  process.exit(await reportStatus());
}

if (!projectRef) {
  console.error("NEXT_PUBLIC_SUPABASE_URL is missing or is not a *.supabase.co URL.");
  process.exit(2);
}

if (accessToken) {
  console.log("Using SUPABASE_ACCESS_TOKEN (Management API).");
  process.exit(await seedViaManagementApi());
}

if (serviceKey) {
  console.log("Using SUPABASE_SERVICE_ROLE_KEY (PostgREST).");
  process.exit(await seedViaRest());
}

console.error(`No credential that can write to Supabase was found.

The anon key cannot seed: it has no INSERT grant on "animals", and row level
security denies it on personal tables. Add ONE of these to .env.local:

  # Option A — personal access token, runs supabase/seed.sql verbatim
  # https://supabase.com/dashboard/account/tokens
  SUPABASE_ACCESS_TOKEN=sbp_...

  # Option B — project service role key, upserts through the REST API
  # https://supabase.com/dashboard/project/${projectRef}/settings/api
  SUPABASE_SERVICE_ROLE_KEY=...

Both files are gitignored (.env*.local), so neither is ever committed.
`);
process.exit(2);
