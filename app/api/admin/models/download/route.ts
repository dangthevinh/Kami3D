import { execFile } from "node:child_process";
import { NextResponse } from "next/server";
import { promisify } from "node:util";

import { requireAdmin, readJson } from "@/app/api/admin/_lib/guard";
import { guardWrite, hostOfRequest } from "@/lib/write-guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const run = promisify(execFile);

/**
 * Download the model the admin picked.
 *
 * This does not have a download path of its own: it runs the CLI with --candidate=provider:id, which is
 * the same code the worker and a hand-run --apply use. That is deliberate — the licence allow-list, the
 * per-model size cap, the download budget (public.reserve_model_download), the DRACO step, the
 * attribution file and the model_url wiring are all enforced there and nowhere else, so a button cannot
 * become a second, weaker way into the repository.
 *
 * --force is passed because the admin named this model for this species: replacing a weaker model is the
 * point of picking one. --approve records that a person approved it, which a policy with
 * require_approval demands, and --actor puts their id in the log.
 */
export async function POST(request: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  const blocked = guardWrite(request, { name: "admin-download", rule: { limit: 4, windowMs: 300_000 }, expectedHost: hostOfRequest(request) });
  if (blocked) return blocked;

  const body = await readJson(request);
  const provider = typeof body?.provider === "string" ? body.provider : "";
  const providerId = typeof body?.providerId === "string" ? body.providerId : "";
  const slug = typeof body?.slug === "string" ? body.slug.trim() : "";
  // The title the console displayed. Providers do not share an id shape (Khronos names its models, a
  // Sketchfab id is an opaque uid), so the run searches for the title and then keeps only the exact id.
  const title = typeof body?.title === "string" ? body.title.trim().slice(0, 120) : "";
  const upload = body?.upload === true;

  if (!/^[a-z0-9_-]+$/i.test(provider) || !providerId || !/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json({ error: "provider, providerId and a species slug are required" }, { status: 400 });
  }

  const argv = [
    "scripts/fetch-models.mjs",
    "--species=" + slug,
    "--provider=" + provider,
    "--candidate=" + provider + ":" + providerId,
    ...(title ? ["--candidate-query=" + title] : []),
    "--apply",
    "--compress",
    "--force",
    "--approve",
    "--count=1",
    "--actor=" + gate.userId,
  ];
  argv.push(upload ? "--upload" : "--wire");

  try {
    const { stdout, stderr } = await run(process.execPath, argv, {
      cwd: process.cwd(),
      timeout: 15 * 60_000,
      maxBuffer: 16 * 1024 * 1024,
    });
    const output = (stdout + (stderr ? "\n" + stderr : "")).trim().split("\n").slice(-12).join("\n");
    const downloaded = /(\d+) downloaded/.exec(stdout);
    const refused = /(\d+) refused by the download budget/.exec(stdout);

    return NextResponse.json({
      ok: Number(downloaded?.[1] ?? 0) > 0,
      downloaded: Number(downloaded?.[1] ?? 0),
      refused: Number(refused?.[1] ?? 0),
      output,
    });
  } catch (error) {
    const failure = error as Error & { stdout?: string; stderr?: string };
    const output = ((failure.stdout ?? "") + (failure.stderr ?? "")).trim().split("\n").slice(-12).join("\n");
    return NextResponse.json(
      { ok: false, error: String(failure.message).split("\n")[0], output },
      { status: 500 },
    );
  }
}
