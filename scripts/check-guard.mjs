/**
 * Checks for the two guards on the only endpoint a visitor can write to.
 *
 * The failure modes are asymmetric and both are tested: a guard that lets a script through leaves the
 * number meaningless, and a guard that refuses a real reader breaks the page for everybody. So the
 * window is driven with an injected clock (no sleeping in a test), the header rules are fed the
 * shapes browsers actually send, and the route itself is checked as text - the guards must be in it,
 * and the limiter must be created once rather than per request.
 *
 * Run with: npm run check:guard
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { clientKey, createRateLimiter, sameOriginVerdict } from "../lib/request-guard.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/** A header bag with the same shape a `Request` has. */
const headers = (values) => ({ get: (name) => values[name.toLowerCase()] ?? null });

test("the window allows its limit, then refuses, then lets the reader back in", () => {
  const limiter = createRateLimiter();
  const rule = { limit: 3, windowMs: 1000 };
  const start = 1_000_000;

  assert.deepEqual(
    [0, 1, 2].map((offset) => limiter.check("a", rule, start + offset).allowed),
    [true, true, true],
  );

  const blocked = limiter.check("a", rule, start + 3);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.remaining, 0);
  assert.equal(blocked.retryAfterSeconds, 1, "the oldest hit leaves the window in a second");

  // Sliding, not fixed: once every hit has left the window the reader starts over - and then
  // exhausts the fresh window exactly the same way, which is the property a fixed window gets wrong.
  const restarted = start + 1000 + 5;
  assert.equal(limiter.check("a", rule, restarted).allowed, true, "the whole burst has aged out");
  assert.equal(limiter.check("a", rule, restarted + 1).allowed, true);
  assert.equal(limiter.check("a", rule, restarted + 2).allowed, true);
  assert.equal(limiter.check("a", rule, restarted + 3).allowed, false, "three is still the limit");

  // A hit recorded just before the boundary keeps the window honest for the rest of it.
  const limiter2 = createRateLimiter();
  assert.equal(limiter2.check("b", rule, 0).allowed, true);
  assert.equal(limiter2.check("b", rule, 0).allowed, true);
  assert.equal(limiter2.check("b", rule, 900).allowed, true);
  const blocked2 = limiter2.check("b", rule, 950);
  assert.equal(blocked2.allowed, false);
  assert.equal(blocked2.retryAfterSeconds, 1, "the window frees up when the first hit is a second old");
  assert.equal(limiter2.check("b", rule, 1001).allowed, true);
});

test("keys are independent, and an empty key is not a shared bucket by accident", () => {
  const limiter = createRateLimiter();
  const rule = { limit: 1, windowMs: 5000 };

  assert.equal(limiter.check("1.2.3.4", rule, 0).allowed, true);
  assert.equal(limiter.check("1.2.3.4", rule, 0).allowed, false);
  assert.equal(limiter.check("5.6.7.8", rule, 0).allowed, true, "another address has its own window");
  assert.equal(limiter.check("", rule, 0).allowed, true);
});

test("nonsense rules are clamped rather than trusted", () => {
  const limiter = createRateLimiter();

  assert.equal(limiter.check("k", { limit: 0, windowMs: 1000 }, 0).limit, 1, "a zero limit would block the world");
  assert.equal(limiter.check("k", { limit: 2.7, windowMs: 1000 }, 0).limit, 2);
  assert.equal(limiter.check("k", { limit: 5, windowMs: 0 }, 0).retryAfterSeconds, 0);
  assert.equal(limiter.check("k", { limit: 5, windowMs: -10 }, 0).allowed, true);
});

test("the map of keys is bounded, so the guard cannot become the outage", () => {
  const limiter = createRateLimiter({ maxKeys: 50 });
  const rule = { limit: 10, windowMs: 60_000 };

  for (let index = 0; index < 500; index += 1) limiter.check("ip-" + index, rule, index);
  assert.equal(limiter.size(), 50, "the oldest keys are evicted, not kept for ever");

  limiter.clear();
  assert.equal(limiter.size(), 0);
});

test("browsers are read the way they speak", () => {
  const host = "localhost:9000";

  assert.equal(sameOriginVerdict(headers({ "sec-fetch-site": "same-origin" }), host), "same-origin");
  assert.equal(sameOriginVerdict(headers({ "sec-fetch-site": "same-site" }), host), "same-origin");
  assert.equal(sameOriginVerdict(headers({ "sec-fetch-site": "none" }), host), "same-origin");
  assert.equal(sameOriginVerdict(headers({ "sec-fetch-site": "CROSS-SITE" }), host), "cross-site");

  // No Sec-Fetch-Site: fall back to Origin, then Referer.
  assert.equal(sameOriginVerdict(headers({ origin: "https://localhost:9000" }), host), "same-origin");
  assert.equal(sameOriginVerdict(headers({ origin: "https://evil.example" }), host), "cross-site");
  assert.equal(sameOriginVerdict(headers({ referer: "https://localhost:9000/animal/lion" }), host), "same-origin");
  assert.equal(sameOriginVerdict(headers({ referer: "https://evil.example/lion" }), host), "cross-site");
  assert.equal(sameOriginVerdict(headers({ origin: "not a url" }), host), "unknown", "garbage is not a match");
  assert.equal(sameOriginVerdict(headers({}), host), "unknown", "curl is not cross-site");

  // Origin wins over Referer, because a page can be framed and still link honestly.
  assert.equal(
    sameOriginVerdict(headers({ origin: "https://evil.example", referer: "https://localhost:9000/" }), host),
    "cross-site",
  );
});

test("the client address comes from the proxy headers, first hop first", () => {
  assert.equal(clientKey(headers({ "x-forwarded-for": "203.0.113.9, 10.0.0.1" })), "203.0.113.9");
  assert.equal(clientKey(headers({ "x-forwarded-for": " 203.0.113.9 " })), "203.0.113.9");
  assert.equal(clientKey(headers({ "cf-connecting-ip": "198.51.100.4" })), "198.51.100.4");
  assert.equal(clientKey(headers({ "x-real-ip": "198.51.100.5" })), "198.51.100.5");
  assert.equal(clientKey(headers({ "x-forwarded-for": "" , "x-real-ip": "198.51.100.6" })), "198.51.100.6");
  assert.equal(clientKey(headers({})), null, "a direct request has no address to key on");
});

test("the endpoint actually uses both guards, and holds one limiter", () => {
  const route = readFileSync(join(root, "app", "api", "views", "route.ts"), "utf8");

  assert.ok(route.includes("sameOriginVerdict("), "the endpoint does not check where the request came from");
  assert.ok(route.includes("limiter.check("), "the endpoint does not rate limit");
  assert.ok(/status: 403/.test(route), "a cross-site attempt should be refused");
  assert.ok(/status: 429/.test(route), "and a flood should be told to come back later");
  assert.ok(route.includes("retry-after"), "with a Retry-After, so a client knows when");
  assert.ok(/^const limiter = createRateLimiter\(\);/m.test(route), "the limiter must outlive a request");
  assert.ok(!/createRateLimiter\(\)[^]*createRateLimiter\(\)/.test(route), "one limiter per module, not per call");
});
