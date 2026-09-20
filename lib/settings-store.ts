import "server-only";

import { getPersonalDataClient } from "@/lib/personal-data";
import { TABLES } from "@/lib/supabase";
import {
  DEFAULT_USER_SETTINGS,
  coerceUserSettings,
  patchToRow,
  settingsFromRow,
  type UserSettings,
  type UserSettingsPatch,
} from "@/lib/user-settings";

/**
 * Reading and writing the visitor's own row in `user_settings`.
 *
 * Which client performs the query is decided once, in `lib/personal-data.ts`:
 * Supabase Auth uses the visitor's session so row level security enforces
 * ownership in Postgres, and Clerk uses the service role with `user_id` filtering
 * in the query itself. Either way the `user_id` here comes from the verified
 * session and never from the request body.
 *
 * Every function returns `null` when the tier is unavailable rather than throwing:
 * the settings panel has a browser-local fallback, and a database that is down
 * must not turn a preference into an error page.
 */

export interface StoredSettings {
  settings: UserSettings;
  /** False when the visitor has no row yet, so the panel can say so. */
  persisted: boolean;
}

export async function readSettingsFor(userId: string): Promise<StoredSettings | null> {
  const supabase = await getPersonalDataClient();
  if (!supabase) return null;

  const { data, error } = await supabase.from(TABLES.settings).select("*").eq("user_id", userId).maybeSingle();
  if (error) {
    console.warn("[kami3d] settings read failed:", error.message);
    return null;
  }

  // No row is not an error: it is every visitor's first visit, and the defaults
  // the panel then shows are the very ones the schema would have written.
  return data ? { settings: settingsFromRow(data), persisted: true } : { settings: DEFAULT_USER_SETTINGS, persisted: false };
}

/**
 * Applies a partial update, creating the row on the first write.
 *
 * Only the columns present in `patch` are sent, so two tabs editing different
 * groups cannot overwrite each other — and the values are coerced against the
 * same bounds as the CHECK constraints before they leave the process.
 */
export async function writeSettingsFor(userId: string, patch: UserSettingsPatch): Promise<UserSettings | null> {
  const columns = patchToRow(patch);
  if (Object.keys(columns).length === 0) return null;

  const supabase = await getPersonalDataClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from(TABLES.settings)
    .upsert({ user_id: userId, ...columns }, { onConflict: "user_id" })
    .select("*")
    .maybeSingle();

  if (error) {
    console.warn("[kami3d] settings write failed:", error.message);
    return null;
  }

  return data ? settingsFromRow(data) : coerceUserSettings({ ...DEFAULT_USER_SETTINGS, ...columns });
}

export interface PurgeCounts {
  favorites: number;
  quizScores: number;
  settings: number;
}

/**
 * Deletes everything Kami3D holds about the visitor — favourites, quiz history and
 * the settings row — **through their own client**, never the service role from the
 * browser. Each statement is filtered by `user_id` as well as relying on RLS, so
 * the same code is correct under both providers.
 */
export async function deletePersonalDataFor(userId: string): Promise<PurgeCounts | null> {
  const supabase = await getPersonalDataClient();
  if (!supabase) return null;

  const counts: PurgeCounts = { favorites: 0, quizScores: 0, settings: 0 };
  const targets = [
    { table: TABLES.favorites, key: "favorites" as const },
    { table: TABLES.quizScores, key: "quizScores" as const },
    { table: TABLES.settings, key: "settings" as const },
  ];

  for (const target of targets) {
    const { data, error } = await supabase.from(target.table).delete().eq("user_id", userId).select("user_id");
    if (error) {
      console.warn(`[kami3d] could not delete ${target.table}:`, error.message);
      return null;
    }
    counts[target.key] = (data ?? []).length;
  }

  return counts;
}
