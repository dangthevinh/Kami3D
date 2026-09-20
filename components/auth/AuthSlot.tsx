"use client";

import * as React from "react";

import { GuestMenu } from "@/components/layout/GuestMenu";
import type { AuthProvider } from "@/lib/auth-provider";
import { readSessionHint } from "@/lib/auth-hint";
import { whenIdle } from "@/lib/idle";

/**
 * The navbar's account area.
 *
 * Everything auth-related is loaded through `import()` **inside an effect**, so
 * neither Clerk's hosted UI nor `@supabase/supabase-js` is part of the page's
 * initial JavaScript. Measured on the production build: a signed-out visitor used
 * to download ~112 kB of Supabase and ~350 kB of Clerk (CDN + chunks) before the
 * first byte of the page was interactive, on every route, including the species
 * pages a crawler visits.
 *
 * The server already rendered the guest state — which is correct for a first-time
 * visitor and for crawlers — so the only job here is to swap it for the account
 * menu when `lib/auth-hint.ts` says there is a session worth loading for.
 */

type SlotComponent = React.ComponentType;

const LOADERS: Record<Exclude<AuthProvider, "none">, () => Promise<SlotComponent>> = {
  clerk: () => import("@/components/layout/UserMenu").then((mod) => mod.UserMenu),
  supabase: () => import("@/components/auth/SupabaseAuthSlot").then((mod) => mod.SupabaseAuthSlot),
};

export function AuthSlot({ provider }: { provider: AuthProvider }) {
  const loader = provider === "none" ? null : LOADERS[provider];
  const [Component, setComponent] = React.useState<SlotComponent | null>(null);

  React.useEffect(() => {
    if (!loader) return;

    const hint = readSessionHint(document.cookie);
    // Guests keep the markup the server already sent: no auth SDK at all.
    if (hint === "out") return;

    let cancelled = false;
    const start = () => {
      void loader()
        .then((component) => {
          if (!cancelled) setComponent(() => component);
        })
        .catch(() => undefined);
    };

    if (hint === "in") {
      start();
      return () => {
        cancelled = true;
      };
    }

    const cancel = whenIdle(start);
    return () => {
      cancelled = true;
      cancel();
    };
  }, [loader]);

  if (!Component) return <GuestMenu />;
  return <Component />;
}
