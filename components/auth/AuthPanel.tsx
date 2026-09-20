"use client";

import { ClerkProvider, SignIn, SignUp } from "@clerk/nextjs";
import { useTheme } from "next-themes";

import { cn } from "@/lib/utils";

/**
 * Clerk's hosted components, styled to match the Kami3D dark theme.
 *
 * Only rendered when Clerk is configured. `<SignIn />` requires a
 * `<ClerkProvider />` ancestor, and it carries its own here rather than relying
 * on the root layout: these two routes are the only ones that need Clerk's
 * sign-in bundle, and this is an `import` boundary, so the rest of the site
 * never pays for it. Neither page is indexed (see `app/robots.ts`).
 */
export function AuthPanel({ mode }: { mode: "sign-in" | "sign-up" }) {
  // Clerk renders its own card, so it follows the visitor's theme like everything
  // else does — the "elements" classes are Tailwind, and they already resolve
  // through the theme tokens.
  const { resolvedTheme } = useTheme();
  const light = resolvedTheme === "light";

  const appearance = {
    variables: {
      colorPrimary: "#0b8f6e",
      colorBackground: light ? "#ffffff" : "#0b1226",
      colorInputBackground: light ? "rgba(10,16,36,0.05)" : "rgba(255,255,255,0.05)",
      colorInputText: light ? "#0a1024" : "#e8eefc",
      colorText: light ? "#0a1024" : "#e8eefc",
      borderRadius: "0.9rem",
    },
    elements: {
      card: cn("bg-abyss/80 backdrop-blur-xl shadow-2xl", light ? "border border-black/10" : "border border-white/10"),
      headerTitle: "font-display",
      socialButtonsBlockButton: "border-white/12 hover:bg-white/8",
      formButtonPrimary: "bg-neon text-on-accent hover:bg-neon/90",
    },
  } as const;

  return (
    <ClerkProvider appearance={{ variables: appearance.variables }}>
      <div className="flex justify-center">
        {mode === "sign-in" ? (
          <SignIn appearance={appearance} signUpUrl="/sign-up" />
        ) : (
          <SignUp appearance={appearance} signInUrl="/sign-in" />
        )}
      </div>
    </ClerkProvider>
  );
}
