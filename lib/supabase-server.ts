import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";

import { isSupabaseConfigured, publicEnv } from "@/lib/env";

/**
 * Server Supabase client that acts **as the signed-in visitor**.
 *
 * Reads and writes go through row level security rather than a service-role key,
 * so the database itself enforces "a user may only touch their own rows" — the
 * application cannot accidentally leak another account's favourites.
 *
 * `cache` dedupes this per request, which matters because every call to
 * `auth.getUser()` is a round trip to Supabase.
 */
export const getSupabaseServer = cache(async () => {
  if (!isSupabaseConfigured) return null;

  const store = await cookies();

  return createServerClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (toSet) => {
        try {
          for (const { name, value, options } of toSet) {
            store.set(name, value, options);
          }
        } catch {
          // Server Components cannot write cookies. The middleware refreshes the
          // session for them, so this is expected and safe to ignore.
        }
      },
    },
  });
});

export interface SupabaseViewer {
  id: string;
  email: string | null;
}

/** The signed-in account, validated against Supabase (not just decoded). */
export const getSupabaseUser = cache(async (): Promise<SupabaseViewer | null> => {
  const supabase = await getSupabaseServer();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return null;
    return { id: data.user.id, email: data.user.email ?? null };
  } catch {
    // Supabase unreachable: treat as signed out rather than failing the page.
    return null;
  }
});
