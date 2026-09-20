import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { TABLES, getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

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
