import { NextResponse } from "next/server";

import { setProjectPublished } from "@/lib/manga/project";
import { badId, isUuid, readBody, writer } from "@/app/api/manga/_lib/guard";

export const dynamic = "force-dynamic";

/**
 * POST /api/manga/projects/[projectId]/publish — body { publish: boolean }
 *
 * Publishing is one switch that sets two columns, and the SQL decides what they mean together: a
 * project is readable by the public only when `is_public and status = 'published'`. Setting one
 * without the other is how a "draft" ends up in the gallery, so this route never splits them.
 *
 * Unpublishing sets the status back to `draft` rather than to `archived`: `archived` is the author
 * saying "this is finished and withdrawn", which is their decision, not a side effect of unticking a
 * checkbox.
 */
export async function POST(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const guard = await writer(request, "manga-project-publish");
  if (!guard.ok) return guard.response;

  const { projectId } = await params;
  if (!isUuid(projectId)) return badId("project");

  const body = await readBody(request);
  if (!body.ok) return body.response;
  if (typeof body.body.publish !== "boolean") {
    return NextResponse.json({ error: "publish must be true or false." }, { status: 400 });
  }

  const updated = await setProjectPublished(projectId, guard.userId, body.body.publish);
  if (!updated.ok) return NextResponse.json({ error: updated.error }, { status: updated.status });

  return NextResponse.json({ project: updated.value });
}
