import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { publicEnv } from "@/lib/env";
import { serverEnv, hasServiceRole } from "@/lib/env.server";

/**
 * Service-role client. Bypasses RLS, so it must never reach the browser — the
 * `server-only` import above turns any accidental client import into a build error.
 *
 * Used by route handlers for writes (favourites, quiz scores) once RLS is locked
 * down, and by scripts/seed.
 */

let cached: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient | null {
  if (!hasServiceRole || !publicEnv.supabaseUrl) return null;
  if (cached) return cached;

  cached = createClient(publicEnv.supabaseUrl, serverEnv.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "x-application-name": "kami3d-admin" } },
  });

  return cached;
}
