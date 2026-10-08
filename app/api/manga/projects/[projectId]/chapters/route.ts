import { NextResponse } from "next/server";

import { createChapter, readCreateChapterInput } from "@/lib/manga/project";
import { badId, isUuid, readBody, writer } from "@/app/api/manga/_lib/guard";

export const dynamic = "force-dynamic";

/**
 * POST /api/manga/projects/[projectId]/chapters — body { title, chapterNumber?, script? }
 *
 * The number is optional, and when it is omitted it is read from the highest chapter that exists -
 * not from what the client has loaded. `manga_chapters` has `unique (project_id, chapter_number)`,
 * so a number that is already taken is a 409 with the number in the sentence rather than a Postgres
 * error the studio cannot explain.
 */
export async function POST(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const guard = await writer(request, "manga-chapter-create");
  if (!guard.ok) return guard.response;

  const { projectId } = await params;
  if (!isUuid(projectId)) return badId("project");

  const body = await readBody(request);
  if (!body.ok) return body.response;

  const input = readCreateChapterInput(body.body);
  if (!input.ok) return NextResponse.json({ error: input.error }, { status: input.status });

  const created = await createChapter(projectId, guard.userId, input.value);
  if (!created.ok) return NextResponse.json({ error: created.error }, { status: created.status });

  return NextResponse.json({ chapter: created.value });
}
