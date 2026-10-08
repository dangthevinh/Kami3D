/**
 * What this deployment sells, in one place (Phase 32).
 *
 * Three rules shape this file, and each one is a decision rather than a detail:
 *
 *   1. **A plan is a name and a grant, not a price.** The price lives in Lemon Squeezy and is shown at
 *      checkout. `priceEnv` exists so a deployment *may* print a price on the pricing page, and when it
 *      is unset the page says "shown at checkout" instead of inventing a number - the same rule the
 *      rest of this project follows about facts it has not measured.
 *   2. **The variant ids come from the environment, never from code.** A variant id is store-specific;
 *      hard-coding one would be a checkout that fails on every other deployment, and a test would pass.
 *   3. **The grants are the point.** `checkPremium` and the unlock gate in Phase 33 read
 *      `entitlementsFrom()`, which reads these grants - so adding a plan means saying what it gives,
 *      not editing a branch somewhere else.
 */

export const PLAN_IDS = [
  "premium-monthly",
  "premium-yearly",
  "unlock-extinct-models",
  "manga-studio-pro",
] as const;

export type PlanId = (typeof PLAN_IDS)[number];

/** An entitlement key. `unlock:<content-id>` is what a one-time purchase grants. */
export type Entitlement = string;

export interface Plan {
  id: PlanId;
  name: string;
  blurb: string;
  /** `subscription` renews; `one-time` is an order rather than a subscription. */
  kind: "subscription" | "one-time";
  interval: "month" | "year" | null;
  /** What the environment variable holding this plan's Lemon Squeezy variant id is called. */
  variantEnv: string;
  /** An optional variable holding a display price, e.g. "$5 / month". Never required. */
  priceEnv: string;
  /** The entitlements this plan grants while it is valid. */
  grants: Entitlement[];
}

export const PLANS: readonly Plan[] = [
  {
    id: "premium-monthly",
    name: "Premium",
    blurb: "Every species, every model, the full map and the quiz without a limit.",
    kind: "subscription",
    interval: "month",
    variantEnv: "LEMON_SQUEEZY_VARIANT_PREMIUM_MONTHLY",
    priceEnv: "LEMON_SQUEEZY_PRICE_PREMIUM_MONTHLY",
    grants: ["premium"],
  },
  {
    id: "premium-yearly",
    name: "Premium (yearly)",
    blurb: "The same entitlements as Premium, billed once a year.",
    kind: "subscription",
    interval: "year",
    variantEnv: "LEMON_SQUEEZY_VARIANT_PREMIUM_YEARLY",
    priceEnv: "LEMON_SQUEEZY_PRICE_PREMIUM_YEARLY",
    grants: ["premium"],
  },
  {
    id: "unlock-extinct-models",
    name: "Extinct species pack",
    blurb: "A one-time unlock: the extinct and disputed models open for good, on this account.",
    kind: "one-time",
    interval: null,
    variantEnv: "LEMON_SQUEEZY_VARIANT_UNLOCK_EXTINCT_MODELS",
    priceEnv: "LEMON_SQUEEZY_PRICE_UNLOCK_EXTINCT_MODELS",
    grants: ["unlock:extinct-models"],
  },
  {
    id: "manga-studio-pro",
    name: "Manga Studio Pro",
    blurb: "AI panel generation, longer chapters and the export tools.",
    kind: "subscription",
    interval: "month",
    variantEnv: "LEMON_SQUEEZY_VARIANT_MANGA_STUDIO_PRO",
    priceEnv: "LEMON_SQUEEZY_PRICE_MANGA_STUDIO_PRO",
    grants: ["premium", "manga-pro"],
  },
];

export function planById(id: string | null | undefined): Plan | null {
  if (!id) return null;
  return PLANS.find((plan) => plan.id === id) ?? null;
}

/** The two entitlements this build knows how to ask for by name. */
export const PREMIUM: Entitlement = "premium";
export const MANGA_PRO: Entitlement = "manga-pro";

/** What unlocking a specific piece of content grants. Phase 33 asks this exact question. */
export function unlockEntitlement(contentId: string): Entitlement {
  return "unlock:" + contentId;
}
