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

import {
  anonymiseAddress,
  cleanOptionalText,
  cleanText,
  looksLikeMarkup,
  stripControl,
} from "../lib/sanitize.ts";
import { isAdminPath } from "../lib/admin-gate.ts";
import { serializeJsonLd } from "../lib/seo.ts";

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), "utf8");

const config = read("next.config.ts");
const demoStore = read("lib/demo-store.ts");
const writeGuard = read("lib/write-guard.ts");
const gitignore = read(".gitignore");
const schema = read("supabase/schema.sql");

/** Every route file, at any depth, that exports a handler that mutates. */
function mutatingRoutes(dir = join(root, "app", "api"), found = []) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) mutatingRoutes(path, found);
    else if (entry === "route.ts") {
      const source = readFileSync(path, "utf8");
      if (/export async function (POST|PATCH|PUT|DELETE)\(/.test(source)) {
        found.push({ path: path.slice(root.length + 1), source, dir: path.slice(0, path.lastIndexOf("/")) });
      }
    }
  }
  return found;
}

/**
 * Does this route reach \`guardWrite\`, directly or through one local helper?
 *
 * Phase 24 added a per-feature guard (\`app/api/manga/_lib/guard.ts\`) that wraps \`guardWrite\` and adds the
 * session lookup and the body bound, and eighteen routes import it. The rule that matters is not "the
 * string appears in the route file" but "the guard is reached", so a relative import is followed -
 * one file deep, and only local ones - and **the helper has to contain \`guardWrite(\` itself**. A route
 * that imported an unguarded helper would still fail here, which is why this resolves rather than
 * simply relaxing the assertion.
 */
