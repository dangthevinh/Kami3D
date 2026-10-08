"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";

/**
 * The upgrade button (Phase 32).
 *
 * Three honest states, and none of them is a disabled-looking button with no explanation:
 *
 *   - **checkout off** (`available === false`) - the deployment has no Lemon Squeezy keys, so this
 *     renders the reason instead of a button that would answer 503;
 *   - **signed out** - it sends the visitor to `/settings` (where the account card is) rather than
 *     pretending to open a checkout that needs an account to credit;
 *   - **ready** - it asks the server for a checkout URL and sends the browser there.
 *
 * The server opens the checkout; this component never sees the API key and never decides a price. A
 * failure is printed verbatim: the route's refusals are sentences written for a person ("set
 * LEMON_SQUEEZY_VARIANT_PREMIUM_MONTHLY"), and swallowing them is how a payment bug becomes a mystery.
 */
export function UpgradeButton({
  planId,
  label,
  available = true,
  signedIn = true,
  variant = "default",
  className,
}: {
  planId: string;
  label: string;
  available?: boolean;
  signedIn?: boolean;
  variant?: "default" | "outline" | "ghost" | "secondary";
  className?: string;
}) {
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function start() {
    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan: planId }),
      });
      const payload = (await response.json().catch(() => null)) as { url?: string; error?: string } | null;

      if (!response.ok || !payload?.url) {
        setError(payload?.error ?? "The checkout could not be opened (" + response.status + ").");
        return;
      }

      // Lemon Squeezy's hosted checkout: a full navigation, so the back button returns here.
      window.location.href = payload.url;
    } catch (thrown) {
      setError(thrown instanceof Error ? thrown.message : "The checkout could not be opened.");
    } finally {
      setBusy(false);
    }
  }

  if (!available) {
    return <p className="text-xs leading-relaxed text-white/45">Checkout is not configured on this deployment.</p>;
  }

  return (
    <div className="space-y-2">
      <Button
        variant={variant}
        className={className}
        disabled={busy}
        onClick={() => {
          if (!signedIn) {
            window.location.href = "/settings";
            return;
          }
          void start();
        }}
      >
        {busy ? "Opening checkout…" : label}
      </Button>
      {error ? (
        <p role="status" className="rounded-xl bg-solar/12 px-3 py-2 text-[11px] leading-relaxed text-solar ring-1 ring-solar/25">
          {error}
        </p>
      ) : null}
    </div>
  );
}
