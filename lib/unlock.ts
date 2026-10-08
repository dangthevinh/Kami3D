import { planById } from "./payments/plans.ts";

/**
 * What is locked, what a visitor has unlocked, and how (Phase 33).
 *
 * Pure, with the clock and the entitlements injected, because every interesting case here is about
 * *time* and *ownership*: an unlock that expired, a purchase that was refunded, a visitor who is signed
 * out and therefore cannot record anything at all.
 *
 * The decisions, and why:
 *
 *   - **Nothing locked means nothing to do.** With no row (or an inactive one) the caller renders the
 *     content exactly as before: this phase must be invisible until an admin marks something.
 *   - **An unlock is a row, and the row is the proof.** One row per (visitor, content) - the primary key
 *     makes watching the advert twice still one unlock.
 *   - **A purchase unlocks through the entitlement, not through a second row.** Phase 32 already stores
 *     what was bought; asking "does this account hold the entitlement this content's plan grants" is one
 *     question rather than two records that can disagree.
 *   - **A visitor who is not signed in cannot use either way out.** An unlock has to belong to somebody,
 *     and a purchase already does - so the modal offers signing in rather than a button that fails.
 *   - **A locked door with no key is not offered.** The methods listed are the intersection of what the
 *     content allows and what is possible right now: buying needs a purchase plan *and* a configured
 *     checkout, watching needs a session.
 */

export const UNLOCK_METHODS = ["ad", "purchase"] as const;
export type UnlockMethod = (typeof UNLOCK_METHODS)[number];

export const CONTENT_KINDS = ["model", "chapter", "catalog-entry"] as const;
export type ContentKind = (typeof CONTENT_KINDS)[number];

/** One row of `public.locked_contents`. */
export interface LockedContentRow {
  content_id: string;
  label: string;
  kind: string;
  unlock_methods: string[];
  purchase_plan: string | null;
  ad_seconds: number;
  active: boolean;
}

/** One row of `public.user_unlocks`. */
export interface UserUnlockRow {
  content_id: string;
  method: string;
  unlocked_at: string;
}

/** A stable key for a piece of content. Text rather than a foreign key: these are not rows of one table. */
export function contentIdFor(kind: ContentKind, id: string): string {
  return kind + ":" + id.trim();
}

/** The key for a catalogue entry, which is identified by its category and its slug. */
export function catalogContentId(category: string, slug: string): string {
  return contentIdFor("catalog-entry", category + "/" + slug);
}

/** A key split back into its two halves, or null when it is not one. */
export function parseContentId(contentId: string): { kind: string; id: string } | null {
  const separator = contentId.indexOf(":");
  if (separator <= 0) return null;
  const kind = contentId.slice(0, separator);
  const id = contentId.slice(separator + 1).trim();
  if (id.length === 0) return null;
  if (!(CONTENT_KINDS as readonly string[]).includes(kind)) return null;
  return { kind, id };
}

export interface UnlockState {
  /** False when there is nothing to unlock, which is the default state of the whole site. */
  locked: boolean;
  /** The label to show in the modal, when there is one. */
  label: string | null;
  contentId: string | null;
  /** Why it is locked, in a sentence, or null when it is not. */
  reason: string | null;
  /** The ways out that are actually available right now. */
  methods: UnlockMethod[];
  /** How long the rewarded ad runs, clamped to the range the schema enforces. */
  adSeconds: number;
  /** Set when it is not locked *because* somebody unlocked it. */
  unlockedBy: "ad" | "purchase" | "admin" | null;
  /** True when a signed-in visitor is required before either way out exists. */
  needsSignIn: boolean;
  /** The plan whose purchase unlocks this, when buying is one of the ways out. */
  purchasePlan: string | null;
}

const NOT_LOCKED: UnlockState = {
  locked: false,
  label: null,
  contentId: null,
  reason: null,
  methods: [],
  adSeconds: 0,
  unlockedBy: null,
  needsSignIn: false,
  purchasePlan: null,
};

/** The run time of a rewarded ad, clamped: the schema checks 5..120 and a nonsense value must not hang a modal. */
export function clampAdSeconds(value: number | null | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 15;
  return Math.min(120, Math.max(5, Math.round(value)));
}

export interface UnlockStateInput {
  content: LockedContentRow | null;
  unlocks: UserUnlockRow[];
  entitlements: string[];
  signedIn: boolean;
  checkoutConfigured: boolean;
  now?: Date;
}

