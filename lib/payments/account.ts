import "server-only";

import { getCurrentUserId } from "@/lib/auth";
import { accountView, UNKNOWN_ACCOUNT, type AccountEntitlements } from "@/lib/payments/account-view";
import type { PurchaseRow, SubscriptionRow } from "@/lib/payments/entitlements";
import type { Entitlement } from "@/lib/payments/plans";
import { getPersonalDataClient } from "@/lib/personal-data";

/**
 * What the signed-in visitor is entitled to, read through the client that is right for their provider
 * (Phase 32).
 *
 * Every page and route that asks "is this person premium" asks here, so the answer comes from one query
 * shape and one arithmetic (lib/payments/entitlements.ts) rather than from three places with three
 * opinions. The decision about what an answer *means* lives in the pure half, `account-view.ts`, which
 * is the file a test can drive.
 *
 * Ownership is enforced by the database, not by this query: both tables carry a policy that compares
 * `user_id` with `public.current_user_id()`, and neither has a write policy at all. The `.eq()` below
 * is belt and braces - it matters only in the Clerk-without-third-party-auth mode where the server talks
 * to Postgres as the service role (see lib/personal-data.ts).
 */

/** The rows, or null when they could not be read. */
async function readRows(userId: string): Promise<{ subscriptions: SubscriptionRow[]; purchases: PurchaseRow[] } | null> {
  const supabase = await getPersonalDataClient();
  if (!supabase) return null;

  const [subscriptions, purchases] = await Promise.all([
    supabase
      .from("subscriptions")
      .select("plan, status, current_period_end, renews_at, ends_at")
      .eq("user_id", userId)
      .order("current_period_end", { ascending: false, nullsFirst: false })
      .limit(20),
    supabase.from("purchases").select("product, status, content_id").eq("user_id", userId).limit(100),
  ]);

  if (subscriptions.error || purchases.error) return null;

  return {
    subscriptions: (subscriptions.data ?? []) as SubscriptionRow[],
    purchases: (purchases.data ?? []) as PurchaseRow[],
  };
}

/** The signed-in visitor's entitlements. Never throws; says so when it could not check. */
export async function accountEntitlements(userIdOverride?: string): Promise<AccountEntitlements> {
  const userId = userIdOverride ?? (await getCurrentUserId());
  if (!userId) return accountView(null, { signedIn: false });

  try {
    const rows = await readRows(userId);
    return accountView(rows, { signedIn: true, readFailed: rows === null });
  } catch (error) {
    return {
      ...UNKNOWN_ACCOUNT,
      signedIn: true,
      reason: "The payment tables could not be read: " + (error instanceof Error ? error.message : String(error)),
    };
  }
}

/**
 * Does this account hold an entitlement right now?
 *
 * The helper the brief asks for ("Middleware / helper kiểm tra user đã Premium chưa"). It returns false
 * for an unknown answer, which is the safe direction for a **lock**, and callers that must tell the
 * difference between "no" and "unknown" read `accountEntitlements().checked` instead.
 */
export async function checkPremium(userId?: string, entitlement: Entitlement = "premium"): Promise<boolean> {
  const account = await accountEntitlements(userId);
  return account.checked && account.entitlements.includes(entitlement);
}
