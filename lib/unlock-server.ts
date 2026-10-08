import "server-only";

import { getCurrentUserId } from "@/lib/auth";
import { accountEntitlements } from "@/lib/payments/account";
import { readPaymentsConfig } from "@/lib/payments/config";
import { getPersonalDataClient } from "@/lib/personal-data";
import { getSupabaseServer } from "@/lib/supabase-server";
import { adUnlockRow, unlockState, type LockedContentRow, type UnlockState, type UserUnlockRow } from "@/lib/unlock";

/**
 * The unlock question, asked against the database (Phase 33).
 *
 * The decision itself is pure (`lib/unlock.ts`); this file only reads and writes. Four things it is
 * careful about:
 *
 *   1. **Nothing locked is the default, and it must be cheap.** A deployment with no rows pays one small
 *      query, and a deployment with no database at all pays none: it renders the content, unchanged.
 *   2. **A read that failed is not a lock.** If the table cannot be read, the content is shown. Locking
 *      a paying visitor out of a species page because a query timed out is a worse failure than showing
 *      something that was meant to be locked.
 *   3. **An unlock is written through the visitor's own client**, so the RLS policy on `user_unlocks`
 *      - which allows `method = 'ad'` and nothing else - is what actually decides. The route cannot
 *      grant a purchase unlock even if it tried.
 *   4. **Writing an unlock twice is not an error.** The primary key makes the second write a conflict,
 *      and a visitor who watches the advert twice should see a success, not a database message.
 */

/** The row, or null. A missing table or a failed read answers null, which reads as "nothing is locked". */
export async function lockedContentRow(contentId: string): Promise<LockedContentRow | null> {
  try {
    const supabase = await getSupabaseServer();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from("locked_contents")
      .select("content_id, label, kind, unlock_methods, purchase_plan, ad_seconds, active")
      .eq("content_id", contentId)
      .limit(1);

    if (error || !data || data.length === 0) return null;
    return data[0] as LockedContentRow;
  } catch {
    return null;
  }
}

/** The signed-in visitor's unlocks. Empty for a guest, and empty when the read failed. */
export async function userUnlocks(userId: string | null): Promise<UserUnlockRow[]> {
  if (!userId) return [];
  try {
    const supabase = await getPersonalDataClient();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from("user_unlocks")
      .select("content_id, method, unlocked_at")
      .eq("user_id", userId)
      .limit(200);

    if (error || !data) return [];
    return data as UserUnlockRow[];
  } catch {
    return [];
  }
}

/** Everything the state machine needs, read once. */
export async function unlockStateFor(contentId: string): Promise<UnlockState> {
  const content = await lockedContentRow(contentId);
  if (!content || !content.active) {
    return unlockState({ content: null, unlocks: [], entitlements: [], signedIn: false, checkoutConfigured: false });
  }

  const [userId, entitlements] = await Promise.all([getCurrentUserId(), accountEntitlements()]);
  const unlocks = await userUnlocks(userId);
  const config = readPaymentsConfig();

  return unlockState({
    content,
    unlocks,
    entitlements: entitlements.checked ? entitlements.entitlements : [],
    signedIn: Boolean(userId),
    checkoutConfigured: config.checkoutConfigured,
  });
}

export type UnlockWrite = { ok: true; alreadyUnlocked: boolean } | { ok: false; status: number; reason: string };

/**
 * Record an advert unlock for one piece of content.
 *
 * Three refusals before anything is written, and they are the three ways this call could be abused:
 * no session (nothing to attach it to), unknown or inactive content (unlocking something that is not
 * locked), or content that does not offer the advert route at all.
 */
export async function recordAdUnlock(contentId: string): Promise<UnlockWrite> {
  const userId = await getCurrentUserId();
  if (!userId) return { ok: false, status: 401, reason: "Sign in to unlock this." };

  const content = await lockedContentRow(contentId);
  if (!content || !content.active) {
    // Idempotent by design: content that is not locked is already available, so this answers success
    // rather than inventing a 404 for a page that plainly renders.
    return { ok: true, alreadyUnlocked: true };
  }

  const allowed = Array.isArray(content.unlock_methods) ? content.unlock_methods : [];
  if (!allowed.includes("ad")) {
    return { ok: false, status: 409, reason: "This content cannot be unlocked by watching an advert." };
  }

  const existing = await userUnlocks(userId);
  if (existing.some((unlock) => unlock.content_id === contentId)) return { ok: true, alreadyUnlocked: true };

  const supabase = await getPersonalDataClient();
  if (!supabase) return { ok: false, status: 503, reason: "There is no database configured, so nothing can be unlocked." };

  const { error } = await supabase.from("user_unlocks").insert(adUnlockRow(userId, contentId));
  if (error) {
    // 23505 is "unique violation": the row already exists, which is what an idempotent unlock looks like.
    if (error.code === "23505") return { ok: true, alreadyUnlocked: true };
    return { ok: false, status: 502, reason: error.message };
  }

  return { ok: true, alreadyUnlocked: false };
}
