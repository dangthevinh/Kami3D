"use client";

import Link from "next/link";
import * as React from "react";

/**
 * What a broken studio page looks like.
 *
 * Deliberately plain: an error boundary is part of the segment's chunk, so it has no business
 * importing the design system or an icon set. One sentence, the digest when there is one, and two ways
 * out — the studio's own index and the gallery, which does not depend on anything this page did.
 */
export default function MangaStudioError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  React.useEffect(() => {
    console.error("[kami3d] manga studio error:", error.digest ?? error.message);
  }, [error]);

  return (
    <div className="section-shell grid min-h-[60vh] place-items-center py-12">
      <div className="glass max-w-lg rounded-[var(--radius-card)] p-8 text-center">
        <h1 className="font-display text-2xl font-bold text-white">The studio hit an error on this page</h1>
        <p className="mt-2 text-sm leading-relaxed text-white/60">
          Nothing was published or deleted by this failure — the panels, pages and chapters already saved are still
          there. Trying again fixes most of these, because most of them are a read that timed out.
        </p>

        {error.digest ? (
          <p className="mt-4 text-[11px] text-white/40">
            Reference: <code className="text-white/70">{error.digest}</code>
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap justify-center gap-3 text-sm">
          <button
            type="button"
            onClick={reset}
            className="tap-target rounded-full bg-neon/15 px-4 py-2 font-medium text-neon ring-1 ring-neon/40 transition-colors hover:bg-neon/25"
          >
            Try again
          </button>
          <Link
            href="/manga-studio"
            className="tap-target rounded-full px-4 py-2 text-white/75 ring-1 ring-white/15 transition-colors hover:bg-white/10 hover:text-white"
          >
            Back to the studio
          </Link>
        </div>
      </div>
    </div>
  );
}
