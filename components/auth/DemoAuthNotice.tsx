import { KeyRound, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const ENV_SAMPLE = [
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_…",
  "CLERK_SECRET_KEY=sk_test_…",
  "NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>",
  "SUPABASE_SERVICE_ROLE_KEY=<service role key>",
].join("\n");

/**
 * Shown on /sign-in and /sign-up while Clerk is unconfigured.
 *
 * Rather than a broken embed, Demo Mode explains exactly what to add — and in the
 * meantime everything account-shaped (favourites, scores, badges) still works
 * against a first-party cookie.
 */
export function DemoAuthNotice({ mode }: { mode: "sign-in" | "sign-up" }) {
  return (
    <div className="glass rounded-[var(--radius-card)] p-6 sm:p-8">
      <Badge variant="solar">Demo Mode</Badge>
      <h1 className="mt-3 font-display text-2xl font-bold text-white">
        {mode === "sign-in" ? "Sign-in is not configured yet" : "Accounts are not configured yet"}
      </h1>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/60">
        Kami3D ships without credentials so it runs anywhere. Add your Clerk keys to
        <code className="mx-1 rounded bg-white/8 px-1.5 py-0.5 text-[12px] text-neon">.env.local</code>
        and restart the dev server — this page will then render the real Clerk form, and favourites will sync to
        Supabase.
      </p>

      <div className="mt-5 rounded-2xl bg-void/60 p-4 ring-1 ring-white/10">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-white/45">
          <KeyRound className="size-3.5" />
          .env.local
        </div>
        <pre className="mt-2 overflow-x-auto font-mono text-[12px] leading-relaxed text-white/70">{ENV_SAMPLE}</pre>
      </div>

      <p className="mt-4 flex items-start gap-2 text-xs text-white/45">
        <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-neon/70" />
        Until then, favourites and quiz scores are kept in a first-party cookie, so the whole product is still fully
        usable.
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/explore">Keep exploring</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/profile">Open my collection</Link>
        </Button>
      </div>
    </div>
  );
}
