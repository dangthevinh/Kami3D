import {
  currentSubscription,
  entitlementsFrom,
  isPremium,
  type PurchaseRow,
  type SubscriptionRow,
} from "./entitlements.ts";
import type { Entitlement } from "./plans.ts";

/**
 * What an account is entitled to, as a value (Phase 32).
 *
 * Split from `lib/payments/account.ts` on purpose: this half is pure, so the check suite can drive the
 * case that actually matters - **"we could not read" is not "you have nothing"**. The other half does
 * the reading, imports `server-only`, and cannot be imported by a test at all, which is exactly why the
 * decision it hands back lives here.
 *
 * Two honest states, and keeping them apart is the whole point:
 *
 *   - **no data client** (Demo Mode, or no Supabase configured, or a query that failed): nothing was
 *     checked. `checked: false`, no entitlements, and a `reason` a page can print. A payment question
 *     that answers "no" because the database was busy is a payment question that locks a paying visitor
 *     out, so the failure path is "we do not know" and the caller decides what to draw.
 *   - **rows**: `checked: true`, and the arithmetic in lib/payments/entitlements.ts decides the rest.
 */

export interface AccountEntitlements {
  signedIn: boolean;
  /** False when nothing could be read, so an empty list must not be read as "no entitlements". */
  checked: boolean;
  entitlements: Entitlement[];
  premium: boolean;
  subscription: (SubscriptionRow & { live: boolean; reason: string; name: string | null }) | null;
  purchases: PurchaseRow[];
  /** A sentence for the UI when the answer is unknown, or null when it is known. */
  reason: string | null;
}

export const UNKNOWN_ACCOUNT: AccountEntitlements = {
  signedIn: false,
  checked: false,
  entitlements: [],
  premium: false,
  subscription: null,
  purchases: [],
  reason: null,
};

/** The answer for a visitor with no session: known, and empty. */
export function guestAccount(): AccountEntitlements {
  return { ...UNKNOWN_ACCOUNT, checked: true };
}

/**
 * Turn rows - or the absence of them - into the answer a page draws.
 *
 * `readFailed` is passed rather than inferred from null rows so a caller cannot accidentally report a
 * failed read as an empty account.
 */
export function accountView(
  rows: { subscriptions: SubscriptionRow[]; purchases: PurchaseRow[] } | null,
  { signedIn, readFailed = false, now = new Date() }: { signedIn: boolean; readFailed?: boolean; now?: Date },
): AccountEntitlements {
  if (!signedIn) return guestAccount();

  if (!rows || readFailed) {
    return {
      ...UNKNOWN_ACCOUNT,
      signedIn: true,
      reason: "The payment tables could not be read, so this session's entitlements are unknown.",
    };
  }

  const entitlements = entitlementsFrom({ subscriptions: rows.subscriptions, purchases: rows.purchases, now });

  return {
    signedIn: true,
    checked: true,
    entitlements,
    premium: isPremium(entitlements),
    subscription: currentSubscription(rows.subscriptions, now),
    purchases: rows.purchases,
    reason: null,
  };
}
