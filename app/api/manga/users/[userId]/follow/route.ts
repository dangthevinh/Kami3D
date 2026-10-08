import { NextResponse } from "next/server";

import { toggleFollow } from "@/lib/manga/social";
import { MANGA_SOCIAL_LIMIT, writer } from "@/app/api/manga/_lib/guard";

export const dynamic = "force-dynamic";

/**
 * POST /api/manga/users/[userId]/follow — follow, or stop following.
 *
 * The id being followed is the path segment, and the follower is always the verified session: a body
 * that named the follower would let one account follow on another's behalf. `manga_follows` has
 * `primary key (follower_id, following_id)` and `check (follower_id <> following_id)`, so a double
 * tap cannot create two rows and a self-follow cannot be stored - both are also refused here, with a
 * sentence rather than a Postgres error.
 */
export async function POST(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const guard = await writer(request, "manga-follow", MANGA_SOCIAL_LIMIT);
  if (!guard.ok) return guard.response;

  const { userId } = await params;
  // Not a uuid: an account id is whatever the auth provider issues ("user_…" under Clerk, a uuid
  // under Supabase Auth), so the bound is a length rather than a shape.
  if (!userId || userId.length > 128) {
    return NextResponse.json({ error: "That account id is not usable." }, { status: 400 });
  }

  const result = await toggleFollow(guard.userId, userId);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  return NextResponse.json(result.value);
}
