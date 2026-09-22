"use client";

import Link from "next/link";
import * as React from "react";

/**
 * What a visitor sees when a server component throws.
 *
 * Before this file existed, Next's own error screen rendered instead: a white page with a stack trace
 * in development and a bare "Application error" in production, on a site whose every other route
 * looks like the same product — and with nothing for the visitor to do about it.
 *
 * It is written with plain elements on purpose. An error boundary is part of the shared chunk of
 * every route, so it is the last place to import an icon set or a button component: what a broken
 * page needs is a sentence, a reference number and two links, and that is all this is.
 *
 * `error.digest` is shown because it is the only handle anybody has on a server-side failure (the
 * message itself is not sent to the browser in production). The reference turns "it broke" into a
 * support request that can be looked up.
 */
export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  React.useEffect(() => {
    // One line to the console, and nowhere else: docs/REVIEW.md R5 records that this project has no
    // error monitoring, and inventing a silent upload here would be worse than the gap.
    console.error("[kami3d] route error:", error.digest ?? error.message);
  }, [error]);

  return (
    <div className="section-shell grid min-h-[70vh] place-items-center pt-10">
      <div className="glass max-w-lg rounded-[var(--radius-card)] p-8 text-center">
        <h1 className="font-display text-2xl font-bold text-white">Something went wrong on this page</h1>
        <p className="mt-2 text-sm leading-relaxed text-white/60">
          The rest of the encyclopedia is fine — this route failed to render. Trying again fixes it more often than
          not, because most of these are a database read that timed out.
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
            className="rounded-full bg-neon/15 px-4 py-2 font-medium text-neon ring-1 ring-neon/40 transition-colors hover:bg-neon/25"
          >
            Try again
          </button>
          <Link
            href="/"
            className="rounded-full px-4 py-2 text-white/75 ring-1 ring-white/15 transition-colors hover:bg-white/10 hover:text-white"
          >
            Back home
          </Link>
        </div>
      </div>
    </div>
  );
}
