"use client";

import * as React from "react";

/**
 * Records one view of a species page.
 *
 * It runs on the client because the page is statically generated: counting during
 * a build would count deployments rather than visitors. The request is
 * fire-and-forget — a view count that fails must never affect the page.
 *
 * `tracked` is a module-level guard rather than component state because React
 * runs effects twice on mount in development, and a client-side navigation back to
 * the same species would otherwise count again. The server holds the real
 * de-duplication (a six-hour cookie), so this is only about not sending the
 * request twice in the first place.
 */

const tracked = new Set<string>();

export function ViewTracker({ slug }: { slug: string }) {
  React.useEffect(() => {
    if (tracked.has(slug)) return;
    tracked.add(slug);

    void fetch("/api/views", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slug }),
      keepalive: true,
    }).catch(() => {
      // Offline, ad blocker, database down: none of it is the visitor's problem.
    });
  }, [slug]);

  return null;
}
