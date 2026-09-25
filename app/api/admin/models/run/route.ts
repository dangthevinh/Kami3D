import { spawn } from "node:child_process";
import { NextResponse } from "next/server";

import { requireAdmin } from "@/app/api/admin/_lib/guard";
import { guardWrite, hostOfRequest } from "@/lib/write-guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Run the queue, now.
 *
 * The work is a child process rather than this request: a batch of downloads takes minutes, and a
 * request that held it open would time out and, worse, would look like it had failed. The worker is
 * `scripts/model-orders.mjs`, the same thing `npm run models:work` runs, and the budget is still
 * enforced inside it by the database.
 *
 * On a serverless host there is no child process to start, so the response says so and names the
 * command instead of pretending something happened.
 */
export async function POST(request: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  // Each call starts a child process, so the bucket is the tightest in the app: six a minute
  // is more than an admin needs and far less than a script would like.
  const blocked = guardWrite(request, {
    name: "admin-run",
    rule: { limit: 6, windowMs: 60_000 },
    expectedHost: hostOfRequest(request),
  });
  if (blocked) return blocked;

  try {
    const child = spawn(process.execPath, ["scripts/model-orders.mjs"], {
      cwd: process.cwd(),
      detached: true,
      stdio: "ignore",
    });
    child.unref();
    return NextResponse.json({ ok: true, started: true, pid: child.pid, command: "npm run models:work" });
  } catch (error) {
    // Honest failure: name the command rather than reporting a run that did not start.
    return NextResponse.json(
      {
        ok: false,
        started: false,
        command: "npm run models:work",
        error: "this runtime cannot start the worker: " + String(error).split("\n")[0],
      },
      { status: 202 },
    );
  }
}
