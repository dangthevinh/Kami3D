import { NextResponse } from "next/server";

import { toggleLike } from "@/lib/manga/social";
import { MANGA_SOCIAL_LIMIT, badId, isUuid, writer } from "@/app/api/manga/_lib/guard";

export const dynamic = "force-dynamic";

/**
 * POST /api/manga/projects/[projectId]/like — like, or take the like back.
 *
 * `manga_likes` has `primary key (project_id, user_id)`, so a double tap cannot count twice: the
 * second insert is a duplicate key, and `toggleLike` reports that as "you already like this". The
 * count in the answer is read from the table rather than kept by the client, so two visitors liking
 * at the same moment do not each see their own number.
 */
export async function POST(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const guard = await writer(request, "manga-like", MANGA_SOCIAL_LIMIT);
  if (!guard.ok) return guard.response;

  const { projectId } = await params;
  if (!isUuid(projectId)) return badId("project");

  const result = await toggleLike(projectId, guard.userId);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  return NextResponse.json(result.value);
}
