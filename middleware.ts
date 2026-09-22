import { clerkMiddleware } from "@clerk/nextjs/server";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";

import { activeAuthProvider } from "@/lib/auth-provider";
import { AUTH_HINT_COOKIE } from "@/lib/auth-hint";
import { classifyChannel, honorsDoNotTrack, isPageRequest, routeClass } from "@/lib/channel";
import { data2mapIsPublic, identityListed, isData2MapPath, isDatabaseAdmin } from "@/lib/data2map-access";

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

/**
 * The Data2Map gate.
 *
 * Data2Map is built but not launched, so the module answers **404** to everyone except the people
 * working on it. A 404 rather than a 403 on purpose: a section that is not public yet should not
 * announce that it exists. The check runs here, in the middleware, because the module's pages are
 * statically generated - asking a page to read a session would turn all seven of them dynamic, and
 * `check:bundle` measures their prerendered HTML.
 *
 * Admins are: the named allow-lists (cheap, no round trip), or a row in `public.app_admins` matched
 * against the **verified** session id - the same table `/admin/geodata` uses, read here with the
 * service role because under Clerk the database cannot see the Clerk identity on its own.
 */
const HIDDEN_BODY = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><title>Not found · Kami3D</title></head><body style="margin:0;background:#04060f;color:#e8ecf6;font:14px/1.6 system-ui,sans-serif;display:grid;place-items:center;min-height:100vh"><main style="text-align:center"><p style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#8a93a6">404</p><h1 style="margin:.25rem 0 0;font-size:1.4rem">Nothing here yet</h1><p style="color:#8a93a6;margin-top:.5rem">This page is not part of the encyclopedia.</p><p><a href="/" style="color:#35f0c0">Back to Kami3D</a></p></main></body></html>`;

function hiddenResponse() {
  return new NextResponse(HIDDEN_BODY, {
    status: 404,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "x-robots-tag": "noindex, nofollow",
    },
  });
}

interface SessionIdentity {
  userId?: string | null;
  email?: string | null;
}

async function canSeeData2Map(identity: SessionIdentity): Promise<boolean> {
  if (data2mapIsPublic()) return true;
  if (identityListed(identity)) return true;
  if (identity.userId) return isDatabaseAdmin(identity.userId);
  return false;
}

const clerkHandler = clerkEnabled
  ? clerkMiddleware(async (auth, request) => {
      // Only the module pays for the check; every other route is untouched.
      if (!isData2MapPath(request.nextUrl.pathname)) return undefined;
      if (data2mapIsPublic()) return undefined;

      const { userId, sessionClaims } = await auth();
      const email = typeof sessionClaims?.email === "string" ? sessionClaims.email : null;
      return (await canSeeData2Map({ userId, email })) ? undefined : hiddenResponse();
    })
  : null;

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

async function refreshSupabaseSession(request: NextRequest): Promise<{ response: NextResponse; identity: SessionIdentity }> {
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

  // Touching the user is what triggers the refresh, and it is also the identity the Data2Map gate
  // needs - Supabase Auth verifies the token server-side, so the email it returns can be trusted.
  const { data } = await supabase.auth.getUser();

  return {
    response,
    identity: { userId: data.user?.id ?? null, email: data.user?.email ?? null },
  };
}

/** Set by the build so the middleware knows whether it can refresh at all. */
void supabaseConfigured;

/**
 * Tells the client whether the account UI is worth downloading.
 *
 * The root layout is statically rendered and cannot read cookies, so without this
 * the browser has to load a whole auth SDK just to find out whether the visitor
 * is signed in. The middleware, by contrast, has already resolved the session —
 * for Clerk as its own `x-clerk-auth-status` response header, for Supabase as the
 * presence of `sb-<ref>-auth-token`. Publishing that answer in a short-lived,
 * JS-readable cookie lets `components/auth/AuthSlot.tsx` skip the download for
 * guests entirely. It is a hint, not a credential: nothing is authorized from it,
 * and the five-minute lifetime means a sign-in or sign-out corrects it quickly.
 */
