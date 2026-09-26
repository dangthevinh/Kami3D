import { NextResponse } from "next/server";

import { requireAdmin } from "@/app/api/admin/_lib/guard";
import { ingestInbox, readInbox } from "@/lib/upload-ingest";
import { guardWrite, hostOfRequest } from "@/lib/write-guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * The automatic door's control panel: what is waiting in the Storage inbox, and a button that
 * processes it now instead of waiting for the app's clock.
 *
 * Both this route and the clock call `ingestInbox()`, which calls the same publish function the
 * manual form calls, so there is one set of rules rather than two.
 */
export async function GET() {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const items = await readInbox();
  return NextResponse.json({ ok: true, items });
}

export async function POST(request: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const blocked = guardWrite(request, {
    name: "admin-model-inbox",
    rule: { limit: 4, windowMs: 600_000 },
    expectedHost: hostOfRequest(request),
  });
  if (blocked) return blocked;

  const report = await ingestInbox({ actor: gate.userId });
  return NextResponse.json(report, { status: report.ok ? 200 : 503 });
}
