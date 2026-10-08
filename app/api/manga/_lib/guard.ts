import "server-only";

import { NextResponse } from "next/server";

import { getCurrentUserId } from "@/lib/auth";
import { activeAuthProvider } from "@/lib/auth-provider";
import { MANGA_NOT_CONFIGURED, type MangaFailure } from "@/lib/manga/rules";
import type { RateLimitRule } from "@/lib/request-guard";
import { guardWrite, hostOfRequest } from "@/lib/write-guard";

/**
 * Phase 24 (Manga Studio): the part every API route needs, in one place.
 *
 * Four shared pieces:
 *
 *   1. **`guardWrite` + a per-route rate limit.** Every route that writes calls `writer()` below,
 *      which is the house guard: a cross-site POST is refused, and a loop is bounded. The limits
 *      differ by what a request costs - a page save is cheap, an AI generation is somebody's money.
 *   2. **The verified session.** `userId` always comes from `lib/auth.ts`, never from a body, a query
 *      string or a header. A route that needs to know who is asking asks here.
 *   3. **A bounded body.** A JSON body larger than 256 KB is refused before it is parsed, so a single
 *      request cannot ask the server to allocate an unbounded string.
 *   4. **Demo Mode.** With no auth provider configured at all, a write answers 503 with the sentence
 *      that says what to set, rather than 401 - which would look like "you are signed out" in a
 *      deployment that has no way to sign in.
 */

export const MANGA_WRITE_LIMIT: RateLimitRule = { limit: 60, windowMs: 60_000 };
/** An upload is a stored file, so it is counted like one. */
export const MANGA_UPLOAD_LIMIT: RateLimitRule = { limit: 20, windowMs: 60_000 };
/** Generation costs an API call somebody pays for. */
export const MANGA_AI_LIMIT: RateLimitRule = { limit: 5, windowMs: 60_000 };
/** One reader following links records far fewer than this; a script wants far more. */
export const MANGA_VIEW_LIMIT: RateLimitRule = { limit: 40, windowMs: 60_000 };
export const MANGA_SOCIAL_LIMIT: RateLimitRule = { limit: 30, windowMs: 60_000 };

/** The largest JSON body any manga route accepts, in characters. */
export const MANGA_MAX_BODY_CHARS = 256 * 1024;

export interface MangaSession {
  userId: string;
}

/** The rate-limit and same-origin half of the guard, for routes that read the body themselves. */
export function block(request: Request, name: string, rule: RateLimitRule = MANGA_WRITE_LIMIT): NextResponse | null {
  return guardWrite(request, { name, rule, expectedHost: hostOfRequest(request) });
}

/** Turn a failed data-layer result into the response the contract promises: `{ error }`. */
export function failure(result: MangaFailure): NextResponse {
  return NextResponse.json({ error: result.error }, { status: result.status });
}

/**
 * Guard, then identify. Returns the session id or the response to send instead.
 *
 * The order matters: the rate limit is checked before anything touches the database, so a flood costs
 * one comparison rather than a query.
 */
export async function writer(
  request: Request,
  name: string,
  rule: RateLimitRule = MANGA_WRITE_LIMIT,
): Promise<{ ok: true; userId: string } | { ok: false; response: NextResponse }> {
  const blocked = block(request, name, rule);
  if (blocked) return { ok: false, response: blocked };

  const userId = await getCurrentUserId();
  if (userId) return { ok: true, userId };

  if (activeAuthProvider() === "none") {
    return { ok: false, response: NextResponse.json({ error: MANGA_NOT_CONFIGURED }, { status: 503 }) };
  }
  return { ok: false, response: NextResponse.json({ error: "Sign in to work on your manga." }, { status: 401 }) };
}

export type MangaBody = { ok: true; body: Record<string, unknown> } | { ok: false; response: NextResponse };

/** A JSON object, bounded before it is parsed. An empty body reads as `{}`. */
export async function readBody(request: Request): Promise<MangaBody> {
  let text: string;
  try {
    text = await request.text();
  } catch {
    return { ok: false, response: NextResponse.json({ error: "Could not read that request body." }, { status: 400 }) };
  }

  if (text.length > MANGA_MAX_BODY_CHARS) {
    return { ok: false, response: NextResponse.json({ error: "That request body is too large." }, { status: 413 }) };
  }
  if (text.trim().length === 0) return { ok: true, body: {} };

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, response: NextResponse.json({ error: "That request body is not valid JSON." }, { status: 400 }) };
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return { ok: false, response: NextResponse.json({ error: "That request body must be a JSON object." }, { status: 400 }) };
  }
  return { ok: true, body: parsed as Record<string, unknown> };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Every id in this API is a uuid from Postgres; anything else is refused before a query is made. */
export function isUuid(value: string): boolean {
  return UUID.test(value);
}

/** The id from a dynamic segment, or a 400 that names what was wrong. */
export function badId(what: string): NextResponse {
  return NextResponse.json({ error: "That " + what + " id is not a uuid." }, { status: 400 });
}
