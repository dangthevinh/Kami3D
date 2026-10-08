import { NextResponse } from "next/server";

import { deletePage, updatePage } from "@/lib/manga/project";
import { badId, isUuid, readBody, writer } from "@/app/api/manga/_lib/guard";

export const dynamic = "force-dynamic";

/**
 * PATCH / DELETE /api/manga/pages/[pageId]
 *
 * PATCH takes any subset of `{ template, slots, bubbles }`. The two halves do different jobs:
 *
 *   - `template` and `slots` are the page's layout, resolved through `lib/manga-layout.ts`, so a slot
 *     rectangle is clamped inside the paper and a panel id has to belong to the chapter;
 *   - `bubbles` is the composer's save after a drag: each entry names a bubble on this page, and its
 *     new position is **clamped inside the panel the bubble belongs to** before it is stored. That is
 *     the same `clampBubble` the composer draws with, applied again on the server, because a bubble
 *     that crosses a gutter reads as belonging to the wrong panel and a hand-written request could put
 *     one anywhere.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ pageId: string }> }) {
  const guard = await writer(request, "manga-page-update");
  if (!guard.ok) return guard.response;

  const { pageId } = await params;
  if (!isUuid(pageId)) return badId("page");

  const body = await readBody(request);
  if (!body.ok) return body.response;

  const updated = await updatePage(pageId, guard.userId, body.body);
  if (!updated.ok) return NextResponse.json({ error: updated.error }, { status: updated.status });

  return NextResponse.json({ page: updated.value });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ pageId: string }> }) {
  const guard = await writer(request, "manga-page-delete");
  if (!guard.ok) return guard.response;

  const { pageId } = await params;
  if (!isUuid(pageId)) return badId("page");

  const removed = await deletePage(pageId, guard.userId);
  if (!removed.ok) return NextResponse.json({ error: removed.error }, { status: removed.status });

  return NextResponse.json({ ok: true });
}
