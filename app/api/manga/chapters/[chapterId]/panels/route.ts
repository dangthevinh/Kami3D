import { NextResponse } from "next/server";

import { getPersonalDataClient } from "@/lib/personal-data";
import { MANGA_PANEL_MAX_BYTES } from "@/lib/manga/rules";
import { checkImage, panelSize, storePanelImage } from "@/lib/manga/panel";
import { requireOwnedChapter } from "@/lib/manga/project";
import { MANGA_UPLOAD_LIMIT, badId, isUuid, writer } from "@/app/api/manga/_lib/guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
/** One image through Storage; a slow connection should not be cut off mid-upload. */
export const maxDuration = 60;

/**
 * POST /api/manga/chapters/[chapterId]/panels — multipart/form-data with a `file` field.
 *
 * The order of the checks is the point of this route:
 *
 *   1. the guard and the session, then the **ownership check**, before the multipart body is parsed -
 *      an upload aimed at somebody else's chapter costs one query and reads no bytes;
 *   2. `file.size` against the bucket's own 8 MB limit, before the bytes are materialised;
 *   3. the declared content type **and** the signature of the bytes, because a browser labels a file
 *      from its name;
 *   4. Storage, then the row - never the row first, because a row pointing at a missing object is a
 *      broken image on a published page.
 */
export async function POST(request: Request, { params }: { params: Promise<{ chapterId: string }> }) {
  const guard = await writer(request, "manga-panel-upload", MANGA_UPLOAD_LIMIT);
  if (!guard.ok) return guard.response;

  const { chapterId } = await params;
  if (!isUuid(chapterId)) return badId("chapter");

  // The authoritative check is inside storePanelImage(); this one exists so that an unauthorised
  // request never gets as far as reading a file.
  const supabase = await getPersonalDataClient();
  if (!supabase) return NextResponse.json({ error: "Manga Studio has nowhere to save this yet." }, { status: 503 });
  const owned = await requireOwnedChapter(supabase, chapterId, guard.userId);
  if (!owned.ok) return NextResponse.json({ error: owned.error }, { status: owned.status });

  let form: FormData | null = null;
  try {
    form = await request.formData();
  } catch {
    form = null;
  }
  if (!form) return NextResponse.json({ error: "Expected a multipart form with a file field." }, { status: 400 });

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Attach an image in the \"file\" field." }, { status: 400 });
  }
  if (file.size > MANGA_PANEL_MAX_BYTES) {
    return NextResponse.json(
      { error: "A panel can be at most " + Math.floor(MANGA_PANEL_MAX_BYTES / (1024 * 1024)) + " MB." },
      { status: 413 },
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const checked = checkImage(bytes, file.type);
  if (!checked.ok) return NextResponse.json({ error: checked.error }, { status: checked.status });

  const panel = await storePanelImage({
    chapterId,
    userId: guard.userId,
    bytes,
    declaredType: file.type,
    ...panelSize(bytes),
  });
  if (!panel.ok) return NextResponse.json({ error: panel.error }, { status: panel.status });

  return NextResponse.json({ panel: panel.value });
}
