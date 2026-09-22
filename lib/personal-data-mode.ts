
/**
 * Which Supabase client a visitor's own rows should go through — the decision, kept pure.
 *
 * This is the last piece of P0.1 that lives in code. The database policies are already in place
 * (`supabase/schema.sql`): every personal table has row level security on, the anonymous key has
 * been revoked, and the owner policies compare against `public.current_user_id()`, which reads
 * `auth.uid()` for Supabase Auth and the JWT `sub` claim for Clerk once Clerk is a Supabase
 * **third-party auth provider**.
 *
 * What is left is the application half: with Clerk, the current code writes with the **service role**,
 * which bypasses RLS entirely — the weakness docs/REVIEW.md calls R1. The fix is a Clerk session
 * token, minted from a JWT template, handed to Supabase as the bearer token, so the policies are the
 * thing enforcing ownership rather than the application remembering a `user_id` filter.
 *
 * That needs one dashboard step (Authentication → Third-Party Auth → Clerk) and one Clerk JWT
 * template. Until both exist the token would be rejected, so this module and its caller fall back to
 * the service role and say so - a deployment must not break because a prerequisite is missing.
 */

/** The Clerk JWT template Supabase should be told to trust. Created in the Clerk dashboard. */
export const CLERK_SUPABASE_TEMPLATE_ENV = "CLERK_SUPABASE_JWT_TEMPLATE";
export const DEFAULT_CLERK_SUPABASE_TEMPLATE = "supabase";

/**
 * The providers this decision knows about.
 *
 * Declared here rather than imported from `lib/auth-provider.ts` so the module stays dependency-free:
 * that file pulls in `lib/env.ts` and its `@/` alias, which a plain `node --test` run cannot resolve -
 * and a pure decision about identity should not need the whole environment to be loadable.
 */
export type IdentityProvider = "supabase" | "clerk" | "none";

export type PersonalDataMode =
  /** Supabase Auth: the signed-in client carries the JWT and RLS enforces ownership. */
  | "supabase-session"
  /** Clerk + third-party auth: the client carries a Clerk token and RLS enforces ownership. */
  | "clerk-token"
  /** Clerk without third-party auth: the service role writes, and the queries filter by user. */
  | "service-role";

/** The configured template name, or null when the deployment has not set one. */
export function clerkSupabaseTemplate(value: string | null | undefined = process.env[CLERK_SUPABASE_TEMPLATE_ENV]): string | null {
  const trimmed = (value ?? "").trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * The mode for a deployment. `null` means "there is no identity here at all" - Demo Mode, where
 * personal data is kept in a cookie instead of a table.
 */
export function personalDataMode(input: { provider: IdentityProvider; template?: string | null }): PersonalDataMode | null {
  if (input.provider === "none") return null;
  if (input.provider === "supabase") return "supabase-session";

  const template = typeof input.template === "undefined" ? clerkSupabaseTemplate() : clerkSupabaseTemplate(input.template);
  return template ? "clerk-token" : "service-role";
}

/** True when RLS is the thing enforcing ownership, rather than the application's own filters. */
export function rlsIsEnforcing(mode: PersonalDataMode | null): boolean {
  return mode === "supabase-session" || mode === "clerk-token";
}
