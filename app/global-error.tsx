"use client";

import * as React from "react";

/**
 * The last line of defence: the root layout itself failed.
 *
 * A `global-error` boundary replaces the root layout, so the theme, the fonts and the stylesheet may
 * all be missing when it renders - which is why this file uses **inline styles** rather than the
 * project's Tailwind classes, and why it does not import a single component. A page that depends on
 * the thing that just broke is not a fallback.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  React.useEffect(() => {
    console.error("[kami3d] root layout error:", error.digest ?? error.message);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#04060f",
          color: "#e8ecf6",
          font: "14px/1.6 system-ui, -apple-system, sans-serif",
        }}
      >
        <main style={{ maxWidth: "30rem", padding: "2rem", textAlign: "center" }}>
          <p style={{ fontSize: "11px", letterSpacing: "0.18em", textTransform: "uppercase", color: "#8a93a6" }}>
            Kami3D
          </p>
          <h1 style={{ margin: "0.5rem 0 0", fontSize: "1.5rem" }}>The site failed to start</h1>
          <p style={{ color: "#8a93a6", marginTop: "0.75rem" }}>
            This is the outermost error boundary, so the page you were on could not be rendered at all.
          </p>

          {error.digest ? (
            <p style={{ marginTop: "1rem", fontSize: "12px", color: "#6f7a90" }}>
              Reference: <code style={{ color: "#e8ecf6" }}>{error.digest}</code>
            </p>
          ) : null}

          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "1.5rem",
              padding: "0.6rem 1.2rem",
              borderRadius: "999px",
              border: "1px solid rgba(53,240,192,0.4)",
              background: "rgba(53,240,192,0.14)",
              color: "#35f0c0",
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
