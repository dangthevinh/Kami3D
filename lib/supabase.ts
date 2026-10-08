import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { isSupabaseConfigured, publicEnv } from "@/lib/env";

/**
 * Browser/server Supabase client (anon key).
 *
 * Clerk owns identity in Kami3D, so Supabase is used purely as a database and
 * storage layer — session persistence and token refresh are therefore disabled.
 * Returns `null` in Demo Mode, which is what makes the whole app runnable with
 * no environment variables at all.
 */

export const TABLES = {
  animals: "animals",
  // Phase 25: the general catalogue. The animals keep their own table and are projected into
  // `catalog_items` rather than copied into `items` - see supabase/schema.sql.
  categories: "categories",
  items: "items",
  catalogItems: "catalog_items",
  favorites: "user_favorites",
  // Phase 30: a saved catalogue item, keyed by <category>:<slug> - most of the catalogue is not a row
  // in any table. See app/api/saved/route.ts.
  savedItems: "saved_items",
  quizScores: "quiz_scores",
  viewsDaily: "animal_views_daily",
  settings: "user_settings",
} as const;

export const ANIMAL_COLUMNS =
  "id, slug, name, latin_name, category, habitat, region, conservation_status, diet, description, fun_facts, model_url, preview_eligible, image_url, sound_url, scale_ratio, weight_kg, length_m, height_m, lifespan_years, is_prehistoric, premium, accent, emoji, silhouette, popularity, view_count, created_at";

let cached: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (cached) return cached;

  cached = createClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { "x-application-name": "kami3d" } },
    db: { schema: "public" },
  });

  return cached;
}

let uncached: SupabaseClient | null = null;

/**
 * The same client, with Next's data cache switched **off**.
 *
 * It exists because of a bug that took an afternoon to see: the Data2Map registry is read at build
 * time by four static pages, Next caches that GET in `.next/cache/fetch-cache`, and the cache
 * survives between builds. A seed that renamed a layer therefore left the rebuild still serving the
 * old layer list - the page rendered a layer that no longer existed anywhere.
 *
 * Turning the cache off for *every* Supabase read would have been wrong in the other direction: it
 * makes the reader dynamic, and this project prerenders its catalogue on purpose. So the registry
 * gets this client, and the pages that use it declare `dynamic = "force-static"`: one read of a live
 * table per build, and the same static output as before.
 */
export function getSupabaseUncached(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (uncached) return uncached;

  uncached = createClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      headers: { "x-application-name": "kami3d" },
      fetch: (input: RequestInfo | URL, init?: RequestInit) => fetch(input, { ...init, cache: "no-store" }),
    },
    db: { schema: "public" },
  });

  return uncached;
}

/**
 * Supabase is a database here, not a file host.
 *
 * `ASSET_BUCKET` and `publicAssetUrl()` used to live at the end of this file, and every writer
 * imported them. They are gone on purpose rather than re-pointed: a helper named after "the asset
 * bucket" is exactly what would let a fifth call site quietly start writing to Supabase Storage again
 * after the move to R2. Files now go through `lib/r2-storage.ts`, which is the only module that
 * holds object-store credentials.
 */
