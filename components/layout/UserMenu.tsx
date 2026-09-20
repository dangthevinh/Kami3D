"use client";

import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import { LogIn } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Clerk's controls for the navbar.
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
 *      rendered**; they were removed in that release.
 *
 * Both wrappers resolve on the client from the Clerk context, so the navbar can
 * live inside a statically rendered layout without reading cookies on the server.
 */
export function UserMenu() {
  return (
    <div className="flex items-center gap-2">
      <Show when="signed-out">
        <SignInButton mode="modal">
          <Button variant="ghost" size="sm" className="hidden xl:inline-flex">
            <LogIn />
            Sign in
          </Button>
        </SignInButton>
      </Show>

      <Show when="signed-in">
        <UserButton
          appearance={{
            elements: {
              avatarBox: "size-9 ring-1 ring-white/15",
              userButtonPopoverCard: "bg-abyss/95 backdrop-blur-xl border border-white/10",
            },
          }}
        />
      </Show>
    </div>
  );
}
