import { NextResponse } from "next/server";

import { deletePanel } from "@/lib/manga/panel";
import { badId, isUuid, writer } from "@/app/api/manga/_lib/guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * DELETE /api/manga/panels/[panelId]
 *
 * The stored object goes first and the row second, and only if the object is really gone: the public
 * URL on the row is the only pointer to the file, so deleting the row first would leave an image
 * nobody can ever remove.
 */
export async function DELETE(request: Request, { params }: { params: Promise<{ panelId: string }> }) {
  const guard = await writer(request, "manga-panel-delete");
  if (!guard.ok) return guard.response;

  const { panelId } = await params;
  if (!isUuid(panelId)) return badId("panel");

  const removed = await deletePanel(panelId, guard.userId);
  if (!removed.ok) return NextResponse.json({ error: removed.error }, { status: removed.status });

  return NextResponse.json({ ok: true });
}
