import { NextResponse } from "next/server";

import { getCurrentUserId } from "@/lib/auth";
import { deletePersonalDataFor, readSettingsFor, writeSettingsFor } from "@/lib/settings-store";
import { DEFAULT_USER_SETTINGS, coerceUserSettings, type UserSettingsPatch } from "@/lib/user-settings";
import { guardWrite, hostOfRequest } from "@/lib/write-guard";

export const dynamic = "force-dynamic";

/**
 * The signed-in visitor's preferences.
 *
 * `GET` answers for a guest too — with `signedIn: false` — because the panel has to
 * be able to tell "you have no account" from "your account has no settings yet".
 *
 * `PATCH`-shaped writes go through `POST` with a `patch` object: only the keys the
 * visitor actually touched are written, so a stale tab cannot roll back a change
 * made elsewhere. Ownership is never read from the body; the user id comes from the
 * verified session, and the query is filtered by it.
 *
 * `DELETE` is the account panel's "delete my data": favourites, quiz history and
 * settings, deleted with the visitor's own rights (see `lib/settings-store.ts`).
 */

const MAX_PATCH_KEYS = 32;

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ signedIn: false, settings: null, persisted: false });

  const stored = await readSettingsFor(userId);
  if (!stored) {
    return NextResponse.json({
      signedIn: true,
      settings: DEFAULT_USER_SETTINGS,
      persisted: false,
      unavailable: true,
    });
  }

  return NextResponse.json({ signedIn: true, ...stored });
}

export async function POST(request: Request) {
  const blocked = guardWrite(request, { name: "settings", rule: { limit: 30, windowMs: 60_000 }, expectedHost: hostOfRequest(request) });
  if (blocked) return blocked;

  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Sign in to save your settings." }, { status: 401 });

  let patch: unknown;
  try {
    ({ patch } = (await request.json()) as { patch?: unknown });
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof patch !== "object" || patch === null || Array.isArray(patch)) {
    return NextResponse.json({ error: "patch must be an object" }, { status: 400 });
  }

  const keys = Object.keys(patch);
  if (keys.length === 0) return NextResponse.json({ error: "patch is empty" }, { status: 400 });
  if (keys.length > MAX_PATCH_KEYS) return NextResponse.json({ error: "patch is too large" }, { status: 400 });

  // Coerced before it reaches Postgres: an out-of-range value is repaired here
  // rather than rejected by a CHECK constraint the visitor cannot act on.
  const settings = coerceUserSettings(patch as UserSettingsPatch);
  const saved = await writeSettingsFor(userId, settings);

  if (!saved) return NextResponse.json({ error: "Could not save that setting. Please try again." }, { status: 502 });
  return NextResponse.json({ settings: saved, persisted: true });
}

export async function DELETE() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Sign in to delete your data." }, { status: 401 });

  const counts = await deletePersonalDataFor(userId);
  if (!counts) return NextResponse.json({ error: "Could not delete your data. Please try again." }, { status: 502 });

  return NextResponse.json({ deleted: counts });
}
