/**
 * Assertions for the payment layer (Phase 32), driven rather than grepped wherever it can be.
 *
 * The repository has no Lemon Squeezy account, so the honest split is:
 *
 *   - **what can be driven, is driven.** The signature check is exercised with a real HMAC computed
 *     here, the event parser is fed payloads shaped the way Lemon Squeezy documents them, and the
 *     entitlement arithmetic is asked about a cancelled subscription whose period ended yesterday
 *     because the clock is injected;
 *   - **what cannot be driven, is asserted as text or as an absence**: the SQL policies (there is no
 *     Postgres in CI), and the one thing a live delivery would prove - that a real store accepts our
 *     checkout body. docs/PAYMENTS.md says that out loud instead of implying it.
 *
 * Run with: npm run check:payments
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { accountView, guestAccount } from "../lib/payments/account-view.ts";
import {
  buildCheckoutBody,
  buildCheckoutRequest,
  checkoutUrlFrom,
  PaymentsError,
} from "../lib/payments/checkout.ts";
import {
  PAYMENT_ENV,
  paymentsStatus,
  readPaymentsConfig,
  sellablePlans,
  variantFor,
} from "../lib/payments/config.ts";
import { currentSubscription, entitlementsFrom, subscriptionState } from "../lib/payments/entitlements.ts";
import { PLANS, PLAN_IDS } from "../lib/payments/plans.ts";
import { parseWebhookEvent, planForVariant, signPayload, verifySignature } from "../lib/payments/webhook.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(join(root, path), "utf8");
const schema = read("supabase/schema.sql");

const SECRET = "whsec_test_do_not_use_in_a_deployment";

/** A configuration with every plan sold, so the variant mapping can be exercised. */
function configured(extra = {}) {
  return readPaymentsConfig({
    [PAYMENT_ENV.apiKey]: "ls_test_key",
    [PAYMENT_ENV.storeId]: "1234",
    [PAYMENT_ENV.webhookSecret]: SECRET,
    LEMON_SQUEEZY_VARIANT_PREMIUM_MONTHLY: "501",
    LEMON_SQUEEZY_VARIANT_PREMIUM_YEARLY: "502",
    LEMON_SQUEEZY_VARIANT_UNLOCK_EXTINCT_MODELS: "503",
    LEMON_SQUEEZY_VARIANT_MANGA_STUDIO_PRO: "504",
    ...extra,
  });
}

/** A delivery body, shaped the way Lemon Squeezy documents one. */
function delivery({ event = "subscription_created", id = "77", variantId = "501", status = "active", userId = "user-1", attributes = {} } = {}) {
  return {
    meta: { event_name: event, custom_data: userId === null ? {} : { user_id: userId } },
    data: {
      type: event.startsWith("order_") ? "orders" : "subscriptions",
      id,
      attributes: {
        store_id: 1234,
        customer_id: 9001,
        order_id: 4242,
        variant_id: variantId,
        status,
        renews_at: "2026-04-01T00:00:00.000Z",
        ends_at: null,
        total: 1999,
        currency: "USD",
        first_order_item: { variant_id: variantId, product_name: "Premium" },
        ...attributes,
      },
    },
  };
}

test("the signature is checked against the raw body, and a wrong one is refused", () => {
  const body = JSON.stringify(delivery());
  const signature = signPayload(body, SECRET);

  assert.equal(verifySignature(body, signature, SECRET), true, "a signature computed the way Lemon Squeezy does must pass");
  assert.equal(verifySignature(body, signature.toUpperCase(), SECRET), true, "hex case is not part of the contract");
  assert.equal(verifySignature(body, " " + signature + " ", SECRET), true, "whitespace around a header is not a signature");

  // The three failures that matter, and each one is a different sentence in the code.
  assert.equal(verifySignature(body, signPayload(body, "another-secret"), SECRET), false, "a signature from another secret");
  assert.equal(verifySignature(body + " ", signature, SECRET), false, "one byte of tampering changes the digest");
  assert.equal(verifySignature(body, null, SECRET), false, "a missing header is not a pass");
  assert.equal(verifySignature(body, "", SECRET), false);
  assert.equal(verifySignature(body, "deadbeef", SECRET), false, "a short value must not throw");

  // An empty secret can be HMAC'd by anyone, which is why it is refused before the comparison.
  assert.equal(verifySignature(body, signPayload(body, ""), ""), false);
  assert.equal(verifySignature(body, signPayload(body, "   "), "   "), false);

  // Unicode: the signature is over UTF-8 bytes, so a body the naive implementation re-encodes still works.
  const unicode = JSON.stringify({ note: "Kami3D — quả địa cầu 🌏", ...delivery() });
  assert.equal(verifySignature(unicode, signPayload(unicode, SECRET), SECRET), true);

  const route = read("app/api/payments/webhook/route.ts");
  assert.match(route, /await request\.text\(\)/, "the raw body is read before anything parses it");
  assert.ok(
    route.indexOf("verifySignature(") < route.indexOf("recordWebhookWrite("),
    "the signature is verified before any row is written",
  );
  assert.match(route, /kind: "webhook-signature"/, "a refused delivery is recorded in the security log");
});

