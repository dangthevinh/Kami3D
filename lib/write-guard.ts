import "server-only";

import { NextResponse } from "next/server";

import { clientKey, createRateLimiter, sameOriginVerdict, type RateLimitRule } from "@/lib/request-guard";

/**
 * One guard for every route that writes.
 *
 * `/api/views` had two guards of its own — a same-origin check and a rate limit — and nothing else did,
 * which left the routes that touch personal data and the two that **spawn a child process** open to a
 * cross-site POST and to a loop. This is that same pair, in one place, using the same pure functions
 * (`npm run check:request-guard` already pins them), so there is no second version of the rule to drift.
 *
 * It returns `null` when the request may proceed, or a response to send instead. Two things it is not:
 *
 *   - it is not authentication. Who the caller is comes from the session, and for admin routes from
 *     `is_admin()`; this only answers "did this arrive from our own page, and is it arriving too fast".
 *   - it is not a shared store. The limiter lives in the process, so a deployment with several instances
 *     gets a limit per instance. That is the honest bound and the README says so; a shared counter would
 *     need Redis or Postgres, which this project deliberately does not require.
 */
const limiters = new Map<string, ReturnType<typeof createRateLimiter>>();

export interface WriteGuardOptions {
  /** The bucket name. One limiter per name, created on first use. */
  name: string;
  rule: RateLimitRule;
  /** The request's own host, for the Origin/Referer fallback when Sec-Fetch-Site is absent. */
  expectedHost: string;
}

export function guardWrite(request: Request, { name, rule, expectedHost }: WriteGuardOptions): NextResponse | null {
  const verdict = sameOriginVerdict(request.headers, expectedHost);
  if (verdict === "cross-site") {
    // A browser told us this came from somewhere else. Page script cannot set that header, which is
    // what makes it worth refusing on.
    return NextResponse.json({ error: "cross-site requests are not accepted" }, { status: 403 });
  }

  let limiter = limiters.get(name);
  if (!limiter) {
    limiter = createRateLimiter();
    limiters.set(name, limiter);
  }

  const key = clientKey(request.headers) ?? name + ":shared";
  const result = limiter.check(key, rule);
  if (!result.allowed) {
    return NextResponse.json(
      { error: "too many requests" },
      { status: 429, headers: { "retry-after": String(Math.max(1, result.retryAfterSeconds)) } },
    );
  }

  return null;
}

/** The host a normal page request arrives on, for the Origin fallback. */
export function hostOfRequest(request: Request): string {
  return new URL(request.url).host;
}
