/**
 * The auto-pilot's rules, as arithmetic.
 *
 * Phase 18B ended with a console that could take an order and a worker that could fill it, which
 * left one thing to a human: deciding when. This module is that decision, and it exists twice on
 * purpose - here for the panel, the runner and the tests, and in SQL (`start_autopilot_round`,
 * `public/gap report in supabase/schema.sql`) because the database is the only place a decision can
 * be made once for a scheduler, a cron endpoint and a button. `npm run check:autopilot` asserts the
 * two agree: same scopes, same ordering, same exclusions, same per-run limit.
 *
 * Nothing here downloads anything, and nothing here can: the module decides *which species* deserve
 * one order, and the order is then filled by the same pipeline `npm run models:work` runs, where
 * `reserve_model_download()` still has the last word.
 */

export const AUTOPILOT_SCOPES = ["unsourced", "weak", "named"] as const;

export type AutopilotScope = (typeof AUTOPILOT_SCOPES)[number];

/** The clamps, in one place: the HTML inputs, the API and the tests all read them from here. */
export const AUTOPILOT_LIMITS = {
  minCadenceMinutes: 5,
  maxCadenceMinutes: 10_080,
  minPerRun: 1,
  maxPerRun: 5,
  minScoreFloor: 0,
  minScoreCeiling: 100,
  /** The default window between rounds: six hours is four rounds a day at most. */
  defaultCadenceMinutes: 360,
  defaultPerRun: 1,
  /** Below this, a model scores like a placeholder rather than like a species. */
  defaultMinScore: 75,
} as const;

export interface AutopilotRoundResult {
  orderId: string | null;
  slugs: string[];
  downloaded: number;
  refused: number;
  failed: number;
  status: string | null;
  trigger: string;
  at: string;
  note: string | null;
}

export interface AutopilotPolicy {
  enabled: boolean;
  cadenceMinutes: number;
  perRun: number;
  scope: AutopilotScope;
  slugs: string[];
  minScore: number;
  nextRunAt: string | null;
  lastRunAt: string | null;
  lastResult: AutopilotRoundResult | null;
  updatedBy: string | null;
  updatedAt: string | null;
}