test("a delivery becomes the row it describes, and an unknown one is ignored rather than guessed", () => {
  const config = configured();

  const created = parseWebhookEvent(delivery(), config);
  assert.equal(created.ok, true);
  assert.equal(created.write.kind, "subscription");
  assert.equal(created.write.id, "77");
  assert.equal(created.write.userId, "user-1");
  assert.equal(created.write.plan, "premium-monthly", "the plan comes from the configured variant, not from its name");
  assert.equal(created.write.status, "active");
  assert.equal(created.write.customerId, "9001");
  assert.equal(created.write.currentPeriodEnd, "2026-04-01T00:00:00.000Z", "an active subscription ends when it renews");

  const cancelled = parseWebhookEvent(
    delivery({ event: "subscription_cancelled", status: "cancelled", attributes: { ends_at: "2026-03-15T00:00:00.000Z" } }),
    config,
  );
  assert.equal(cancelled.write.status, "cancelled");
  assert.equal(cancelled.write.currentPeriodEnd, "2026-03-15T00:00:00.000Z", "a cancelled subscription ends when it was paid to");

  const order = parseWebhookEvent(delivery({ event: "order_created", id: "555", variantId: "503", status: "paid" }), config);
  assert.equal(order.write.kind, "purchase");
  assert.equal(order.write.product, "unlock-extinct-models");
  assert.equal(order.write.totalCents, 1999, "money is integer cents, never a float");

  const refund = parseWebhookEvent(delivery({ event: "order_refunded", id: "555", variantId: "503", status: "refunded" }), config);
  assert.equal(refund.write.status, "refunded");

  // A variant this deployment does not sell is stored with a null plan rather than refused: refusing
  // would answer 500 to a real payment and earn a retry storm.
  const unknownVariant = parseWebhookEvent(delivery({ variantId: "999" }), config);
  assert.equal(unknownVariant.ok, true);
  assert.equal(unknownVariant.write.plan, null);
  assert.equal(planForVariant(config, "999"), null);
  assert.equal(planForVariant(config, "504"), "manga-studio-pro");

  // Ignored, not refused: a 200 stops the store retrying an event this build has no opinion about.
  assert.deepEqual(parseWebhookEvent(delivery({ event: "license_key_created" }), config), {
    ok: true,
    ignore: "This build does not act on license_key_created.",
  });
  assert.equal(parseWebhookEvent(delivery({ event: "subscription_updated", attributes: { status: "weird" } }), config).write.status, null,
    "an unknown status is stored as null rather than failing the check constraint");

  // Refused, because a silent 200 would lose a payment.
  assert.equal(parseWebhookEvent(delivery({ userId: null }), config).ok, false);
  assert.equal(parseWebhookEvent({ meta: {}, data: {} }, config).ok, false);
  assert.equal(parseWebhookEvent("not an object", config).ok, false);
});

