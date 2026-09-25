import { execFile } from "node:child_process";
import { NextResponse } from "next/server";
import { promisify } from "node:util";

import { requireAdmin, readJson } from "@/app/api/admin/_lib/guard";
import { evaluateBudget } from "@/lib/model-budget";
import { providersWithAvailability, readPolicy, readUsage } from "@/lib/model-sourcing";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const run = promisify(execFile);

/**
 * Search the enabled providers, and say for each result whether it may be downloaded.
 *
 * The search itself runs in scripts/model-search.mjs — the same gatherCandidates/rankCandidates the CLI
 * uses, so a candidate the console shows is a candidate the CLI would have found. The budget is applied
 * here, per candidate, because that is the question the button asks: "may this one be fetched now, and
 * if not, why".
 *
 * A candidate whose size the provider does not publish is evaluated at the policy's per-model ceiling.
 * That is not a guess, it is what the CLI reserves for the same model: the cap is checked against the
 * worst case and the settle writes the real number afterwards.
 */
export async function POST(request: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const body = await readJson(request);
  const query = typeof body?.query === "string" ? body.query.trim().slice(0, 80) : "";
  const slug = typeof body?.slug === "string" ? body.slug.trim().slice(0, 60) : "";
  if (!query && !slug) return NextResponse.json({ error: "a query or a species slug is required" }, { status: 400 });

  const configured = new Set(providersWithAvailability().filter((provider) => provider.configured).map((provider) => provider.id));
  const requested = Array.isArray(body?.providers) ? body.providers.filter((id): id is string => typeof id === "string") : [];
  const providers = (requested.length > 0 ? requested : [...configured]).filter((id) => configured.has(id) && id !== "direct");
  if (providers.length === 0) {
    return NextResponse.json({ error: "no provider is configured and enabled" }, { status: 409 });
  }

  let payload;
  try {
    const { stdout } = await run(
      process.execPath,
      [
        "scripts/model-search.mjs",
        "--json",
        "--query=" + (query || slug),
        ...(slug ? ["--slug=" + slug] : []),
        "--providers=" + providers.join(","),
        "--limit=8",
      ],
      { cwd: process.cwd(), timeout: 90_000, maxBuffer: 8 * 1024 * 1024 },
    );
    payload = JSON.parse(stdout);
  } catch (error) {
    // A host without child processes cannot search; say so and name the command instead of an empty table.
    return NextResponse.json(
      {
        ok: false,
        error: "the search could not run here: " + String((error as Error).message).split("\n")[0],
        command:
          'node scripts/model-search.mjs --query="' + (query || slug) + '" --providers=' + providers.join(","),
      },
      { status: 202 },
    );
  }

  const [policy, usage] = await Promise.all([readPolicy(), readUsage()]);
  const ceiling = policy?.maxBytesPerModel ?? 0;

  const candidates = (payload.candidates ?? []).map((candidate: Record<string, unknown>) => {
    const bytes = typeof candidate.bytes === "number" && candidate.bytes > 0 ? candidate.bytes : null;
    const decision = evaluateBudget({
      policy,
      usage,
      candidate: {
        provider: String(candidate.provider),
        // Unknown size: budgeted at the ceiling, which is what the CLI reserves for the same model.
        bytes: bytes ?? (ceiling || null),
        license: typeof candidate.license === "string" ? candidate.license : null,
        title: typeof candidate.title === "string" ? candidate.title : null,
      },
      approved: true,
    });

    return {
      ...candidate,
      bytes,
      sizeEstimated: bytes === null,
      allowed: decision.allowed && Boolean(candidate.license),
      blockedReason: candidate.license ? decision.reason : String(candidate.licenseVerdict ?? "licence refused"),
    };
  });

  return NextResponse.json({
    ok: true,
    query: payload.query,
    providers,
    candidates,
    budget: {
      enabled: policy?.enabled ?? false,
      remainingToday: Math.max(0, (policy?.maxPerDay ?? 0) - (usage?.today ?? 0)),
      reason: policy ? null : "no policy row",
    },
  });
}
