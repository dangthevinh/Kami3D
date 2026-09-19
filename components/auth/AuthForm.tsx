"use client";

import { AlertCircle, ArrowRight, CheckCircle2, Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

import { GoogleButton } from "@/components/auth/GoogleButton";
import { Button } from "@/components/ui/button";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { cn } from "@/lib/utils";

/**
 * Email + password sign-in and sign-up, backed by Supabase Auth.
 *
 * Written by hand rather than embedded (as Clerk's hosted form is) because
 * Supabase's auth UI is a separate dependency and this keeps the two providers
 * interchangeable behind one component.
 *
 * The sign-up path handles both project settings: with "Confirm email" off,
 * Supabase returns a session and the visitor is signed in immediately; with it on,
 * the account exists but is unconfirmed, and saying so is far better than
 * pretending the sign-in failed.
 */

type Mode = "sign-in" | "sign-up";

const MIN_PASSWORD_LENGTH = 8;

/** Supabase's messages are accurate but terse; these are friendlier. */
function explain(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("invalid login credentials")) return "That email and password combination does not match an account.";
  if (lower.includes("email not confirmed")) return "This account still needs confirming — check your inbox for the link.";
  if (lower.includes("user already registered")) return "An account with that email already exists. Try signing in instead.";
  if (lower.includes("password should be at least")) return `Please use at least ${MIN_PASSWORD_LENGTH} characters.`;
  if (lower.includes("unable to validate email")) return "That does not look like a valid email address.";
  if (lower.includes("rate limit") || lower.includes("too many")) return "Too many attempts — please wait a minute and try again.";
  if (lower.includes("failed to fetch") || lower.includes("networkerror")) return "Could not reach Supabase. Check your connection and try again.";
  return message;
}

export interface AuthFormProps {
  mode: Mode;
  /** Where to land after a successful sign-in. */
  redirectTo?: string;
  /** Whether the Supabase project has the Google provider switched on. */
  googleEnabled?: boolean;
  /** An error handed back by /auth/callback or by an OAuth refusal. */
  initialError?: string | null;
  className?: string;
}

export function AuthForm({
  mode,
  redirectTo = "/",
  googleEnabled = false,
  initialError = null,
  className,
}: AuthFormProps) {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(initialError);
  const [notice, setNotice] = React.useState<string | null>(null);

  const supabase = getSupabaseBrowser();
  const isSignUp = mode === "sign-up";

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);

    if (!supabase) {
      setError("Supabase is not configured, so accounts are unavailable.");
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }

    setBusy(true);
    try {
      if (isSignUp) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/sign-in` },
        });
        if (signUpError) throw signUpError;

        if (data.session) {
          router.push(redirectTo);
          router.refresh();
          return;
        }

        // No session: the project requires email confirmation.
        setNotice(`Account created. We sent a confirmation link to ${email} — open it, then sign in here.`);
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;

      router.push(redirectTo);
      router.refresh();
    } catch (caught) {
      setError(explain(caught instanceof Error ? caught.message : String(caught)));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className={cn("glass rounded-[var(--radius-card)] p-6 sm:p-8", className)} noValidate>
      <h1 className="font-display text-2xl font-bold text-white">
        {isSignUp ? "Create your Kami3D account" : "Welcome back"}
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-white/60">
        {isSignUp
          ? "Save species to your collection and keep your quiz scores and badges across devices."
          : "Sign in to reach your saved species, scores and badges."}
      </p>

      <div className="mt-6 space-y-4">
        <GoogleButton
          enabled={googleEnabled}
          redirectTo={redirectTo}
          label={isSignUp ? "Sign up with Google" : "Continue with Google"}
        />

        <div className="flex items-center gap-3" aria-hidden>
          <span className="h-px flex-1 bg-white/10" />
          <span className="text-[11px] uppercase tracking-wide text-white/35">or use email</span>
          <span className="h-px flex-1 bg-white/10" />
        </div>

        <label className="block">
          <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-white/50">Email</span>
          <span className="relative block">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-white/40" />
            <input
              type="email"
              name="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="h-11 w-full rounded-full bg-white/6 pl-10 pr-4 text-sm text-white placeholder:text-white/35 ring-1 ring-white/10 transition hover:ring-white/20 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-neon/60"
            />
          </span>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-white/50">Password</span>
          <span className="relative block">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-white/40" />
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              autoComplete={isSignUp ? "new-password" : "current-password"}
              required
              minLength={MIN_PASSWORD_LENGTH}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
              className="h-11 w-full rounded-full bg-white/6 pl-10 pr-12 text-sm text-white placeholder:text-white/35 ring-1 ring-white/10 transition hover:ring-white/20 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-neon/60"
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-3 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full text-white/45 transition-colors hover:bg-white/10 hover:text-white"
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </span>
        </label>
      </div>

      {error ? (
        <p
          role="alert"
          className="mt-4 flex items-start gap-2 rounded-2xl bg-coral/12 px-3.5 py-3 text-sm text-coral ring-1 ring-coral/30"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          {error}
        </p>
      ) : null}

      {notice ? (
        <p
          role="status"
          className="mt-4 flex items-start gap-2 rounded-2xl bg-neon/12 px-3.5 py-3 text-sm text-neon ring-1 ring-neon/30"
        >
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          {notice}
        </p>
      ) : null}

      <Button type="submit" size="lg" disabled={busy} className="mt-5 w-full">
        {busy ? <Loader2 className="animate-spin" /> : null}
        {busy ? "Working…" : isSignUp ? "Create account" : "Sign in"}
        {!busy ? <ArrowRight /> : null}
      </Button>

      <p className="mt-5 text-center text-sm text-white/55">
        {isSignUp ? "Already have an account? " : "New to Kami3D? "}
        <a
          href={isSignUp ? "/sign-in" : "/sign-up"}
          className="font-medium text-neon underline decoration-neon/30 underline-offset-2 transition-colors hover:text-neon/80"
        >
          {isSignUp ? "Sign in" : "Create one"}
        </a>
      </p>
    </form>
  );
}
