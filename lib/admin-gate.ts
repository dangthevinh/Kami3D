/**
 * Which paths belong to the console, and what the middleware does with them (Phase 31, requirement 5).
 *
 * The console was reachable before this file existed: every `/admin/*` **page** asked
 * `adminStatus()` and rendered a "sign in" panel, which is a friendly answer but a late one - the
 * page's HTML had already been produced, and the rule lived in three files instead of one. The API
 * routes had `requireAdmin()` from the start; the pages had nothing the middleware could see.
 *
 * So the gate is here, next to `lib/data2map-access.ts` and for the same reason: the middleware runs
 * on every request and can refuse **before** a page is rendered, while a page-level check is a second
 * line rather than the first. Non-admins get the same 404 the API gives - a console that answers "403"
 * tells a stranger the console is there.
 *
 * Two things this file is not:
 *
 *   - **not the API gate.** `/api/admin/*` is refused inside the route by
 *     `app/api/admin/_lib/guard.ts`, which also records the refusal. Gating it here as well would
 *     mean a second database round trip per admin call for an answer the route has to make anyway.
 *   - **not a role system.** It answers "is this a console path", and the middleware asks the
 *     allow-lists and `public.app_admins` - the same two questions `lib/admin.ts` asks.
 */

export const ADMIN_PREFIX = "/admin";

/**
 * Is this request inside the console?
 *
 * Matched on segments, so `/adminx` is somebody else's route and `/administrator` is not smuggled
 * past the gate by a prefix comparison. A trailing slash is the same path.
 */
export function isAdminPath(pathname: string): boolean {
  const path = (pathname.split("?")[0] ?? "").replace(/\/+$/, "");
  return path === ADMIN_PREFIX || path.startsWith(ADMIN_PREFIX + "/");
}

/*
 * What is deliberately absent: a "paid routes" branch.
 *
 * The phase brief asks the middleware to protect admin routes **and paid routes**, and half of that is
 * not buildable today, because no route in this app is behind a paywall yet - the pricing page and the
 * locked content arrive in Phases 32 and 33. An `isPaidPath()` that returns false for everything would
 * be a switch that does nothing, and this project has already written down why that is worse than no
 * switch: it reads as protection in a diff and protects nothing.
 *
 * When Phase 32 lands, the gate belongs here and the rule is written next to the thing it gates. */

