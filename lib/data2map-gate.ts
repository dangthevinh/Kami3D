import "server-only";

import { activeAuthProvider } from "@/lib/auth-provider";
import { data2mapIsPublic, identityListed, isDatabaseAdmin } from "@/lib/data2map-access";
import { getSupabaseUser } from "@/lib/supabase-server";

/**
 * "May this visitor see Data2Map?", answered for the navbar.
 *
 * The middleware already enforces the answer on every request to the module; this module exists so
 * the navigation can *draw* it without shipping an auth SDK to everyone. It is deliberately the same
 * three questions in the same order:
 *
 *   1. is the module public (the launch switch, or a development build)?
 *   2. is the session named in the allow-lists?
 *   3. does `public.app_admins` hold a row for it?
 *
 * Whoever calls this gets an answer about the **current session**, and nothing here is a credential:
 * a client that lies about it draws a link it cannot follow, because the middleware checks again.
 */

export type Data2MapAccessReason = "public" | "listed" | "database" | "denied";

export interface Data2MapAccess {
  visible: boolean;
  reason: Data2MapAccessReason;
  /** True when somebody is signed in - the navbar uses it to know whether to ask at all. */
  signedIn: boolean;
}

export async function data2MapAccess(): Promise<Data2MapAccess> {
  if (data2mapIsPublic()) return { visible: true, reason: "public", signedIn: false };

  const identity = await currentIdentity();
  if (!identity.userId && !identity.email) return { visible: false, reason: "denied", signedIn: false };

  if (identityListed(identity)) return { visible: true, reason: "listed", signedIn: true };
  if (await isDatabaseAdmin(identity.userId)) return { visible: true, reason: "database", signedIn: true };

  return { visible: false, reason: "denied", signedIn: true };
}

/** The signed-in visitor's id and email, from whichever provider is authoritative. */
async function currentIdentity(): Promise<{ userId: string | null; email: string | null }> {
  const provider = activeAuthProvider();
  if (provider === "none") return { userId: null, email: null };

  if (provider === "supabase") {
    const user = await getSupabaseUser();
    return { userId: user?.id ?? null, email: user?.email ?? null };
  }

  // Loaded lazily so an app without Clerk never evaluates its key checks.
  const { currentUser } = await import("@clerk/nextjs/server");
  const user = await currentUser();
  return {
    userId: user?.id ?? null,
    email: user?.primaryEmailAddress?.emailAddress ?? null,
  };
}
