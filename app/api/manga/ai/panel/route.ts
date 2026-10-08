import { NextResponse } from "next/server";

import { generatePanelImage } from "@/lib/manga/ai";
import { MANGA_AI_LIMIT, badId, isUuid, readBody, writer } from "@/app/api/manga/_lib/guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
/** An image API is slow by nature; this gives one generation room without holding a slot open. */
export const maxDuration = 120;

/**
 * POST /api/manga/ai/panel — body { chapterId, prompt }
 *
 * Two answers worth reading carefully:
 *
 *   - **503 with a sentence** when generation is not configured. The sentence comes from
 *     `readMangaAiConfig` and names the missing variable, because "AI is unavailable" is not something
 *     a person can act on. Nothing is charged here: the provider is not called at all.
 *   - **502 with the provider's own message** when the call fails. A rejected key, an unknown model
 *     name and an upstream outage are three different problems, and only the provider knows which one
 *     happened. The message is passed through rather than replaced with "something went wrong".
 *
 * A generation costs money, so the rate limit is five a minute and the ownership check runs before the
 * provider is called.
 */
export async function POST(request: Request) {
  const guard = await writer(request, "manga-ai-panel", MANGA_AI_LIMIT);
  if (!guard.ok) return guard.response;

  const body = await readBody(request);
  if (!body.ok) return body.response;

  const chapterId = body.body.chapterId;
  if (typeof chapterId !== "string" || !isUuid(chapterId)) return badId("chapter");

  const prompt = body.body.prompt;
  if (typeof prompt !== "string") {
    return NextResponse.json({ error: "A prompt is required." }, { status: 400 });
  }

  const created = await generatePanelImage({ chapterId, userId: guard.userId, prompt });
  if (!created.ok) return NextResponse.json({ error: created.error }, { status: created.status });

  return NextResponse.json({ panel: created.value }, { status: 201 });
}
