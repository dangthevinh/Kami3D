import { NextResponse } from "next/server";

import { paymentsStatus, readPaymentsConfig } from "@/lib/payments/config";
import { accountEntitlements } from "@/lib/payments/account";

export const dynamic = "force-dynamic";

/**
 * GET /api/payments/status - what is configured, and what the current session is entitled to.
 *
 * Two answers in one payload, and they are deliberately different things:
 *
 *   - **configuration** (`payments`) is about the deployment: is checkout on, is the webhook on, which
 *     plans does this store actually sell. It never contains a key, only whether one is present.
 *   - **account** is about the caller: which entitlements this session holds, and the `checked` flag
 *     that separates "no entitlements" from "could not read". A UI that shows a lock must ask this one.
 *
 * The route never throws and never answers 5xx, for the same reason the AI status route does not: a
 * settings page must be able to say "payment is off" rather than look broken.
 */
export async function GET() {
  try {
    const config = readPaymentsConfig();
    const account = await accountEntitlements();

    return NextResponse.json({
      payments: paymentsStatus(config),
      account: {
        signedIn: account.signedIn,
        checked: account.checked,
        entitlements: account.entitlements,
        premium: account.premium,
        subscription: account.subscription,
        reason: account.reason,
      },
    });
  } catch (error) {
    return NextResponse.json({
      payments: { checkout: false, webhook: false, plans: [], reason: "The payment configuration could not be read." },
      account: { signedIn: false, checked: false, entitlements: [], premium: false, subscription: null, reason: null },
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
