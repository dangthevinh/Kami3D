import { NextResponse } from "next/server";

import { requireAdmin, readJson } from "@/app/api/admin/_lib/guard";
import { planBatch } from "@/lib/model-budget";
import { readPolicy, readUsage } from "@/lib/model-sourcing";
import { getPersonalDataClient } from "@/lib/personal-data";

export const dynamic = "force-dynamic";

const MAX_REQUESTED = 200;

/**
 * Place an order: "fetch up to N models".
 *
 * The order is a *request*, not a permission. It is created here and executed by
 * `npm run models:work`, and every model that worker fetches still has to pass
 * `public.reserve_model_download()` — so an order that asks for more than the budget allows is
 * trimmed here, and refused again by the database if the budget has moved since.
 */
export async function POST(request: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const body = await readJson(request);
  if (!body) return NextResponse.json({ error: "expected a JSON body" }, { status: 400 });

  const requestedRaw = typeof body.requested === "number" ? Math.round(body.requested) : 1;
  const requested = Math.max(1, Math.min(requestedRaw, MAX_REQUESTED));

  const slugs = Array.isArray(body.slugs)
    ? body.slugs.filter((slug): slug is string => typeof slug === "string" && /^[a-z0-9-]+$/.test(slug)).slice(0, 50)
    : [];

  const [policy, usage] = await Promise.all([readPolicy(), readUsage()]);
  if (!policy) return NextResponse.json({ error: "no download policy row: run npm run db:schema" }, { status: 503 });

  const providers = (Array.isArray(body.providers) ? body.providers : [])
    .filter((id): id is string => typeof id === "string" && policy.providersAllowed.includes(id));
  const allowed = providers.length > 0 ? providers : policy.providersAllowed;

  // Only the day's remaining slots can be spent now; the worker re-checks every one of them.
  const decision = planBatch(
    {
      allowed: policy.enabled,
      reason: policy.enabled ? null : "downloading is switched off in the policy",
      remainingToday: Math.max(0, policy.maxPerDay - (usage?.today ?? 0)),
      remainingThisMonth: Math.max(0, policy.maxPerMonth - (usage?.thisMonth ?? 0)),
      remainingTotal: Math.max(0, policy.maxTotal - (usage?.total ?? 0)),
      remainingBytes: Math.max(0, policy.maxBytesTotal - (usage?.bytesTotal ?? 0)),
    },
    requested,
  );

  if (!policy.enabled) {
    return NextResponse.json({ error: "downloading is switched off in the policy" }, { status: 409 });
  }
  if (allowed.length === 0) {
    return NextResponse.json({ error: "no provider is allowed by the policy" }, { status: 409 });
  }

  const supabase = await getPersonalDataClient();
  if (!supabase) return NextResponse.json({ error: "no data client" }, { status: 503 });

  const { data, error } = await supabase
    .from("model_source_orders")
    .insert({
      created_by: gate.userId,
      status: "queued",
      providers: allowed,
      slugs,
      requested,
      note: typeof body.note === "string" ? body.note.slice(0, 280) : null,
    })
    .select("id,requested")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    order: data,
    // Said plainly: an order may be larger than today's budget, and then it fills today and stops.
    note:
      decision >= requested
        ? null
        : "the budget allows " + decision + " of the " + requested + " asked for today; the rest waits for tomorrow",
  });
}
