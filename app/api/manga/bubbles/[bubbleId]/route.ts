import { NextResponse } from "next/server";

import { deleteBubble, readUpdateBubbleInput, updateBubble } from "@/lib/manga/project";
import { badId, isUuid, readBody, writer } from "@/app/api/manga/_lib/guard";

export const dynamic = "force-dynamic";

/**
 * PATCH / DELETE /api/manga/bubbles/[bubbleId]
 *
 * One bubble, edited on its own: this is the route a text edit uses, where the page-wide save in
 * `PATCH /api/manga/pages/[pageId]` is the one a drag uses. A moved bubble is clamped back inside its
 * own panel, which is looked up from the page's stored layout rather than taken from the request.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ bubbleId: string }> }) {
  const guard = await writer(request, "manga-bubble-update");
  if (!guard.ok) return guard.response;

  const { bubbleId } = await params;
  if (!isUuid(bubbleId)) return badId("bubble");

  const body = await readBody(request);
  if (!body.ok) return body.response;

  const patch = readUpdateBubbleInput(body.body);
  if (!patch.ok) return NextResponse.json({ error: patch.error }, { status: patch.status });

  const updated = await updateBubble(bubbleId, guard.userId, patch.value);
  if (!updated.ok) return NextResponse.json({ error: updated.error }, { status: updated.status });

  return NextResponse.json({ bubble: updated.value });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ bubbleId: string }> }) {
  const guard = await writer(request, "manga-bubble-delete");
  if (!guard.ok) return guard.response;

  const { bubbleId } = await params;
  if (!isUuid(bubbleId)) return badId("bubble");

  const removed = await deleteBubble(bubbleId, guard.userId);
  if (!removed.ok) return NextResponse.json({ error: removed.error }, { status: removed.status });

  return NextResponse.json({ ok: true });
}
