import { NextResponse } from "next/server";

import { getCurrentUserId } from "@/lib/auth";
import { appendQuizEntry, readQuizHistory } from "@/lib/demo-store";
import { badgesForScore } from "@/lib/profile";
import { getSupabase } from "@/lib/supabase";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { TABLES } from "@/lib/supabase";
import { QUIZ_MODES, type QuizMode } from "@/types/animal";

export const dynamic = "force-dynamic";

/**
 * Quiz score sink.
 *
 * Scores and badges are recomputed server-side from `score / totalQuestions` and
 * never trusted from the client, so a tampered request cannot mint badges.
 * Storage is Supabase when configured (Clerk user id as the key), otherwise a
 * first-party cookie so Demo Mode still has a working profile page.
 */

interface QuizRow {
  score: number;
  total_questions: number;
  mode: QuizMode;
  badges_unlocked: string[];
  created_at: string;
}

export async function GET() {
  const userId = await getCurrentUserId();

  if (userId) {
    const supabase = getSupabase();
    if (supabase) {
      const { data, error } = await supabase
        .from(TABLES.quizScores)
        .select("score, total_questions, mode, badges_unlocked, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (!error) {
        const history = (data as QuizRow[] | null) ?? [];
        return NextResponse.json({ history, source: "supabase" });
      }
      console.warn("[kami3d] quiz history read failed:", error.message);
    }
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
    const writer = getSupabaseAdmin() ?? getSupabase();
    if (writer) {
      const { error } = await writer
        .from(TABLES.quizScores)
        .insert({ user_id: userId, ...entry });

      if (!error) {
        const history = await readHistoryFrom(userId);
        return NextResponse.json({
          badges,
          best: Math.max(...history.map((row) => row.score), rawScore),
          history,
          source: "supabase",
        });
      }
      console.warn("[kami3d] quiz score write failed, falling back to cookie:", error.message);
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

async function readHistoryFrom(userId: string): Promise<QuizRow[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data } = await supabase
    .from(TABLES.quizScores)
    .select("score, total_questions, mode, badges_unlocked, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  return (data as QuizRow[] | null) ?? [];
}
