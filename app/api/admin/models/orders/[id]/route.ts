import { NextResponse } from "next/server";

import { requireAdmin } from "@/app/api/admin/_lib/guard";
import { getPersonalDataClient } from "@/lib/personal-data";
import { guardWrite, hostOfRequest } from "@/lib/write-guard";

export const dynamic = "force-dynamic";

/** Cancel an order that has not been claimed yet. A running order is left to finish its species. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  const blocked = guardWrite(_request, { name: "admin-order-cancel", rule: { limit: 30, windowMs: 60_000 }, expectedHost: hostOfRequest(_request) });
  if (blocked) return blocked;

  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return NextResponse.json({ error: "bad id" }, { status: 400 });

  const supabase = await getPersonalDataClient();
  if (!supabase) return NextResponse.json({ error: "no data client" }, { status: 503 });

  const { data, error } = await supabase
    .from("model_source_orders")
    .update({ status: "cancelled", finished_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "queued")
    .select("id,status");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data || data.length === 0) {
    return NextResponse.json({ error: "only a queued order can be cancelled" }, { status: 409 });
  }

  return NextResponse.json({ ok: true });
}
