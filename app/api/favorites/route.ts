import { NextResponse } from "next/server";

import { getCurrentUserId } from "@/lib/auth";
import { readFavoriteIds, writeFavoriteIds } from "@/lib/demo-store";
import { readFavoriteIdsFor } from "@/lib/profile";
import { TABLES } from "@/lib/supabase";
import { getSupabaseServer } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

/**
 * Favourites endpoint.
 *
 * Two tiers:
 *   1. Signed in -> rows in `user_favorites`, written with the visitor's own
 *      Supabase session so row level security is the thing enforcing ownership.
 *   2. Signed out, or the database is unreachable -> an httpOnly cookie, so the
 *      feature genuinely works with no account and no schema applied.
 */

export async function GET() {
  const userId = await getCurrentUserId();

  if (userId) {
    const ids = await readFavoriteIdsFor(userId);
    if (ids) return NextResponse.json({ ids, source: "supabase" });
  }

  return NextResponse.json({ ids: await readFavoriteIds(), source: userId ? "cookie-fallback" : "demo" });
}

export async function POST(request: Request) {
  let animalId: unknown;
  try {
    ({ animalId } = (await request.json()) as { animalId?: unknown });
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof animalId !== "string" || animalId.length === 0 || animalId.length > 64) {
    return NextResponse.json({ error: "animalId must be a non-empty string" }, { status: 400 });
  }

  const userId = await getCurrentUserId();

  if (userId) {
    const supabase = await getSupabaseServer();
    if (supabase) {
      const current = (await readFavoriteIdsFor(userId)) ?? [];
      const isFavorite = current.includes(animalId);

      const { error } = isFavorite
        ? await supabase.from(TABLES.favorites).delete().eq("user_id", userId).eq("animal_id", animalId)
        : await supabase.from(TABLES.favorites).insert({ user_id: userId, animal_id: animalId });

      if (!error) {
        const ids = isFavorite ? current.filter((id) => id !== animalId) : [...current, animalId];
        return NextResponse.json({ ids, favorite: !isFavorite, source: "supabase" });
      }

      // A signed-in visitor's collection lives in the database, and the read path
      // only ever looks there. Silently parking the write in a cookie would show a
      // heart that disappears on the next load, so the failure is reported and the
      // client rolls its optimistic update back.
      console.warn("[kami3d] favourite write rejected:", error.message);

      const missingSpecies = error.message.includes("foreign key") || error.code === "23503";
      return NextResponse.json(
        {
          error: missingSpecies
            ? "This species is not in the database yet, so it cannot be saved. Run supabase/seed.sql (see README) to load the catalogue."
            : "Could not save that favourite. Please try again.",
          ids: current,
        },
        { status: missingSpecies ? 409 : 502 },
      );
    }
  }

  // Signed out: the browser-local collection is the only store, and it is real.
  const ids = await readFavoriteIds();
  const isFavorite = ids.includes(animalId);
  const next = isFavorite ? ids.filter((id) => id !== animalId) : [...ids, animalId];
  await writeFavoriteIds(next);

  return NextResponse.json({ ids: next, favorite: !isFavorite, source: "demo" });
}
