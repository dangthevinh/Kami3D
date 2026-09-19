import type { Metadata } from "next";

import { AuthForm } from "@/components/auth/AuthForm";
import { AuthPanel } from "@/components/auth/AuthPanel";
import { DemoAuthNotice } from "@/components/auth/DemoAuthNotice";
import { activeAuthProvider } from "@/lib/auth-provider";
import { getAuthProviders } from "@/lib/auth-providers";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to Kami3D to sync your favourite species, quiz scores and badges.",
  robots: { index: false, follow: true },
};

/** Read the post-sign-in destination from either provider's query parameter. */
function resolveRedirect(params: Record<string, string | string[] | undefined>): string {
  const raw = params.redirect_url ?? params.redirectTo ?? params.next;
  const value = Array.isArray(raw) ? raw[0] : raw;
  // Only same-site paths, so a crafted link cannot bounce a visitor off-site.
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

/** An OAuth refusal or a failed code exchange arrives back here as a query param. */
function resolveError(params: Record<string, string | string[] | undefined>): string | null {
  const raw = params.error_description ?? params.error;
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value ? value : null;
}

export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const provider = activeAuthProvider();
  // Google availability is only meaningful for the Supabase provider.
  const providers = provider === "supabase" ? await getAuthProviders() : { email: false, google: false };

  return (
    <div className="section-shell flex min-h-[70vh] items-center justify-center pt-10">
      <div className="w-full max-w-4xl">
        {provider === "clerk" ? (
          <AuthPanel mode="sign-in" />
        ) : provider === "supabase" ? (
          <div className="mx-auto max-w-md">
            <AuthForm
              mode="sign-in"
              redirectTo={resolveRedirect(params)}
              googleEnabled={providers.google}
              initialError={resolveError(params)}
            />
          </div>
        ) : (
          <DemoAuthNotice mode="sign-in" />
        )}
      </div>
    </div>
  );
}