test("entitlements follow the clock, and a cancelled subscription keeps what it paid for", () => {
  const now = new Date("2026-03-01T00:00:00.000Z");
  const active = { plan: "premium-monthly", status: "active", current_period_end: "2026-04-01T00:00:00.000Z" };
  const cancelledFuture = { plan: "premium-monthly", status: "cancelled", current_period_end: "2026-03-20T00:00:00.000Z" };
  const cancelledPast = { plan: "premium-monthly", status: "cancelled", current_period_end: "2026-02-01T00:00:00.000Z" };

  assert.deepEqual(entitlementsFrom({ subscriptions: [active], purchases: [], now }), ["premium"]);
  assert.deepEqual(entitlementsFrom({ subscriptions: [cancelledFuture], purchases: [], now }), ["premium"]);
  assert.deepEqual(entitlementsFrom({ subscriptions: [cancelledPast], purchases: [], now }), []);
  assert.equal(subscriptionState(cancelledFuture, now).live, true);
  assert.match(subscriptionState(cancelledPast, now).reason, /paid period has ended/);

  // A cancelled row with no date promises nothing, because there is nothing to honour.
  assert.equal(subscriptionState({ plan: "premium-monthly", status: "cancelled", current_period_end: null }, now).live, false);

  for (const status of ["past_due", "unpaid", "paused", "expired"]) {
    assert.equal(
      entitlementsFrom({ subscriptions: [{ ...active, status }], purchases: [], now }).length,
      0,
      status + " must not grant anything",
    );
  }
  assert.equal(subscriptionState({ plan: "mystery-plan", status: "active", current_period_end: null }, now).live, false);

  // A purchase counts only while it is paid, which is what makes a refund take access back.
  const paid = { product: "unlock-extinct-models", status: "paid", content_id: null };
  assert.deepEqual(entitlementsFrom({ subscriptions: [], purchases: [paid], now }), ["unlock:extinct-models"]);
  assert.deepEqual(entitlementsFrom({ subscriptions: [], purchases: [{ ...paid, status: "refunded" }], now }), []);
  assert.deepEqual(
    entitlementsFrom({ subscriptions: [], purchases: [{ ...paid, content_id: "tyrannosaurus-rex" }], now }),
    ["unlock:extinct-models", "unlock:tyrannosaurus-rex"],
    "a purchase that names one thing unlocks that thing",
  );

  // Manga Studio Pro grants both, and the plan list is where that is decided.
  assert.deepEqual(
    entitlementsFrom({ subscriptions: [{ plan: "manga-studio-pro", status: "active", current_period_end: null }], purchases: [], now }),
    ["manga-pro", "premium"],
  );

  // Two calls with the same rows compare equal: sorted, deduped.
  const two = entitlementsFrom({ subscriptions: [active, cancelledFuture], purchases: [paid], now });
  assert.deepEqual(two, ["premium", "unlock:extinct-models"]);

  assert.equal(currentSubscription([cancelledPast, active], now).plan, "premium-monthly");
  assert.equal(currentSubscription([], now), null);
});

test("an unconfigured deployment says which variable is missing, and never leaks a key", () => {
  const empty = readPaymentsConfig({});
  assert.equal(empty.checkoutConfigured, false);
  assert.equal(empty.webhookConfigured, false);
  assert.match(empty.reason, /LEMON_SQUEEZY_API_KEY/);
  assert.match(empty.reason, /LEMON_SQUEEZY_STORE_ID/);
  assert.deepEqual(sellablePlans(empty), []);
  assert.equal(variantFor(empty, "premium-monthly"), null);

  // The webhook and the checkout need different things: a deployment can verify deliveries with no API key.
  const webhookOnly = readPaymentsConfig({ [PAYMENT_ENV.webhookSecret]: SECRET });
  assert.equal(webhookOnly.checkoutConfigured, false);
  assert.equal(webhookOnly.webhookConfigured, true);

  const onePlan = readPaymentsConfig({
    [PAYMENT_ENV.apiKey]: "k",
    [PAYMENT_ENV.storeId]: "1",
    LEMON_SQUEEZY_VARIANT_PREMIUM_MONTHLY: "501",
  });
  assert.equal(onePlan.checkoutConfigured, true);
  assert.deepEqual(sellablePlans(onePlan).map((plan) => plan.id), ["premium-monthly"], "a plan nobody set up is not offered");

  const status = paymentsStatus(onePlan, { LEMON_SQUEEZY_PRICE_PREMIUM_MONTHLY: "$5 / month" });
  assert.equal(status.checkout, true);
  assert.equal(status.webhook, false);
  assert.equal(status.plans.find((plan) => plan.id === "premium-monthly").price, "$5 / month");
  assert.equal(status.plans.find((plan) => plan.id === "premium-yearly").price, null, "a price nobody set is not printed");

  // The status payload is rendered; a key must not be able to reach it even by accident.
  const withKey = readPaymentsConfig({ [PAYMENT_ENV.apiKey]: "ls_super_secret", [PAYMENT_ENV.storeId]: "1" });
  assert.ok(!JSON.stringify(paymentsStatus(withKey)).includes("ls_super_secret"), "the status never carries the key");

  // Every plan declares the variables it needs, and both names are spelled the way the docs spell them.
  for (const plan of PLANS) {
    assert.match(plan.variantEnv, /^LEMON_SQUEEZY_VARIANT_[A-Z_]+$/);
    assert.match(plan.priceEnv, /^LEMON_SQUEEZY_PRICE_[A-Z_]+$/);
    assert.ok(plan.grants.length > 0, plan.id + " must say what it grants");
  }
  assert.equal(new Set(PLAN_IDS).size, PLAN_IDS.length);
  assert.equal(new Set(PLANS.map((plan) => plan.variantEnv)).size, PLANS.length, "two plans must not share a variable");
});

