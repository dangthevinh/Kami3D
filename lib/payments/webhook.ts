import { createHmac, timingSafeEqual } from "node:crypto";

import { type PaymentsConfig, variantFor } from "./config.ts";
import { PLAN_IDS, type PlanId, planById } from "./plans.ts";

/**
 * The Lemon Squeezy webhook, as pure functions (Phase 32).
 *
 * Everything here can be driven by a test with a body it wrote itself, which is the only way to be
 * honest about a webhook in a repository that has no store keys: **the signature check is exercised for
 * real** (a locally computed HMAC against a locally chosen secret), and what cannot be exercised - a
 * live delivery from Lemon Squeezy - is named as such in docs/PAYMENTS.md rather than implied.
 *
 * Two shapes matter:
 *
 *   1. **The signature.** Lemon Squeezy signs the **raw request body** with the signing secret,
 *      HMAC-SHA256, and sends it hex-encoded in X-Signature. So the route must read request.text() and
 *      verify *that* string - a route that parses JSON first and re-serialises it verifies a different
 *      byte sequence and fails (or, worse, succeeds against a body nobody sent).
 *      The comparison is timingSafeEqual, not ===: a signature check that leaks its answer through
 *      timing is a signature check that can be solved one byte at a time.
 *   2. **The event.** meta.event_name says what happened and meta.custom_data.user_id says whose account
 *      it belongs to - we set that at checkout, and a delivery without it is refused rather than guessed
 *      at from an email address.
 *
 * Replay is not defended against here, and that is deliberate: a replayed delivery writes the same row
 * again, and lemon_squeezy_id is unique in the schema, so the second write is an update of the same
 * subscription rather than a second entitlement. Idempotency is a schema property here, not a nonce
 * table - which also means a redelivery after a fixed bug still lands.
 */

export const SIGNATURE_HEADER = "x-signature";

/** The events this build acts on. Anything else is acknowledged and ignored, on purpose. */
export const HANDLED_EVENTS = [
  "subscription_created",
  "subscription_updated",
  "subscription_cancelled",
  "subscription_resumed",
  "subscription_expired",
  "subscription_paused",
  "subscription_unpaused",
  "order_created",
  "order_refunded",
] as const;

export type HandledEvent = (typeof HANDLED_EVENTS)[number];

/** The hex HMAC a signing secret produces for a body. Exported so a test can sign as Lemon Squeezy does. */
export function signPayload(rawBody: string, secret: string): string {
  return createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
}

/**
 * Does this request really come from Lemon Squeezy?
 *
 * False for a missing header, a blank secret, a wrong length (which is what a wrong secret almost
 * always produces) and a valid-looking signature that does not match. The empty-secret case is checked
 * first: HMAC with an empty key is perfectly computable, so a route that forgot to check would accept
 * a signature anyone could produce.
 */
export function verifySignature(rawBody: string, signature: string | null, secret: string | null): boolean {
  if (!secret || secret.trim().length === 0) return false;
  const provided = (signature ?? "").trim().toLowerCase();
  if (provided.length === 0) return false;

  const expected = signPayload(rawBody, secret);
  if (provided.length !== expected.length) return false;

  try {
    return timingSafeEqual(Buffer.from(provided, "utf8"), Buffer.from(expected, "utf8"));
  } catch {
    return false;
  }
}

/** The statuses Lemon Squeezy reports for a subscription, spelled the way the schema checks them. */
export const SUBSCRIPTION_STATUSES = [
  "on_trial",
  "active",
  "paused",
  "past_due",
  "unpaid",
  "cancelled",
  "expired",
] as const;

export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const ORDER_STATUSES = ["paid", "pending", "refunded", "failed"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];
export interface SubscriptionEvent {
  kind: "subscription";
  event: HandledEvent;
  /** The Lemon Squeezy subscription id: the unique key the row is written under. */
  id: string;
  userId: string;
  plan: PlanId | null;
  variantId: string | null;
  status: SubscriptionStatus | null;
  customerId: string | null;
  orderId: string | null;
  renewsAt: string | null;
  endsAt: string | null;
  /** ends_at when it is set (a cancelled subscription keeps its access), otherwise renews_at. */
  currentPeriodEnd: string | null;
}

export interface PurchaseEvent {
  kind: "purchase";
  event: HandledEvent;
  /** The order id: a one-time purchase is keyed by its order. */
  id: string;
  userId: string;
  product: PlanId | null;
  variantId: string | null;
  status: OrderStatus | null;
  totalCents: number | null;
  currency: string | null;
}

