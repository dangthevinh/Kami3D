/**
 * The client-side answer to "might this visitor already be signed in?".
 *
 * The root layout renders the **guest** state for everyone, because reading
 * cookies there would opt all 34 routes — including the 24 statically generated
 * species pages — into dynamic rendering. The trade-off used to be paid in
 * JavaScript: the navbar mounted Clerk's (or Supabase's) account UI to find out,
 * which meant every anonymous visitor and every crawler downloaded a full auth
 * SDK before the page was interactive.
 *
 * This module replaces that guess with a cheap, synchronous cookie read:
 *
 *   - `kami-auth` is written by `middleware.ts` from the session the server
 *     already resolved, so it is authoritative and costs no client code.
 *   - Clerk stamps a signed-in browser with `__client_uat=<timestamp>` and a
 *     signed-out one with `0`; Supabase's `@supabase/ssr` client keeps its
 *     session in `sb-<ref>-auth-token` (chunked as `….0`, `….1` when large).
 *
 * `"unknown"` is a first-class answer: it means "load the account UI when the
 * browser is idle", so a stale or missing hint can only ever *delay* the account
 * menu, never hide it from a visitor who is signed in.
 */

export const AUTH_HINT_COOKIE = "kami-auth";

export type SessionHint = "in" | "out" | "unknown";

/** Every cookie name in a `document.cookie`-style string. */
export function cookieNames(cookieString: string): string[] {
  return cookieString
    .split(";")
    .map((part) => part.slice(0, part.indexOf("=") === -1 ? undefined : part.indexOf("=")).trim())
    .filter(Boolean);
}

/** One cookie's value, or null when it is absent. */
export function readCookie(cookieString: string, name: string): string | null {
  for (const part of cookieString.split(";")) {
    const separator = part.indexOf("=");
    if (separator === -1) continue;
    if (part.slice(0, separator).trim() === name) return part.slice(separator + 1).trim();
  }
  return null;
}

export function readSessionHint(cookieString: string): SessionHint {
  const names = cookieNames(cookieString);

  // Positive signals first: an explicit "in" from the middleware, a Supabase
  // session token, or a Clerk activity timestamp that is not the signed-out "0".
  if (readCookie(cookieString, AUTH_HINT_COOKIE) === "in") return "in";

  if (names.some((name) => /^sb-.*-auth-token(\.\d+)?$/.test(name))) return "in";

  for (const name of names) {
    if (name !== "__client_uat" && !name.startsWith("__client_uat_")) continue;
    const value = readCookie(cookieString, name);
    if (value && value !== "0") return "in";
  }

  return readCookie(cookieString, AUTH_HINT_COOKIE) === "out" ? "out" : "unknown";
}
