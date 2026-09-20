"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { cn } from "@/lib/utils";

/**
 * "Continue with Google", via Supabase's OAuth flow.
 *
 * `redirectTo` points at the app's own /auth/callback, which performs the code
 * exchange and writes the session cookies. The provider itself has to be enabled
 * in the Supabase dashboard before this works; when it is not, Supabase answers
 * with "provider is not enabled" and that message is surfaced verbatim rather than
 * swallowed.
 */

function GoogleGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} focusable="false">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.46a5.53 5.53 0 0 1-2.4 3.62v3.01h3.88c2.27-2.09 3.58-5.17 3.58-8.82Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.08 7.94-2.91l-3.88-3.01c-1.08.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.28v3.09A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.29 14.28a7.2 7.2 0 0 1 0-4.56V6.63H1.28a12 12 0 0 0 0 10.74l4.01-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.34.61 4.59 1.8l3.44-3.44C17.95 1.18 15.24 0 12 0A12 12 0 0 0 1.28 6.63l4.01 3.09C6.23 6.88 8.88 4.77 12 4.77Z"
      />
    </svg>
  );
}

export interface GoogleButtonProps {
  /** Shown when the provider is not enabled, so the button is never a dead end. */
  enabled: boolean;
  /** Where to land after the callback completes. */
  redirectTo?: string;
  label?: string;
  className?: string;
}

export function GoogleButton({ enabled, redirectTo = "/", label = "Continue with Google", className }: GoogleButtonProps) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onClick() {
    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setError("Supabase is not configured on this deployment.");
      return;
    }

    setBusy(true);
    setError(null);

    const callback = new URL("/auth/callback", window.location.origin);
    callback.searchParams.set("next", redirectTo);

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callback.toString(),
        // Let the visitor pick an account rather than silently reusing the last one.
        queryParams: { prompt: "select_account" },
      },
    });

    // With a redirect in flight this never resolves; it returns only on failure.
    if (oauthError) {
      setError(
        oauthError.message.toLowerCase().includes("not enabled")
          ? "Google is not enabled for this Supabase project yet — see docs/GOOGLE_AUTH.md."
          : oauthError.message,
      );
      setBusy(false);
      return;
    }

    // Defensive: some environments block the automatic redirect.
    router.refresh();
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={onClick}
        disabled={!enabled || busy}
        aria-disabled={!enabled || busy}
        title={enabled ? undefined : "Enable the Google provider in Supabase to switch this on"}
        className={cn(
          "flex h-11 w-full items-center justify-center gap-2.5 rounded-full px-4 text-sm font-medium transition",
          // Google's button is white in both themes, so it keeps a literal white
          // (the `white` token means "ink" in light mode) and borrows a hairline
          // so it does not disappear on a light card.
          "bg-[#ffffff] text-[#1f1f1f] ring-1 ring-black/10 hover:bg-[#f1f3f4] active:scale-[0.99]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon/70 focus-visible:ring-offset-2 focus-visible:ring-offset-void",
          (!enabled || busy) && "cursor-not-allowed opacity-45 hover:bg-[#ffffff]",
        )}
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : <GoogleGlyph className="size-[18px]" />}
        {busy ? "Redirecting…" : label}
      </button>

      {!enabled ? (
        <p className="mt-2 text-center text-[11px] leading-relaxed text-white/40">
          Google sign-in needs to be enabled in Supabase first —{" "}
          <a
            href="https://github.com/dangthevinh/Kami3D/blob/main/docs/GOOGLE_AUTH.md"
            target="_blank"
            rel="noreferrer noopener"
            className="text-white/60 underline decoration-white/20 underline-offset-2 hover:text-neon"
          >
            setup guide
          </a>
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="mt-2 text-center text-[11px] leading-relaxed text-coral">
          {error}
        </p>
      ) : null}
    </div>
  );
}