test("the checkout request is built on the server, and a refusal names the fix", () => {
  const config = configured();
  const input = { config, planId: "premium-monthly", userId: "user-1", email: "someone@example.com", redirectUrl: "https://kami3d.test/settings?upgraded=1" };

  const request = buildCheckoutRequest(input);
  assert.equal(request.url, "https://api.lemonsqueezy.com/v1/checkouts");
  assert.equal(request.init.method, "POST");
  assert.match(String(request.init.headers.authorization), /^Bearer ls_test_key$/, "the key goes on the wire, never to a browser");

  const body = JSON.parse(String(request.init.body));
  assert.equal(body.data.type, "checkouts");
  assert.equal(body.data.attributes.checkout_data.custom.user_id, "user-1", "the account the webhook will credit");
  assert.equal(body.data.attributes.checkout_data.custom.plan, "premium-monthly");
  assert.equal(body.data.relationships.store.data.id, "1234");
  assert.equal(body.data.relationships.variant.data.id, "501");
  assert.equal(body.data.attributes.test_mode, false, "a request must not be able to switch a store into test mode");
  assert.deepEqual(body.data.attributes.product_options.enabled_variants, [501], "the variant is sent as a number when it is one");

  // A refusal a person can act on, rather than a generic failure.
  assert.throws(
    () => buildCheckoutRequest({ ...input, config: readPaymentsConfig({}) }),
    (error) => error instanceof PaymentsError && /LEMON_SQUEEZY_API_KEY/.test(error.message),
  );
  assert.throws(
    () => buildCheckoutRequest({ ...input, config: readPaymentsConfig({ [PAYMENT_ENV.apiKey]: "k", [PAYMENT_ENV.storeId]: "1" }) }),
    (error) => error instanceof PaymentsError && /LEMON_SQUEEZY_VARIANT_PREMIUM_MONTHLY/.test(error.message),
  );
  assert.throws(() => buildCheckoutRequest({ ...input, planId: "free-lunch" }), (error) => error instanceof PaymentsError && error.status === 400);
  assert.throws(() => buildCheckoutRequest({ ...input, userId: "" }), (error) => error instanceof PaymentsError && error.status === 401);

  // A variant id that is not a number stays a string: a store can hand out non-numeric ids.
  const stringVariant = buildCheckoutBody({
    ...input,
    variantId: "abc-123",
  });
  assert.deepEqual(stringVariant.data.attributes.product_options.enabled_variants, ["abc-123"]);

  assert.equal(checkoutUrlFrom({ data: { attributes: { url: "https://store.lemonsqueezy.com/checkout/buy/abc" } } }), "https://store.lemonsqueezy.com/checkout/buy/abc");
  assert.equal(checkoutUrlFrom({ data: { attributes: { url: "javascript:alert(1)" } } }), null, "a checkout URL is https or it is not a checkout URL");
  assert.equal(checkoutUrlFrom({ data: {} }), null);
  assert.equal(checkoutUrlFrom(null), null);
});

