/**
 * The download budget, as arithmetic.
 *
 * `public.reserve_model_download()` is the authority: it holds an advisory lock, counts the log and
 * writes the attempt in one transaction, and both the worker and the console go through it. This
 * module is the same decision expressed as a pure function, for two reasons that are worth stating
 * because a second implementation of a rule is a second chance to disagree with it:
 *
 *   1. the console can grey out a button **and say why** without a round trip, and the worker can
 *      stop a batch before it starts rather than one refusal at a time;
 *   2. the rule gets a test that does not need a database — every branch, including the ones that
 *      only happen at a month boundary.
 *
 * The direction of the disagreement is fixed: `scripts/check-model-budget.mjs` asserts that this
 * function never allows something the SQL would refuse. Where the two could drift, the SQL wins,
 * and the worker treats a refusal as the last word.
 */

/** Licences a model may carry to be redistributed by this project. Mirrors the CHECK in model_assets. */
export const ALLOWED_LICENSES = ["CC0", "CC-BY"] as const;
export type AllowedLicense = (typeof ALLOWED_LICENSES)[number];

/** Providers that need no token, so a fresh clone can still fetch models. */
export const KEYLESS_PROVIDERS = ["polyhaven", "nasa", "khronos"] as const;

export interface DownloadPolicy {
  enabled: boolean;
  maxPerDay: number;
  maxPerMonth: number;
  maxTotal: number;
  maxBytesTotal: number;
  maxBytesPerModel: number;
  providersAllowed: readonly string[];
  requireApproval: boolean;
}

export interface DownloadUsage {
  today: number;
  thisMonth: number;
  total: number;
  bytesTotal: number;
}

export interface DownloadCandidate {
  provider: string;
  /** Bytes, as reported by the provider before the download. */
  bytes: number | null;
  /** "CC0" | "CC-BY" | anything else the provider said. */
  license: string | null;
  title?: string | null;
}

export interface BudgetDecision {
  allowed: boolean;
  /** Why not, in words an operator can act on. Null when allowed. */
  reason: string | null;
  remainingToday: number;
  remainingThisMonth: number;
  remainingTotal: number;
  remainingBytes: number;
}

const MB = 1_048_576;
const mb = (bytes: number) => Math.round((bytes / MB) * 10) / 10;

/**
 * May this model be fetched right now?
 *
 * A missing usage or a missing policy is a refusal, not a benefit of the doubt: the whole point of
 * the budget is that nobody can spend it by making the numbers unavailable.
 */
