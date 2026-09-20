"use client";

import { ClerkProvider, Show, UserButton } from "@clerk/nextjs";
import { useTheme } from "next-themes";

import { GuestMenu } from "@/components/layout/GuestMenu";

/**
 * Clerk's account control for the navbar — and its own `<ClerkProvider>`.
 *
 * The provider used to sit in the root layout, which put Clerk's client runtime
 * (and the UI chunks its components pull from Clerk's CDN) into every page's
 * initial payload, signed in or not. Mounting it here instead keeps that cost
 * inside a module the browser only asks for when `lib/auth-hint.ts` reports a
 * session: a signed-out visitor — and every crawler — never downloads it.
 *
 * Two things here are easy to get wrong, and both produced the same visible bug —
 * a "Sign in" button sitting next to the avatar of a visitor who was already
 * signed in:
 *
 *   1. `<SignInButton>` renders its children **unconditionally**. It is a button
 *      that opens the sign-in modal, not a "show this when signed out" switch, so
 *      it has to be wrapped in a condition.
 *   2. In Clerk Core 3 (`@clerk/nextjs@7`) the wrapper is `<Show when="signed-out">`.
 *      `<SignedIn>` and `<SignedOut>` still exist as exports but **throw when
 *      rendered`; they were removed in that release.
 *
 * Both wrappers resolve on the client from the Clerk context, so the navbar can
 * live inside a statically rendered layout without reading cookies on the server.
 */
export function UserMenu() {
  // Clerk paints its own popover, so it needs the theme too. `resolvedTheme` is
  // undefined until mount, which falls back to the dark product default.
  const { resolvedTheme } = useTheme();
  const light = resolvedTheme === "light";

  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "#0b8f6e",
          colorBackground: light ? "#ffffff" : "#070c1a",
          borderRadius: "0.9rem",
        },
      }}
    >
      {/* Until Clerk has loaded there is no state to show, and a visitor who
          reaches this module is one the hint could not prove is a guest, so the
          guest menu is the safe placeholder either way. */}
      <Show when="signed-in" fallback={<GuestMenu />}>
        <UserButton
          appearance={{
            elements: {
              avatarBox: "size-9 ring-1 ring-white/15",
              userButtonPopoverCard: "bg-abyss/95 backdrop-blur-xl border border-white/10",
            },
          }}
        />
      </Show>
    </ClerkProvider>
  );
}
