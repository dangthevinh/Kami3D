import { NextResponse } from "next/server";

import { adminStatus } from "@/lib/admin";
import { clientKey } from "@/lib/request-guard";
import { noteSecurityEvent } from "@/lib/security-log";

/**
 * The gate every /api/admin route uses before it touches anything.
 *
 * A route answers 404 rather than 403 to a visitor who is not an admin: whether an endpoint exists
 * is not something an unauthorised caller needs to learn, and it matches the /admin/* gate in the
 * middleware (Phase D8).
 *
 * Phase 31 added the second half of the job: the refusal is **recorded** (`security_events`), because
 * an admin route being probed is exactly the event an operator wants to see afterwards. The write is
 * fire-and-forget and throttled, so a script hammering the endpoint cannot turn the log into the
 * outage, and a deployment with no service key degrades to one console line a minute.
 */
export async function requireAdmin(
  request?: Request,
): Promise<{ ok: true; userId: string } | { ok: false; response: NextResponse }> {
  const status = await adminStatus();
  if (!status.admin || !status.userId) {
    void noteSecurityEvent({
      kind: "admin-denied",
      route: routeOf(request),
      actorId: status.userId,
      address: request ? clientKey(request.headers) : null,
      detail: { signedIn: status.signedIn, checked: status.checked },
    });
    return { ok: false, response: NextResponse.json({ error: "not found" }, { status: 404 }) };
  }
  return { ok: true, userId: status.userId };
}

/**
 * The path, for the log line. The query string is dropped with the rest of the URL: `/api/admin` is
 * what an operator greps for, and a query string is one more place a value nobody meant to store ends
 * up. A caller that has no request (a server-side call) says so rather than guessing.
 */
function routeOf(request?: Request): string {
  if (!request) return "/api/admin";
  try {
    return new URL(request.url).pathname;
  } catch {
    return "/api/admin";
  }
}

/** Reject a body that is not the JSON object the route expects. */
export async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await request.json();
    return body && typeof body === "object" ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
