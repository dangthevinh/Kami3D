import Link from "next/link";

import { Button } from "@/components/ui/button";

/**
 * Demo-Mode replacement for Clerk's `<UserButton />`. Sign-in pages still exist
 * and explain how to enable auth, so the flow is never a dead end.
 */
export function GuestMenu() {
  return (
    <div className="flex items-center gap-2">
      <Button asChild variant="ghost" size="sm">
        <Link href="/sign-in">Sign in</Link>
      </Button>
      <Button asChild variant="secondary" size="sm">
        <Link href="/sign-up">Sign up</Link>
      </Button>
    </div>
  );
}
