"use client";

import { Lock, Play, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import * as React from "react";

import { Button } from "@/components/ui/button";
import type { UnlockState } from "@/lib/unlock";

/**
 * The locked-content panel (Phase 33).
 *
 * It replaces the thing that is locked rather than covering it: on a page where the 3D viewer would be,
 * the visitor sees this panel, so there is no moment where the locked content is on screen behind a
 * translucent overlay.
 *
 * The two ways out are the brief's two, and each says what it really is:
 *
 *   - **watch an advert** - the player is a **mock**. Nothing is contacted, the client reports when it
 *     started, and the server (app/api/unlock) checks only that enough time passed. A real rewarded
 *     network verifies completion on its **own** server and calls back; docs/ADS.md writes down what that
 *     would take, because a mock that looks like enforcement is worse than an obvious placeholder.
 *   - **buy it once** - a real Lemon Squeezy checkout (Phase 32). The plan comes from the row the admin
 *     wrote, never from the client, and the unlock is recorded by the webhook rather than here.
 *
 * After either one succeeds the panel calls `router.refresh()`: the server re-renders the page and this
 * time the real content is there. No client state has to agree with the database for that to work.
 */
export function UnlockPanel({ state, className }: { state: UnlockState; className?: string }) {
  const router = useRouter();
  const [watching, setWatching] = React.useState(false);
  const [remaining, setRemaining] = React.useState(state.adSeconds);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  React.useEffect(() => {
    if (!watching) return;
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      const left = Math.max(0, Math.ceil((startedAt + state.adSeconds * 1000 - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0) window.clearInterval(timer);
    }, 250);
    return () => window.clearInterval(timer);
  }, [watching, state.adSeconds]);

  async function creditAdvert(startedAtMs: number) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/unlock", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ contentId: state.contentId, startedAtMs }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setError(payload?.error ?? "The unlock could not be recorded (" + response.status + ").");
        return;
      }
      setDone(true);
      router.refresh();
    } catch (thrown) {
      setError(thrown instanceof Error ? thrown.message : "The unlock could not be recorded.");
    } finally {
      setBusy(false);
      setWatching(false);
    }
  }

  async function buy() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan: state.purchasePlan }),
      });
      const payload = (await response.json().catch(() => null)) as { url?: string; error?: string } | null;
      if (!response.ok || !payload?.url) {
        setError(payload?.error ?? "The checkout could not be opened (" + response.status + ").");
        return;
      }
      window.location.href = payload.url;
    } catch (thrown) {
      setError(thrown instanceof Error ? thrown.message : "The checkout could not be opened.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className={"glass rounded-[var(--radius-card)] p-6 text-center " + (className ?? "")}
      aria-label="Locked content"
    >
      <Lock className="mx-auto size-6 text-solar" aria-hidden />
      <h2 className="mt-3 font-display text-lg font-semibold text-white">{state.label ?? "Locked content"}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-white/60">{state.reason}</p>

      {state.needsSignIn ? (
        <p className="mt-4 text-sm">
          <Link href="/settings" className="text-neon hover:text-white">
            Open settings and sign in
          </Link>
        </p>
      ) : null}

      {watching ? (
        <div className="mt-5">
          <div className="mx-auto h-2 w-full max-w-xs overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-neon transition-[width] duration-200"
              style={{ width: ((state.adSeconds - remaining) / Math.max(1, state.adSeconds)) * 100 + "%" }}
            />
          </div>
          <p className="mt-2 text-xs text-white/50">
            {remaining > 0 ? remaining + "s left — this is a placeholder advert, no network is contacted." : "Finishing…"}
          </p>
          <Button
            className="mt-3"
            variant="outline"
            size="sm"
            disabled={remaining > 0 || busy}
            onClick={() => void creditAdvert(Date.now() - state.adSeconds * 1000)}
          >
            {remaining > 0 ? "Please wait" : "Claim unlock"}
          </Button>
        </div>
      ) : (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {state.methods.includes("ad") ? (
            <Button
              onClick={() => {
                setRemaining(state.adSeconds);
                setWatching(true);
              }}
              disabled={busy || done}
            >
              <Play className="size-4" aria-hidden />
              Watch {state.adSeconds}s to unlock
            </Button>
          ) : null}

          {state.methods.includes("purchase") && state.purchasePlan ? (
            <Button variant="secondary" onClick={() => void buy()} disabled={busy || done}>
              <Sparkles className="size-4" aria-hidden />
              Buy it once
            </Button>
          ) : null}
        </div>
      )}

      {done ? <p className="mt-3 text-xs text-neon">Unlocked. Loading the content…</p> : null}
      {error ? (
        <p role="status" className="mx-auto mt-3 max-w-md rounded-xl bg-solar/12 px-3 py-2 text-[11px] leading-relaxed text-solar ring-1 ring-solar/25">
          {error}
        </p>
      ) : null}
    </section>
  );
}
