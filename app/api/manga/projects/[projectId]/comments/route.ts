import { NextResponse } from "next/server";

import { addComment, listComments } from "@/lib/manga/social";
import { MANGA_SOCIAL_LIMIT, badId, isUuid, readBody, writer } from "@/app/api/manga/_lib/guard";

export const dynamic = "force-dynamic";

/**
 * GET  /api/manga/projects/[projectId]/comments — the thread, newest first.
 * POST /api/manga/projects/[projectId]/comments — body { content }
 *
 * Reading needs no account, and row level security decides the rest: the `manga comments readable`
 * policy only exposes comments on a project that is published and public (or on the reader's own), so
 * this route does not have to repeat that rule. Writing needs a session, and the length limit is the
 * database's own `between 1 and 1000`.
 */
export async function GET(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  if (!isUuid(projectId)) return badId("project");

  return NextResponse.json({ comments: await listComments(projectId) });
}

export async function POST(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const guard = await writer(request, "manga-comment", MANGA_SOCIAL_LIMIT);
  if (!guard.ok) return guard.response;

  const { projectId } = await params;
  if (!isUuid(projectId)) return badId("project");

  const body = await readBody(request);
  if (!body.ok) return body.response;

  const created = await addComment(projectId, guard.userId, body.body.content);
  if (!created.ok) return NextResponse.json({ error: created.error }, { status: created.status });

  return NextResponse.json({ comment: created.value });
}
