import type { Metadata } from "next";
import Link from "next/link";

import { UpgradeButton } from "@/components/payments/UpgradeButton";
import { accountEntitlements } from "@/lib/payments/account";
import { paymentsStatus, readPaymentsConfig, sellablePlans } from "@/lib/payments/config";
import { PAYMENT_ENV } from "@/lib/payments/config";
import { PLANS } from "@/lib/payments/plans";

/**
 * /pricing - what this deployment sells (Phase 32).
 *
 * The page is rendered per request because it reads the visitor's entitlements, and it is honest in the
 * two places a pricing page usually is not:
 *
 *   1. **a price it does not know is not printed.** The amount lives in the Lemon Squeezy store and is
 *      shown at checkout; `LEMON_SQUEEZY_PRICE_*` may carry a display string, and when it is absent the
 *      card says "shown at checkout" rather than inventing one. A hard-coded price that drifts from the
 *      store is the classic way a pricing page lies.
 *   2. **an unconfigured deployment says so.** With no keys the page lists what the plans would be, names
 *      the variables that are missing, and shows no button that would answer 503. That is the same
 *      treatment `/api/manga/ai/status` gives a missing AI key.
 *
 * Nothing on this page is a claim about the store: which plans are *sellable* is derived from the
 * configured variant ids, so a plan nobody set up is not offered.
 */

export const metadata: Metadata = {
  title: "Pricing",
  description: "Premium, the extinct-species pack and Manga Studio Pro for Kami3D - what each one opens.",
  alternates: { canonical: "/pricing" },
};

export const dynamic = "force-dynamic";

function money(price: string | null, plan: { interval: string | null }): string {
  if (price) return price;
  return plan.interval ? "Shown at checkout, per " + plan.interval : "Shown at checkout";
}

export default async function PricingPage() {
  const config = readPaymentsConfig();
  const status = paymentsStatus(config);
  const account = await accountEntitlements();
  const sellable = sellablePlans(config);

  return (
    <div className="section-shell py-12">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neon">Kami3D</p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">Pricing</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/55">
          The encyclopedia stays free: every species page, every credited model and the map. What is paid
          for is the extra - a subscription that opens the whole catalogue, a one-time pack, and the Manga
          Studio tools.
        </p>
      </header>

      {!status.checkout ? (
        <div className="glass mt-6 max-w-2xl rounded-[var(--radius-card)] p-5 text-sm leading-relaxed text-white/60">
          <p className="text-white/80">Checkout is not configured on this deployment.</p>
          <p className="mt-2">{status.reason ?? "No Lemon Squeezy keys are set."}</p>
          <p className="mt-3 text-xs text-white/45">
            Set{" "}
            <code className="text-white/70">{PAYMENT_ENV.apiKey}</code>,{" "}
            <code className="text-white/70">{PAYMENT_ENV.storeId}</code> and a variant id per plan (see{" "}
            <span className="text-white/70">docs/PAYMENTS.md</span>). The plans below are what this build
            knows how to sell; none of them is offered until its variant is configured.
          </p>
        </div>
      ) : null}

      {account.signedIn ? (
        <p className="mt-6 text-xs text-white/50">
          {!account.checked
            ? account.reason ?? "This session's entitlements could not be read."
            : account.premium
              ? "You hold Premium" + (account.subscription?.name ? " (" + account.subscription.name + ")" : "") + "."
              : "You do not hold Premium on this account."}
        </p>
      ) : (
        <p className="mt-6 text-xs text-white/50">
          <Link href="/settings" className="text-neon hover:text-white">
            Sign in
          </Link>{" "}
          first: a purchase is attached to an account, because that is whose entitlement the store's
          webhook writes.
        </p>
      )}

      <ul className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {PLANS.map((plan) => {
          const offered = sellable.some((entry) => entry.id === plan.id);
          const price = status.plans.find((entry) => entry.id === plan.id)?.price ?? null;

          return (
            <li key={plan.id} className="glass flex flex-col rounded-[var(--radius-card)] p-5">
              <h2 className="font-display text-lg font-semibold text-white">{plan.name}</h2>
              <p className="mt-1 text-xs uppercase tracking-[0.14em] text-white/40">
                {plan.kind === "subscription" ? "Subscription" : "One-time"}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-white/60">{plan.blurb}</p>

              <p className="mt-4 text-sm text-white/80">{money(price, plan)}</p>

              <ul className="mt-3 space-y-1 text-xs text-white/50">
                {plan.grants.map((grant) => (
                  <li key={grant}>{grant}</li>
                ))}
              </ul>

              <div className="mt-auto pt-5">
                <UpgradeButton
                  planId={plan.id}
                  label={"Get " + plan.name}
                  available={offered && status.checkout}
                  signedIn={account.signedIn}
                />
                {!offered ? (
                  <p className="mt-2 text-[11px] leading-relaxed text-white/35">
                    Not sold here: set <code className="text-white/55">{plan.variantEnv}</code> to this
                    plan's Lemon Squeezy variant id.
                  </p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      <section className="glass mt-8 max-w-2xl rounded-[var(--radius-card)] p-5 text-xs leading-relaxed text-white/55">
        <h2 className="text-sm font-semibold text-white/80">How the payment works</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            Checkout is hosted by Lemon Squeezy. No card number, no expiry and no CVC ever reaches this
            server - what arrives is an event with an id, a status and a date.
          </li>
          <li>
            The webhook at <code className="text-white/70">/api/payments/webhook</code> verifies the
            delivery's HMAC signature before it trusts a single field, and writes the entitlement with the
            service role: neither table accepts a write from a browser at all.
          </li>
          <li>
            {status.webhook
              ? "This deployment can verify webhook signatures."
              : "This deployment has no webhook signing secret set, so deliveries are refused (503) and the store retries until " + PAYMENT_ENV.webhookSecret + " is set."}
          </li>
          <li>
            A cancelled subscription keeps access until the end of the period that was paid for; a refunded
            order loses it. Both are visible in{" "}
            <Link href="/settings" className="text-neon hover:text-white">
              Settings
            </Link>
            .
          </li>
        </ul>
      </section>
    </div>
  );
}
