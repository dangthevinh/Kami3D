import "server-only";

import { cache } from "react";

import { isSupabaseConfigured, publicEnv } from "@/lib/env";

/**
 * Which sign-in methods the Supabase project actually offers.
 *
 * Read from Supabase's public settings endpoint rather than hard-coded, so the
 * UI never shows a "Continue with Google" button that cannot work: an OAuth
 * provider has to be configured in two dashboards (Google Cloud and Supabase)
 * before it accepts a single sign-in, and a button that fails silently is worse
 * than no button.
 */

export interface AuthProviders {
  email: boolean;
  google: boolean;
}

const FALLBACK: AuthProviders = { email: true, google: false };

export const getAuthProviders = cache(async (): Promise<AuthProviders> => {
  if (!isSupabaseConfigured) return FALLBACK;

  try {
    const response = await fetch(`${publicEnv.supabaseUrl}/auth/v1/settings`, {
      headers: { apikey: publicEnv.supabaseAnonKey },
      // Cached for five minutes: providers change when a dashboard is edited, not
      // between page views.
      next: { revalidate: 300 },
    });

    if (!response.ok) return FALLBACK;

    const settings = (await response.json()) as { external?: Record<string, boolean> };
    return {
      email: settings.external?.email ?? true,
      google: settings.external?.google === true,
    };
  } catch {
    // Supabase unreachable: keep email/password (it fails with its own message)
    // and hide the provider we cannot confirm.
    return FALLBACK;
  }
});
