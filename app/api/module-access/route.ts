import { NextResponse } from "next/server";

import { moduleAccess } from "@/lib/module-gate";

/**
 * GET /api/module-access - which of the unlaunched modules may this visitor open?
 *
 * The navbar asks once per tab (the answer is kept in `sessionStorage`) and only when the session
 * hint says somebody might be signed in, so a guest never pays for this request and a signed-in admin
 * pays for it once. Every module in `lib/coming-soon.ts` is answered at the same time, because one
 * request that answers two questions is cheaper than two.
 *
 * **This endpoint is not the gate.** The middleware enforces each module on every request; this is
 * the same question asked again so a link can be drawn as a link or as "coming soon". It sits outside
 * every gated prefix on purpose: those answer 404 to everyone else, and a 404 is a poor way to say
 * "not for you yet".
 */

export const dynamic = "force-dynamic";

export async function GET() {
  const access = await moduleAccess();

  return NextResponse.json(access, { headers: { "cache-control": "no-store" } });
}
