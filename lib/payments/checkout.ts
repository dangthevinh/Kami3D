import { PAYMENT_ENV, variantFor, type PaymentsConfig } from "./config.ts";
import { planById, type PlanId } from "./plans.ts";

/**
 * The checkout request, as data (Phase 32).
 *
 * Lemon Squeezy is called by the **server**, not by the browser: the API key is a secret, and a browser
 * that could create a checkout against this store could also choose its own price. So the route builds
 * this object and posts it; the client only receives the URL to open.
 *
 * Two things are carried into `checkout_data` and both matter:
 *
 *   - `custom.user_id` - the account to credit. The webhook reads it back from
 *     `meta.custom_data.user_id`, and a delivery without it is refused rather than guessed at from an
 *     email address (lib/payments/webhook.ts).
 *   - `custom.plan` - the plan the visitor chose, so a mis-mapped variant is visible in the delivery
 *     rather than only in the entitlement maths.
 *
 * `test_mode` is not sent: whether a store is in test mode is the store's own setting, and a request
 * that could switch it would be a request that could sell a real product for nothing.
 */

export class PaymentsError extends Error {
  readonly status: number;
  constructor(message: string, status = 503) {
    super(message);
    this.name = "PaymentsError";
    this.status = status;
  }
}

export interface CheckoutInput {
  config: PaymentsConfig;
  planId: string;
  userId: string;
  email: string | null;
  /** Where Lemon Squeezy sends the browser after a completed order. */
  redirectUrl: string;
}

export const LEMON_API = "https://api.lemonsqueezy.com/v1";

/** The body of `POST /v1/checkouts`, exactly as the documented API wants it. */
export function buildCheckoutBody(input: CheckoutInput & { variantId: string }): Record<string, unknown> {
  const plan = planById(input.planId);
  const name = plan?.name ?? input.planId;

  return {
    data: {
      type: "checkouts",
      attributes: {
        checkout_data: {
          email: input.email ?? undefined,
          custom: { user_id: input.userId, plan: input.planId },
        },
        product_options: {
          // The receipt and the overlay both say what was bought, and neither invents a name.
          name,
          redirect_url: input.redirectUrl,
          enabled_variants: [Number.isNaN(Number(input.variantId)) ? input.variantId : Number(input.variantId)],
        },
        checkout_options: {
          // The 3D pages are dark; a white overlay in front of a black canvas is a flashbang.
          dark: true,
          button_color: "#35f0c0",
        },
        expires_at: null,
        preview: false,
        test_mode: false,
      },
      relationships: {
        store: { data: { type: "stores", id: String(input.config.storeId ?? "") } },
        variant: { data: { type: "variants", id: String(input.variantId) } },
      },
    },
  };
}

/**
 * The request to send for one plan, or a `PaymentsError` whose message a visitor can act on.
 *
 * Every refusal names the variable that would fix it - the same rule `lib/manga/ai.ts` follows - because
 * "checkout failed" in front of a paying visitor is the worst sentence this feature can produce.
 */
export function buildCheckoutRequest(input: CheckoutInput): { url: string; init: RequestInit } {
  const plan = planById(input.planId);
  if (!plan) throw new PaymentsError("There is no plan called \"" + input.planId + "\".", 400);
  if (!input.userId) throw new PaymentsError("Sign in before upgrading: a purchase has to belong to an account.", 401);

  if (!input.config.checkoutConfigured) {
    throw new PaymentsError(input.config.reason ?? "Checkout is not configured on this deployment.", 503);
  }

  const variantId = variantFor(input.config, plan.id as PlanId);
  if (!variantId) {
    throw new PaymentsError(
      "This deployment does not sell " + plan.name + ": set " + plan.variantEnv + " to its Lemon Squeezy variant id.",
      503,
    );
  }

  return {
    url: LEMON_API + "/checkouts",
    init: {
      method: "POST",
      headers: {
        accept: "application/vnd.api+json",
        "content-type": "application/vnd.api+json",
        authorization: "Bearer " + (input.config.apiKey ?? ""),
      },
      body: JSON.stringify(buildCheckoutBody({ ...input, variantId })),
    },
  };
}

/**
 * The URL Lemon Squeezy answered with.
 *
 * Read from `data.attributes.url` and nothing else: an API that answers 200 with no URL is an API this
 * code cannot use, and returning the response object as a link would send a visitor to `[object Object]`.
 */
export function checkoutUrlFrom(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null) return null;
  const data = (payload as { data?: unknown }).data;
  if (typeof data !== "object" || data === null) return null;
  const attributes = (data as { attributes?: unknown }).attributes;
  if (typeof attributes !== "object" || attributes === null) return null;
  const url = (attributes as { url?: unknown }).url;
  return typeof url === "string" && /^https:\/\//.test(url) ? url : null;
}

/** The reason a misconfigured deployment gives, for a route that has no request to build. */
export function checkoutUnavailableReason(config: PaymentsConfig): string {
  if (config.checkoutConfigured) return "No plan was named.";
  return config.reason ?? "Set " + PAYMENT_ENV.apiKey + " and " + PAYMENT_ENV.storeId + " to switch checkout on.";
}