test("the tables accept no write from a browser, and only the owner may read", () => {
  for (const table of ["subscriptions", "purchases"]) {
    assert.ok(new RegExp("create table if not exists public\\." + table).test(schema), table + " is missing");
    assert.ok(new RegExp("alter table public\\." + table + "\\s+enable row level security").test(schema), table + " has RLS off");
    assert.ok(
      new RegExp('create policy "a ' + (table === "subscriptions" ? "subscription" : "purchase") + ' is legible to its owner"[\\s\\S]{0,220}?using \\(user_id = public\\.current_user_id\\(\\)\\)').test(schema),
      table + " must be readable by its owner through the identity helper",
    );
    assert.ok(
      !new RegExp("on public\\." + table + " for (insert|update|delete)").test(schema),
      table + " must have no write policy at all: the webhook writes with the service role",
    );
    assert.match(
      schema,
      /revoke all on public\.subscriptions, public\.purchases from anon, authenticated/,
      "the anon and authenticated roles hold no privilege on the payment tables",
    );
  }

  assert.match(schema, /lemon_squeezy_id\s+text not null unique/, "the upstream id is unique, which is what makes a retry an update");
  assert.match(schema, /total_cents\s+integer/, "money is integer cents");
  assert.ok(!/total_cents\s+(numeric|real|double)/.test(schema), "and never a float");

  // The plan ids in the database and in the code are the same list - the same rule check-manga applies.
  const checkConstraint = /plan\s+text check \(plan is null or plan in \(([^)]+)\)\)/.exec(schema);
  assert.ok(checkConstraint, "the plan column must be constrained");
  const inSql = [...checkConstraint[1].matchAll(/'([a-z0-9-]+)'/g)].map((match) => match[1]).sort();
  assert.deepEqual(inSql, [...PLAN_IDS].sort(), "the SQL check constraint and lib/payments/plans.ts must agree");
});

test("the routes take the session, the guard and the log seriously", () => {
  const checkout = read("app/api/payments/checkout/route.ts");
  assert.match(checkout, /guardWrite\(request, \{/, "the checkout route goes through the shared write guard");
  assert.match(checkout, /rule: \{ limit: \d+, windowMs: [\d_]+ \}/, "and carries a rate limit");
  assert.match(checkout, /await getCurrentUserId\(\)/, "and identifies the caller from the session, never from the body");
  assert.ok(!/test_mode:\s*true/.test(checkout), "nothing may switch a store into test mode");

  const status = read("app/api/payments/status/route.ts");
  assert.match(status, /accountEntitlements\(\)/, "the status route answers about the caller");
  assert.ok(!/apiKey/.test(status), "and never reads the API key");

  // The pricing page exists, is public, and is reachable from the navbar.
  assert.ok(read("app/pricing/page.tsx").includes("sellablePlans"), "the pricing page offers only what is configured");
  // The way in moved when the navbar was compacted: the row keeps the site's own surfaces and the
  // visitor's pages live in the settings menu, so the assertion follows the link rather than the file.
  const chrome = read("components/layout/Navbar.tsx") + read("components/layout/SettingsMenu.tsx");
  assert.match(chrome, /href: "\/pricing"/, "the pricing page is reachable from the chrome");
  assert.match(read("app/sitemap.ts"), /\$\{siteUrl\}\/pricing/, "and the sitemap lists it");

  // Settings reports the subscription state from the server's answer.
  assert.match(read("app/settings/page.tsx"), /accountEntitlements\(\)/);
  assert.match(read("components/settings/SettingsScreen.tsx"), /Subscription/, "the settings panel has the subscription card");
});

test("unreadable is not the same answer as empty", () => {
  // Demo Mode / no data client / a query that failed: nothing was checked, and the caller is told so
  // rather than being shown the free experience as if it were a fact about their subscription.
  const unknown = accountView(null, { signedIn: true, readFailed: true });
  assert.equal(unknown.checked, false);
  assert.equal(unknown.premium, false, "the safe direction for a lock is closed");
  assert.deepEqual(unknown.entitlements, []);
  assert.match(unknown.reason, /could not be read/);

  // A guest is a different answer: known, and empty. Signing in is the fix, not a retry.
  const guest = guestAccount();
  assert.equal(guest.checked, true);
  assert.equal(guest.signedIn, false);
  assert.equal(guest.premium, false);

  // And a read that worked says so, with the arithmetic applied.
  const known = accountView(
    {
      subscriptions: [{ plan: "premium-monthly", status: "active", current_period_end: "2099-01-01T00:00:00.000Z" }],
      purchases: [],
    },
    { signedIn: true },
  );
  assert.equal(known.checked, true);
  assert.equal(known.premium, true);
  assert.equal(known.subscription.name, "Premium");
});
