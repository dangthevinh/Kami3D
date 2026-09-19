import "server-only";

import { getCurrentUserId } from "@/lib/auth";
import { readFavoriteIds as readCookieFavorites, readQuizHistory as readCookieQuiz } from "@/lib/demo-store";
import { TABLES } from "@/lib/supabase";
import { getSupabaseServer } from "@/lib/supabase-server";
import { BADGES } from "@/types/animal";

/**
 * Everything the profile page (and the score APIs) need about the current
 * visitor, resolved from whichever storage tier is active.
 *
 * Personal rows are read with the **signed-in Supabase client**, so row level
 * security decides what comes back — the application never holds a key that could
 * bypass it. Returning `null` means "this tier is unavailable", which is what
 * makes callers fall back to the browser-local collection instead of reporting an
 * empty one.
 */

export interface QuizEntry {
  score: number;
  total_questions: number;
  mode: string;
  badges_unlocked: string[];
  created_at: string;
}

export type StorageSource = "supabase" | "cookie-fallback" | "demo";

export interface ViewerProfile {
  userId: string | null;
  signedIn: boolean;
  favoriteIds: string[];
  favoriteSource: StorageSource;
  quizHistory: QuizEntry[];
  quizSource: StorageSource;
  badges: string[];
  bestScore: number;
  bestTotal: number;
  roundsPlayed: number;
}

/** Badge unlocks are always derived from the ratio, never trusted from input. */
export function badgesForScore(score: number, total: number): string[] {
  const ratio = total > 0 ? score / total : 0;
  return BADGES.filter((badge) => ratio >= badge.threshold).map((badge) => badge.id);
}

export async function readFavoriteIdsFor(userId: string): Promise<string[] | null> {
  const supabase = await getSupabaseServer();
  if (!supabase) return null;

  const { data, error } = await supabase.from(TABLES.favorites).select("animal_id").eq("user_id", userId);
  if (error) {
    console.warn("[kami3d] favourites read failed:", error.message);
    return null;
  }
  return ((data as { animal_id: string }[] | null) ?? []).map((row) => row.animal_id);
}

export async function readQuizHistoryFor(userId: string): Promise<QuizEntry[] | null> {
  const supabase = await getSupabaseServer();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from(TABLES.quizScores)
    .select("score, total_questions, mode, badges_unlocked, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    console.warn("[kami3d] quiz history read failed:", error.message);
    return null;
  }
  return (data as QuizEntry[] | null) ?? [];
}

export async function getViewerProfile(): Promise<ViewerProfile> {
  const userId = await getCurrentUserId();

  let favoriteIds: string[] | null = null;
  let favoriteSource: StorageSource = userId ? "supabase" : "demo";

  if (userId) {
    favoriteIds = await readFavoriteIdsFor(userId);
    if (favoriteIds === null) favoriteSource = "cookie-fallback";
  }
  if (favoriteIds === null) {
    favoriteIds = await readCookieFavorites();
    if (!userId) favoriteSource = "demo";
  }

  let quizHistory: QuizEntry[] | null = null;
  let quizSource: StorageSource = userId ? "supabase" : "demo";

  if (userId) {
    quizHistory = await readQuizHistoryFor(userId);
    if (quizHistory === null) quizSource = "cookie-fallback";
  }
  if (quizHistory === null) {
    quizHistory = await readCookieQuiz();
    if (!userId) quizSource = "demo";
  }

  const badges = [...new Set(quizHistory.flatMap((entry) => entry.badges_unlocked ?? []))];
  const best = quizHistory.reduce<QuizEntry | null>(
    (current, entry) => (current === null || entry.score > current.score ? entry : current),
    null,
  );

  return {
    userId,
    signedIn: Boolean(userId),
    favoriteIds,
    favoriteSource,
    quizHistory,
    quizSource,
    badges,
    bestScore: best?.score ?? 0,
    bestTotal: best?.total_questions ?? 10,
    roundsPlayed: quizHistory.length,
  };
}
