import { NextResponse } from "next/server";

import { requireAdmin, readJson } from "@/app/api/admin/_lib/guard";
import { mergeAutopilotInput } from "@/lib/autopilot";
import { runAutopilotRound } from "@/lib/autopilot-runner";
import { readAutopilot, readGapReport, readOrders } from "@/lib/model-sourcing";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { guardWrite, hostOfRequest } from "@/lib/write-guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
/** A round downloads and uploads a model, so this route is allowed to take its time. */
export const maxDuration = 300;

/**
 * The auto-pilot's control panel, as an API.
 *
 *   GET  ?                                the policy, the gap report, and what the next round asks for
 *   POST { action: "configure" | "run" | "enqueue" }
 *
 * "run" is the difference between this phase and Phase 18B: the round is executed **here**, in
 * process, and the answer is what actually happened - the order's counts and the worker's own
 * output - instead of "started" and a hope. The rule the panel cannot break is that a round is a
 * request to the database, not a permission: the download budget is still spent by
 * `reserve_model_download()` and nowhere else.
 */
export async function GET() {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const [policy, gaps, orders] = await Promise.all([readAutopilot(), readGapReport(), readOrders(3)]);
  const openSlugs = orders
    .filter((order) => order.status === "queued" || order.status === "running")
    .flatMap((order) => order.slugs);

  return NextResponse.json({ policy, gaps, openSlugs });
}

export async function POST(request: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const body = await readJson(request);
  if (!body) return NextResponse.json({ error: "expected a JSON body" }, { status: 400 });

  const action = typeof body.action === "string" ? body.action : "configure";

  // A round starts a child process and spends real downloads, so its bucket is the tight one.
  const blocked = guardWrite(request, {
    name: action === "run" ? "admin-autopilot-run" : "admin-autopilot",
    rule: action === "run" ? { limit: 3, windowMs: 300_000 } : { limit: 20, windowMs: 60_000 },
    expectedHost: hostOfRequest(request),
  });
  if (blocked) return blocked;

  if (action === "configure") {
    const current = await readAutopilot();
    if (!current) {
      return NextResponse.json({ error: "no auto-pilot row: run npm run db:schema" }, { status: 503 });
    }

    const next = mergeAutopilotInput(current, body);
    const supabase = getSupabaseAdmin();
    if (!supabase) return NextResponse.json({ error: "no database connection" }, { status: 503 });

    const { error } = await supabase
      .from("model_autopilot")
      .update({
        enabled: next.enabled,
        cadence_minutes: next.cadenceMinutes,
        per_run: next.perRun,
        scope: next.scope,
        slugs: next.slugs,
        min_score: next.minScore,
        // Switching it on should not make an admin wait for the next slot of the old cadence.
        ...(next.enabled && !current.enabled ? { next_run_at: new Date().toISOString() } : {}),
        updated_by: gate.userId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", "default");

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const [policy, gaps] = await Promise.all([readAutopilot(), readGapReport()]);
    return NextResponse.json({ ok: true, policy, gaps });
  }

  if (action === "run" || action === "enqueue") {
    const report = await runAutopilotRound({
      actor: gate.userId,
      trigger: "panel",
      // The button is explicit: it ignores the switch and the cadence, and nothing else.
      force: true,
      enqueueOnly: action === "enqueue",
      waitMs: action === "run" ? 150_000 : 5_000,
    });
    return NextResponse.json(report, { status: report.ok ? 200 : 503 });
  }

  return NextResponse.json({ error: "unknown action: " + action }, { status: 400 });
}
