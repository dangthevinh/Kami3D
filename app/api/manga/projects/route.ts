import { NextResponse } from "next/server";

import { getCurrentUserId } from "@/lib/auth";
import { createProject, listOwnProjects, listPublicProjects, readCreateProjectInput } from "@/lib/manga/project";
import { readBody, writer } from "@/app/api/manga/_lib/guard";

export const dynamic = "force-dynamic";

/**
 * GET  /api/manga/projects?scope=mine|public
 * POST /api/manga/projects
 *
 * `scope=mine` needs a session and returns the author's own work including drafts; `scope=public` is
 * the gallery and returns only what is published. With no session the default is `public`, so the
 * endpoint a signed-out visitor can reach is never the one that lists private rows.
 *
 * A `scope` that is neither is a 400 rather than a silent fallback: a typo that quietly returned the
 * wrong list would look like the studio had lost the visitor's work.
 */
export async function GET(request: Request) {
  const scope = new URL(request.url).searchParams.get("scope");
  if (scope !== null && scope !== "mine" && scope !== "public") {
    return NextResponse.json({ error: "scope must be mine or public." }, { status: 400 });
  }

  const userId = await getCurrentUserId();
  const wanted = scope ?? (userId ? "mine" : "public");

  if (wanted === "mine") {
    if (!userId) return NextResponse.json({ projects: [] });
    return NextResponse.json({ projects: await listOwnProjects(userId) });
  }

  const limit = Number(new URL(request.url).searchParams.get("limit") ?? "");
  return NextResponse.json({ projects: await listPublicProjects(Number.isFinite(limit) && limit > 0 ? limit : 60) });
}

export async function POST(request: Request) {
  const guard = await writer(request, "manga-project-create");
  if (!guard.ok) return guard.response;

  const body = await readBody(request);
  if (!body.ok) return body.response;

  const input = readCreateProjectInput(body.body);
  if (!input.ok) return NextResponse.json({ error: input.error }, { status: input.status });

  const created = await createProject(guard.userId, input.value);
  if (!created.ok) return NextResponse.json({ error: created.error }, { status: created.status });

  return NextResponse.json({ project: created.value });
}
