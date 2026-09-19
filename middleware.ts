import { clerkMiddleware } from "@clerk/nextjs/server";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";

/**
 * Session middleware.
 *
 * Both auth providers are optional, and exactly one of them is active — the same
 * preference order `lib/auth.ts` uses:
 *
 *   1. Supabase Auth when the Supabase project is configured. Its access token
 *      lives in a cookie, and cookies expire long before the tokens inside them
 *      do, so every request refreshes them here. Without this a visitor would be
 *      silently signed out mid-session and Server Components could not read the
 *      session at all.
 *   2. Clerk when Clerk keys are present instead.
 *   3. Neither: a pass-through, so the app still runs in Demo Mode.
 *
 * There is deliberately no route matching. Path-based protection is deprecated in
 * Clerk and easy to get wrong, so `/profile` enforces its own requirement where
 * the personal data actually lives.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";

const supabaseEnabled = Boolean(supabaseUrl && supabaseKey);
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

export default async function middleware(request: NextRequest, event: NextFetchEvent) {
  if (supabaseEnabled) {
    return hasSupabaseSessionCookie(request) ? refreshSupabaseSession(request) : NextResponse.next({ request });
  }
  if (clerkHandler) {
    return clerkHandler(request, event);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Skip Next internals and static files, run on everything else (incl. /api).
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
