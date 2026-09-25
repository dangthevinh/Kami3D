import { NextResponse } from "next/server";

import { parseImport, validateOptions } from "@/lib/geodata-import";
import { getCurrentUserId } from "@/lib/auth";
import { getPersonalDataClient } from "@/lib/personal-data";
import { guardWrite, hostOfRequest } from "@/lib/write-guard";

export const dynamic = "force-dynamic";

/**
 * The admin geodata import endpoint.
 *
 * Three rules from the Phase 17 brief are enforced here rather than in the page:
 *
 *   1. **the service role never reaches the browser.** The upload is validated in
 *      `lib/geodata-import.ts`, and only a request that passes `is_admin()` in the database
 *      writes a row - which is the same check the RLS policy on `animal_geodata` makes, so a
 *      bug here cannot become a write anyway;
 *   2. **preview before publish.** Without `publish: true` the endpoint parses and answers
 *      with the summary and every refusal, and touches nothing;
 *   3. **an import is a version.** Rows are written under a `source_version`, so re-importing
 *      appends rather than overwrites and the timeline keeps its history.
 *
 * The limit is small on purpose: this endpoint is for a curated range map, not for a bulk
 * upload, and a file that big belongs in the CLI.
 */

const MAX_BYTES = 4 * 1024 * 1024;

async function isAdmin(): Promise<boolean> {
  const userId = await getCurrentUserId();
  if (!userId) return false;

  const supabase = await getPersonalDataClient();
  if (!supabase) return false;

  const { data, error } = await supabase.rpc("is_admin");
  if (error) {
    console.warn("[kami3d] admin check failed:", error.message);
    return false;
  }

  return data === true;
}

export async function GET() {
  const userId = await getCurrentUserId();
  return NextResponse.json({ signedIn: Boolean(userId), admin: await isAdmin() });
}

export async function POST(request: Request) {
  const blocked = guardWrite(request, { name: "admin-geodata", rule: { limit: 20, windowMs: 60_000 }, expectedHost: hostOfRequest(request) });
  if (blocked) return blocked;

  if (!(await isAdmin())) {
    // Deliberately the same answer for "not signed in" and "signed in but not an admin": the
    // endpoint is not a place to enumerate who has rights.
    return NextResponse.json({ error: "Admin access is required." }, { status: 403 });
  }

  let body: {
    file?: unknown;
    slug?: unknown;
    kind?: unknown;
    year?: unknown;
    source?: unknown;
    sourceUrl?: unknown;
    license?: unknown;
    attribution?: unknown;
    publish?: unknown;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const file = typeof body.file === "string" ? body.file : "";
  if (file.length === 0) return NextResponse.json({ error: "No file content" }, { status: 400 });
  if (file.length > MAX_BYTES) {
    return NextResponse.json({ error: "That file is larger than 4 MB - use the CLI for bulk imports." }, { status: 413 });
  }

  const options = {
    slug: typeof body.slug === "string" ? body.slug : "",
    kind: typeof body.kind === "string" ? body.kind : "",
    year: typeof body.year === "number" && Number.isInteger(body.year) ? body.year : null,
    source: typeof body.source === "string" ? body.source : "",
    license: typeof body.license === "string" ? body.license : "",
    attribution: typeof body.attribution === "string" ? body.attribution : "",
    sourceUrl: typeof body.sourceUrl === "string" && body.sourceUrl.length > 0 ? body.sourceUrl : null,
  };

  const problems = validateOptions(options);
  if (problems.length > 0) return NextResponse.json({ errors: problems }, { status: 400 });

  const result = parseImport(file, options);
  if (result.errors.length > 0) {
    return NextResponse.json({ errors: result.errors, warnings: result.warnings }, { status: 422 });
  }

  if (body.publish !== true) {
    return NextResponse.json({
      preview: true,
      summary: result.summary,
      warnings: result.warnings,
      // Only the first few geometries travel back: the preview map needs an outline, not the
      // whole file again.
      features: result.features.slice(0, 25),
    });
  }

  const supabase = await getPersonalDataClient();
  if (!supabase) return NextResponse.json({ error: "The database is unavailable." }, { status: 502 });

  const { data: animals, error: lookupError } = await supabase.from("animals").select("id").eq("slug", options.slug).limit(1);
  if (lookupError) return NextResponse.json({ error: lookupError.message }, { status: 502 });
  const animalId = animals?.[0]?.id;
  if (!animalId) return NextResponse.json({ error: `No species called "${options.slug}".` }, { status: 404 });

  const version = `${options.source.replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase()}-${new Date().toISOString().slice(0, 10)}`;
  const rows = result.features.map((feature) => ({
    animal_id: animalId,
    kind: options.kind,
    year: options.year,
    geometry: feature.geometry,
    source: options.source,
    source_url: options.sourceUrl,
    license: options.license,
    attribution: options.attribution,
    source_version: version,
    properties: { imported: true, via: "admin", points: result.summary.points },
  }));

  const { error: insertError } = await supabase.from("animal_geodata").upsert(rows, { onConflict: "animal_id,dedupe_key" });
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 502 });

  return NextResponse.json({ published: rows.length, version });
}
