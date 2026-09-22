import { NextResponse } from "next/server";

import { getAnimalBySlug } from "@/lib/animals";

/**
 * GET /api/animals/[slug] — the full record for one species.
 *
 * The map page carries a light `MapSpecies` (name, region, status, slug) because that is all its
 * panel needs, and putting twenty-four full encyclopaedia entries in the RSC payload to satisfy a
 * 3D viewer that most visitors never open would be the wrong trade. So the hybrid view asks for the
 * one it needs, when it needs it.
 *
 * The catalogue changes when the seed runs, not when a visitor arrives, so it is cached for an hour.
 */

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  if (!slug || slug.length > 120) {
    return NextResponse.json({ error: "A slug is required." }, { status: 400 });
  }

  const animal = await getAnimalBySlug(slug);
  if (!animal) return NextResponse.json({ error: "No such species." }, { status: 404 });

  return NextResponse.json(animal, { headers: { "cache-control": "public, s-maxage=3600, stale-while-revalidate=86400" } });
}
