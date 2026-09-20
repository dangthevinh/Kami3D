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
  favorites: "user_favorites",
  quizScores: "quiz_scores",
  viewsDaily: "animal_views_daily",
  settings: "user_settings",
} as const;

export const ANIMAL_COLUMNS =
  "id, slug, name, latin_name, category, habitat, region, conservation_status, diet, description, fun_facts, model_url, image_url, sound_url, scale_ratio, weight_kg, length_m, height_m, lifespan_years, is_prehistoric, premium, accent, emoji, silhouette, popularity, view_count, created_at";

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

/** Storage bucket that holds uploaded .glb models and call recordings. */
export const ASSET_BUCKET = "animal-assets";

/** Public URL for a file in the asset bucket (used when seeding `model_url`). */
export function publicAssetUrl(path: string) {
  const client = getSupabase();
  if (!client) return null;
  return client.storage.from(ASSET_BUCKET).getPublicUrl(path).data.publicUrl;
}
