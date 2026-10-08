import { NextResponse } from "next/server";

import { isData2MapSampleId, readData2MapSample } from "@/lib/data2map/sample-source";

/**
 * One Data2Map sample, over HTTP.
 *
 * The product pages are static and stay static: this route is where their GeoJSON lives now, read
 * from `data/` at request time instead of being bundled into the page and embedded in its HTML. See
 * `lib/data2map/sample-source.ts` for the measurement that motivated it and the rules it keeps.
 *
 * Three deliberate properties:
 *
 *   - **Dynamic on purpose.** `force-dynamic` means the file is read when a request arrives, not
 *     evaluated into the build. A build should not pay for a dataset to serve a browser that may
 *     never open the page.
 *   - **`private`, not `public`.** Data2Map is admin-only until launch (`lib/data2map-access.ts`),
 *     and the gate is the middleware. A shared cache holding a 200 and handing it to a visitor the
 *     middleware would have 404'd is exactly the hole a `s-maxage` would open, so the only cache
 *     allowed here is the visitor's own browser, for five minutes.
 *   - **A refusal is a sentence.** An unknown dataset is a 404, a broken file is a 503 with the
 *     reason in it; the page prints what it is told rather than drawing an empty map.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ dataset: string }> }) {
  const { dataset } = await context.params;

  if (!isData2MapSampleId(dataset)) {
    return NextResponse.json(
      { error: "Unknown dataset. The Data2Map samples are: agriculture, trends, logistics, real-estate." },
      { status: 404, headers: { "cache-control": "no-store" } },
    );
  }

  try {
    const sample = await readData2MapSample(dataset);
    return NextResponse.json(sample, {
      headers: { "cache-control": "private, max-age=300, must-revalidate" },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "The " + dataset + " sample is not being served: " + (error as Error).message },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }
}
