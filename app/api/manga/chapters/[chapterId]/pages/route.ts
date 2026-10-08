import { NextResponse } from "next/server";

import { createPage, readPageInput } from "@/lib/manga/project";
import { badId, isUuid, readBody, writer } from "@/app/api/manga/_lib/guard";

export const dynamic = "force-dynamic";

/**
 * POST /api/manga/chapters/[chapterId]/pages — body { template, slots }
 *
 * The page number is not the client's to choose: it is `nextPageNumber` over the numbers the chapter
 * already uses, which fills the first hole rather than counting up. `manga_pages` has
 * `unique (chapter_id, page_number)`, so "the page after the last one" would collide the moment a
 * page was deleted from the middle, and renumbering the pages after it would move a reader's place.
 */
export async function POST(request: Request, { params }: { params: Promise<{ chapterId: string }> }) {
  const guard = await writer(request, "manga-page-create");
  if (!guard.ok) return guard.response;

  const { chapterId } = await params;
  if (!isUuid(chapterId)) return badId("chapter");

  const body = await readBody(request);
  if (!body.ok) return body.response;

  const input = readPageInput(body.body);
  if (!input.ok) return NextResponse.json({ error: input.error }, { status: input.status });

  const created = await createPage(chapterId, guard.userId, input.value);
  if (!created.ok) return NextResponse.json({ error: created.error }, { status: created.status });

  return NextResponse.json({ page: created.value });
}
