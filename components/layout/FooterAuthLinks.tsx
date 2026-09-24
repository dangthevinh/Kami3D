"use client";

import Link from "next/link";
import * as React from "react";

import { readSessionHint } from "@/lib/auth-hint";

/**
 * The footer's account links, hidden once a visitor is signed in.
 *
 * A link that still says "Sign in" after you have signed in is the kind of detail
 * that makes an app feel broken, and the footer is easy to miss because it lives
 * outside the auth-aware navbar.
 *
 * The links are server-rendered (a crawler should see them) and removed on the
 * client from the same cookie hint the navbar uses — no Clerk context, so this
 * piece costs no auth JavaScript at all.
 */
export function FooterAuthLinks() {
  const [signedIn, setSignedIn] = React.useState(false);

  React.useEffect(() => {
    if (readSessionHint(document.cookie) === "in") setSignedIn(true);
  }, []);

  if (signedIn) return null;

  return (
    <>
      <li>
        <Link href="/sign-in" className="tap-target text-sm text-white/65 transition-colors hover:text-neon">
          Sign in
        </Link>
      </li>
      <li>
        <Link href="/sign-up" className="tap-target text-sm text-white/65 transition-colors hover:text-neon">
          Create account
        </Link>
      </li>
    </>
  );
}
