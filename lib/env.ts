/**
 * Public (client-safe) environment flags.
 *
 * Kami3D is designed to boot with **zero** configuration: with no keys it runs in
 * Demo Mode against the bundled dataset. Adding keys progressively switches on
 * Clerk auth, Supabase persistence and AdSense.
 */

export const publicEnv = {
  clerkPublishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "",
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  // Supabase is migrating from the legacy anon JWT to "sb_publishable_…" keys.
  // Both are public and interchangeable for the client, so accept either.
  supabaseAnonKey:
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:9000",
  adsenseClient: process.env.NEXT_PUBLIC_ADSENSE_CLIENT ?? "",
  /**
   * Self-hosted by default: the decoder is vendored in `public/draco/` (copied
   * from three) because every model fetched by `npm run models:fetch` is
   * DRACO-compressed. Pointing at the CDN is still possible through the env var
   * if you would rather not ship the ~1.8 MB of decoder files.
   */
  dracoDecoderPath: process.env.NEXT_PUBLIC_DRACO_DECODER_PATH || "/draco/",
} as const;

/** Clerk is only wired up when the publishable key is present in the client bundle. */
export const isClerkEnabled = publicEnv.clerkPublishableKey.length > 0;

/** Supabase reads are only attempted when both public values exist. */
export const isSupabaseConfigured = Boolean(publicEnv.supabaseUrl && publicEnv.supabaseAnonKey);

/** True while the app is driven by the bundled dataset instead of Postgres. */
export const isDemoMode = !isSupabaseConfigured;

export const isAdsEnabled = publicEnv.adsenseClient.length > 0;
