import { NextResponse } from "next/server";

import { mangaAiStatus, readMangaAiConfig } from "@/lib/manga/ai";

export const dynamic = "force-dynamic";

/**
 * GET /api/manga/ai/status — whether panel generation is on, and why not when it is off.
 *
 * This route **never** answers 5xx and never throws. The studio calls it on load, and the difference
 * between "AI is off" and "the server is broken" has to be visible in the UI: the first is a sentence
 * the visitor can act on ("set MANGA_AI_API_KEY"), the second is a bug. It also never returns the key -
 * only whether one is present.
 *
 * The variables it reads are MANGA_AI_PROVIDER, MANGA_AI_API_KEY and MANGA_AI_MODEL, documented in
 * docs/MANGA.md.
 */
export async function GET() {
  try {
    return NextResponse.json(mangaAiStatus(readMangaAiConfig()));
  } catch (error) {
    // Reached only if reading the environment itself throws, which would be a bug worth naming.
    return NextResponse.json({
      configured: false,
      provider: null,
      model: null,
      reason: "The AI configuration could not be read: " + (error instanceof Error ? error.message : String(error)),
    });
  }
}
