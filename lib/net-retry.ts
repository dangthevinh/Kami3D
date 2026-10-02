/**
 * Retrying the network, without retrying the things that should not be retried.
 *
 * A model-sourcing run is a long sequence of HTTP calls to providers, to Supabase and to Storage, and
 * one dropped connection used to end the whole run: measured, a fill that had downloaded models for
 * some species died with `getaddrinfo ENOTFOUND ...supabase.co` and lost the rest of its queue. The
 * queue survived, but the round did not, and nobody was watching at the time.
 *
 * So this is the rule, in one place: **transient** failures (DNS, connection reset, timeout, 5xx, 429)
 * are retried with exponential backoff and jitter; **decisions** (400, 401, 403, 404, 409) are not - a
 * licence refusal or a bad request is an answer, and asking again only wastes the budget.
 *
 * `sleep` and `random` are injectable so the tests do not wait for real time.
 */

export interface RetryOptions {
  attempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  /** Injected in tests: resolve after n milliseconds. */
  sleep?: (ms: number) => Promise<void>;
  random?: () => number;
  /** Called before each wait, so a run can say what it is doing rather than looking hung. */
  onRetry?: (attempt: number, error: Error, delayMs: number) => void;
}

/** Network-level failures worth another attempt, by message or by status. */
export function isTransient(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  if (/ENOTFOUND|EAI_AGAIN|ECONNRESET|ECONNREFUSED|ETIMEDOUT|EPIPE|socket hang up|fetch failed|network|aborted|timeout/i.test(message)) return true;
  const status = (error as { status?: number } | null)?.status;
  if (typeof status === "number") return status >= 500 || status === 429 || status === 408;
  return false;
}

export async function withRetry<T>(operation: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const attempts = Math.max(1, options.attempts ?? 4);
  const base = Math.max(1, options.baseDelayMs ?? 500);
  const ceiling = Math.max(base, options.maxDelayMs ?? 8_000);
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const random = options.random ?? Math.random;

  let lastError: unknown = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt === attempts || !isTransient(error)) throw error;
      // Backoff with jitter: a whole queue retrying in lockstep is a self-inflicted outage.
      const delay = Math.min(ceiling, base * 2 ** (attempt - 1)) * (0.5 + random() * 0.5);
      const delayMs = Math.round(delay);
      options.onRetry?.(attempt, error instanceof Error ? error : new Error(String(error)), delayMs);
      await sleep(delayMs);
    }
  }
  throw lastError;
}

/** A `fetch` that survives a dropped connection, for the JSON APIs this project talks to. */
export async function fetchWithRetry(url: string, init: RequestInit = {}, options: RetryOptions = {}): Promise<Response> {
  return withRetry(async () => {
    const response = await fetch(url, init);
    // 5xx and 429 are transient; 4xx are answers and are handed back to the caller.
    if (response.status >= 500 || response.status === 429 || response.status === 408) {
      const body = await response.text().catch(() => "");
      const error = new Error("HTTP " + response.status + " from " + url + ": " + body.slice(0, 120));
      (error as Error & { status?: number }).status = response.status;
      throw error;
    }
    return response;
  }, options);
}