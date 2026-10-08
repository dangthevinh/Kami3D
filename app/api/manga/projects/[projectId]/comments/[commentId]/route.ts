import { NextResponse } from "next/server";

import { deleteComment } from "@/lib/manga/social";
import { MANGA_SOCIAL_LIMIT, badId, isUuid, writer } from "@/app/api/manga/_lib/guard";

export const dynamic = "force-dynamic";

/**
 * DELETE /api/manga/projects/[projectId]/comments/[commentId]
 *
 * Only the person who wrote a comment may delete it - not the author of the manga, who would otherwise
 * be able to edit a thread about their own work. That is exactly the SQL policy
 * (`manga comments own: using (user_id = public.current_user_id())`), and the check is repeated in
 * `deleteComment` because the service-role client would bypass the policy.
 */
export async function DELETE(request: Request, { params }: { params: Promise<{ projectId: string; commentId: string }> }) {
  const guard = await writer(request, "manga-comment-delete", MANGA_SOCIAL_LIMIT);
  if (!guard.ok) return guard.response;

  const { projectId, commentId } = await params;
  if (!isUuid(projectId)) return badId("project");
  if (!isUuid(commentId)) return badId("comment");

  const removed = await deleteComment(projectId, commentId, guard.userId);
  if (!removed.ok) return NextResponse.json({ error: removed.error }, { status: removed.status });

  return NextResponse.json({ ok: true });
}
