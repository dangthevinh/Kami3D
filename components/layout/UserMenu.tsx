"use client";

import { SignInButton, UserButton } from "@clerk/nextjs";
import { LogIn } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Rendered only when Clerk is configured — `<UserButton />` requires a
 * `<ClerkProvider />` ancestor, which the root layout adds conditionally.
 */
export function UserMenu() {
  return (
    <div className="flex items-center gap-2">
      <SignInButton mode="modal">
        <Button variant="ghost" size="sm" className="hidden xl:inline-flex">
          <LogIn />
          Sign in
        </Button>
      </SignInButton>
      <UserButton
        appearance={{
          elements: {
            avatarBox: "size-9 ring-1 ring-white/15",
            userButtonPopoverCard: "bg-abyss/95 backdrop-blur-xl border border-white/10",
          },
        }}
      />
    </div>
  );
}
