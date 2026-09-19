import { NextResponse } from "next/server";

import { getCurrentUserId } from "@/lib/auth";
import { readFavoriteIds, writeFavoriteIds } from "@/lib/demo-store";
import { readFavoriteIdsFor } from "@/lib/profile";
import { getSupabase } from "@/lib/supabase";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { TABLES } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * Favourites endpoint.
 *
 * Three tiers, in order of preference:
 *   1. Clerk user + Supabase  -> rows in `user_favorites`
 *   2. Supabase service role  -> used for writes when RLS is locked down
 *   3. Demo Mode              -> an httpOnly cookie, so the feature genuinely
 *                                works with zero configuration
 */

const readFromDatabase = readFavoriteIdsFor;

export async function GET() {
  const userId = await getCurrentUserId();

  if (userId) {
    const ids = await readFromDatabase(userId);
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
    const writer = getSupabaseAdmin();
    if (writer) {
      const current = (await readFromDatabase(userId)) ?? [];
      const isFavorite = current.includes(animalId);

      const { error } = isFavorite
        ? await writer.from(TABLES.favorites).delete().eq("user_id", userId).eq("animal_id", animalId)
        : await writer.from(TABLES.favorites).insert({ user_id: userId, animal_id: animalId });

      if (!error) {
        const ids = isFavorite ? current.filter((id) => id !== animalId) : [...current, animalId];
        return NextResponse.json({ ids, favorite: !isFavorite, source: "supabase" });
      }
      console.warn("[kami3d] favourite write failed, falling back to cookie:", error.message);
    }
  }

  const ids = await readFavoriteIds();
  const isFavorite = ids.includes(animalId);
  const next = isFavorite ? ids.filter((id) => id !== animalId) : [...ids, animalId];
  await writeFavoriteIds(next);

  return NextResponse.json({ ids: next, favorite: !isFavorite, source: "demo" });
}
