/**
 * Assertions for the security posture, as far as text can carry them.
 *
 * Three things that are easy to lose in a refactor and expensive to lose in production:
 *
 *   1. **the response headers.** A missing \`X-Frame-Options\` is a clickjacking target, and a security
 *      header deleted while debugging tends to stay deleted. The list here is the one the app actually
 *      serves — measured with \`curl -I\` when the phase landed, and pinned here so a later change has to
 *      be deliberate.
 *   2. **a guard on every route that writes.** \`/api/views\` learned this first; the other ten routes
 *      did not, which left personal data and two child-process endpoints open to a cross-site POST.
 *      Every mutating handler must go through \`guardWrite\` (or carry the original pair, in views).
 *   3. **cookie and secret hygiene.** The demo cookies are \`httpOnly\` and \`secure\` in production, and no
 *      .env file is tracked by git.
 *
 * What this cannot check: whether a policy is correct, whether a token leaks at runtime, or whether a
 * header actually reaches a browser. \`scripts/check-secrets.mjs\` covers the second on the real build.
 *
 * Run with: npm run check:security
 */

import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), "utf8");

const config = read("next.config.ts");
const demoStore = read("lib/demo-store.ts");
const writeGuard = read("lib/write-guard.ts");
const gitignore = read(".gitignore");

/** Every route file, at any depth, that exports a handler that mutates. */
function mutatingRoutes(dir = join(root, "app", "api"), found = []) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) mutatingRoutes(path, found);
    else if (entry === "route.ts") {
      const source = readFileSync(path, "utf8");
      if (/export async function (POST|PATCH|PUT|DELETE)\(/.test(source)) {
        found.push({ path: path.slice(root.length + 1), source });
      }
    }
  }
  return found;
}

test("the security headers are still served, with the two that are production-only", () => {
  for (const [header, why] of [
    ["X-Content-Type-Options", "nosniff stops a text file being sniffed into a script"],
    ["Referrer-Policy", "the referrer is sent to other origins on every outbound link"],
    ["X-Frame-Options", "a framed console is a clickjacking target"],
    ["Permissions-Policy", "camera, microphone and the rest are capabilities this app never asks for"],
    ["Cross-Origin-Opener-Policy", "a window opened from here should not share a browsing context"],
  ]) {
    assert.ok(config.includes(header), header + " must be configured: " + why);
  }

  assert.ok(config.includes('"X-Frame-Options", value: "DENY"'), "framing is denied, not merely restricted");
  assert.ok(
    /NODE_ENV === "production"[\s\S]{0,200}Strict-Transport-Security/.test(config),
    "HSTS is production-only: a dev server over http would pin the developer's browser",
  );
});

test("the content policy reports before it enforces", () => {
  assert.ok(config.includes("Content-Security-Policy-Report-Only"), "the policy ships as report-only");
  assert.ok(!/key: "Content-Security-Policy"/.test(config), "and is not enforcing yet");

  // Two directives that cost nothing and stop the two classic escalations.
  assert.ok(config.includes("frame-ancestors 'none'"), "nothing may frame the app");
  assert.ok(config.includes("object-src 'none'"), "no plugin content");
  assert.ok(config.includes("base-uri 'self'"), "no injected <base> rewriting every relative URL");
});

test("every route that writes goes through the shared guard", () => {
  const routes = mutatingRoutes();
  assert.ok(routes.length >= 8, "the scan should find the routes that write, saw " + routes.length);

  for (const { path, source } of routes) {
    const guarded = source.includes("guardWrite(") || source.includes("sameOriginVerdict(");
    assert.ok(guarded, path + " has a mutating handler and no same-origin check");
  }

  // One implementation of the rule, not two: the guard reads its two pure functions from
  // lib/request-guard.ts, which check:request-guard already pins.
  assert.ok(writeGuard.includes("sameOriginVerdict"), "the guard uses the same origin verdict as /api/views");
  assert.ok(writeGuard.includes("createRateLimiter"), "and the same sliding window");
  assert.ok(
    writeGuard.includes("server-only"),
    "the guard is server-only: importing it into a client component would ship the limits to the browser",
  );
});

test("cookies and environment files stay where they belong", () => {
  for (const cookie of ["FAVORITES_COOKIE", "QUIZ_COOKIE"]) {
    const block = new RegExp(cookie + "[\\s\\S]{0,320}?\\}\\)").exec(demoStore);
    assert.ok(block, cookie + " must still be set with explicit flags");
    for (const flag of ["httpOnly: true", 'sameSite: "lax"', 'secure: process.env.NODE_ENV === "production"']) {
      assert.ok(block[0].includes(flag), cookie + " must set " + flag);
    }
  }

  for (const pattern of [".env", ".env.local", ".env*.local"]) {
    assert.ok(gitignore.split("\n").includes(pattern), pattern + " must be ignored by git");
  }
});
