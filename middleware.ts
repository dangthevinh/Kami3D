import { clerkMiddleware } from "@clerk/nextjs/server";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";

import { activeAuthProvider } from "@/lib/auth-provider";

/**
 * Session middleware.
 *
 * Exactly one auth provider is active, and this file must agree with everything
 * else about which one — `lib/auth-provider.ts` is that single decision point.
 *
 * This mattered in practice: the middleware used to branch on "is Supabase
 * configured?", so with **both** Supabase and Clerk configured the Supabase branch
 * always won and `clerkMiddleware()` never ran. Clerk's `auth()` then threw
 * "can't detect usage of clerkMiddleware()" on every page that reads a session.
 *
 *   - Supabase Auth: the access token lives in a cookie whose lifetime is shorter
 *     than the token inside it, so every request that carries one refreshes it.
 *   - Clerk: its own middleware maintains the session.
 *   - Neither: a pass-through, so the app still runs in Demo Mode.
 *
 * There is deliberately no route matching. Path-based protection is deprecated in
 * Clerk and easy to get wrong, so `/profile` enforces its own requirement where
 * the personal data actually lives.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";

// The Supabase refresh needs real values; Clerk needs both halves of its key pair.
const supabaseConfigured = Boolean(supabaseUrl && supabaseKey);
const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY);

const clerkHandler = clerkEnabled ? clerkMiddleware() : null;

/**
 * Supabase names its session cookie `sb-<project-ref>-auth-token`. Without one
 * there is nothing to refresh, and skipping the round trip keeps anonymous page
 * loads — the overwhelming majority, including crawlers — as fast as they were
 * before auth existed.
 */
function hasSupabaseSessionCookie(request: NextRequest) {
  return request.cookies
    .getAll()
    .some(({ name }) => name.startsWith("sb-") && name.includes("-auth-token"));
}

async function refreshSupabaseSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet) => {
        for (const { name, value } of toSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of toSet) response.cookies.set(name, value, options);
      },
    },
  });

  // Touching the user is what triggers the refresh.
  await supabase.auth.getUser();

  return response;
}

/** Set by the build so the middleware knows whether it can refresh at all. */
void supabaseConfigured;

export default async function middleware(request: NextRequest, event: NextFetchEvent) {
  switch (activeAuthProvider()) {
    case "supabase":
      // Skip the round trip entirely when there is no session to refresh.
      return supabaseConfigured && hasSupabaseSessionCookie(request)
        ? refreshSupabaseSession(request)
        : NextResponse.next({ request });
    case "clerk":
      return clerkHandler ? clerkHandler(request, event) : NextResponse.next({ request });
    default:
      return NextResponse.next({ request });
  }
}

export const config = {
  matcher: [
    // Skip Next internals and static files, run on everything else (incl. /api).
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
