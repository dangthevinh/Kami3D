import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type { PurchaseEvent, SubscriptionEvent } from "@/lib/payments/webhook";

/**
 * The only writer of `subscriptions` and `purchases` (Phase 32).
 *
 * It runs with the service role, which is what the schema assumes: neither table has an insert or
 * update policy, so a browser cannot write one at all.
 *
 * **Idempotent by construction.** Both writes upsert on `lemon_squeezy_id`, which is unique, so a
 * redelivered webhook - Lemon Squeezy retries anything that did not answer 2xx, and it redelivers on
 * demand - updates the same row instead of granting a second entitlement. That is why there is no nonce
 * table and no replay window here: the uniqueness of the upstream id is the whole mechanism, and it also
 * means a delivery replayed after a bug fix still lands.
 *
 * A failure answers the route, which answers 5xx on purpose: a webhook that says "ok" while losing a
 * payment is worse than one that asks to be retried.
 */

export type RecordResult = { ok: true; id: string } | { ok: false; reason: string };

function serviceClient() {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { supabase: null, reason: "SUPABASE_SERVICE_ROLE_KEY is not set, so the webhook cannot write." };
  }
  return { supabase, reason: null };
}

export async function recordWebhookWrite(write: SubscriptionEvent | PurchaseEvent): Promise<RecordResult> {
  const { supabase, reason } = serviceClient();
  if (!supabase) return { ok: false, reason: reason ?? "No database client." };

  const now = new Date().toISOString();

  try {
    if (write.kind === "subscription") {
      const { error } = await supabase.from("subscriptions").upsert(
        {
          user_id: write.userId,
          plan: write.plan,
          status: write.status,
          lemon_squeezy_id: write.id,
          lemon_customer_id: write.customerId,
          lemon_order_id: write.orderId,
          variant_id: write.variantId,
          renews_at: write.renewsAt,
          ends_at: write.endsAt,
          current_period_end: write.currentPeriodEnd,
          last_event: write.event,
          updated_at: now,
        },
        { onConflict: "lemon_squeezy_id" },
      );
      if (error) return { ok: false, reason: error.message };
      return { ok: true, id: write.id };
    }

    const { error } = await supabase.from("purchases").upsert(
      {
        user_id: write.userId,
        product: write.product,
        status: write.status,
        lemon_squeezy_id: write.id,
        variant_id: write.variantId,
        total_cents: write.totalCents,
        currency: write.currency,
        last_event: write.event,
        updated_at: now,
      },
      { onConflict: "lemon_squeezy_id" },
    );
    if (error) return { ok: false, reason: error.message };
    return { ok: true, id: write.id };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : "unknown error" };
  }
}
