import { NextResponse } from "next/server";

import { getCurrentUserId } from "@/lib/auth";
import { deleteProject, getPublicProject, listProjectChapters, readUpdateProjectInput, updateProject } from "@/lib/manga/project";
import { badId, isUuid, readBody, writer } from "@/app/api/manga/_lib/guard";

export const dynamic = "force-dynamic";

/**
 * GET / PATCH / DELETE /api/manga/projects/[projectId]
 *
 * The read is the reader's and the gallery's: row level security is what decides that a draft is
 * invisible, so the same call serves a published manga to anybody and the author's own draft to its
 * author - the `viewerId` is only ever used to widen what *that* account may see, and the row is
 * re-checked against it before it is returned.
 *
 * The writes are the author's, and none of them reads an owner from the request.
 */
export async function GET(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  if (!isUuid(projectId)) return badId("project");

  const userId = await getCurrentUserId();
  const project = await getPublicProject(projectId, userId);
  if (!project) return NextResponse.json({ error: "That manga does not exist, or it is not published." }, { status: 404 });

  return NextResponse.json({ project, chapters: (await listProjectChapters(projectId, userId)) ?? [] });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const guard = await writer(request, "manga-project-update");
  if (!guard.ok) return guard.response;

  const { projectId } = await params;
  if (!isUuid(projectId)) return badId("project");

  const body = await readBody(request);
  if (!body.ok) return body.response;

  const patch = readUpdateProjectInput(body.body);
  if (!patch.ok) return NextResponse.json({ error: patch.error }, { status: patch.status });

  const updated = await updateProject(projectId, guard.userId, patch.value);
  if (!updated.ok) return NextResponse.json({ error: updated.error }, { status: updated.status });

  return NextResponse.json({ project: updated.value });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const guard = await writer(request, "manga-project-delete");
  if (!guard.ok) return guard.response;

  const { projectId } = await params;
  if (!isUuid(projectId)) return badId("project");

  const removed = await deleteProject(projectId, guard.userId);
  if (!removed.ok) return NextResponse.json({ error: removed.error }, { status: removed.status });

  return NextResponse.json({ ok: true });
}
