/**
 * lib/net-retry.ts: retry the network, never retry an answer.
 *
 *   node --test scripts/check-net-retry.mjs
 *
 * Written after a real failure: a model fill died mid-run with `getaddrinfo ENOTFOUND ...supabase.co`
 * and lost the rest of its queue. The tests use an injected clock, so they run in milliseconds and say
 * exactly which failures are worth another attempt and which are decisions.
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import { fetchWithRetry, isTransient, withRetry } from "../lib/net-retry.ts";

const clock = () => {
  const waits = [];
  return { waits, sleep: async (ms) => void waits.push(ms), random: () => 0.5 };
};

test("a transient failure is retried and the call can still succeed", async () => {
  const { waits, sleep, random } = clock();
  let calls = 0;
  const result = await withRetry(
    async () => {
      calls += 1;
      if (calls < 3) throw new Error("getaddrinfo ENOTFOUND example.invalid");
      return "ok";
    },
    { sleep, random },
  );
  assert.equal(result, "ok");
  assert.equal(calls, 3);
  assert.equal(waits.length, 2, "two failures, two waits");
  assert.ok(waits[1] > waits[0], "the backoff grows");
});

test("an answer is not retried: a 400 means the request was wrong", async () => {
  const { sleep, random } = clock();
  let calls = 0;
  await assert.rejects(
    () =>
      withRetry(
        async () => {
          calls += 1;
          const error = new Error("HTTP 400 from /rest/v1/x");
          error.status = 400;
          throw error;
        },
        { sleep, random },
      ),
    /HTTP 400/,
  );
  assert.equal(calls, 1, "a bad request must not be sent four times");
});

test("what counts as transient, and what does not", () => {
  assert.equal(isTransient(new Error("fetch failed")), true);
  assert.equal(isTransient(new Error("getaddrinfo ENOTFOUND host")), true);
  assert.equal(isTransient(new Error("socket hang up")), true);
  assert.equal(isTransient(new Error("The operation was aborted due to timeout")), true);
  const server = Object.assign(new Error("HTTP 503"), { status: 503 });
  assert.equal(isTransient(server), true);
  const throttled = Object.assign(new Error("HTTP 429"), { status: 429 });
  assert.equal(isTransient(throttled), true, "rate limiting is a wait, not a refusal");
  const missing = Object.assign(new Error("HTTP 404"), { status: 404 });
  assert.equal(isTransient(missing), false);
  assert.equal(isTransient(new Error("licence CC-BY-NC is not on the allow-list")), false);
});

test("it gives up after the configured number of attempts, with the last error", async () => {
  const { sleep, random } = clock();
  let calls = 0;
  await assert.rejects(
    () => withRetry(async () => { calls += 1; throw new Error("ECONNRESET"); }, { attempts: 3, sleep, random }),
    /ECONNRESET/,
  );
  assert.equal(calls, 3);
});

test("the delay is capped and jittered, so a queue does not retry in lockstep", async () => {
  const waits = [];
  await withRetry(async () => { throw new Error("ETIMEDOUT"); }, {
    attempts: 6,
    baseDelayMs: 100,
    maxDelayMs: 1_000,
    random: () => 1,
    sleep: async (ms) => void waits.push(ms),
  }).catch(() => {});
  assert.deepEqual(waits, [100, 200, 400, 800, 1_000], "doubles, then stops at the ceiling");
});

test("a run can say what it is waiting for", async () => {
  const seen = [];
  let calls = 0;
  await withRetry(
    async () => {
      calls += 1;
      if (calls === 1) throw new Error("fetch failed");
      return 1;
    },
    { random: () => 0.5, sleep: async () => {}, onRetry: (attempt, error) => seen.push(attempt + ":" + error.message) },
  );
  assert.deepEqual(seen, ["1:fetch failed"]);
});

test("fetchWithRetry hands 4xx back to the caller and retries 5xx", async () => {
  const original = globalThis.fetch;
  const responses = [
    new Response("boom", { status: 503 }),
    new Response("slow down", { status: 429 }),
    new Response("{\"ok\":true}", { status: 200 }),
  ];
  let calls = 0;
  globalThis.fetch = (async () => {
    calls += 1;
    return responses[Math.min(calls - 1, responses.length - 1)];
  });
  try {
    const response = await fetchWithRetry("https://example.invalid/x", {}, { random: () => 0.5, sleep: async () => {} });
    assert.equal(response.status, 200);
    assert.equal(calls, 3, "two transient statuses, then the real answer");
  } finally {
    globalThis.fetch = original;
  }
});
