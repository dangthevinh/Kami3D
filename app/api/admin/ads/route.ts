import { NextResponse } from "next/server";

import { requireAdmin, readJson } from "@/app/api/admin/_lib/guard";
import { AD_PLACEMENTS, placementPatch, resolveAdSlots } from "@/lib/ads";
import { forgetAdSlots } from "@/lib/ads-server";
import { publicEnv } from "@/lib/env";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { guardWrite, hostOfRequest } from "@/lib/write-guard";

export const dynamic = "force-dynamic";

/**
 * GET  /api/admin/ads - the switches, and why an enabled one is drawing nothing
 * POST /api/admin/ads - flip one
 *
 * The console needs both halves: a switch that says "on" while the page renders nothing is the exact
 * confusion this route exists to remove, so the answer carries a reason for every placement that is
 * enabled and cannot be honoured (`lib/ads.ts` decides those).
 *
 * Reads use the service role because the row is written by an admin and read by a page; the RLS policy
 * allows an authenticated admin to update it, and this route goes through `requireAdmin()` first, which
 * is the same gate every other /api/admin route uses.
 */
export async function GET(request: Request) {
  const gate = await requireAdmin(request);
  if (!gate.ok) return gate.response;

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "The database is not configured." }, { status: 503 });

  const { data, error } = await supabase
    .from("ad_placements")
    .select("id, label, enabled, provider, slot_id, note, updated_at")
    .order("id");

  if (error) return NextResponse.json({ error: error.message }, { status: 502 });

  const resolved = resolveAdSlots(data ?? [], { adsenseClient: publicEnv.adsenseClient || null });

  return NextResponse.json({
    placements: (data ?? []).map((row) => ({
      ...row,
      // What a page would actually draw for this switch right now.
      rendering: resolved.slots.some((slot) => slot.id === row.id),
      reason: resolved.reasons.find((entry) => entry.id === row.id)?.reason ?? null,
    })),
    known: AD_PLACEMENTS.map((placement) => ({ id: placement.id, label: placement.label, where: placement.where })),
    adsenseConfigured: (publicEnv.adsenseClient || "").length > 0,
  });
}

export async function POST(request: Request) {
  const blocked = guardWrite(request, {
    name: "admin-ads",
    rule: { limit: 30, windowMs: 60_000 },
    expectedHost: hostOfRequest(request),
  });
  if (blocked) return blocked;

  const gate = await requireAdmin(request);
  if (!gate.ok) return gate.response;

  const body = await readJson(request);
  if (!body) return NextResponse.json({ error: "A JSON body is required." }, { status: 400 });

  const patch = placementPatch(body);
  if (typeof patch === "string") return NextResponse.json({ error: patch }, { status: 400 });

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "The database is not configured." }, { status: 503 });

  const { error } = await supabase
    .from("ad_placements")
    .update({
      enabled: patch.enabled,
      provider: patch.provider,
      slot_id: patch.slotId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", patch.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 502 });

  // The read cache is 60 seconds long, and an admin who flips a switch and then reloads the page must not
  // be shown the old answer: the process that handled the write forgets it immediately.
  forgetAdSlots();

  return NextResponse.json({ ok: true, id: patch.id, enabled: patch.enabled, provider: patch.provider });
}
