import "server-only";

import { publicEnv } from "@/lib/env";
import { resolveSiteUrl } from "@/lib/seo";

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

/**
 * The origin this deployment publishes.
 *
 * Everything a crawler resolves — canonical tags, `og:url`, the sitemap, robots
 * and every `@id` in the structured-data graph — is built from this value, and
 * getting it wrong is one of the few SEO mistakes that is worse than having no
 * tags at all: a canonical pointing at another host tells Google not to index
 * this one.
 *
 * So the order is deliberate:
 *
 *   1. `NEXT_PUBLIC_SITE_URL`, the documented setting, wins.
 *   2. Otherwise the platform's own production URL (Vercel, Netlify) — a
 *      deployment that forgot the variable still publishes correct canonicals
 *      instead of `http://localhost:9000` on every page.
 *   3. Only then the local development default.
 */
export const siteUrl = resolveSiteUrl({
  explicit: process.env.NEXT_PUBLIC_SITE_URL,
  platform:
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL ||
    process.env.DEPLOY_PRIME_URL ||
    process.env.URL,
  fallback: publicEnv.siteUrl,
});

/** True when the published origin had to be guessed rather than configured. */
export const siteUrlIsGuessed = !process.env.NEXT_PUBLIC_SITE_URL?.trim() && !process.env.VERCEL_PROJECT_PRODUCTION_URL;

/** Auth exists only when *both* halves of the Clerk key pair are present. */
export const isAuthConfigured = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY,
);

/** Privileged writes (badge/score backfills, moderation) use the service role. */
export const hasServiceRole = serverEnv.supabaseServiceRoleKey.length > 0;

/** Which provider the UI and the server helpers both agree on. */
export { activeAuthProvider } from "@/lib/auth-provider";