export type WebhookOutcome =
  | { ok: true; write: SubscriptionEvent | PurchaseEvent }
  | { ok: true; ignore: string }
  | { ok: false; reason: string };

/** A JSON object, or null. */
function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

/** A trimmed non-empty string, or null. Numbers arrive as ids too, so they are accepted and stringified. */
function str(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

/** An ISO timestamp, or null. A date Postgres cannot parse must not reach an insert. */
function iso(value: unknown): string | null {
  const text = str(value);
  if (!text) return null;
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function oneOf<T extends string>(values: readonly T[], value: unknown): T | null {
  const text = str(value);
  return text && (values as readonly string[]).includes(text) ? (text as T) : null;
}

/** The plan a variant belongs to, read from the configuration rather than guessed from its name. */
export function planForVariant(config: PaymentsConfig, variantId: string | null): PlanId | null {
  if (!variantId) return null;
  for (const id of PLAN_IDS) {
    if (variantFor(config, id) === variantId) return id;
  }
  return null;
}

/**
 * Turn a delivered payload into the row it should write.
 *
 * Three answers, and the difference between them is the whole contract: **write** (a handled event with
 * everything needed), **ignore** (a handled event this deployment does not sell, or a type we do not act
 * on - acknowledged with 200 so Lemon Squeezy stops retrying), and **refuse** (malformed, or an account
 * we cannot identify - answered 400, because a silent 200 would lose a payment).
 */
export function parseWebhookEvent(payload: unknown, config: PaymentsConfig): WebhookOutcome {
  const root = asRecord(payload);
  if (!root) return { ok: false, reason: "The body is not a JSON object." };

  const meta = asRecord(root.meta);
  const data = asRecord(root.data);
  if (!meta || !data) return { ok: false, reason: "The body has no meta or data object." };

  const eventName = str(meta.event_name);
  if (!eventName) return { ok: false, reason: "meta.event_name is missing." };
  if (!(HANDLED_EVENTS as readonly string[]).includes(eventName)) {
    return { ok: true, ignore: "This build does not act on " + eventName + "." };
  }
  const event = eventName as HandledEvent;

  const custom = asRecord(meta.custom_data);
  const userId = str(custom?.user_id);
  if (!userId) {
    // Deliberately not falling back to the order's email: an entitlement attached to an address nobody
    // verified is a purchase that can be claimed by whoever controls that address later.
    return { ok: false, reason: "meta.custom_data.user_id is missing, so there is no account to credit." };
  }

  const id = str(data.id);
  if (!id) return { ok: false, reason: "data.id is missing." };

  const attributes = asRecord(data.attributes) ?? {};
  const type = str(data.type);

  if (type === "subscriptions" || event.startsWith("subscription_")) {
    const variantId = str(attributes.variant_id);
    const renewsAt = iso(attributes.renews_at);
    const endsAt = iso(attributes.ends_at);

    return {
      ok: true,
      write: {
        kind: "subscription",
        event,
        id,
        userId,
        plan: planForVariant(config, variantId),
        variantId,
        status: oneOf(SUBSCRIPTION_STATUSES, attributes.status),
        customerId: str(attributes.customer_id),
        orderId: str(attributes.order_id),
        renewsAt,
        endsAt,
        // Lemon Squeezy has no "current_period_end" field: when a subscription is cancelled it sets
        // ends_at (access until then), and otherwise renews_at is when the period ends. The schema keeps
        // the derived column because it is the one every entitlement question is actually asked about.
        currentPeriodEnd: endsAt ?? renewsAt,
      },
    };
  }

  if (type === "orders" || event.startsWith("order_")) {
    const item = asRecord(attributes.first_order_item);
    const variantId = str(item?.variant_id) ?? str(attributes.variant_id);
    const total = attributes.total;

    return {
      ok: true,
      write: {
        kind: "purchase",
        event,
        id,
        userId,
        product: planForVariant(config, variantId),
        variantId,
        status: oneOf(ORDER_STATUSES, attributes.status),
        totalCents: typeof total === "number" && Number.isFinite(total) ? Math.round(total) : null,
        currency: str(attributes.currency),
      },
    };
  }

  return { ok: true, ignore: "This build does not act on a " + (type ?? "unknown") + " object." };
}

/** The product name behind a plan id, for a log line or a receipt. Null when it is not one of ours. */
export function planName(planId: string | null): string | null {
  return planById(planId)?.name ?? null;
}

