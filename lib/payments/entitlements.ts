import { PREMIUM, planById, type Entitlement } from "./plans.ts";

/**
 * Who is entitled to what, as arithmetic (Phase 32).
 *
 * This is the file the rest of the app asks. A page that wants to know whether to draw a lock, the
 * settings screen that reports a subscription, and the webhook that writes the rows all end up here,
 * because "is this person premium" is a question with one answer and it should not be re-derived in
 * three places with three different opinions about a cancelled subscription.
 *
 * The rules, and why each one is what it is:
 *
 *   - **active / on_trial** - entitled.
 *   - **cancelled** - entitled **until the date Lemon Squeezy set**, because cancelling is not the same
 *     as ending: the visitor paid for a period. A cancelled row with no date is **not** entitled: there
 *     is nothing to honour, and inventing a period would be inventing a fact.
 *   - **past_due / unpaid** - not entitled. A payment that failed is a payment that failed; the row is
 *     kept so the settings page can say why, and the grace period a real store may want is a decision
 *     for the operator rather than a silent default here.
 *   - **paused / expired** - not entitled.
 *   - **a purchase** counts only when the order is **paid**. A refunded order (Phase 32 handles
 *     order_refunded) takes the entitlement back, which is the whole reason the status is stored.
 *
 * Time is injected, so a test can watch a subscription end without waiting a month.
 */

/** The subscription statuses that grant their plan's entitlements outright. */
export const LIVE_STATUSES: readonly string[] = ["active", "on_trial"];

/** The statuses that only grant while the period they paid for is still running. */
export const UNTIL_PERIOD_ENDS_STATUSES: readonly string[] = ["cancelled"];

export interface SubscriptionRow {
  plan: string | null;
  status: string | null;
  /** The date the paid period ends - ends_at when cancelled, otherwise renews_at. */
  current_period_end: string | null;
}

export interface PurchaseRow {
  product: string | null;
  status: string | null;
  /** The content a one-time purchase unlocked, when it is about one thing rather than a pack. */
  content_id?: string | null;
}

export interface EntitlementInput {
  subscriptions: SubscriptionRow[];
  purchases: PurchaseRow[];
  now?: Date;
}

function time(value: string | null | undefined): number | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.getTime();
}

/**
 * Is this subscription live right now, and if not, say why in one sentence.
 *
 * The reason is returned rather than logged because the settings page prints it: "your subscription
 * was cancelled on the 3rd" is a far better answer than a lock with no explanation.
 */
export function subscriptionState(row: SubscriptionRow, now: Date = new Date()): { live: boolean; reason: string } {
  const status = (row.status ?? "").trim().toLowerCase();
  const plan = planById(row.plan);

  if (!plan) return { live: false, reason: "This subscription is for a plan this build does not know." };
  if (LIVE_STATUSES.includes(status)) return { live: true, reason: "Active." };

  if (UNTIL_PERIOD_ENDS_STATUSES.includes(status)) {
    const endsAt = time(row.current_period_end);
    if (endsAt === null) return { live: false, reason: "Cancelled, and no end date was recorded." };
    if (endsAt > now.getTime()) return { live: true, reason: "Cancelled: access runs to the end of the paid period." };
    return { live: false, reason: "Cancelled and the paid period has ended." };
  }

  if (status === "past_due" || status === "unpaid") {
    return { live: false, reason: "The last payment did not go through." };
  }
  if (status === "paused") return { live: false, reason: "Paused." };
  if (status === "expired") return { live: false, reason: "Expired." };

  return { live: false, reason: "Unknown status: " + (row.status ?? "(none)") + "." };
}

/** Every entitlement these rows grant right now, deduped and sorted so two calls compare equal. */
export function entitlementsFrom({ subscriptions, purchases, now = new Date() }: EntitlementInput): Entitlement[] {
  const granted = new Set<Entitlement>();

  for (const subscription of subscriptions) {
    if (!subscriptionState(subscription, now).live) continue;
    for (const entitlement of planById(subscription.plan)?.grants ?? []) granted.add(entitlement);
  }

  for (const purchase of purchases) {
    if ((purchase.status ?? "").trim().toLowerCase() !== "paid") continue;
    for (const entitlement of planById(purchase.product)?.grants ?? []) granted.add(entitlement);
    // A purchase that names one piece of content unlocks that piece, whatever the product was.
    if (purchase.content_id) granted.add("unlock:" + purchase.content_id);
  }

  return [...granted].sort();
}

export function hasEntitlement(entitlements: readonly Entitlement[], wanted: Entitlement): boolean {
  return entitlements.includes(wanted);
}

export function isPremium(entitlements: readonly Entitlement[]): boolean {
  return hasEntitlement(entitlements, PREMIUM);
}

/** The newest live subscription, for the settings screen. Null when there is none. */
export function currentSubscription(
  subscriptions: SubscriptionRow[],
  now: Date = new Date(),
): (SubscriptionRow & { live: boolean; reason: string; name: string | null }) | null {
  const live = subscriptions.filter((row) => subscriptionState(row, now).live);
  const candidates = live.length > 0 ? live : subscriptions;
  if (candidates.length === 0) return null;

  const sorted = [...candidates].sort((a, b) => (time(b.current_period_end) ?? 0) - (time(a.current_period_end) ?? 0));
  const row = sorted[0]!;
  const state = subscriptionState(row, now);

  return { ...row, live: state.live, reason: state.reason, name: planById(row.plan)?.name ?? null };
}
