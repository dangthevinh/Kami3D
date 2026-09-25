import { NextResponse } from "next/server";

import { requireAdmin } from "@/app/api/admin/_lib/guard";
import { cronAuthorised } from "@/lib/autopilot";
import { runAutopilotRound } from "@/lib/autopilot-runner";
import { guardWrite, hostOfRequest } from "@/lib/write-guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * The same round as the panel button, for hosts that have a scheduler instead of a server process.
 *
 * The in-process scheduler (`lib/autopilot-scheduler.ts`) covers a long-running `next start`, which
 * is how this project is run. A serverless host has no such process, so it needs something outside
 * to call in, and this is that door:
 *
 *   curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://your-host/api/cron/models
 *
 * A signed-in admin may call it too, which is what makes it testable without inventing a secret. With
 * no `CRON_SECRET` set the endpoint refuses **every** unauthenticated call: an unset secret is not an
 * open door, and it says so in the response instead of pretending to have run.
 */
async function handle(request: Request) {
  const verdict = cronAuthorised(request.headers.get("authorization"), process.env.CRON_SECRET ?? null);

  if (!verdict.ok) {
    const gate = await requireAdmin();
    if (!gate.ok) return NextResponse.json({ ok: false, reason: verdict.reason }, { status: 401 });
  }

  // A scheduler that has lost its mind should not be able to spend a download budget through this
  // door: six rounds in five minutes is more than any cadence needs. A server-to-server call carries
  // no Sec-Fetch-Site and no Origin, which the guard reads as "not a browser" and lets through.
  const blocked = guardWrite(request, {
    name: "cron-models",
    rule: { limit: 6, windowMs: 300_000 },
    expectedHost: hostOfRequest(request),
  });
  if (blocked) return blocked;

  // Shorter than the panel's patience: a scheduler will come back, and a request that hangs is worse
  // than a round that is left running. The order row carries the progress either way.
  const report = await runAutopilotRound({ actor: "cron", trigger: "cron", force: false, waitMs: 45_000 });
  return NextResponse.json(report, { status: report.ok ? 200 : 503 });
}

export const GET = handle;
export const POST = handle;
