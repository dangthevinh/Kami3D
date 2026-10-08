import { NextResponse } from "next/server";

import { requireAdmin, readJson } from "@/app/api/admin/_lib/guard";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { lockedContentPatch } from "@/lib/unlock";
import { guardWrite, hostOfRequest } from "@/lib/write-guard";

export const dynamic = "force-dynamic";

/**
 * GET  /api/admin/locked - everything that is locked, and how many people opened each one
 * POST /api/admin/locked - lock, unlock or re-describe one piece of content
 *
 * The brief's fourth requirement: an admin decides what needs unlocking. The POST is an **upsert** on the
 * content key, so marking something twice is one row, and `active: false` is how content is made public
 * again without deleting the record that it was once locked.
 *
 * Nothing here writes a `user_unlocks` row: an admin does not silently grant a visitor an unlock. The
 * `admin` method exists in the schema for a future console action that could say who did it and why.
 */
export async function GET(request: Request) {
  const gate = await requireAdmin(request);
  if (!gate.ok) return gate.response;

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "The database is not configured." }, { status: 503 });

  const [content, unlocks] = await Promise.all([
    supabase
      .from("locked_contents")
      .select("content_id, label, kind, unlock_methods, purchase_plan, ad_seconds, active, updated_at")
      .order("updated_at", { ascending: false })
      .limit(200),
    supabase.from("user_unlocks").select("content_id, method").limit(1000),
  ]);

  if (content.error) return NextResponse.json({ error: content.error.message }, { status: 502 });

  const byMethod = new Map<string, { ad: number; purchase: number }>();
  for (const row of (unlocks.data ?? []) as { content_id: string; method: string }[]) {
    const entry = byMethod.get(row.content_id) ?? { ad: 0, purchase: 0 };
    if (row.method === "ad") entry.ad += 1;
    else entry.purchase += 1;
    byMethod.set(row.content_id, entry);
  }

  return NextResponse.json({
    content: (content.data ?? []).map((row) => ({ ...row, unlocks: byMethod.get(row.content_id) ?? { ad: 0, purchase: 0 } })),
  });
}

export async function POST(request: Request) {
  const blocked = guardWrite(request, {
    name: "admin-locked",
    rule: { limit: 30, windowMs: 60_000 },
    expectedHost: hostOfRequest(request),
  });
  if (blocked) return blocked;

  const gate = await requireAdmin(request);
  if (!gate.ok) return gate.response;

  const body = await readJson(request);
  if (!body) return NextResponse.json({ error: "A JSON body is required." }, { status: 400 });

  const patch = lockedContentPatch(body);
  if (typeof patch === "string") return NextResponse.json({ error: patch }, { status: 400 });

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "The database is not configured." }, { status: 503 });

  const { error } = await supabase.from("locked_contents").upsert(
    {
      content_id: patch.contentId,
      label: patch.label,
      kind: patch.kind,
      unlock_methods: patch.methods,
      purchase_plan: patch.purchasePlan,
      ad_seconds: patch.adSeconds,
      active: patch.active,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "content_id" },
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 502 });
  return NextResponse.json({ ok: true, contentId: patch.contentId, active: patch.active });
}
