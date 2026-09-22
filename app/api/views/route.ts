import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { clientKey, createRateLimiter, sameOriginVerdict } from "@/lib/request-guard";
import { TABLES, getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * The two guards, and why they are here rather than in a proxy.
 *
 * A six-hour cookie stops a refresh from counting twice; it does not stop a loop. This is the only
 * endpoint an anonymous visitor can write to, and docs/REVIEW.md listed it as risk R2, so:
 *
 *   - a **cross-site** POST is refused before anything else happens. `Sec-Fetch-Site` is set by the
 *     browser and cannot be forged by page script, which is what makes it worth reading;
 *   - a **sliding window per address** caps how many views one client can record. Forty a minute is
 *     far more than a reader following links needs and far less than a script wants.
 *
 * The limiter lives in the module, so it is shared by every request this instance serves - and it is
 * per instance, which is the honest limit of an in-memory counter. A multi-instance deployment needs
 * a shared store; the README says so rather than pretending otherwise.
 */
const limiter = createRateLimiter();

const VIEW_LIMIT = { limit: 40, windowMs: 60_000 };

/**
 * The bucket for requests with no client address at all.
 *
 * A deployment behind a proxy always has one (`x-forwarded-for`, `cf-connecting-ip`, `x-real-ip`);
 * a bare `next start` does not. Keying those on the same string would put every visitor in one
 * bucket, so the fallback gets its own, much larger allowance: still a ceiling on a flood, and no
 * chance of a reader's view going uncounted because somebody else was busy.
 */
const SHARED_LIMIT = { limit: 600, windowMs: 60_000 };

/**
 * Counts one view of a species.
 *
 * A view is a visit to the species page, not a card appearing in a grid — counting
 * renders would make the number meaningless. The write itself goes through the
 * `increment_animal_view` Postgres function, which is the only way an anonymous
 * visitor is allowed to touch the table (see supabase/schema.sql).
 *
 * Repeat views from the same browser inside the window are not counted again. That
 * is a first-party cookie, so it is honest about what it is: a coarse defence
 * against a refresh inflating the figure, not a real analytics identity.
 */

const COOKIE = "kami3d.viewed";
/** Six hours: long enough that a browsing session counts once per species. */
const WINDOW_SECONDS = 60 * 60 * 6;
const MAX_REMEMBERED = 60;

function readViewed(raw: string | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === "string") : [];
  } catch {
    return [];
  }
}

export async function POST(request: Request) {
  const verdict = sameOriginVerdict(request.headers, new URL(request.url).host);
  if (verdict === "cross-site") {
    return NextResponse.json({ error: "Cross-site requests are not counted." }, { status: 403 });
  }

  const address = clientKey(request.headers);
  const allowed = limiter.check("views:" + (address ?? "shared"), address ? VIEW_LIMIT : SHARED_LIMIT);
  if (!allowed.allowed) {
    return NextResponse.json(
      { error: "Too many views from this address. Try again in a moment." },
      { status: 429, headers: { "retry-after": String(allowed.retryAfterSeconds) } },
    );
  }

  let slug: unknown;
  try {
    ({ slug } = (await request.json()) as { slug?: unknown });
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof slug !== "string" || slug.length === 0 || slug.length > 120) {
    return NextResponse.json({ error: "slug must be a non-empty string" }, { status: 400 });
  }

  const supabase = getSupabase();
  if (!supabase) {
    // Demo Mode has no counter to increment. The UI hides the figure rather than
    // inventing one.
    return NextResponse.json({ views: null, counted: false, reason: "no-database" });
  }

  const store = await cookies();
  const viewed = readViewed(store.get(COOKIE)?.value);

  if (viewed.includes(slug)) {
    // Already counted recently: report the stored figure without inflating it.
    const { data } = await supabase.from(TABLES.animals).select("view_count").eq("slug", slug).maybeSingle();
    return NextResponse.json({ views: (data as { view_count: number } | null)?.view_count ?? null, counted: false });
  }

  const { data, error } = await supabase.rpc("increment_animal_view", { animal_slug: slug });

  if (error) {
    console.warn("[kami3d] view count failed:", error.message);
    return NextResponse.json({ error: "Could not record that view." }, { status: 502 });
  }

  store.set(COOKIE, JSON.stringify([slug, ...viewed].slice(0, MAX_REMEMBERED)), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: WINDOW_SECONDS,
  });

  return NextResponse.json({ views: typeof data === "number" ? data : null, counted: true });
}
