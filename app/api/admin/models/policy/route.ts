import { NextResponse } from "next/server";

import { requireAdmin, readJson } from "@/app/api/admin/_lib/guard";
import { providersWithAvailability } from "@/lib/model-sourcing";
import { getPersonalDataClient } from "@/lib/personal-data";

export const dynamic = "force-dynamic";

/**
 * Save the download budget.
 *
 * The SQL table is the authority — the CLI and the worker only ever ask
 * `public.reserve_model_download()` — so this route writes the row an admin edits and nothing else.
 * It cannot widen what a download is allowed to be: the licence allow-list, the per-model size cap
 * and the counters are all still enforced by the database.
 */
export async function POST(request: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const body = await readJson(request);
  if (!body) return NextResponse.json({ error: "expected a JSON body" }, { status: 400 });

  const number = (key: string, min: number, max: number) => {
    const value = body[key];
    if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) return null;
    return Math.round(value);
  };

  const maxPerDay = number("maxPerDay", 0, 100);
  const maxPerMonth = number("maxPerMonth", 0, 2000);
  const maxTotal = number("maxTotal", 0, 100_000);
  const maxBytesPerModelMb = number("maxBytesPerModelMb", 1, 512);
  const maxBytesTotalMb = number("maxBytesTotalMb", 1, 1_048_576);

  if ([maxPerDay, maxPerMonth, maxTotal, maxBytesPerModelMb, maxBytesTotalMb].some((value) => value === null)) {
    return NextResponse.json({ error: "every quota must be a whole number inside its range" }, { status: 400 });
  }

  const known = new Set(providersWithAvailability().map((provider) => provider.id));
  const requested = Array.isArray(body.providersAllowed) ? body.providersAllowed : [];
  const providersAllowed = requested.filter((id): id is string => typeof id === "string" && known.has(id));

  const patch = {
    enabled: body.enabled !== false,
    max_per_day: maxPerDay,
    max_per_month: maxPerMonth,
    max_total: maxTotal,
    max_bytes_per_model: (maxBytesPerModelMb as number) * 1_048_576,
    max_bytes_total: (maxBytesTotalMb as number) * 1_048_576,
    providers_allowed: providersAllowed,
    require_approval: body.requireApproval !== false,
    updated_by: gate.userId,
    updated_at: new Date().toISOString(),
  };

  const supabase = await getPersonalDataClient();
  if (!supabase) return NextResponse.json({ error: "no data client" }, { status: 503 });

  const { error } = await supabase.from("model_download_policy").update(patch).eq("id", "default");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, policy: patch });
}
