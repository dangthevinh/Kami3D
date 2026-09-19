import "server-only";

/**
 * Server-only secrets. Importing this module from a client component is a build
 * error thanks to `server-only`, which keeps CLERK_SECRET_KEY and the Supabase
 * service-role key out of the browser bundle.
 */

export const serverEnv = {
  clerkSecretKey: process.env.CLERK_SECRET_KEY ?? "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
} as const;

/** Auth exists only when *both* halves of the Clerk key pair are present. */
export const isAuthConfigured = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY,
);

/** Privileged writes (badge/score backfills, moderation) use the service role. */
export const hasServiceRole = serverEnv.supabaseServiceRoleKey.length > 0;
