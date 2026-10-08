import { NextResponse } from "next/server";

import { rewardedAdVerdict } from "@/lib/unlock";
import { recordAdUnlock, unlockStateFor } from "@/lib/unlock-server";
import { guardWrite, hostOfRequest } from "@/lib/write-guard";

export const dynamic = "force-dynamic";

/**
 * GET  /api/unlock?contentId=...  - is this locked, and how could it be opened?
 * POST /api/unlock                - record that the rewarded advert finished
 *
 * The GET is what the modal asks before it draws itself, so a page can decide late (and on the client)
 * whether to show a lock without making every page dynamic. It never throws: an unreadable table is
 * reported as "not locked", which is the direction that keeps the site working.
 *
 * The POST is the one place a visitor writes an unlock, and the write goes through their own session so
 * the RLS policy on `user_unlocks` - which permits `method = 'ad'` and nothing else - is what decides.
 *
 * **The rewarded advert is a mock, and this route says so.** The client reports when the advert started;
 * the server checks that the elapsed time covers the advert's length and nothing more. A client that
 * lies can therefore unlock for free. The real integration is not "trust the timer" but the network's
 * server-side verification callback (docs/ADS.md), and the difference is written down rather than
 * implied, because the next person to read this file will otherwise assume it is enforced.
 */

const CONTENT_ID = /^[a-z-]+:[\w\-./]{1,120}$/;

function contentIdFrom(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return CONTENT_ID.test(trimmed) ? trimmed : null;
}

export async function GET(request: Request) {
  const contentId = contentIdFrom(new URL(request.url).searchParams.get("contentId"));
  if (!contentId) return NextResponse.json({ error: "contentId is missing or malformed." }, { status: 400 });

  const state = await unlockStateFor(contentId);
  return NextResponse.json({ state });
}

export async function POST(request: Request) {
  const blocked = guardWrite(request, {
    name: "unlock",
    rule: { limit: 20, windowMs: 60_000 },
    expectedHost: hostOfRequest(request),
  });
  if (blocked) return blocked;

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const contentId = contentIdFrom(body?.contentId);
  if (!contentId) return NextResponse.json({ error: "contentId is missing or malformed." }, { status: 400 });

  const state = await unlockStateFor(contentId);
  if (!state.locked) return NextResponse.json({ ok: true, state, alreadyUnlocked: true });
  if (!state.methods.includes("ad")) {
    return NextResponse.json({ error: "This content cannot be unlocked here right now.", state }, { status: 409 });
  }

  const startedAtMs = typeof body?.startedAtMs === "number" && Number.isFinite(body.startedAtMs) ? body.startedAtMs : null;
  if (startedAtMs === null) {
    return NextResponse.json({ error: "The advert's start time is missing, so it cannot be credited." }, { status: 400 });
  }

  const verdict = rewardedAdVerdict({ startedAtMs, nowMs: Date.now(), seconds: state.adSeconds });
  if (!verdict.earned) {
    return NextResponse.json(
      { error: "The advert had not finished: " + Math.ceil((verdict.requiredMs - verdict.elapsedMs) / 1000) + "s short." },
      { status: 400 },
    );
  }

  const written = await recordAdUnlock(contentId);
  if (!written.ok) return NextResponse.json({ error: written.reason }, { status: written.status });

  const next = await unlockStateFor(contentId);
  return NextResponse.json({ ok: true, alreadyUnlocked: written.alreadyUnlocked, state: next });
}
