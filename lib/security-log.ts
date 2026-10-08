import "server-only";

import { anonymiseAddress } from "@/lib/sanitize";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * The security log (Phase 31, requirement 6: "logging & monitoring cơ bản").
 *
 * What is recorded, and what is deliberately not:
 *
 *   - **Recorded:** a refusal, an unlock, a webhook whose signature did not verify - the events an
 *     operator would want to see after an incident. Each row carries the route, the actor when there is
 *     one, and a **prefix** of the client address, never the address itself (`anonymiseAddress`):
 *     "the same /24 tried 200 times" is what a rate-limit investigation needs, and the host part is
 *     personal data a log has no business keeping.
 *   - **Not recorded:** request bodies, tokens, query strings. `boundDetail` keeps only short
 *     string/number/boolean values and drops everything else, so a caller cannot accidentally write a
 *     credential into the log by passing a whole request through.
 *
 * Two properties make it safe to call from a guard that must never fail:
 *
 *   1. **It never throws.** No database (Demo Mode), no service key, a table that does not exist yet in
 *      an older deployment - all of them end as a throttled `console.warn` and the request carries on.
 *   2. **It is throttled.** A cross-site flood or a script hitting the rate limit would otherwise write
 *      one row per request, turning the log into the outage. One row per kind and address prefix per
 *      minute, in memory, per process - the same honest bound the rate limiter has.
 */

export const SECURITY_EVENT_KINDS = [
  /** An admin-only route refused a caller. */
  "admin-denied",
  /** A write arrived from another site. */
  "cross-site",
  /** A write arrived too fast. */
  "rate-limited",
  /** The sign-in path answered with a refusal. */
  "auth-denied",
  /** A payment webhook failed signature verification (Phase 32). */
  "webhook-signature",
  /** A payment webhook was accepted and changed an entitlement (Phase 32). */
  "payment-webhook",
  /** Something was unlocked, by ad or by purchase (Phase 33). */
  "content-unlocked",
] as const;

export type SecurityEventKind = (typeof SECURITY_EVENT_KINDS)[number];

export interface SecurityEventInput {
  kind: SecurityEventKind;
  /** Where it happened: a route path or a short label. */
  route: string;
  /** The signed-in actor, when there is one. Null for a guest. */
  actorId?: string | null;
  /** The raw client address. Only its prefix is stored. */
  address?: string | null;
  /** A few short facts. Long values are dropped, not truncated. */
  detail?: Record<string, unknown>;
}

/** The longest a stored route or detail value may be. */
export const SECURITY_DETAIL_MAX_CHARS = 200;

/** At most one row per kind and address prefix inside this window. */
export const SECURITY_THROTTLE_MS = 60_000;

export interface EventThrottle {
  allow(kind: string, key: string, now?: number): boolean;
  size(): number;
  clear(): void;
}

/**
 * The throttle, as a pure object with an injectable clock, so a test can drive a minute of traffic
 * without waiting a minute. Bounded for the same reason the rate limiter is: an unbounded map keyed by
 * client address is itself a denial-of-service vector.
 */
export function createEventThrottle({ maxKeys = 2000 }: { maxKeys?: number } = {}): EventThrottle {
  const seen = new Map<string, number>();
  const ceiling = Math.max(1, Math.floor(maxKeys));

  return {
    allow(kind, key, now = Date.now()) {
      const id = kind + "|" + key;
      const last = seen.get(id);
      if (last !== undefined && now - last < SECURITY_THROTTLE_MS) return false;

      seen.delete(id);
      seen.set(id, now);
      while (seen.size > ceiling) {
        const oldest = seen.keys().next().value;
        if (oldest === undefined) break;
        seen.delete(oldest);
      }
      return true;
    },
    size: () => seen.size,
    clear: () => seen.clear(),
  };
}

/**
 * Keep only the detail a log should hold: short strings, finite numbers, booleans. A nested object or a
 * long string is dropped rather than clipped, because a clipped token is still a token.
 */
export function boundDetail(detail: Record<string, unknown> | undefined): Record<string, string | number | boolean> {
  if (!detail) return {};

  const kept: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(detail)) {
    if (Object.keys(kept).length >= 12) break;
    if (typeof value === "string") {
      if (value.length > 0 && value.length <= SECURITY_DETAIL_MAX_CHARS) kept[key] = value;
      continue;
    }
    if (typeof value === "number" && Number.isFinite(value)) kept[key] = value;
    else if (typeof value === "boolean") kept[key] = value;
  }
  return kept;
}

const throttle = createEventThrottle();

/**
 * Write one event. Never throws, never awaited for its result by a caller that must not fail.
 *
 * Returns true when the event was written to the table, false when it was dropped (throttled) or could
 * only be reported to the console. A test can assert the false path exists rather than assume it.
 */
export async function noteSecurityEvent(event: SecurityEventInput): Promise<boolean> {
  const prefix = anonymiseAddress(event.address) ?? "unknown";
  if (!throttle.allow(event.kind, prefix)) return false;

  const row = {
    kind: event.kind,
    route: event.route.slice(0, SECURITY_DETAIL_MAX_CHARS),
    actor_id: event.actorId ?? null,
    address_prefix: prefix,
    detail: boundDetail(event.detail),
  };

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    // Demo Mode, or a deployment without a service key: the console is the only sink there is, and the
    // line says so rather than pretending the event was stored.
    console.warn("[kami3d] security event (not stored, no service key):", row.kind, row.route, row.address_prefix);
    return false;
  }

  try {
    const { error } = await supabase.from("security_events").insert(row);
    if (error) {
      console.warn("[kami3d] security event not stored:", error.message);
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[kami3d] security event failed:", error instanceof Error ? error.message : "unknown error");
    return false;
  }
}

/** Read the recent events for the admin console. Newest first, bounded. */
export async function recentSecurityEvents(limit = 100): Promise<
  { id: number; created_at: string; kind: string; route: string | null; actor_id: string | null; address_prefix: string | null; detail: Record<string, unknown> }[]
> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const bounded = Math.min(Math.max(1, Math.floor(limit)), 500);
  const { data, error } = await supabase
    .from("security_events")
    .select("id, created_at, kind, route, actor_id, address_prefix, detail")
    .order("created_at", { ascending: false })
    .limit(bounded);

  if (error || !data) return [];
  return data as Awaited<ReturnType<typeof recentSecurityEvents>>;
}
