import { PLANS, type Plan, type PlanId } from "./plans.ts";

/**
 * What the environment says about payments, and what is missing when it says nothing (Phase 32).
 *
 * The same shape as `lib/manga/ai.ts`, for the same reason: a deployment without keys must boot, and
 * the UI has to be able to say **which** variable is missing rather than showing a button that fails.
 * Nothing here returns a key to a caller that renders - the status route below never reads `apiKey`.
 *
 * Two switches, not one, because the webhook and the checkout need different things:
 *
 *   - **the webhook needs only `LEMON_SQUEEZY_WEBHOOK_SECRET`.** It verifies an incoming signature; it
 *     never calls the API. A deployment that only wants entitlements recorded needs nothing else, and
 *     this file says so instead of demanding a key it does not use.
 *   - **the checkout needs the API key, the store id and that plan's variant id.** A store id without a
 *     variant id is a checkout that cannot be opened, and that is the case worth naming.
 */

export const PAYMENT_ENV = {
  apiKey: "LEMON_SQUEEZY_API_KEY",
  storeId: "LEMON_SQUEEZY_STORE_ID",
  webhookSecret: "LEMON_SQUEEZY_WEBHOOK_SECRET",
} as const;

export interface PaymentsConfig {
  /** True when a checkout can be opened at all: API key and store id are both present. */
  checkoutConfigured: boolean;
  /** True when the webhook can verify a signature. Both doors can be off independently. */
  webhookConfigured: boolean;
  apiKey: string | null;
  storeId: string | null;
  webhookSecret: string | null;
  /** Plan id to variant id, for the plans this deployment actually sells. */
  variants: Record<string, string>;
  /** A sentence naming what is missing, or null when everything a checkout needs is present. */
  reason: string | null;
}

const blank = (value: string | undefined): string | null => {
  const trimmed = (value ?? "").trim();
  return trimmed.length > 0 ? trimmed : null;
};

export function readPaymentsConfig(env: Record<string, string | undefined> = process.env): PaymentsConfig {
  const apiKey = blank(env[PAYMENT_ENV.apiKey]);
  const storeId = blank(env[PAYMENT_ENV.storeId]);
  const webhookSecret = blank(env[PAYMENT_ENV.webhookSecret]);

  const variants: Record<string, string> = {};
  for (const plan of PLANS) {
    const variant = blank(env[plan.variantEnv]);
    if (variant) variants[plan.id] = variant;
  }

  const missing: string[] = [];
  if (!apiKey) missing.push(PAYMENT_ENV.apiKey);
  if (!storeId) missing.push(PAYMENT_ENV.storeId);

  return {
    checkoutConfigured: missing.length === 0,
    webhookConfigured: webhookSecret !== null,
    apiKey,
    storeId,
    webhookSecret,
    variants,
    reason:
      missing.length === 0
        ? null
        : "Checkout is off: " + missing.join(" and ") + (missing.length === 1 ? " is" : " are") + " not set.",
  };
}

/** The variant a plan is sold as, or null when this deployment does not sell it. */
export function variantFor(config: PaymentsConfig, planId: PlanId | string): string | null {
  return config.variants[planId] ?? null;
}

/** The plans a visitor can actually buy here, in the order the pricing page shows them. */
export function sellablePlans(config: PaymentsConfig): Plan[] {
  return PLANS.filter((plan) => variantFor(config, plan.id) !== null);
}

/**
 * The answer `GET /api/payments/status` returns. Never contains a key, never throws.
 *
 * Only the webhook secret's **presence** and the checkout's readiness are reported: a caller that can
 * see whether a key is set learns nothing it could use, and the alternative - a page that silently
 * hides a misconfigured store - is how a payment bug ships.
 */
export interface PaymentsStatus {
  checkout: boolean;
  webhook: boolean;
  plans: { id: string; name: string; price: string | null; configured: boolean }[];
  reason: string | null;
}

export function paymentsStatus(
  config: PaymentsConfig = readPaymentsConfig(),
  env: Record<string, string | undefined> = process.env,
): PaymentsStatus {
  try {
    return {
      checkout: config.checkoutConfigured,
      webhook: config.webhookConfigured,
      plans: PLANS.map((plan) => ({
        id: plan.id,
        name: plan.name,
        price: blank(env[plan.priceEnv]),
        configured: variantFor(config, plan.id) !== null,
      })),
      reason: config.reason,
    };
  } catch (error) {
    return {
      checkout: false,
      webhook: false,
      plans: [],
      reason: "The payment configuration could not be read: " + (error instanceof Error ? error.message : String(error)),
    };
  }
}
