"use client";

import { Show } from "@clerk/nextjs";
import Link from "next/link";

/**
 * The footer's account links, hidden once a visitor is signed in.
 *
 * A link that still says "Sign in" after you have signed in is the kind of detail
 * that makes an app feel broken, and the footer is easy to miss because it lives
 * outside the auth-aware navbar.
 *
 * A client component on purpose: the footer sits in the root layout, and asking
 * Clerk for the auth state on the server would read cookies and opt all 34 routes
 * — including the statically generated species pages — into dynamic rendering.
 * `<Show>` resolves from the client context instead.
 *
 * `<Show>` is the Core 3 replacement for `<SignedOut>`, which was removed in
 * `@clerk/nextjs@7` and throws if it is rendered.
 */
export function FooterAuthLinks({ clerk }: { clerk: boolean }) {
  const links = (
    <>
      <li>
        <Link href="/sign-in" className="text-sm text-white/65 transition-colors hover:text-neon">
          Sign in
        </Link>
      </li>
      <li>
        <Link href="/sign-up" className="text-sm text-white/65 transition-colors hover:text-neon">
          Create account
        </Link>
      </li>
    </>
  );

  // Without a ClerkProvider ancestor <Show> has no context, so the non-Clerk
  // providers keep the links unconditionally.
  return clerk ? <Show when="signed-out">{links}</Show> : links;
}
