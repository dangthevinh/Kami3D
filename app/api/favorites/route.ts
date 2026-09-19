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

      // A missing table (schema not applied yet) lands here, which is exactly the
      // case the cookie fallback exists for.
      console.warn("[kami3d] favourite write fell back to cookie:", error.message);
    }
  }

  const ids = await readFavoriteIds();
  const isFavorite = ids.includes(animalId);
  const next = isFavorite ? ids.filter((id) => id !== animalId) : [...ids, animalId];
  await writeFavoriteIds(next);

  return NextResponse.json({ ids: next, favorite: !isFavorite, source: "demo" });
}
