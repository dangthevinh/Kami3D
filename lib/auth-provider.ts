import { isClerkEnabled, isSupabaseConfigured } from "@/lib/env";

/**
 * The single decision point for which sign-in system this deployment uses.
 *
 * Both providers can be configured at once — Supabase Auth for data ownership and
 * Clerk for its hosted UI, say — and it matters that exactly ONE of them is
 * authoritative. Before this existed, the navbar and the sign-in pages picked
 * Clerk whenever its keys were present while `lib/auth.ts` preferred Supabase:
 * a visitor would sign in through one system and then find that favourites, which
 * are scoped to `auth.uid()`, belonged to the other. Everything now asks here.
 *
 * `AUTH_PROVIDER` pins the choice explicitly; otherwise Supabase wins when it is
 * configured, because that is the provider whose identity the database policies
 * actually understand.
 */

export type AuthProvider = "supabase" | "clerk" | "none";

export function activeAuthProvider(): AuthProvider {
  const override = (process.env.AUTH_PROVIDER ?? "").trim().toLowerCase();
  if (override === "supabase" || override === "clerk" || override === "none") {
    return override;
  }

  if (isSupabaseConfigured) return "supabase";
  if (isClerkEnabled) return "clerk";
  return "none";
}

/** True when a visitor can create an account or sign in at all. */
export function isSignInAvailable(): boolean {
  return activeAuthProvider() !== "none";
}
