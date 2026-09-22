import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { activeAuthProvider } from "@/lib/auth-provider";
import { publicEnv } from "@/lib/env";
import { serverEnv } from "@/lib/env.server";
import { SESSION_TOKEN_MARKER, clerkSupabaseTemplate, personalDataMode, templateKind } from "@/lib/personal-data-mode";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getSupabaseServer } from "@/lib/supabase-server";

/**
 * The Supabase client to use for a visitor's own rows — and the choice matters.
 *
 * Three cases, decided by `lib/personal-data-mode.ts`:
 *
 *   1. **Supabase Auth** issues the JWTs the database understands, so personal data goes through the
 *      signed-in client and row level security enforces ownership in Postgres itself;
 *   2. **Clerk with third-party auth** (`CLERK_SUPABASE_JWT_TEMPLATE` set, Clerk registered as a
 *      Supabase third-party auth provider): the client carries a Clerk session token as its bearer
 *      token, Supabase validates it, and the same policies enforce ownership. This is the case P0.1
 *      exists to reach — RLS doing the work instead of the application;
 *   3. **Clerk without it**: Supabase never sees a Clerk token, `auth.uid()` is null and every policy
 *      denies, so the server writes with the service role and ownership is enforced by the queries —
 *      every read and write filtered by `user_id` from the verified Clerk session. That is a weaker
 *      guarantee, which is why the first two cases exist and why the fallback announces itself.
 *
 * `supabase/schema.sql` keeps the RLS policies in every case: they are what stops the public anon key
 * from touching personal rows at all.
 */
export async function getPersonalDataClient(): Promise<SupabaseClient | null> {
  const mode = personalDataMode({ provider: activeAuthProvider() });

  if (mode === "supabase-session") return getSupabaseServer();
  if (mode === "clerk-token") return (await getClerkTokenClient()) ?? getSupabaseAdmin();
  if (mode === "service-role") return getSupabaseAdmin();

  return null;
}

/**
 * A Supabase client that speaks for the Clerk user rather than for the service.
 *
 * `accessToken` is called by supabase-js per request, so the token is minted from the current session
 * and never cached across requests. A token that cannot be minted (template renamed, provider not yet
 * enabled in Supabase) returns null, the request is denied by RLS, and the caller falls back — which
 * is the safe direction: a missing token must never silently become the service role inside this
 * client.
 */
/** Template-id lookups are per process: a name does not change while the server is running. */
const templateNames = new Map<string, string>();

/** `jtmp_…` to its name, through the Clerk Backend API, or null when it cannot be asked. */
async function resolveTemplateName(id: string): Promise<string | null> {
  const cached = templateNames.get(id);
  if (cached) return cached;
  if (!serverEnv.clerkSecretKey) return null;

  try {
    const response = await fetch("https://api.clerk.com/v1/jwt_templates", {
      headers: { authorization: "Bearer " + serverEnv.clerkSecretKey },
      cache: "no-store",
    });
    if (!response.ok) return null;

    const templates = (await response.json()) as { id?: string; name?: string }[];
    const match = templates.find((entry) => entry.id === id && typeof entry.name === "string");
    if (!match?.name) return null;

    templateNames.set(id, match.name);
    return match.name;
  } catch {
    return null;
  }
}

async function getClerkTokenClient(): Promise<SupabaseClient | null> {
  const template = clerkSupabaseTemplate();
  if (!template || !publicEnv.supabaseUrl || !publicEnv.supabaseAnonKey) return null;

  // A template id is not a name, and getToken() wants the name.
  const resolved = templateKind(template) === "id" ? ((await resolveTemplateName(template)) ?? template) : template;

  const { auth } = await import("@clerk/nextjs/server");

  return createClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: { "x-application-name": "kami3d-clerk" },
      fetch: (input: RequestInfo | URL, init?: RequestInit) => fetch(input, { ...init, cache: "no-store" }),
    },
    accessToken: async () => {
      try {
        const { getToken } = await auth();
        // "session" means the customized session token - the path Clerk's Connect with Supabase sets
        // up. Anything else is a JWT template name.
        return resolved === SESSION_TOKEN_MARKER ? await getToken() : await getToken({ template: resolved });
      } catch {
        return null;
      }
    },
  });
}
