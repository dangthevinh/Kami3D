import { NextResponse } from "next/server";

import { adSlots } from "@/lib/ads-server";

/**
 * GET /api/ads/slots - which ad positions are on right now, and what each one should render.
 *
 * Public and cookie-less on purpose: the answer is the same for everybody, and a route that read a
 * session would make every page that shows an ad dynamic. It is cached for a minute at the edge and in
 * process, so an admin's switch applies quickly without a rebuild and without a query per page view.
 *
 * It never throws: when the placements cannot be read the answer is `checked: false` and no slots, which
 * the banner treats as "draw nothing".
 */
export const revalidate = 60;

export async function GET() {
  const { slots, checked } = await adSlots();
  return NextResponse.json(
    {
      checked,
      slots: slots.map((slot) => ({
        id: slot.id,
        label: slot.label,
        provider: slot.provider,
        slotId: slot.slotId,
        client: slot.client,
      })),
    },
    { headers: { "cache-control": "public, max-age=0, s-maxage=60, stale-while-revalidate=300" } },
  );
}