export function unlockState({
  content,
  unlocks,
  entitlements,
  signedIn,
  checkoutConfigured,
}: UnlockStateInput): UnlockState {
  if (!content || !content.active) return NOT_LOCKED;

  const row = unlocks.find((unlock) => unlock.content_id === content.content_id);
  if (row) {
    return {
      locked: false,
      label: content.label,
      contentId: content.content_id,
      reason: null,
      methods: [],
      adSeconds: clampAdSeconds(content.ad_seconds),
      unlockedBy: row.method === "purchase" || row.method === "admin" ? row.method : "ad",
      needsSignIn: false,
      purchasePlan: content.purchase_plan,
    };
  }

  // A purchase unlocks through the entitlement Phase 32 stored, not through a second row here.
  const plan = planById(content.purchase_plan);
  const granted = plan ? plan.grants.filter((entitlement) => entitlements.includes(entitlement)) : [];
  if (plan && granted.length > 0) {
    return {
      locked: false,
      label: content.label,
      contentId: content.content_id,
      reason: null,
      methods: [],
      adSeconds: clampAdSeconds(content.ad_seconds),
      unlockedBy: "purchase",
      needsSignIn: false,
      purchasePlan: content.purchase_plan,
    };
  }

  const allowed = Array.isArray(content.unlock_methods) ? content.unlock_methods : [];
  const methods: UnlockMethod[] = [];
  if (signedIn && allowed.includes("ad")) methods.push("ad");
  if (signedIn && allowed.includes("purchase") && plan && checkoutConfigured) methods.push("purchase");

  const adSeconds = clampAdSeconds(content.ad_seconds);
  const reason = !signedIn
    ? "Sign in to unlock this: an unlock belongs to an account."
    : methods.length === 0
      ? "This content is locked and this deployment offers no way to unlock it right now."
      : "Watch a short advert (" + adSeconds + "s) or buy it once.";

  return {
    locked: true,
    label: content.label,
    contentId: content.content_id,
    reason,
    methods,
    adSeconds,
    unlockedBy: null,
    needsSignIn: !signedIn,
    purchasePlan: methods.includes("purchase") ? content.purchase_plan : null,
  };
}

/**
 * Did the rewarded advert run long enough?
 *
 * The honest description of the mock: the **client** reports when it started, and this only decides
 * whether that report is long enough to have been a real viewing. A client that lies can therefore earn
 * an unlock for free. That is acceptable for a placeholder and **not** acceptable for a real network,
 * which is why the real integration is not "keep the timer on the server" but the network's own
 * server-side verification callback (see docs/ADS.md). Writing that down is the point of this comment:
 * the next person must not mistake this for enforcement.
 */
export function rewardedAdVerdict({
  startedAtMs,
  nowMs,
  seconds,
}: {
  startedAtMs: number;
  nowMs: number;
  seconds: number;
}): { earned: boolean; elapsedMs: number; requiredMs: number } {
  const requiredMs = clampAdSeconds(seconds) * 1000;
  const elapsedMs = Math.max(0, nowMs - startedAtMs);
  return { earned: elapsedMs >= requiredMs, elapsedMs, requiredMs };
}

/** The unlock row a request may write. Only the ad method is ever written from a browser. */
export function adUnlockRow(userId: string, contentId: string, now: Date = new Date()): { user_id: string; content_id: string; method: "ad"; unlocked_at: string } {
  return { user_id: userId, content_id: contentId, method: "ad", unlocked_at: now.toISOString() };
}

/** The payload of `POST /api/admin/locked`, validated. A string is the refusal sentence. */
export function lockedContentPatch(body: Record<string, unknown>): {
  contentId: string;
  label: string;
  kind: ContentKind;
  methods: UnlockMethod[];
  purchasePlan: string | null;
  adSeconds: number;
  active: boolean;
} | string {
  const rawId = typeof body.contentId === "string" ? body.contentId.trim() : "";
  const parsed = parseContentId(rawId);
  if (!parsed) {
    return "contentId must look like \"model:tyrannosaurus-rex\", \"chapter:<uuid>\" or \"catalog-entry:space/uranus\".";
  }

  const label = typeof body.label === "string" ? body.label.trim() : "";
  if (label.length === 0 || label.length > 120) return "label must be between 1 and 120 characters.";

  const given = Array.isArray(body.methods) ? body.methods : [];
  const methods = given.filter((entry): entry is UnlockMethod => (UNLOCK_METHODS as readonly string[]).includes(String(entry)));

  // The unknown-entry check comes first on purpose: "bribe is not a way out" is the useful sentence, and
  // the emptiness message would otherwise fire for a list that was not empty at all.
  if (methods.length !== given.length) return "methods may only contain " + UNLOCK_METHODS.join(" and ") + ".";
  if (methods.length === 0) {
    return "A locked door needs a key: methods must list at least one of " + UNLOCK_METHODS.join(", ") + ".";
  }

  const purchasePlan = typeof body.purchasePlan === "string" && body.purchasePlan.trim().length > 0 ? body.purchasePlan.trim() : null;
  if (methods.includes("purchase") && !purchasePlan) {
    return "Buying is one of the ways out, so purchasePlan must name the plan that unlocks it.";
  }
  if (purchasePlan && !planById(purchasePlan)) return "There is no plan called \"" + purchasePlan + "\".";

  return {
    contentId: rawId,
    label,
    kind: parsed.kind as ContentKind,
    methods,
    purchasePlan,
    adSeconds: clampAdSeconds(typeof body.adSeconds === "number" ? body.adSeconds : null),
    active: body.active !== false,
  };
}
