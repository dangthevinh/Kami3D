import type { Metadata } from "next";
import Link from "next/link";

import { AdsConsole } from "@/components/admin/AdsConsole";
import { adminStatus } from "@/lib/admin";
import { AD_PLACEMENTS } from "@/lib/ads";
import { adSlots } from "@/lib/ads-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * /admin/ads - the two switches Phase 33 added, in one console (Phase 33).
 *
 * Both halves of the brief's fourth requirement live here - "turn an ad position on or off" and "mark
 * content as needing an unlock" - and the page reads what a visitor would actually see rather than what
 * the row says: `lib/ads.ts` resolves each enabled switch, and a switch that is on while drawing nothing
 * comes with the sentence explaining why.
 *
 * The gate is the middleware (Phase 31) plus `adminStatus()` here, and every write goes through
 * `/api/admin/ads` or `/api/admin/locked`, which ask `requireAdmin()` again.
 */

export const metadata: Metadata = {
  title: "Ads and locks",
  description: "Ad positions and locked content for Kami3D.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminAdsPage() {
  const status = await adminStatus();

  if (!status.admin) {
    return (
      <div className="section-shell py-14">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-white">Ads and locks</h1>
        <div className="glass mt-5 max-w-2xl rounded-[var(--radius-card)] p-5 text-sm leading-relaxed text-white/60">
          <p>
            {status.signedIn
              ? "This account is not an admin. Access is a row in public.app_admins, checked by public.is_admin()."
              : "Sign in as an admin first: the middleware refuses this page before it renders."}
          </p>
        </div>
        <Link href="/" className="mt-5 inline-block text-xs text-neon hover:text-white">
          ← Back to Kami3D
        </Link>
      </div>
    );
  }

  const supabase = getSupabaseAdmin();
  const [placements, locks] = await Promise.all([
    supabase
      ? supabase.from("ad_placements").select("id, label, enabled, provider, slot_id, note").order("id")
      : Promise.resolve({ data: [], error: null }),
    supabase
      ? supabase
          .from("locked_contents")
          .select("content_id, label, kind, unlock_methods, purchase_plan, ad_seconds, active, updated_at")
          .order("updated_at", { ascending: false })
          .limit(100)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const slots = await adSlots({ fresh: true });

  return (
    <div className="section-shell py-10">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-solar">Admin</p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-white">Ads and locks</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/55">
          Every position starts off: an advertisement appears only where a switch here says so, and an
          entry is locked only when it is listed below. Nothing is drawn over a 3D canvas - the positions
          are beside the content, below it, or in the flow of a grid.
        </p>
      </header>

      <div className="mt-6">
        <AdsConsole
          placements={(placements.data ?? []) as never}
          catalogue={AD_PLACEMENTS.map((entry) => ({ id: entry.id, label: entry.label, where: entry.where }))}
          drawing={slots.slots.map((slot) => slot.id)}
          reasons={slots.reasons}
          locks={(locks.data ?? []) as never}
          adsenseConfigured={Boolean(process.env.NEXT_PUBLIC_ADSENSE_CLIENT)}
        />
      </div>

      <p className="mt-8 text-[11px] text-white/35">
        Other admin surfaces:{" "}
        <Link href="/admin/models" className="underline decoration-white/20 underline-offset-2">
          Model sourcing
        </Link>
        {" · "}
        <Link href="/admin/analytics" className="underline decoration-white/20 underline-offset-2">
          Channel analytics
        </Link>
        {" · "}
        <Link href="/admin/security" className="underline decoration-white/20 underline-offset-2">
          Security log
        </Link>
      </p>
    </div>
  );
}
