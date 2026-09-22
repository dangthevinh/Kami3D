/**
 * Two cheap guards for the one endpoint a visitor can write to.
 *
 * `/api/views` is the only place an anonymous request changes a number anyone looks at, and
 * docs/REVIEW.md listed it as risk R2: a six-hour cookie stops a refresh from inflating a count, and
 * nothing stopped a script. These are the two things that do, and both are pure so the check suite
 * can drive them without a server:
 *
 *   1. **`sameOriginVerdict`** - browsers tell the server where a request came from, and
 *      `Sec-Fetch-Site` cannot be forged by page JavaScript. A cross-site POST is refused.
 *   2. **`createRateLimiter`** - a sliding window per key. In-memory and therefore **per instance**,
 *      which is the honest description: it bounds one process, and a deployment with several of them
 *      would need the shared store the README does not have yet.
 */

export interface RateLimitRule {
  /** Requests allowed inside the window. */
  limit: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  /** Seconds until the oldest hit leaves the window. 0 when the request was allowed. */
  retryAfterSeconds: number;
  /** Epoch milliseconds at which the window frees up. */
  resetAt: number;
}

export interface RateLimiter {
  check(key: string, rule: RateLimitRule, now?: number): RateLimitResult;
  size(): number;
  clear(): void;
}

/**
 * A sliding-window limiter that keeps at most `maxKeys` keys.
 *
 * The bound matters: an unbounded map keyed by client address is itself a denial-of-service vector,
 * so the oldest key is evicted once the ceiling is reached (a `Map` iterates in insertion order,
 * which is what makes "oldest" cheap).
 */
export function createRateLimiter({ maxKeys = 5000 }: { maxKeys?: number } = {}): RateLimiter {
  const hits = new Map<string, number[]>();
  const ceiling = Math.max(1, Math.floor(maxKeys));

  return {
    check(key, rule, now = Date.now()) {
      const windowMs = Math.max(1, Math.floor(rule.windowMs));
      const limit = Math.max(1, Math.floor(rule.limit));
      const cutoff = now - windowMs;

      const recent = (hits.get(key) ?? []).filter((at) => at > cutoff);
      const allowed = recent.length < limit;
      if (allowed) recent.push(now);

      if (recent.length === 0) hits.delete(key);
      else hits.set(key, recent);

      while (hits.size > ceiling) {
        const oldest = hits.keys().next().value;
        if (oldest === undefined) break;
        hits.delete(oldest);
      }

      const resetAt = (recent[0] ?? now) + windowMs;

      return {
        allowed,
        limit,
        remaining: Math.max(0, limit - recent.length),
        retryAfterSeconds: allowed ? 0 : Math.max(1, Math.ceil((resetAt - now) / 1000)),
        resetAt,
      };
    },
    size: () => hits.size,
    clear: () => hits.clear(),
  };
}

export type OriginVerdict = "same-origin" | "cross-site" | "unknown";

interface HeaderReader {
  get(name: string): string | null;
}

/** The host part of a URL, or null when it is not one. */
function hostOf(value: string | null): string | null {
  if (!value) return null;
  try {
    return new URL(value).host.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Where did this request come from?
 *
 * `Sec-Fetch-Site` is the browser's own answer and page JavaScript cannot set it, so it is trusted
 * first: `cross-site` is refused, `same-origin` and `same-site` are allowed, and `none` (a typed
 * URL, a bookmark) is allowed because it is not a script at all.
 *
 * When the header is missing - an older browser, or a client that is not a browser - the
 * `Origin` (then `Referer`) is compared with the host the request arrived on. A mismatch is
 * cross-site. Nothing at all is reported as `unknown` rather than refused, because `curl` is also
 * how this endpoint is tested, and the rate limiter is what bounds it.
 */
export function sameOriginVerdict(headers: HeaderReader, expectedHost: string): OriginVerdict {
  const site = (headers.get("sec-fetch-site") ?? "").trim().toLowerCase();
  if (site === "cross-site") return "cross-site";
  if (site === "same-origin" || site === "same-site" || site === "none") return "same-origin";

  const origin = hostOf(headers.get("origin"));
  if (origin) return origin === expectedHost.toLowerCase() ? "same-origin" : "cross-site";

  const referer = hostOf(headers.get("referer"));
  if (referer) return referer === expectedHost.toLowerCase() ? "same-origin" : "cross-site";

  return "unknown";
}

/** The client address, from whichever proxy header this deployment has, or null. */
export function clientKey(headers: HeaderReader): string | null {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  for (const name of ["cf-connecting-ip", "x-real-ip", "x-vercel-forwarded-for"]) {
    const value = headers.get(name)?.trim();
    if (value) return value;
  }

  return null;
}
