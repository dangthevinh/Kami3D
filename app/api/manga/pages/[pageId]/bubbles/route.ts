import { NextResponse } from "next/server";

import { createBubble, readCreateBubbleInput } from "@/lib/manga/project";
import { badId, isUuid, readBody, writer } from "@/app/api/manga/_lib/guard";

export const dynamic = "force-dynamic";

/**
 * POST /api/manga/pages/[pageId]/bubbles — body { panelId, content, bubbleType, position }
 *
 * A bubble is capped at 400 characters by the database, and at the same number here so that the
 * refusal is a sentence rather than a 500. The four kinds the SQL allows are the four
 * `BUBBLE_TYPES` from `lib/manga-layout.ts`, and the position is clamped into the named panel before
 * it is stored - the geometry module is the only place that arithmetic lives.
 */
export async function POST(request: Request, { params }: { params: Promise<{ pageId: string }> }) {
  const guard = await writer(request, "manga-bubble-create");
  if (!guard.ok) return guard.response;

  const { pageId } = await params;
  if (!isUuid(pageId)) return badId("page");

  const body = await readBody(request);
  if (!body.ok) return body.response;

  const input = readCreateBubbleInput(body.body);
  if (!input.ok) return NextResponse.json({ error: input.error }, { status: input.status });

  const created = await createBubble(pageId, guard.userId, input.value);
  if (!created.ok) return NextResponse.json({ error: created.error }, { status: created.status });

  return NextResponse.json({ bubble: created.value });
}