function reachesTheGuard(source, dir, seen = new Set()) {
  if (source.includes("guardWrite(") || source.includes("sameOriginVerdict(")) return true;

  for (const [, specifier] of source.matchAll(/from\s+"([^"]+)"/g)) {
    let target = null;
    if (specifier.startsWith("./") || specifier.startsWith("../")) target = join(dir, specifier);
    else if (specifier.startsWith("@/app/")) target = join(root, specifier.slice(2));
    if (!target) continue;

    const file = target + ".ts";
    if (seen.has(file)) continue;
    seen.add(file);
    try {
      if (reachesTheGuard(readFileSync(file, "utf8"), target.slice(0, target.lastIndexOf("/")), seen)) return true;
    } catch {
      // A specifier that is not a file (a directory index, a package) is simply not a guard.
    }
  }
  return false;
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

  for (const { path, source, dir } of routes) {
    const guarded = reachesTheGuard(source, dir);
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

/**
 * Phase 31. The admin gate is one function, and the check below is what keeps it one function: the
 * geodata route carried its own is_admin() call and its own 403 until this phase, so the shared guard's
 * 404 convention, its default-owner rule and its new logging did not apply to it. A test is the only
 * thing that notices that drift the next time.
 */
test("every /api/admin route asks the one admin gate", () => {
  const dir = join(root, "app", "api", "admin");

  const routes = [];
  const walk = (current) => {
    for (const entry of readdirSync(current)) {
      const path = join(current, entry);
      if (statSync(path).isDirectory()) {
        if (entry !== "_lib") walk(path);
      } else if (entry === "route.ts") {
        routes.push({ path: path.slice(root.length + 1), source: readFileSync(path, "utf8") });
      }
    }
  };
  walk(dir);

  assert.ok(routes.length >= 8, "the scan should find the admin routes, saw " + routes.length);

  for (const { path, source } of routes) {
    assert.ok(source.includes("requireAdmin"), path + " does not go through the shared admin gate");
    assert.ok(
      !/\.rpc\(\s*["']is_admin["']/.test(source),
      path + " asks the database itself instead of the shared gate, which is the drift Phase 31 removed",
    );
  }

  const guard = read("app/api/admin/_lib/guard.ts");
  assert.ok(guard.includes("noteSecurityEvent"), "a refused admin call must be recorded, not just answered");
  assert.ok(guard.includes("status: 404"), "and it answers 404 rather than 403, so the route's existence is not confirmed");
});

test("the console is behind the middleware, and the path rule matches segments rather than prefixes", () => {
  const middleware = read("middleware.ts");
  assert.ok(middleware.includes("isAdminPath("), "the middleware must gate the console, not only the API");
  assert.ok(
    middleware.includes("canEnterConsole"),
    "and ask the allow-lists plus public.app_admins, the same two questions lib/admin.ts asks",
  );

  // The rule itself, driven: a prefix comparison would let /adminx and /administrator through.
  assert.equal(isAdminPath("/admin"), true);
  assert.equal(isAdminPath("/admin/"), true);
  assert.equal(isAdminPath("/admin/models"), true);
  assert.equal(isAdminPath("/admin/models?tab=1"), true);
  assert.equal(isAdminPath("/administrator"), false, "a prefix comparison would let this through");
  assert.equal(isAdminPath("/adminx"), false);
  assert.equal(isAdminPath("/animals/admin"), false);
});

test("the security log is written best-effort, admin-only, and the anon key cannot read it", () => {
  const log = read("lib/security-log.ts");
  assert.ok(log.includes("server-only"), "the log holds addresses and must never reach a client bundle");
  assert.ok(log.includes("getSupabaseAdmin"), "it writes with the service role, which is the only role that may insert");
  assert.ok(/try \{[\s\S]*?catch/.test(log), "a failed write must be caught: a guard that throws on a log write is a guard that fails");

  // SQL: the table, the policy, and the revoke the default privileges make necessary.
  assert.ok(/create table if not exists public\.security_events/.test(schema), "the events table is missing");
  assert.ok(/alter table public\.security_events\s+enable row level security/.test(schema), "RLS is off on the log");
  assert.ok(
    /create policy "only admins read the security log"[\s\S]{0,200}?using \(public\.is_admin\(\)\)/.test(schema),
    "the read policy must be the admin check, not a blanket true",
  );
  assert.ok(
    /revoke all on public\.security_events from anon/.test(schema),
    "the default privileges grant SELECT to anon on every new table, so this table has to take it back",
  );
  assert.ok(
    /grant select, insert on public\.security_events to service_role/.test(schema),
    "only the service role writes the log, so a caller cannot forge an event",
  );
  assert.ok(
    !/on public\.security_events for insert/.test(schema),
    "no insert policy: the log is written by the server, never by a caller",
  );

  // The one thing a security log has to record is who: the address is redacted *before* it is stored.
  assert.ok(log.includes("anonymiseAddress"), "an address is stored as a prefix, never as a host");
});

test("a member writes a panel in their own folder, and the asset buckets stay server-only", () => {
  for (const action of ["uploads", "replaces", "deletes"]) {
    assert.ok(
      new RegExp('create policy "a member ' + action + ' panels in their own folder"').test(schema),
      action + " needs a policy scoped to the member's own folder",
    );
  }

  const folderChecks = schema.match(/\(storage\.foldername\(name\)\)\[1\] = public\.current_user_id\(\)/g) ?? [];
  assert.ok(folderChecks.length >= 4, "every write policy compares the first path segment with the session id, saw " + folderChecks.length);

  // The asset buckets are read-only to clients: a model without a credit line is the one thing this
  // catalogue does not allow, and a browser upload path is how that happens.
  assert.ok(
    !/on storage\.objects for (insert|update|delete)[\s\S]{0,400}?bucket_id = 'animal-(assets|sounds)'/.test(schema),
    "an asset bucket must have no client write policy",
  );
});

test("input hygiene: control characters go, bounds hold, markup is reported without mangling text", () => {
  // Invisible characters are removed, and the characters an author actually types survive.
  assert.equal(stripControl("lion\u0000\u200bcub"), "lioncub");
  assert.equal(stripControl("line one\r\nline two"), "line one\nline two");
  assert.equal(stripControl("two\nlines", { multiline: false }), "two lines", "a single-line field has no newline");
  assert.equal(stripControl("a\u202eb"), "ab", "a bidi override can disguise a value and is dropped");

  assert.equal(cleanText("  Lion  ", { max: 10 }), "Lion");
  assert.equal(cleanText("", { max: 10 }), null, "an empty field is absent, not a string of spaces");
  assert.equal(cleanText("   ", { max: 10 }), null);
  assert.equal(cleanText(42, { max: 10 }), null, "a number is not text");
  assert.equal(cleanText("x".repeat(11), { max: 10 }), null, "over the limit is refused, never silently cut");
  assert.equal(cleanOptionalText(undefined, { max: 10 }), null, "absent stays absent");

  // Narrow on purpose: a check that calls "5 < 6" markup gets switched off.
  assert.equal(looksLikeMarkup("<script>alert(1)</script>"), true);
  assert.equal(looksLikeMarkup("<img src=x onerror=1>"), true);
  assert.equal(looksLikeMarkup("javascript:alert(1)"), true);
  assert.equal(looksLikeMarkup("data:text/html;base64,PHNjcmlwdD4="), true);
  assert.equal(looksLikeMarkup("5 < 6 and 7 > 2"), false);
  assert.equal(looksLikeMarkup("The Lion (Panthera leo)"), false);

  assert.equal(anonymiseAddress("203.0.113.42"), "203.0.113.0/24");
  assert.equal(anonymiseAddress("203.000.113.42"), "203.0.113.0/24", "two spellings of one network must compare equal");
  assert.equal(anonymiseAddress("2001:db8:1234:5678::1"), "2001:0db8:1234::/48");
  assert.equal(
    anonymiseAddress("::1"),
    "0000:0000:0000::/48",
    "the loopback address must not become 1:: - the bug the first version of this function had",
  );
  assert.equal(anonymiseAddress("not an address"), null);
  assert.equal(anonymiseAddress("999.0.0.1"), null, "an out-of-range octet is not an address");
  assert.equal(anonymiseAddress(null), null);
});

test("the two innerHTML sinks are fed by serializers, not by user text", () => {
  const sinks = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) walk(path);
      else if (/\.tsx?$/.test(entry)) {
        const source = readFileSync(path, "utf8");
        if (source.includes("dangerouslySetInnerHTML")) sinks.push(path.slice(root.length + 1));
      }
    }
  };
  walk(join(root, "app"));
  walk(join(root, "components"));

  assert.deepEqual(
    sinks.sort(),
    ["components/brand/KamiLogo.tsx", "components/seo/JsonLd.tsx"],
    "a third innerHTML sink must be a deliberate decision, not a surprise",
  );

  // Driven rather than grepped: the serializer is imported and asked to do the job, because a regex
  // over source text passes for the wrong reason as easily as it fails for one.
  const hostile = serializeJsonLd({ name: "</script><img src=x onerror=alert(1)>" });
  assert.ok(!hostile.includes("<"), "the JSON-LD serializer must escape every < it is handed");
  assert.ok(hostile.includes("\\u003c"), "and it does so as an escape, not by dropping the character");
  assert.ok(read("components/brand/KamiLogo.tsx").includes("kamiMarkSvg("), "the logo sink renders a generated string, not a stored field");
});