function withAuthHint(response: NextResponse, signedIn: boolean) {
  response.cookies.set(AUTH_HINT_COOKIE, signedIn ? "in" : "out", {
    path: "/",
    sameSite: "lax",
    httpOnly: false,
    maxAge: 300,
  });
  return response;
}

/**
 * One page view, counted — and the four reasons this is not a tracking pixel.
 *
 *   1. **nothing is waited for.** The write goes out through `event.waitUntil`, so a slow database
 *      cannot slow a page and a failed count cannot reach a reader;
 *   2. **nothing about a person is sent.** A channel label and a normalised route: no IP, no user
 *      agent, no cookie, no query string (see `lib/channel.ts`, and the schema test that refuses a
 *      column named like an identifier);
 *   3. **bots are their own channel**, so a crawler never inflates a percentage a human reads;
 *   4. **a visitor can refuse.** `DNT: 1` or `Sec-GPC: 1` means nothing is written at all - not a
 *      hash, not a count, nothing.
 *
 * It is deliberately here rather than in a client beacon: the headers that answer "where did this
 * come from" are on the request, and a visitor with JavaScript off is still a reader.
 */
function recordTraffic(request: NextRequest, event: NextFetchEvent) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return; // Demo Mode: there is no database to count in.
  if (request.method !== "GET") return;
  if (!isPageRequest(request.nextUrl.pathname)) return;
  if (honorsDoNotTrack(request.headers)) return;

  const channel = classifyChannel({
    referer: request.headers.get("referer"),
    secFetchSite: request.headers.get("sec-fetch-site"),
    userAgent: request.headers.get("user-agent"),
    host: request.headers.get("host"),
    campaign: request.nextUrl.searchParams.get("utm_source") ?? request.nextUrl.searchParams.get("utm_campaign"),
  });

  event.waitUntil(
    fetch(url + "/rest/v1/rpc/bump_traffic", {
      method: "POST",
      headers: { apikey: key, authorization: "Bearer " + key, "content-type": "application/json" },
      body: JSON.stringify({
        p_day: new Date().toISOString().slice(0, 10),
        p_channel: channel,
        p_route: routeClass(request.nextUrl.pathname),
      }),
      cache: "no-store",
    })
      .then(() => undefined)
      // A counter is not worth an error page: the reader never hears about this.
      .catch(() => undefined),
  );
}

export default async function middleware(request: NextRequest, event: NextFetchEvent) {
  recordTraffic(request, event);

  switch (activeAuthProvider()) {
    case "supabase": {
      // Skip the round trip entirely when there is no session to refresh.
      const signedIn = hasSupabaseSessionCookie(request);
      const refreshed =
        supabaseConfigured && signedIn
          ? await refreshSupabaseSession(request)
          : { response: NextResponse.next({ request }), identity: { userId: null, email: null } };

      if (isData2MapPath(request.nextUrl.pathname) && !(await canSeeData2Map(refreshed.identity))) {
        return hiddenResponse();
      }

      return withAuthHint(refreshed.response, signedIn);
    }
    case "clerk": {
      if (!clerkHandler) return withAuthHint(NextResponse.next({ request }), false);
      const result = await clerkHandler(request, event);
      // Clerk's own response carries the verdict; adding a cookie to it leaves its
      // session handling — handshake and token refresh included — untouched.
      if (!(result instanceof NextResponse)) {
        return result ?? withAuthHint(NextResponse.next({ request }), false);
      }
      const status = result.headers.get("x-clerk-auth-status");
      if (status === "signed-in" || status === "signed-out") {
        withAuthHint(result, status === "signed-in");
      }
      return result;
    }
    default:
      // No provider is configured (Demo Mode). There is nobody to be an admin, so the module is
      // hidden here too - `npm run dev` and `NEXT_PUBLIC_DATA2MAP_PUBLIC=1` are the ways in.
      if (isData2MapPath(request.nextUrl.pathname) && !data2mapIsPublic()) {
        return hiddenResponse();
      }
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
