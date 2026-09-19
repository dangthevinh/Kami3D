import "server-only";

import { isAuthConfigured } from "@/lib/env.server";

/**
 * Thin wrapper around Clerk so the rest of the app never has to care whether
 * authentication is configured. With no Clerk keys every call resolves to `null`
 * ("anonymous visitor") instead of throwing, which keeps Demo Mode fully working.
 */

export async function getCurrentUserId(): Promise<string | null> {
  if (!isAuthConfigured) return null;
  // Loaded lazily so an unconfigured app never evaluates Clerk's key checks.
  const { auth } = await import("@clerk/nextjs/server");
  const { userId } = await auth();
  return userId ?? null;
}

export async function getCurrentUser(): Promise<{ id: string; name: string | null; imageUrl: string | null } | null> {
  if (!isAuthConfigured) return null;
  const { currentUser } = await import("@clerk/nextjs/server");
  const user = await currentUser();
  if (!user) return null;
  return {
    id: user.id,
    name: user.fullName ?? user.username ?? null,
    imageUrl: user.imageUrl ?? null,
  };
}

/** Server-action / route-handler guard. Returns null in Demo Mode. */
export async function requireUserId(): Promise<string | null> {
  return getCurrentUserId();
}
