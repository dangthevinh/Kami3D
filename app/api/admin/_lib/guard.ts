import { NextResponse } from "next/server";

import { adminStatus } from "@/lib/admin";

/**
 * The gate every /api/admin route uses before it touches anything.
 *
 * A route answers 404 rather than 403 to a visitor who is not an admin: whether an endpoint exists
 * is not something an unauthorised caller needs to learn, and it matches the /admin/* gate in the
 * middleware (Phase D8).
 */
export async function requireAdmin(): Promise<{ ok: true; userId: string } | { ok: false; response: NextResponse }> {
  const status = await adminStatus();
  if (!status.admin || !status.userId) {
    return { ok: false, response: NextResponse.json({ error: "not found" }, { status: 404 }) };
  }
  return { ok: true, userId: status.userId };
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
