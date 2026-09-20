/**
 * Assertions for the session hint that decides whether the account UI is worth
 * downloading.
 *
 * Getting this wrong is not symmetric:
 *
 *   - a false "out" hides the account menu from a signed-in visitor — the exact
 *     bug that was reported as "I signed in and it still says Sign in";
 *   - a false "in" costs a download, nothing more;
 *   - "unknown" is the safe answer, and the caller loads the UI when idle.
 *
 * Run with: npm run check:auth
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import { AUTH_HINT_COOKIE, cookieNames, readCookie, readSessionHint } from "../lib/auth-hint.ts";

test("readCookie finds a value among others, including empty ones", () => {
  const jar = "theme=dark; kami-auth=in; empty=; spaced = value ";
  assert.equal(readCookie(jar, "theme"), "dark");
  assert.equal(readCookie(jar, "kami-auth"), "in");
  assert.equal(readCookie(jar, "empty"), "");
  assert.equal(readCookie(jar, "missing"), null);
});

test("cookieNames lists every name and nothing else", () => {
  assert.deepEqual(cookieNames("a=1; b=2;"), ["a", "b"]);
  assert.deepEqual(cookieNames(""), []);
});

test("the middleware hint is authoritative in both directions", () => {
  assert.equal(readSessionHint("kami-auth=in; __client_uat=0"), "in");
  assert.equal(readSessionHint("kami-auth=out"), "out");
});

test("a live Clerk session is recognised without the middleware hint", () => {
  assert.equal(readSessionHint("__client_uat=1756800000"), "in");
  assert.equal(readSessionHint("__client_uat_dev_abc=1756800000"), "in");
  // Clerk writes 0 for a signed-out browser; that must never count as a session.
  assert.equal(readSessionHint("__client_uat=0"), "unknown");
});

test("Supabase session cookies are recognised, chunked or not", () => {
  assert.equal(readSessionHint("sb-ztihljcpeylprcgblnpv-auth-token=base64"), "in");
  assert.equal(readSessionHint("sb-ztihljcpeylprcgblnpv-auth-token.0=part"), "in");
  // Same site, no session: unrelated sb- cookies must not be mistaken for one.
  assert.equal(readSessionHint("sb-something-else=1"), "unknown");
});

test("no signal at all is unknown, never signed out", () => {
  // The distinction matters: "out" skips the account UI entirely, "unknown"
  // loads it once the browser is idle, so a stale cookie can only delay it.
  assert.equal(readSessionHint(""), "unknown");
  assert.equal(readSessionHint("theme=dark; NEXT_LOCALE=en"), "unknown");
});

test("a positive signal outranks a stale negative hint", () => {
  // Middleware said "out" five minutes ago, then the visitor signed in.
  assert.equal(readSessionHint("kami-auth=out; sb-abc-auth-token=xyz"), "in");
  assert.equal(readSessionHint("kami-auth=out; __client_uat=1756800000"), "in");
});

test("the hint cookie name is stable", () => {
  // middleware.ts and the client both import this constant; renaming it would
  // silently disable the optimisation rather than break loudly.
  assert.equal(AUTH_HINT_COOKIE, "kami-auth");
});
