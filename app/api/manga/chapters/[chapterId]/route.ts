import { NextResponse } from "next/server";

import { getCurrentUserId } from "@/lib/auth";
import { deleteChapter, getChapterBundle, readUpdateChapterInput, updateChapter } from "@/lib/manga/project";
import { badId, isUuid, readBody, writer } from "@/app/api/manga/_lib/guard";

export const dynamic = "force-dynamic";

/**
 * GET / PATCH / DELETE /api/manga/chapters/[chapterId]
 *
 * The read is the composer's and the reader's: it returns the chapter with its panels, pages and
 * speech bubbles in one answer, so opening a chapter is one round trip rather than four. A published
 * chapter is readable by anybody; a draft only by its author, whose id comes from the session.
 */
export async function GET(request: Request, { params }: { params: Promise<{ chapterId: string }> }) {
  const { chapterId } = await params;
  if (!isUuid(chapterId)) return badId("chapter");

  const userId = await getCurrentUserId();
  const bundle = await getChapterBundle(chapterId, userId);
  if (!bundle) return NextResponse.json({ error: "That chapter does not exist, or it is not published." }, { status: 404 });

  return NextResponse.json(bundle);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ chapterId: string }> }) {
  const guard = await writer(request, "manga-chapter-update");
  if (!guard.ok) return guard.response;

  const { chapterId } = await params;
  if (!isUuid(chapterId)) return badId("chapter");

  const body = await readBody(request);
  if (!body.ok) return body.response;

  const patch = readUpdateChapterInput(body.body);
  if (!patch.ok) return NextResponse.json({ error: patch.error }, { status: patch.status });

  const updated = await updateChapter(chapterId, guard.userId, patch.value);
  if (!updated.ok) return NextResponse.json({ error: updated.error }, { status: updated.status });

  return NextResponse.json({ chapter: updated.value });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ chapterId: string }> }) {
  const guard = await writer(request, "manga-chapter-delete");
  if (!guard.ok) return guard.response;

  const { chapterId } = await params;
  if (!isUuid(chapterId)) return badId("chapter");

  const removed = await deleteChapter(chapterId, guard.userId);
  if (!removed.ok) return NextResponse.json({ error: removed.error }, { status: removed.status });

  return NextResponse.json({ ok: true });
}