export function evaluateBudget(input: {
  policy: DownloadPolicy | null | undefined;
  usage: DownloadUsage | null | undefined;
  candidate: DownloadCandidate;
  /** True when an admin has approved this specific model, which require_approval demands. */
  approved?: boolean;
}): BudgetDecision {
  const policy = input.policy;
  const usage = input.usage;
  const candidate = input.candidate;

  const empty = (reason: string): BudgetDecision => ({
    allowed: false,
    reason,
    remainingToday: 0,
    remainingThisMonth: 0,
    remainingTotal: 0,
    remainingBytes: 0,
  });

  if (!policy) return empty("no download policy is configured");
  if (!usage) return empty("the download log could not be read, so the budget is unknown");

  const remainingToday = Math.max(0, policy.maxPerDay - usage.today);
  const remainingThisMonth = Math.max(0, policy.maxPerMonth - usage.thisMonth);
  const remainingTotal = Math.max(0, policy.maxTotal - usage.total);
  const remainingBytes = Math.max(0, policy.maxBytesTotal - usage.bytesTotal);

  const refuse = (reason: string): BudgetDecision => ({
    allowed: false,
    reason,
    remainingToday,
    remainingThisMonth,
    remainingTotal,
    remainingBytes,
  });

  if (!policy.enabled) return refuse("downloading is switched off in the policy");
  if (policy.requireApproval && !input.approved) {
    return refuse("this policy requires an admin approval for each model");
  }
  if (!policy.providersAllowed.includes(candidate.provider)) {
    return refuse("provider " + candidate.provider + " is not in providers_allowed");
  }
  if (!candidate.license || !(ALLOWED_LICENSES as readonly string[]).includes(candidate.license)) {
    return refuse("licence " + (candidate.license ?? "(none)") + " is not on the allow-list (CC0 or CC-BY)");
  }
  if (candidate.bytes === null || !Number.isFinite(candidate.bytes) || candidate.bytes <= 0) {
    return refuse("the model reports no usable size, so it cannot be budgeted");
  }
  if (candidate.bytes > policy.maxBytesPerModel) {
    return refuse("model is " + mb(candidate.bytes) + " MB, over the " + mb(policy.maxBytesPerModel) + " MB per-model cap");
  }
  if (remainingToday <= 0) return refuse("daily budget spent (" + usage.today + " of " + policy.maxPerDay + ")");
  if (remainingThisMonth <= 0) {
    return refuse("monthly budget spent (" + usage.thisMonth + " of " + policy.maxPerMonth + ")");
  }
  if (remainingTotal <= 0) return refuse("total budget spent (" + usage.total + " of " + policy.maxTotal + ")");
  if (candidate.bytes > remainingBytes) {
    return refuse("storage budget would be exceeded (" + mb(usage.bytesTotal + candidate.bytes) + " of " + mb(policy.maxBytesTotal) + " MB)");
  }

  return { allowed: true, reason: null, remainingToday, remainingThisMonth, remainingTotal, remainingBytes };
}

/** How many more models this batch may ask for, given the budget and how many it wants. */
export function planBatch(decision: BudgetDecision, requested: number): number {
  if (!decision.allowed) return 0;
  return Math.max(0, Math.min(requested, decision.remainingToday, decision.remainingThisMonth, decision.remainingTotal));
}

/**
 * The UTC day and month keys the SQL counts by.
 *
 * `date_trunc('day', now())` in Postgres is UTC, and a console that computed "today" in the
 * browser's timezone would disagree with it for part of every day. Exported so the check suite can
 * pin the boundary rather than assume it.
 */
export function utcDayKey(at: Date): string {
  return at.toISOString().slice(0, 10);
}

export function utcMonthKey(at: Date): string {
  return at.toISOString().slice(0, 7);
}

/** Rows the console's usage panel needs, from the jsonb `model_download_usage()` returns. */
export function usageFromJson(value: unknown): DownloadUsage | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const number = (key: string) => (typeof row[key] === "number" ? (row[key] as number) : null);
  const today = number("today");
  const thisMonth = number("thisMonth");
  const total = number("total");
  const bytesTotal = number("bytesTotal");
  if (today === null || thisMonth === null || total === null || bytesTotal === null) return null;
  return { today, thisMonth, total, bytesTotal };
}

/** The policy row, from the same jsonb. Null when any field is missing: a partial policy is no policy. */
export function policyFromJson(value: unknown): DownloadPolicy | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (
    typeof row.enabled !== "boolean" ||
    typeof row.max_per_day !== "number" ||
    typeof row.max_per_month !== "number" ||
    typeof row.max_total !== "number" ||
    typeof row.max_bytes_total !== "number" ||
    typeof row.max_bytes_per_model !== "number" ||
    !Array.isArray(row.providers_allowed) ||
    typeof row.require_approval !== "boolean"
  ) {
    return null;
  }

  return {
    enabled: row.enabled,
    maxPerDay: row.max_per_day,
    maxPerMonth: row.max_per_month,
    maxTotal: row.max_total,
    maxBytesTotal: row.max_bytes_total,
    maxBytesPerModel: row.max_bytes_per_model,
    providersAllowed: row.providers_allowed.filter((entry): entry is string => typeof entry === "string"),
    requireApproval: row.require_approval,
  };
}
