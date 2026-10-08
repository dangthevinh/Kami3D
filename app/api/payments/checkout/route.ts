import { NextResponse } from "next/server";

import { getCurrentUserEmail, getCurrentUserId } from "@/lib/auth";
import { activeAuthProvider } from "@/lib/auth-provider";
import { buildCheckoutRequest, checkoutUrlFrom, PaymentsError } from "@/lib/payments/checkout";
import { readPaymentsConfig } from "@/lib/payments/config";
import { guardWrite, hostOfRequest } from "@/lib/write-guard";

export const dynamic = "force-dynamic";

/**
 * POST /api/payments/checkout - the server opens the checkout and hands the browser a URL.
 *
 * Why the server: the Lemon Squeezy API key is a secret, and a browser that could create a checkout
 * against this store could also pick its own price. The client sends a plan id; the route decides what
 * that costs and which variant it is, using the configuration.
 *
 * The four refusals are all sentences a visitor or an operator can act on, and none of them is a 500:
 *
 *   - no session → **401** (a purchase has to belong to an account, because that is whose entitlement
 *     the webhook will write);
 *   - Demo Mode (no auth provider at all) → **503** with the variable to set, exactly like the Manga
 *     Studio AI panel, so a deployment without keys does not look like a broken login;
 *   - a plan this build does not know → **400**;
 *   - checkout unconfigured, or this deployment does not sell that plan → **503** naming the missing
 *     variable.
 *
 * A Lemon Squeezy answer that carries no URL is a **502**: the store answered, and the answer could not
 * be used - which is a different failure from "the store is not configured".
 */

export async function POST(request: Request) {
  const blocked = guardWrite(request, {
    name: "payments-checkout",
    rule: { limit: 20, windowMs: 60_000 },
    expectedHost: hostOfRequest(request),
  });
  if (blocked) return blocked;

  const body = (await request.json().catch(() => null)) as { plan?: unknown } | null;
  const planId = typeof body?.plan === "string" ? body.plan.trim() : "";
  if (planId.length === 0) return NextResponse.json({ error: "Name the plan to buy." }, { status: 400 });

  const userId = await getCurrentUserId();
  if (!userId) {
    if (activeAuthProvider() === "none") {
      return NextResponse.json(
        { error: "Sign-in is not configured on this deployment, so nothing can be bought yet." },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: "Sign in first: a purchase belongs to an account." }, { status: 401 });
  }

  const config = readPaymentsConfig();

  let built: { url: string; init: RequestInit };
  try {
    built = buildCheckoutRequest({
      config,
      planId,
      userId,
      email: await getCurrentUserEmail(),
      redirectUrl: new URL("/settings?upgraded=1", request.url).toString(),
    });
  } catch (error) {
    if (error instanceof PaymentsError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "The checkout request could not be built." }, { status: 500 });
  }

  try {
    // A store that does not answer must not hold a route open: the visitor is waiting on this.
    const response = await fetch(built.url, { ...built.init, signal: AbortSignal.timeout(15_000) });
    const payload: unknown = await response.json().catch(() => null);

    if (!response.ok) {
      const detail =
        typeof payload === "object" && payload !== null && typeof (payload as { errors?: unknown }).errors === "object"
          ? " Lemon Squeezy refused the request."
          : "";
      // 502 rather than the store's own code: the store's 401 is about *our* API key, and forwarding it
      // would tell a visitor to sign in when the deployment's key is wrong.
      return NextResponse.json({ error: "Lemon Squeezy answered " + response.status + "." + detail }, { status: 502 });
    }

    const url = checkoutUrlFrom(payload);
    if (!url) return NextResponse.json({ error: "Lemon Squeezy answered without a checkout URL." }, { status: 502 });
    return NextResponse.json({ url });
  } catch (error) {
    return NextResponse.json(
      { error: "Could not reach Lemon Squeezy: " + (error instanceof Error ? error.message : "unknown error") },
      { status: 502 },
    );
  }
}
