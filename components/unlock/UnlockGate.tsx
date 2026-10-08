"use client";

import * as React from "react";

import { UnlockPanel } from "@/components/unlock/UnlockPanel";
import type { UnlockState } from "@/lib/unlock";

/**
 * The gate around content that may be locked (Phase 33).
 *
 * Why this is a client island rather than a server check, and why that is a deliberate trade:
 *
 *   - a server check would call `cookies()`, which turns every route it touches into a dynamic render -
 *     and the catalogue detail pages are prerendered (199 pages in the last build). Reading a session in
 *     a page is exactly the cost `lib/auth-hint.ts` exists to avoid;
 *   - so the page stays static, and the island asks `/api/unlock` once. **While the answer is in flight it
 *     renders a placeholder, never the content**, so a locked model is never on screen behind a modal.
 *
 * What this is honest about: it is a **product gate, not access control**. The model files live in a
 * public bucket (every credited model in this catalogue is served from one), so a visitor who reads the
 * page payload can still find the URL. Locking the bytes would mean per-object storage policies, and that
 * is a different change with a different cost - written down in docs/ADS.md rather than implied by a
 * padlock icon.
 */
export function UnlockGate({
  contentId,
  children,
  className,
}: {
  contentId: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [state, setState] = React.useState<UnlockState | null>(null);
  const [checked, setChecked] = React.useState(false);

  React.useEffect(() => {
    let live = true;
    const url = "/api/unlock?contentId=" + encodeURIComponent(contentId);

    fetch(url, { headers: { accept: "application/json" } })
      .then((response) => (response.ok ? (response.json() as Promise<{ state: UnlockState }>) : null))
      .then((payload) => {
        if (!live) return;
        setState(payload?.state ?? null);
        setChecked(true);
      })
      .catch(() => {
        // A failed check shows the content: locking a visitor out because a request failed is a worse
        // failure than showing something that was meant to be locked.
        if (live) setChecked(true);
      });

    return () => {
      live = false;
    };
  }, [contentId]);

  if (!checked) {
    return (
      <div
        className={"grid min-h-[220px] place-items-center rounded-[var(--radius-card)] bg-white/3 ring-1 ring-white/8 " + (className ?? "")}
        aria-busy="true"
        aria-label="Checking access"
      >
        <p className="text-xs text-white/40">Checking access…</p>
      </div>
    );
  }

  if (state?.locked) return <UnlockPanel state={state} className={className} />;
  return <>{children}</>;
}
