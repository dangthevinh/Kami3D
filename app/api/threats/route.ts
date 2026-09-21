import { NextResponse } from "next/server";

import { getMapThreats } from "@/lib/threats";

/**
 * The threat layer, fetched when the visitor turns it on.
 *
 * 1 662 centroids are a few hundred kilobytes: sending them with the page would make every
 * `/map` visit pay for a layer most visitors never switch on, and the page is a server
 * component whose props travel in the payload. So the layer is a request away, and only when
 * the switch is flipped.
 *
 * Read-only and public, like the geodata itself: the same rows are already readable through
 * RLS by anyone with the anon key.
 */

// Dynamic rather than baked at build time: the layer changes whenever the pipeline runs,
// and a stale copy of it would be indistinguishable from an empty one. The response is
// cached hard instead (`s-maxage`), so the database is asked once a day, not once a visit.
export const dynamic = "force-dynamic";

export async function GET() {
  const features = await getMapThreats();

  return NextResponse.json(
    { type: "FeatureCollection", features },
    { headers: { "cache-control": "public, s-maxage=86400, stale-while-revalidate=604800" } },
  );
}