export interface SpeciesGap {
  slug: string;
  name: string;
  /** False when the database has no model_assets row: the file on the site is unproven. */
  hasAsset: boolean;
  bestScore: number | null;
  popularity: number | null;
  modelUrl: string | null;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const numberOr = (value: unknown, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const clamp = (value: number, low: number, high: number): number => Math.min(high, Math.max(low, value));

export const isAutopilotScope = (value: unknown): value is AutopilotScope =>
  typeof value === "string" && (AUTOPILOT_SCOPES as readonly string[]).includes(value);

/** A slug list from a form or a request body: lowercase, deduplicated, and never a path. */
export function sanitiseSlugs(value: unknown, limit = 50): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  for (const entry of value) {
    if (typeof entry !== "string") continue;
    const slug = entry.trim().toLowerCase();
    if (!/^[a-z0-9-]{1,64}$/.test(slug)) continue;
    seen.add(slug);
    if (seen.size >= limit) break;
  }
  return [...seen];
}

/** The one row, as the app wants it. Returns null when the database has no usable row. */
export function autopilotFromJson(value: unknown): AutopilotPolicy | null {
  if (!isRecord(value)) return null;
  if (value.id !== undefined && value.id !== "default") return null;

  return {
    enabled: value.enabled === true,
    cadenceMinutes: clamp(
      Math.round(numberOr(value.cadence_minutes, AUTOPILOT_LIMITS.defaultCadenceMinutes)),
      AUTOPILOT_LIMITS.minCadenceMinutes,
      AUTOPILOT_LIMITS.maxCadenceMinutes,
    ),
    perRun: clamp(
      Math.round(numberOr(value.per_run, AUTOPILOT_LIMITS.defaultPerRun)),
      AUTOPILOT_LIMITS.minPerRun,
      AUTOPILOT_LIMITS.maxPerRun,
    ),
    scope: isAutopilotScope(value.scope) ? value.scope : "weak",
    slugs: sanitiseSlugs(value.slugs),
    minScore: clamp(
      Math.round(numberOr(value.min_score, AUTOPILOT_LIMITS.defaultMinScore)),
      AUTOPILOT_LIMITS.minScoreFloor,
      AUTOPILOT_LIMITS.minScoreCeiling,
    ),
    nextRunAt: typeof value.next_run_at === "string" ? value.next_run_at : null,
    lastRunAt: typeof value.last_run_at === "string" ? value.last_run_at : null,
    lastResult: roundResultFromJson(value.last_result),
    updatedBy: typeof value.updated_by === "string" ? value.updated_by : null,
    updatedAt: typeof value.updated_at === "string" ? value.updated_at : null,
  };
}

export function roundResultFromJson(value: unknown): AutopilotRoundResult | null {
  if (!isRecord(value)) return null;
  return {
    orderId: typeof value.orderId === "string" ? value.orderId : null,
    slugs: sanitiseSlugs(value.slugs),
    downloaded: numberOr(value.downloaded, 0),
    refused: numberOr(value.refused, 0),
    failed: numberOr(value.failed, 0),
    status: typeof value.status === "string" ? value.status : null,
    trigger: typeof value.trigger === "string" ? value.trigger : "unknown",
    at: typeof value.at === "string" ? value.at : new Date(0).toISOString(),
    note: typeof value.note === "string" ? value.note : null,
  };
}

/**
 * What an admin just submitted, merged onto what is already stored.
 *
 * A partial body is normal - the panel sends one switch at a time - so every field is optional and
 * anything absent keeps its current value rather than silently becoming a default.
 */
export function mergeAutopilotInput(
  current: AutopilotPolicy,
  body: unknown,
): Pick<AutopilotPolicy, "enabled" | "cadenceMinutes" | "perRun" | "scope" | "slugs" | "minScore"> {
  const input = isRecord(body) ? body : {};
  const scope = isAutopilotScope(input.scope) ? input.scope : current.scope;
  const slugs = input.slugs === undefined ? current.slugs : sanitiseSlugs(input.slugs);

  return {
    enabled: typeof input.enabled === "boolean" ? input.enabled : current.enabled,
    cadenceMinutes: clamp(
      Math.round(numberOr(input.cadenceMinutes, current.cadenceMinutes)),
      AUTOPILOT_LIMITS.minCadenceMinutes,
      AUTOPILOT_LIMITS.maxCadenceMinutes,
    ),
    perRun: clamp(
      Math.round(numberOr(input.perRun, current.perRun)),
      AUTOPILOT_LIMITS.minPerRun,
      AUTOPILOT_LIMITS.maxPerRun,
    ),
    // "named" with no names would ask for nothing forever; the database refuses it too.
    scope: scope === "named" && slugs.length === 0 ? "weak" : scope,
    slugs,
    minScore: clamp(
      Math.round(numberOr(input.minScore, current.minScore)),
      AUTOPILOT_LIMITS.minScoreFloor,
      AUTOPILOT_LIMITS.minScoreCeiling,
    ),
  };
}

export interface DueVerdict {
  due: boolean;
  reason: string | null;
}

/** Is a round owed right now? The same three answers the SQL gives, in the same order. */
export function autopilotDue(policy: AutopilotPolicy, now: Date = new Date()): DueVerdict {
  if (!policy.enabled) return { due: false, reason: "the auto-pilot is switched off" };
  if (policy.nextRunAt) {
    const dueAt = new Date(policy.nextRunAt);
    if (!Number.isNaN(dueAt.getTime()) && dueAt.getTime() > now.getTime()) {
      return { due: false, reason: "not due until " + policy.nextRunAt.slice(0, 16).replace("T", " ") };
    }
  }
  return { due: true, reason: null };
}

export interface TargetPlan {
  targets: string[];
  /** The species in scope that the per-run limit left for later rounds. */
  deferred: string[];
  reason: string | null;
}

/**
 * Which species the next round would ask for.
 *
 * The rules, in the order the SQL applies them: scope, then "not already in an open order", then
 * most popular first, then the per-run limit. When a scope selects nothing the reason says so
 * instead of the panel showing an empty list and no explanation.
 */
export function autopilotTargets(
  policy: Pick<AutopilotPolicy, "scope" | "slugs" | "minScore" | "perRun">,
  gaps: SpeciesGap[],
  options: { openSlugs?: string[]; now?: Date } = {},
): TargetPlan {
  const open = new Set(options.openSlugs ?? []);

  const inScope = (gap: SpeciesGap): boolean => {
    if (policy.scope === "named") return policy.slugs.includes(gap.slug);
    if (policy.scope === "unsourced") return !gap.hasAsset;
    // "weak" includes "unsourced": no model at all is the weakest case there is.
    return (gap.bestScore ?? -1) < policy.minScore;
  };

  const candidates = gaps
    .filter((gap) => !open.has(gap.slug) && inScope(gap))
    .sort(
      (a, b) =>
        (b.popularity ?? -1) - (a.popularity ?? -1) || a.slug.localeCompare(b.slug),
    );

  const targets = candidates.slice(0, policy.perRun).map((gap) => gap.slug);
  const deferred = candidates.slice(policy.perRun).map((gap) => gap.slug);

  if (candidates.length === 0) {
    const reason =
      policy.scope === "named"
        ? "none of the named species need a model"
        : policy.scope === "unsourced"
          ? "every species already has a sourced model"
          : "no species scores below " + policy.minScore;
    return { targets, deferred, reason };
  }
  if (open.size > 0 && gaps.every((gap) => open.has(gap.slug) || !inScope(gap))) {
    return { targets, deferred, reason: "everything in scope is already in an open order" };
  }

  return { targets, deferred, reason: null };
}

/** "every 6 hours", "every 15 minutes" - for a panel that should not make an admin do arithmetic. */
export function cadenceLabel(minutes: number): string {
  if (minutes === 1440) return "every day";
  if (minutes % 1440 === 0) return "every " + minutes / 1440 + " days";
  if (minutes === 60) return "every hour";
  if (minutes % 60 === 0) return "every " + minutes / 60 + " hours";
  return "every " + minutes + " minutes";
}

export const SCOPE_LABELS: Record<AutopilotScope, string> = {
  unsourced: "species the database has no sourced model for",
  weak: "species whose best recorded model scores below the threshold",
  named: "only the species listed by name",
};

/** One sentence for the panel and for the run log: what the last round actually did. */
export function roundSummary(result: AutopilotRoundResult | null): string {
  if (!result) return "no round has run yet";
  if (result.slugs.length === 0) return result.note ?? "nothing to fetch";
  const parts = [
    result.downloaded + " downloaded",
    result.refused + " refused by the budget",
    result.failed + " failed or skipped",
  ];
  return result.slugs.length + " asked for (" + result.slugs.join(", ") + "): " + parts.join(", ");
}

/**
 * Compare a secret without leaking its length or its first differing character.
 *
 * `crypto.timingSafeEqual` throws on unequal lengths, which is itself a signal, so the lengths are
 * mixed into the result instead of being compared first.
 */
export function constantTimeEquals(a: string, b: string): boolean {
  const left = new TextEncoder().encode(a);
  const right = new TextEncoder().encode(b);
  let diff = left.length ^ right.length;
  const size = Math.max(left.length, right.length);
  for (let index = 0; index < size; index += 1) {
    diff |= (left[index] ?? 0) ^ (right[index] ?? 0);
  }
  return diff === 0;
}

export const CRON_PATH = "/api/cron/models";

/** The cron endpoint's gate: a bearer token, compared in constant time. */
export function cronAuthorised(header: string | null, secret: string | null): { ok: boolean; reason: string | null } {
  if (!secret) return { ok: false, reason: "CRON_SECRET is not set, so no scheduler can drive this endpoint" };
  const provided = header?.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!provided) return { ok: false, reason: "expected an Authorization: Bearer <CRON_SECRET> header" };
  if (!constantTimeEquals(provided, secret)) return { ok: false, reason: "the cron secret does not match" };
  return { ok: true, reason: null };
}
