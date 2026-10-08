# Payments (Phase 32)

Lemon Squeezy is the store: it hosts the checkout, holds the card, and sends this server an event when
something is bought, renewed, cancelled or refunded. Kami3D stores an **entitlement**, never a payment
method.

## The flow

    browser                this server                     Lemon Squeezy
    ───────                ───────────                     ─────────────
    click "Get Premium" ─▶ POST /api/payments/checkout
                           (session + rate limit)
                           POST /v1/checkouts ───────────▶ creates a hosted checkout
                           ◀──────────────────────────────  { data.attributes.url }
    ◀── { url }  ─────────
    browser navigates to the checkout, pays on Lemon Squeezy's domain
                           ◀──── POST /api/payments/webhook (signed)
                           verify HMAC over the raw body
                           upsert subscriptions / purchases
                           (service role; neither table accepts a browser write)
    ◀── /settings, /pricing read the entitlement

## Environment

| Variable | What it turns on | Required for |
| --- | --- | --- |
| `LEMON_SQUEEZY_WEBHOOK_SECRET` | verifying deliveries | the webhook (nothing else) |
| `LEMON_SQUEEZY_API_KEY` | opening a checkout | the checkout |
| `LEMON_SQUEEZY_STORE_ID` | the store the checkout belongs to | the checkout |
| `LEMON_SQUEEZY_VARIANT_*` | one per plan: the variant that is sold | that plan only |
| `LEMON_SQUEEZY_PRICE_*` | a display string for the pricing page, e.g. `"$5 / month"` | optional |

A plan with no variant id is **not offered**: the pricing page says which variable is missing instead of
showing a button that would answer 503. Nothing here is invented - the real price lives in the store and
is shown at checkout.

## Setting the store up

1. Lemon Squeezy → Products: create the product, and a variant per plan (monthly, yearly, one-time).
   Copy each variant id into the matching `LEMON_SQUEEZY_VARIANT_*` variable.
2. Lemon Squeezy → Settings → API: create an API key, put it in `LEMON_SQUEEZY_API_KEY`.
3. Lemon Squeezy → Settings → Stores: copy the store id into `LEMON_SQUEEZY_STORE_ID`.
4. Lemon Squeezy → Settings → Webhooks: add `https://your-host/api/payments/webhook`, subscribe to the
   subscription and order events, and copy the **signing secret** into
   `LEMON_SQUEEZY_WEBHOOK_SECRET`.
5. Send a test delivery from that screen and check `/admin/security` - a refused signature appears there
   as `webhook-signature`, an accepted one as `payment-webhook`.

```bash
curl -s https://your-host/api/payments/webhook     # { "configured": true, "url": "..." }
```

## What the entitlements mean

`lib/payments/entitlements.ts` is the only place that decides, and the clock is injected so the rules can
be tested without waiting a month:

| Subscription status | Entitled? |
| --- | --- |
| `active`, `on_trial` | yes |
| `cancelled` | yes **until** `current_period_end` - a cancellation is not an ending |
| `cancelled` with no date | no: there is nothing to honour |
| `past_due`, `unpaid` | no, and the row is kept so Settings can say why |
| `paused`, `expired` | no |
| a purchase | only while its order is `paid` - a refund takes the entitlement back |

`current_period_end` is derived on write: `ends_at` when Lemon Squeezy set it (a cancellation), otherwise
`renews_at`. Lemon Squeezy has no column by that name; the schema keeps it because it is the column every
entitlement question actually reads.

## What has been verified, and what has not

Verified against a running server with a locally chosen secret (the same code path a real delivery takes):

| Probe | Result |
| --- | --- |
| signed `subscription_created` delivery | **200**, one row in `subscriptions` |
| the same delivery redelivered | **200**, still **one** row - the upsert on `lemon_squeezy_id` is the idempotency |
| `subscription_cancelled` with `ends_at` | **200**, the same row updates: status `cancelled`, period end set |
| signed `order_created` | **200**, a `purchases` row with `total_cents` |
| body with one byte added | **401** + a `webhook-signature` event |
| signature from another secret | **401** |
| no signature at all | **401** |
| `GET /rest/v1/subscriptions` with the anon key | **401** (no privilege; only `authenticated` has SELECT, and only for its own rows) |

**Not verified, and not claimed:** a live delivery from Lemon Squeezy, and a checkout opened against a
real store. This repository has no account, so those two steps have never run. Everything up to them has:
the signature check is exercised with a real HMAC, the event parser is fed payloads shaped the way the
API documents them, and the request body is asserted field by field. The first real delivery is the
remaining risk, and it is named here rather than discovered later.

## Deliberate limits

- **No dunning.** `past_due` loses access immediately. A grace period is a business decision, and a
  silent default would be worse than none.
- **No customer portal link.** Lemon Squeezy's own portal URL would be the place for "update my card";
  it is not wired up, so a visitor with a failed payment has to use the link in their receipt email.
- **Plan changes are recorded, not interpreted.** An upgrade or a downgrade arrives as a
  `subscription_updated` with a new variant, and the row follows the store; there is no proration logic
  here, because the store already did it.
- **The purchase table carries `content_id`** for the day a purchase is about one item rather than a
  pack. Today no plan sets it, and the unlock gate (Phase 33) reads it.
- **Nothing about a card is stored.** Not a last-four, not a brand, not an expiry: there is no column for
  it, which is the strongest form of "we do not keep it".
