import "server-only";

import { COMING_SOON_MODULES, type ComingSoonModule } from "@/lib/coming-soon";
import { identityListed, isDatabaseAdmin } from "@/lib/data2map-access";
import { activeAuthProvider } from "@/lib/auth-provider";
import { getSupabaseUser } from "@/lib/supabase-server";

/**
 * "May this visitor open the modules that are not launched yet?", answered for the navbar.
 *
 * The middleware already enforces the answer on every request; this module exists so the navigation
 * can *draw* it without shipping an auth SDK to everyone. It is deliberately the same three questions
 * in the same order, for every module in `lib/coming-soon.ts`:
 *
 *   1. is the module open to everybody (the launch switch, or a development build)?
 *   2. is the session named in the allow-lists?
 *   3. does `public.app_admins` hold a row for it?
 *
 * Whoever calls this gets an answer about the **current session**, and nothing here is a credential:
 * a client that lies about it draws a link it cannot follow, because the middleware checks again.
 */

export interface ModuleAccess {
  signedIn: boolean;
  /** Module id to "may this session open it". A module that is open to everybody is true for guests. */
  modules: Record<string, boolean>;
}

/** The three questions, for one module. Shared with the middleware, which cannot import this file. */
export async function canEnterModule(
  module: ComingSoonModule,
  identity: { userId?: string | null; email?: string | null },
): Promise<boolean> {
  if (module.isOpen()) return true;
  if (identityListed(identity)) return true;
  if (identity.userId) return isDatabaseAdmin(identity.userId);
  return false;
}

export async function moduleAccess(): Promise<ModuleAccess> {
  const identity = await currentIdentity();
  const signedIn = Boolean(identity.userId || identity.email);

  const modules: Record<string, boolean> = {};
  for (const module of COMING_SOON_MODULES) {
    modules[module.id] = await canEnterModule(module, identity);
  }

  return { signedIn, modules };
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
