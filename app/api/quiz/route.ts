import { NextResponse } from "next/server";

import { getCurrentUserId } from "@/lib/auth";
import { appendQuizEntry, readQuizHistory } from "@/lib/demo-store";
import { badgesForScore, readQuizHistoryFor } from "@/lib/profile";
import { TABLES } from "@/lib/supabase";
import { getPersonalDataClient } from "@/lib/personal-data";
import { QUIZ_MODES, type QuizMode } from "@/types/animal";

export const dynamic = "force-dynamic";

/**
 * Quiz score sink.
 *
 * Badges are recomputed server-side from `score / totalQuestions` and never
 * trusted from the client, so a tampered request cannot mint badges. Storage is
 * the signed-in account's rows in Supabase when available, otherwise a
 * first-party cookie so Demo Mode still has a working profile page.
 */

export async function GET() {
  const userId = await getCurrentUserId();

  if (userId) {
    const history = await readQuizHistoryFor(userId);
    if (history) return NextResponse.json({ history, source: "supabase" });
  }

  return NextResponse.json({ history: await readQuizHistory(), source: userId ? "cookie-fallback" : "demo" });
}

export async function POST(request: Request) {
  let payload: { score?: unknown; totalQuestions?: unknown; mode?: unknown };
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const totalQuestions = Number(payload.totalQuestions);
  const rawScore = Number(payload.score);
  const mode = typeof payload.mode === "string" && (QUIZ_MODES as readonly string[]).includes(payload.mode)
    ? (payload.mode as QuizMode)
    : "silhouette";

  if (!Number.isInteger(totalQuestions) || totalQuestions < 1 || totalQuestions > 50) {
    return NextResponse.json({ error: "totalQuestions must be an integer between 1 and 50" }, { status: 400 });
  }
  if (!Number.isFinite(rawScore) || rawScore < 0 || rawScore > totalQuestions) {
    return NextResponse.json({ error: "score must be between 0 and totalQuestions" }, { status: 400 });
  }

  // Recomputed on the server: the client's badge list is never persisted as-is.
  const badges = badgesForScore(rawScore, totalQuestions);
  const entry = {
    score: rawScore,
    total_questions: totalQuestions,
    mode,
    badges_unlocked: badges,
    created_at: new Date().toISOString(),
  };

  const userId = await getCurrentUserId();

  if (userId) {
    const supabase = await getPersonalDataClient();
    if (supabase) {
      const { error } = await supabase.from(TABLES.quizScores).insert({ user_id: userId, ...entry });

      if (!error) {
        const history = (await readQuizHistoryFor(userId)) ?? [];
        return NextResponse.json({
          badges,
          best: Math.max(...history.map((row) => row.score), rawScore),
          history,
          source: "supabase",
        });
      }

      console.warn("[kami3d] quiz score write fell back to cookie:", error.message);
    }
  }

  const history = await appendQuizEntry(entry);
  return NextResponse.json({
    badges,
    best: Math.max(...history.map((row) => row.score), rawScore),
    history,
    source: "demo",
  });
}
