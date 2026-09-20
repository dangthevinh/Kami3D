import "server-only";

import { getAllAnimals } from "@/lib/animals";
import { TABLES, getSupabase } from "@/lib/supabase";
import { fillDays, type DailyCount } from "@/lib/trend";
import type { Animal } from "@/types/animal";

/**
 * View statistics for the leaderboard.
 *
 * The totals come from `animals.view_count` and the history from
 * `animal_views_daily`, both written by the same Postgres function so they can
 * never disagree. With no database configured there is no history at all, which
 * the page renders as an honest empty state rather than an empty chart.
 */

export interface SpeciesTrend {
  slug: string;
  points: DailyCount[];
  total: number;
}

/** Species ranked by total views. */
export async function getMostViewed(limit = 10): Promise<Animal[]> {
  const animals = await getAllAnimals();
  return [...animals]
    .sort((a, b) => (b.view_count ?? 0) - (a.view_count ?? 0) || b.popularity - a.popularity)
    .slice(0, limit);
}

/** `YYYY-MM-DD` for the first day of the window, in UTC like `current_date`. */
function windowStart(days: number): string {
  const today = new Date();
  const end = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return new Date(end - (days - 1) * 86_400_000).toISOString().slice(0, 10);
}

/**
 * Daily history for every species, keyed by slug and gap-filled.
 *
 * One query for the whole catalogue: the alternative — a query per species — would
 * be a round trip per card on the leaderboard.
 */
export async function getDailyTrend(days = 30): Promise<Map<string, SpeciesTrend>> {
  const supabase = getSupabase();
  if (!supabase) return new Map();

  const [{ data, error }, animals] = await Promise.all([
    supabase
      .from(TABLES.viewsDaily)
      .select("animal_id, day, views")
      .gte("day", windowStart(days)),
    getAllAnimals(),
  ]);

  if (error) {
    console.warn("[kami3d] daily view history unavailable:", error.message);
    return new Map();
  }

  const slugById = new Map(animals.map((animal) => [animal.id, animal.slug]));
  const bySlug = new Map<string, DailyCount[]>();

  for (const row of (data as { animal_id: string; day: string; views: number }[] | null) ?? []) {
    const slug = slugById.get(row.animal_id);
    if (!slug) continue;
    const list = bySlug.get(slug) ?? [];
    list.push({ day: String(row.day), views: Number(row.views) });
    bySlug.set(slug, list);
  }

  const trends = new Map<string, SpeciesTrend>();
  for (const [slug, rows] of bySlug) {
    const points = fillDays(rows, days);
    trends.set(slug, { slug, points, total: points.reduce((sum, point) => sum + point.views, 0) });
  }

  return trends;
}

export interface QuizStats {
  rounds: number;
  players: number;
  bestScore: number;
  totalQuestions: number;
  averagePercent: number;
  perfect: number;
  lastPlayedAt: string | null;
  byMode: Record<string, number>;
}

/**
 * Anonymised quiz aggregates, for the public leaderboard.
 *
 * `quiz_scores` is owner-only by policy and `anon` holds no grant on the table, so
 * a per-visitor public board is impossible by design. This reads the one thing the
 * database is willing to expose: counts and averages, via the `quiz_stats()`
 * function — no `user_id`, no single round, nothing to trace back to a person.
 *
 * `null` means "no database on this deployment", which the page renders as
 * nothing at all rather than as a chart of zeroes.
 */
export async function getQuizStats(): Promise<QuizStats | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase.rpc("quiz_stats");
  if (error) {
    console.warn("[kami3d] quiz statistics unavailable:", error.message);
    return null;
  }

  const raw = (data ?? {}) as Partial<QuizStats>;
  return {
    rounds: Number(raw.rounds ?? 0),
    players: Number(raw.players ?? 0),
    bestScore: Number(raw.bestScore ?? 0),
    totalQuestions: Number(raw.totalQuestions ?? 0),
    averagePercent: Number(raw.averagePercent ?? 0),
    perfect: Number(raw.perfect ?? 0),
    lastPlayedAt: typeof raw.lastPlayedAt === "string" ? raw.lastPlayedAt : null,
    byMode: (raw.byMode ?? {}) as Record<string, number>,
  };
}

/** The whole catalogue's daily series, for the headline chart. */
export async function getOverallTrend(days = 30): Promise<DailyCount[]> {
  const trends = await getDailyTrend(days);
  const combined = new Map<string, number>();

  for (const trend of trends.values()) {
    for (const point of trend.points) {
      combined.set(point.day, (combined.get(point.day) ?? 0) + point.views);
    }
  }

  return fillDays(
    [...combined].map(([day, views]) => ({ day, views })),
    days,
  );
}
