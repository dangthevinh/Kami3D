import { NextResponse } from "next/server";

import { getCurrentUserId } from "@/lib/auth";
import { readSavedKeys, writeSavedKeys } from "@/lib/demo-store";
import { getPersonalDataClient } from "@/lib/personal-data";
import { TABLES } from "@/lib/supabase";
import { guardWrite, hostOfRequest } from "@/lib/write-guard";

export const dynamic = "force-dynamic";

/**
 * Saved catalogue items - the heart on a monument, a planet, a tree or a car.
 *
 * The same two tiers as `/api/favorites`, and for the same reason: the feature has to work for a
 * visitor with no account. Signed in, the keys go to `public.saved_items` under the visitor's own
 * session, so row level security is what enforces ownership; signed out, they go to an httpOnly cookie.
 *
 * Why a key and not an id: most of the catalogue is **not in the database**. The 47 landmarks, the 16
 * planets and spacecraft, the 16 plants and the 14 vehicles are TypeScript files, projected into the
 * same shape at read time (`lib/catalog-project.ts`), so the only stable thing to save is
 * `<category>:<slug>` - which is exactly the id a catalogue item already carries.
 */

/** The shape every key has to have, mirrored by the CHECK in `supabase/schema.sql`. */
const KEY = /^[a-z][a-z0-9-]{0,31}:[a-z0-9]+(-[a-z0-9]+)*$/;

export async function GET() {
  const userId = await getCurrentUserId();

  if (userId) {
    const supabase = await getPersonalDataClient();
    if (supabase) {
      const { data, error } = await supabase
        .from(TABLES.savedItems)
        .select("item_key")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (!error && data) {
        return NextResponse.json({ keys: data.map((row) => String(row.item_key)), source: "supabase" });
      }
    }
  }

  return NextResponse.json({ keys: await readSavedKeys(), source: userId ? "cookie-fallback" : "demo" });
}

export async function POST(request: Request) {
  const blocked = guardWrite(request, {
    name: "saved",
    rule: { limit: 60, windowMs: 60_000 },
    expectedHost: hostOfRequest(request),
  });
  if (blocked) return blocked;

  let itemKey: unknown;
  try {
    ({ itemKey } = (await request.json()) as { itemKey?: unknown });
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof itemKey !== "string" || !KEY.test(itemKey)) {
    return NextResponse.json({ error: "itemKey must look like <category>:<slug>" }, { status: 400 });
  }

  const userId = await getCurrentUserId();

  if (userId) {
    const supabase = await getPersonalDataClient();
    if (supabase) {
      const { data } = await supabase.from(TABLES.savedItems).select("item_key").eq("user_id", userId);
      const current = (data ?? []).map((row) => String(row.item_key));
      const saved = current.includes(itemKey);

      const { error } = saved
        ? await supabase.from(TABLES.savedItems).delete().eq("user_id", userId).eq("item_key", itemKey)
        : await supabase.from(TABLES.savedItems).insert({ user_id: userId, item_key: itemKey });

      if (!error) {
        const keys = saved ? current.filter((key) => key !== itemKey) : [...current, itemKey];
        return NextResponse.json({ keys, saved: !saved, source: "supabase" });
      }
      // A database that refuses the write falls through to the cookie rather than failing the click.
    }
  }

  const current = await readSavedKeys();
  const saved = current.includes(itemKey);
  const keys = saved ? current.filter((key) => key !== itemKey) : [...current, itemKey];
  await writeSavedKeys(keys);

  return NextResponse.json({ keys, saved: !saved, source: userId ? "cookie-fallback" : "demo" });
}
