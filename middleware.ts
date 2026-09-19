import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Auth middleware.
 *
 * Clerk is optional: Kami3D is expected to run with no keys at all, so the Clerk
 * middleware is only constructed when both halves of the key pair are present. In
 * Demo Mode a pass-through middleware keeps the same matcher (and therefore the
 * same routing behaviour) without ever touching Clerk.
 *
 * Note there is deliberately no route matching here. Path-based protection is
 * deprecated in Clerk and easy to get wrong, so the requirement is enforced where
 * the data lives instead — see the guard in `app/profile/page.tsx`. This
 * middleware only maintains the session.
 */

const authEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY);

export default authEnabled
  ? clerkMiddleware()
  : function demoMiddleware(_request: NextRequest) {
      return NextResponse.next();
    };

export const config = {
  matcher: [
    // Skip Next internals and static files, run on everything else (incl. /api).
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
