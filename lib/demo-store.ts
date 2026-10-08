import "server-only";

import { cookies } from "next/headers";

import type { QuizMode } from "@/types/animal";

/**
 * Demo-Mode persistence.
 *
 * When Supabase is not configured there is no database to write to, but the
 * favourites/quiz features should still *work* rather than show a stub. We keep
 * both in signed-scope-first-party cookies so the experience is real, survives
 * reloads, and needs zero infrastructure. Once Supabase is configured these
 * helpers are bypassed entirely.
 */

const FAVORITES_COOKIE = "kami3d.favorites";
const SAVED_COOKIE = "kami3d.saved";
const QUIZ_COOKIE = "kami3d.quiz";
const MAX_AGE = 60 * 60 * 24 * 365;

export interface DemoQuizEntry {
  score: number;
  total_questions: number;
  mode: QuizMode;
  badges_unlocked: string[];
  created_at: string;
}

function parseJson<T>(raw: string | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return (parsed ?? fallback) as T;
  } catch {
    return fallback;
  }
}

export async function readFavoriteIds(): Promise<string[]> {
  const store = await cookies();
  const ids = parseJson<string[]>(store.get(FAVORITES_COOKIE)?.value, []);
  return Array.isArray(ids) ? ids.filter((id) => typeof id === "string") : [];
}

export async function writeFavoriteIds(ids: string[]): Promise<void> {
  const store = await cookies();
  store.set(FAVORITES_COOKIE, JSON.stringify([...new Set(ids)].slice(0, 200)), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

/** The catalogue keys this visitor saved, in the same shape the signed-in path stores. */
export async function readSavedKeys(): Promise<string[]> {
  const store = await cookies();
  const keys = parseJson<string[]>(store.get(SAVED_COOKIE)?.value, []);
  return Array.isArray(keys) ? keys.filter((key) => typeof key === "string") : [];
}

export async function writeSavedKeys(keys: string[]): Promise<void> {
  const store = await cookies();
  store.set(SAVED_COOKIE, JSON.stringify([...new Set(keys)].slice(0, 500)), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function readQuizHistory(): Promise<DemoQuizEntry[]> {
  const store = await cookies();
  const entries = parseJson<DemoQuizEntry[]>(store.get(QUIZ_COOKIE)?.value, []);
  return Array.isArray(entries) ? entries : [];
}

export async function appendQuizEntry(entry: DemoQuizEntry): Promise<DemoQuizEntry[]> {
  const history = await readQuizHistory();
  // Keep the payload well under the 4 KB cookie ceiling.
  const next = [entry, ...history].slice(0, 20);
  const store = await cookies();
  store.set(QUIZ_COOKIE, JSON.stringify(next), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
  return next;
}
