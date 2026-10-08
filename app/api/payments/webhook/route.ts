import { NextResponse } from "next/server";

import { readPaymentsConfig } from "@/lib/payments/config";
import { recordWebhookWrite } from "@/lib/payments/record";
import { SIGNATURE_HEADER, parseWebhookEvent, verifySignature } from "@/lib/payments/webhook";
import { clientKey } from "@/lib/request-guard";
import { noteSecurityEvent } from "@/lib/security-log";
import { guardWrite, hostOfRequest } from "@/lib/write-guard";

export const dynamic = "force-dynamic";

/**
 * POST /api/payments/webhook - what Lemon Squeezy calls when a subscription or an order changes.
 *
 * The order of the four steps is the whole design, and none of them can be moved:
 *
 *   1. **the raw body is read first.** The signature is over the bytes Lemon Squeezy sent, so
 *      `request.text()` happens before any parsing. A route that parsed JSON and re-serialised it would
 *      verify a different byte sequence.
 *   2. **the signature is verified before the body is trusted at all.** Not after a parse, not after a
 *      partial write: an unsigned delivery is somebody else's claim about somebody else's money.
 *   3. **the event is parsed into a row**, and three answers are possible - write, ignore (200, so the
 *      store stops retrying) or refuse (400, because a silent 200 would lose a payment).
 *   4. **the write is idempotent** (`lemon_squeezy_id` is unique), so a retry is an update.
 *
 * The write guard is still applied, and it does not fight the store: a server-to-server delivery carries
 * no `Sec-Fetch-Site` and no `Origin`, which `sameOriginVerdict` reads as "not a browser" and lets
 * through. The rate limit is generous - a busy store sends bursts - and it is the thing that bounds a
 * forged flood, which would otherwise cost a signature check and a database round trip per request.
 *
 * A 503 when the deployment has no webhook secret is deliberate: the store retries, and the day the
 * secret is set, the retries land. The alternative - accepting unsigned deliveries because nothing is
 * configured - is a store that can be credited by anyone who knows the URL.
 */

/** A body larger than this is not a Lemon Squeezy delivery; it is somebody testing the parser. */
const MAX_WEBHOOK_BYTES = 128 * 1024;

export async function POST(request: Request) {
  const blocked = guardWrite(request, {
    name: "payments-webhook",
    rule: { limit: 120, windowMs: 60_000 },
    expectedHost: hostOfRequest(request),
  });
  if (blocked) return blocked;

  const config = readPaymentsConfig();
  if (!config.webhookConfigured) {
    return NextResponse.json(
      { error: "The payment webhook is not configured: set LEMON_SQUEEZY_WEBHOOK_SECRET to the store's signing secret." },
      { status: 503 },
    );
  }

  const rawBody = await request.text();
  if (rawBody.length > MAX_WEBHOOK_BYTES) {
    return NextResponse.json({ error: "That body is too large to be a delivery." }, { status: 413 });
  }

  const signature = request.headers.get(SIGNATURE_HEADER);
  if (!verifySignature(rawBody, signature, config.webhookSecret)) {
    void noteSecurityEvent({
      kind: "webhook-signature",
      route: "/api/payments/webhook",
      address: clientKey(request.headers),
      detail: { signature: signature ? "present but wrong" : "missing", bytes: rawBody.length },
    });
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "That body is not JSON." }, { status: 400 });
  }

  const outcome = parseWebhookEvent(payload, config);
  if (!outcome.ok) {
    return NextResponse.json({ error: outcome.reason }, { status: 400 });
  }
  if ("ignore" in outcome) {
    return NextResponse.json({ ok: true, ignored: outcome.ignore });
  }

  const result = await recordWebhookWrite(outcome.write);
  if (!result.ok) {
    // 500 on purpose: the store retries, and a payment that is not recorded is worth a retry storm.
    return NextResponse.json({ error: result.reason }, { status: 500 });
  }

  void noteSecurityEvent({
    kind: "payment-webhook",
    route: "/api/payments/webhook",
    actorId: outcome.write.userId,
    detail: { event: outcome.write.event, table: outcome.write.kind, plan: outcome.write.kind === "subscription" ? outcome.write.plan : outcome.write.product },
  });

  return NextResponse.json({ ok: true, kind: outcome.write.kind, id: outcome.write.id });
}

/** Health for a store's webhook tester, and for a deployment check. Never reveals the secret. */
export async function GET() {
  const config = readPaymentsConfig();
  return NextResponse.json({ configured: config.webhookConfigured, url: "/api/payments/webhook" });
}
