import "server-only";

/**
 * Server-only secrets. Importing this module from a client component is a build
 * error thanks to `server-only`, which keeps CLERK_SECRET_KEY and the Supabase
 * service-role key out of the browser bundle.
 */

export const serverEnv = {
  clerkSecretKey: process.env.CLERK_SECRET_KEY ?? "",
  // Supabase is migrating from the legacy service_role JWT to "sb_secret_…" keys.
  // Whichever is present is used, and both are server-only: a secret key under a
  // NEXT_PUBLIC_ name would be shipped to the browser, which is why
  // NEXT_PUBLIC_SUPABASE_SECRET_KEY is deliberately not read here.
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "",
} as const;

/** Auth exists only when *both* halves of the Clerk key pair are present. */
export const isAuthConfigured = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY,
);

/** Privileged writes (badge/score backfills, moderation) use the service role. */
export const hasServiceRole = serverEnv.supabaseServiceRoleKey.length > 0;

/** Which provider the UI and the server helpers both agree on. */
export { activeAuthProvider } from "@/lib/auth-provider";
