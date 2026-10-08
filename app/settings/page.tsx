import type { Metadata } from "next";

import { SettingsScreen, type SettingsPayments } from "@/components/settings/SettingsScreen";
import { getCurrentUser } from "@/lib/auth";
import { activeAuthProvider } from "@/lib/auth-provider";
import { accountEntitlements } from "@/lib/payments/account";
import { readPaymentsConfig } from "@/lib/payments/config";

/**
 * `/settings` — the full preferences panel (Phase 11).
 *
 * It is the one page in the product that is rendered per visitor: every other route
 * stays static and reads a session hint on the client instead (see
 * `lib/auth-hint.ts`). That is deliberate here, because the account card has to be
 * right on the first paint and there is no cached version of it worth having.
 *
 * The panel is the same component for a guest, who gets the browser-local copy of
 * every preference plus an invitation to sign in — a settings page that refuses to
 * open without an account would hide the theme switch from most of the people who
 * want it.
 */

export const metadata: Metadata = {
  title: "Settings",
  description:
    "Theme, accent colour, glass intensity, 3D quality, audio, measurement units and notification preferences for Kami3D.",
  alternates: { canonical: "/settings" },
  robots: { index: false, follow: true },
};

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [user, provider, account] = await Promise.all([
    getCurrentUser(),
    Promise.resolve(activeAuthProvider()),
    // Phase 32: the subscription card is rendered from the server's answer, so it cannot flicker from
    // "no subscription" to "Premium" a second after the page appears.
    accountEntitlements(),
  ]);

  const config = readPaymentsConfig();
  const payments: SettingsPayments = {
    checkout: config.checkoutConfigured,
    reason: config.reason,
    signedIn: account.signedIn,
    checked: account.checked,
    premium: account.premium,
    planName: account.subscription?.name ?? null,
    statusReason: account.subscription?.reason ?? account.reason,
    periodEnd: account.subscription?.current_period_end ?? null,
    entitlements: account.entitlements,
  };

  return <SettingsScreen user={user} provider={provider} payments={payments} />;
}
