import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { MANGA_TABLE } from "@/lib/manga/rules";
import { getSupabase } from "@/lib/supabase";
import { MANGA_VIEW_LIMIT, badId, block, isUuid } from "@/app/api/manga/_lib/guard";

export const dynamic = "force-dynamic";

/**
 * POST /api/manga/projects/[projectId]/view — count one read of a public manga.
 *
 * Three things make this the same shape as `/api/views`:
 *
 *   1. the guard runs first: a cross-site POST is refused and one address may record forty views a
 *      minute, because a reader following links records a handful and a loop wants thousands;
 *   2. a six-hour cookie means a refresh does not inflate the figure - it is a coarse defence, and
 *      this comment says so rather than calling it analytics;
 *   3. the number itself is only ever moved by `public.increment_manga_view(uuid)`, a SECURITY DEFINER
 *      function that refuses anything not public and published. `view_count` has no update policy and
 *      no grant to `anon`, so a client cannot PATCH it - this route is the only way in, and the
 *      function is what decides.
 *
 * When there is nothing to count the answer is quiet rather than an error: `viewCount: null` with a
 * reason. A reader must never see an error because a counter was unavailable.
 */
const COOKIE = "kami3d.manga.viewed";
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

export async function POST(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const blocked = block(request, "manga-view", MANGA_VIEW_LIMIT);
  if (blocked) return blocked;

  const { projectId } = await params;
  if (!isUuid(projectId)) return badId("project");

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ viewCount: null, counted: false, reason: "no-database" });

  const store = await cookies();
  const viewed = readViewed(store.get(COOKIE)?.value);

  const readBack = async (): Promise<number | null> => {
    const { data } = await supabase.from(MANGA_TABLE.projects).select("view_count").eq("id", projectId).maybeSingle();
    return (data as { view_count: number } | null)?.view_count ?? null;
  };

  if (viewed.includes(projectId)) {
    return NextResponse.json({ viewCount: await readBack(), counted: false, reason: "counted-recently" });
  }

  const { data, error } = await supabase.rpc("increment_manga_view", { p_project: projectId });

  if (error) {
    // The function exists only once the schema is applied; an older database is a reason, not a 500.
    console.warn("[kami3d] manga view count failed:", error.message);
    return NextResponse.json({ viewCount: null, counted: false, reason: "unavailable" });
  }

  if (typeof data !== "number" || data < 0) {
    // -1 is the function's own answer for "not public and published".
    return NextResponse.json({ viewCount: null, counted: false, reason: "not-published" });
  }

  store.set(COOKIE, JSON.stringify([projectId, ...viewed].slice(0, MAX_REMEMBERED)), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: WINDOW_SECONDS,
  });

  return NextResponse.json({ viewCount: data, counted: true });
}
