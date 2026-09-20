import "server-only";

import { activeAuthProvider } from "@/lib/auth-provider";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getSupabaseServer } from "@/lib/supabase-server";

/**
 * The Supabase client to use for a visitor's own rows — and the choice matters.
 *
 * **Supabase Auth** issues the JWTs the database understands, so personal data
 * goes through the signed-in client and row level security enforces ownership in
 * Postgres itself. Nothing in the application can reach another account's rows.
 *
 * **Clerk** authenticates the visitor, but Supabase never sees a token of its own,
 * so `auth.uid()` is null and every policy denies. The server therefore writes
 * with the service role, and ownership is enforced by the queries themselves —
 * every read and write is filtered by `user_id`, taken from the verified Clerk
 * session. That is a weaker guarantee than RLS: it depends on the application
 * never forgetting the filter, which is exactly why both paths live here, next to
 * each other, rather than being scattered across route handlers.
 *
 * `supabase/schema.sql` keeps the RLS policies either way: with Clerk they are what
 * stops the public anon key from touching personal rows at all.
 */
export async function getPersonalDataClient() {
  return activeAuthProvider() === "clerk" ? getSupabaseAdmin() : getSupabaseServer();
}
