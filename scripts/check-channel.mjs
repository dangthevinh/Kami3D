/**
 * Checks for the channel classifier and the shape of what it is allowed to store.
 *
 * Two halves, and the second is the one that matters over time: the classifier is driven directly
 * (referrers, bots, the two opt-out headers), while the **schema** is parsed to prove that the tables
 * cannot hold a person. There is no Postgres in CI, so the privacy policy lives in assertions about
 * the file: no column may be named like an address, a device or a session, and every channel the
 * classifier can return must be one the CHECK constraint accepts.
 *
 * Run with: npm run check:channel
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import {
  CHANNELS,
  campaignSlug,
  classifyChannel,
  honorsDoNotTrack,
  isBotUserAgent,
  isPageRequest,
  routeClass,
  searchOutcome,
} from "../lib/channel.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const schema = readFileSync(join(root, "supabase", "schema.sql"), "utf8");
const middleware = readFileSync(join(root, "middleware.ts"), "utf8");

const headers = (values) => ({ get: (name) => values[name.toLowerCase()] ?? null });

test("a bot is a bot, a campaign is a campaign, and the order is deliberate", () => {
  assert.equal(classifyChannel({ userAgent: "Googlebot/2.1 (+http://www.google.com/bot.html)" }), "bot");
  assert.equal(classifyChannel({ userAgent: "Mozilla/5.0 HeadlessChrome/120" }), "bot");
  assert.equal(classifyChannel({ userAgent: "curl/8.4.0" }), "bot");

  // A campaign tag beats the referrer, because that is what the tag is for - even from a bot-free
  // browser arriving through a search engine.
  assert.equal(
    classifyChannel({ referer: "https://www.google.com/search?q=lion", campaign: "spring_sale" }),
    "campaign",
  );

  // The host a request arrived on is what makes a referral internal.
  assert.equal(classifyChannel({ referer: "https://localhost:9000/explore", host: "localhost:9000" }), "internal");
  assert.equal(classifyChannel({ referer: "https://www.google.co.uk/search?q=lion" }), "search");
  assert.equal(classifyChannel({ referer: "https://duckduckgo.com/" }), "search");
  assert.equal(classifyChannel({ referer: "https://www.facebook.com/" }), "social");
  assert.equal(classifyChannel({ referer: "https://t.co/abc" }), "social");
  assert.equal(classifyChannel({ referer: "https://news.example.org/story" }), "referral");

  assert.equal(classifyChannel({ secFetchSite: "same-origin" }), "internal", "a client-side navigation");
  assert.equal(classifyChannel({ secFetchSite: "cross-site" }), "direct", "no referrer is not a guess");
  assert.equal(classifyChannel({}), "direct");
  assert.equal(classifyChannel({ referer: "not a url" }), "direct");
});

test("a campaign tag is normalised, and cannot carry something that is not a tag", () => {
  assert.equal(campaignSlug("Spring-Sale"), "spring-sale");
  assert.equal(campaignSlug("  newsletter  "), "newsletter");
  assert.equal(campaignSlug("a".repeat(80))?.length, 40);
  assert.equal(campaignSlug("user@example.com"), "userexamplecom", "punctuation goes, so an address is not stored as one");
  assert.equal(campaignSlug(""), null);
  assert.equal(campaignSlug(null), null);
  assert.equal(campaignSlug("!!!"), null);
});

test("routes collapse to the shape of a page, and query strings never survive", () => {
  assert.equal(routeClass("/"), "/");
  assert.equal(routeClass("/explore"), "/explore");
  assert.equal(routeClass("/explore/"), "/explore");
  assert.equal(routeClass("/animal/lion"), "/animal/[slug]");
  assert.equal(routeClass("/animal/blue-whale?utm_source=x"), "/animal/[slug]");
  assert.equal(routeClass("/data2map"), "/data2map");
  assert.equal(routeClass("/data2map/twin"), "/data2map/[product]");
  assert.equal(routeClass("/admin/geodata"), "/admin/[page]");
  assert.equal(routeClass("/something/else/entirely"), "/something", "an unknown path cannot explode the table");
  assert.equal(routeClass(""), "/");
});

test("a visitor can say no, and it is respected", () => {
  assert.equal(honorsDoNotTrack(headers({ dnt: "1" })), true);
  assert.equal(honorsDoNotTrack(headers({ "sec-gpc": "1" })), true);
  assert.equal(honorsDoNotTrack(headers({ dnt: "0" })), false);
  assert.equal(honorsDoNotTrack(headers({})), false);
});

test("only pages are counted, never assets or API calls", () => {
  assert.equal(isPageRequest("/"), true);
  assert.equal(isPageRequest("/animal/lion?utm_source=x"), true);
  assert.equal(isPageRequest("/api/views"), false);
  assert.equal(isPageRequest("/_next/static/chunk.js"), false);
  assert.equal(isPageRequest("/icon.svg"), false);
  assert.equal(isPageRequest("/opengraph-image"), true, "an image route without an extension is still a route");
});

test("a search is remembered as an outcome, never as a term", () => {
  assert.deepEqual(searchOutcome("lion"), { outcome: "matched", slug: "lion" });
  assert.deepEqual(searchOutcome(null), { outcome: "no_match", slug: "" });
  assert.deepEqual(searchOutcome("   "), { outcome: "no_match", slug: "" });
  assert.equal(searchOutcome("x".repeat(400)).slug.length, 120);
});

test("the schema cannot hold a person", () => {
  const forbidden = /(^|_)(ip|ip_address|user_agent|ua|visitor|visitor_id|session|session_id|device|fingerprint|cookie|email|user_id)($|_)/i;

  for (const table of ["traffic_daily", "page_daily", "search_daily"]) {
    const start = schema.indexOf("create table if not exists public." + table + " (");
    assert.ok(start >= 0, table + " is missing from schema.sql");

    const body = schema.slice(start, schema.indexOf(");", start));
    const columns = [...body.matchAll(/^\s{2}([a-z_]+)\s/gm)].map((match) => match[1]);
    assert.ok(columns.length >= 3, table + " has no columns?");

    for (const column of columns) {
      assert.ok(!forbidden.test(column), table + "." + column + " looks like personal data, which this schema does not keep");
    }

    assert.ok(
      new RegExp("alter table public\\." + table + "\\s+enable row level security").test(schema),
      table + " has row level security off",
    );

    // Admins read it; there is no write policy at all, so only the service role can write.
    assert.ok(new RegExp("on public\\." + table + " for select to authenticated using \\(public\\.is_admin\\(\\)\\)").test(schema), table + " is not admin-only");
    assert.ok(!new RegExp("on public\\." + table + " for (insert|update|delete)").test(schema), table + " has a write policy");
    assert.ok(new RegExp("revoke all on public\\." + table + " from anon").test(schema), table + " still grants anon");
  }

  // Every channel the classifier can produce must be one the CHECK constraint accepts, or a real
  // visit would fail to be counted at three in the morning.
  const allowed = (schema.match(/channel text not null check \(channel in \(([^)]*)\)\)/)?.[1] ?? "")
    .match(/'[^']+'/g)
    ?.map((entry) => entry.replace(/'/g, "")) ?? [];
  assert.deepEqual(allowed.sort(), [...CHANNELS].sort());
});

test("one function writes, service-role only, and retention has a floor", () => {
  assert.ok(/create or replace function public\.bump_traffic\(/.test(schema), "the writer is missing");
  assert.ok(/revoke all on function public\.bump_traffic\([^)]*\) from public, anon, authenticated/.test(schema));
  assert.ok(/grant execute on function public\.bump_traffic\([^)]*\) to service_role/.test(schema));

  assert.ok(/create or replace function public\.prune_traffic\(retain_days integer default 400\)/.test(schema));
  assert.ok(schema.includes("retain_days must be positive"), "the sweep must refuse a zero window");
  assert.ok(/grant execute on function public\.prune_traffic\(integer\) to service_role/.test(schema));
});

test("the middleware records a page view without waiting for the database", () => {
  for (const symbol of ["classifyChannel", "routeClass", "honorsDoNotTrack", "isPageRequest"]) {
    assert.ok(middleware.includes(symbol), "the middleware does not use " + symbol);
  }

  // Fire and forget: a counter must never delay a page, and a failure must never surface to a reader.
  assert.ok(/waitUntil/.test(middleware), "the write must not block the response");
  assert.ok(/catch\(\(\) => undefined\)|catch \{\s*\/\//.test(middleware), "a failed count must be swallowed");
});
