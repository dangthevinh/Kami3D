"use client";

import { SignIn, SignUp } from "@clerk/nextjs";

/**
 * Clerk's hosted components, styled to match the Kami3D dark theme.
 *
 * Only rendered when Clerk is configured — `<SignIn />` requires a
 * `<ClerkProvider />` ancestor, and the root layout only mounts that provider
 * when the publishable key exists.
 */
export function AuthPanel({ mode }: { mode: "sign-in" | "sign-up" }) {
  const appearance = {
    variables: {
      colorPrimary: "#35f0c0",
      colorBackground: "#0b1226",
      colorInputBackground: "rgba(255,255,255,0.05)",
      colorInputText: "#e8eefc",
      colorText: "#e8eefc",
      borderRadius: "0.9rem",
    },
    elements: {
      card: "bg-abyss/80 backdrop-blur-xl border border-white/10 shadow-2xl",
      headerTitle: "font-display",
      socialButtonsBlockButton: "border-white/12 hover:bg-white/8",
      formButtonPrimary: "bg-neon text-[#04121a] hover:bg-neon/90",
    },
  } as const;

  return (
    <div className="flex justify-center">
      {mode === "sign-in" ? (
        <SignIn appearance={appearance} signUpUrl="/sign-up" />
      ) : (
        <SignUp appearance={appearance} signInUrl="/sign-in" />
      )}
    </div>
  );
}
