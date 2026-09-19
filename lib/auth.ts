import "server-only";

import { isAuthConfigured } from "@/lib/env.server";
import { getSupabaseUser } from "@/lib/supabase-server";

/**
 * Who is using the app right now.
 *
 * Two providers, in order of preference:
 *
 *   1. **Supabase Auth** — the default, because it needs nothing beyond the
 *      Supabase project the app already talks to for data.
 *   2. **Clerk** — used when Clerk keys are present, so a deployment that
 *      standardised on Clerk keeps working.
 *
 * With neither configured every call resolves to `null` ("anonymous visitor")
 * instead of throwing, which is what keeps Demo Mode working.
 */

export async function getCurrentUserId(): Promise<string | null> {
  const supabaseUser = await getSupabaseUser();
  if (supabaseUser) return supabaseUser.id;

  if (!isAuthConfigured) return null;

  // Loaded lazily so an unconfigured app never evaluates Clerk's key checks.
  const { auth } = await import("@clerk/nextjs/server");
  const { userId } = await auth();
  return userId ?? null;
}

export async function getCurrentUser(): Promise<{ id: string; name: string | null; imageUrl: string | null } | null> {
  const supabaseUser = await getSupabaseUser();
  if (supabaseUser) {
    return { id: supabaseUser.id, name: supabaseUser.email, imageUrl: null };
  }

  if (!isAuthConfigured) return null;

  const { currentUser } = await import("@clerk/nextjs/server");
  const user = await currentUser();
  if (!user) return null;
  return {
    id: user.id,
    name: user.fullName ?? user.username ?? user.primaryEmailAddress?.emailAddress ?? null,
    imageUrl: user.imageUrl ?? null,
  };
}

/** Server-action / route-handler guard. Returns null in Demo Mode. */
export async function requireUserId(): Promise<string | null> {
  return getCurrentUserId();
}
