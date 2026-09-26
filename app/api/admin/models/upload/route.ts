import { NextResponse } from "next/server";

import { requireAdmin } from "@/app/api/admin/_lib/guard";
import { publishUploadedModel } from "@/lib/model-publish";
import { slugFromFilename } from "@/lib/model-upload";
import { guardWrite, hostOfRequest } from "@/lib/write-guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
/** A model is compressed and uploaded here, so the route is allowed to take its time. */
export const maxDuration = 300;

/**
 * The manual door: an admin picks a species and a file, and it becomes that species' model.
 *
 * Everything about what may be published is decided elsewhere and on purpose -
 * `publishUploadedModel()` reserves the budget, measures the file, compresses it, stores it and wires
 * it to the species, and `reserve_model_download()` is what actually says yes or no. This route's job
 * is to turn a multipart form into that call and to report the result unchanged, including the
 * refusals: a form that answers "ok" to a file the database refused is worse than no form.
 */
/**
 * Any other method answers the way a route that does not exist answers.
 *
 * A plain 405 would tell a visitor the path is real, and every other admin route in this project says
 * 404 instead. An admin who lands here by mistake gets the sentence they need.
 */
export async function GET() {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  return NextResponse.json({ ok: false, reason: "POST a multipart form with a 'file' field" }, { status: 405 });
}

export async function POST(request: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  // Six uploads in five minutes: each one is a stored model and a budget slot, not a page view.
  const blocked = guardWrite(request, {
    name: "admin-model-upload",
    rule: { limit: 6, windowMs: 300_000 },
    expectedHost: hostOfRequest(request),
  });
  if (blocked) return blocked;

  let form: FormData | null = null;
  try {
    form = await request.formData();
  } catch {
    form = null;
  }
  if (!form) return NextResponse.json({ ok: false, reason: "expected a multipart form" }, { status: 400 });

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ ok: false, reason: "expected a .glb file in the 'file' field" }, { status: 400 });
  }

  const field = (name: string): string => {
    const value = form?.get(name);
    return typeof value === "string" ? value : "";
  };

  const slug = field("slug") || slugFromFilename(file.name);
  const bytes = new Uint8Array(await file.arrayBuffer());

  const report = await publishUploadedModel({
    actor: gate.userId,
    slug,
    filename: file.name,
    bytes,
    meta: {
      title: field("title"),
      author: field("author"),
      license: field("license") as "CC0" | "CC-BY",
      sourceUrl: field("sourceUrl"),
      note: field("note"),
    },
    drawOnCard: field("drawOnCard") !== "false",
    origin: "manual",
  });

  // 422 rather than 500: a refused upload is an answer, and the panel prints the reason verbatim.
  return NextResponse.json(report, { status: report.ok ? 200 : 422 });
}
