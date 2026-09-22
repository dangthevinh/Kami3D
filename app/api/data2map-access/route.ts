import { NextResponse } from "next/server";

import { data2MapAccess } from "@/lib/data2map-gate";

/**
 * GET /api/data2map-access — may this visitor see Data2Map?
 *
 * The navbar asks once per tab (the answer is kept in `sessionStorage`) and only when the session
 * hint says somebody might be signed in, so a guest never pays for this request and a signed-in
 * admin pays for it once.
 *
 * **This endpoint is not the gate.** The middleware enforces the module on every request; this is
 * the same question asked again so a link can be drawn. It sits outside `/api/data2map` on purpose:
 * the gated prefix answers 404 to everyone else, and a 404 is a poor way to say "no link for you".
 */

export const dynamic = "force-dynamic";

export async function GET() {
  const access = await data2MapAccess();

  return NextResponse.json(
    { visible: access.visible, reason: access.reason, signedIn: access.signedIn },
    { headers: { "cache-control": "no-store" } },
  );
}
