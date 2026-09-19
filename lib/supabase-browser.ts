"use client";

import { createBrowserClient } from "@supabase/ssr";

import { isSupabaseConfigured, publicEnv } from "@/lib/env";

/**
 * Browser Supabase client, backed by cookies so the session is visible to the
 * server as well.
 *
 * `@supabase/ssr` (rather than the plain `createClient`) is what lets a sign-in
 * performed in the browser be read by a Server Component or Route Handler on the
 * very next request, instead of living only in localStorage where the server can
 * never see it.
 */

let cached: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseBrowser() {
  if (!isSupabaseConfigured) return null;
  cached ??= createBrowserClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey);
  return cached;
}

/** True when an email/password account system is usable. */
export const isSupabaseAuthEnabled = isSupabaseConfigured;
