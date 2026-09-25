/**
 * The auto-pilot's rules, checked twice.
 *
 * The first half tests lib/autopilot.ts as arithmetic: the clamps, the scopes, the ordering, the
 * per-run limit, the "is it due" answer, and the constant-time secret compare.
 *
 * The second half is the one that matters, and it is the reason this file exists rather than the
 * tests living next to the module: **the same decision is written twice** - once in TypeScript for
 * the panel and the runner, once in SQL for the database - and two copies of a rule drift apart
 * silently. These tests read supabase/schema.sql and assert that the SQL still applies the same
 * scopes, the same exclusions, the same ordering and the same limit, and that it still cannot spend
 * a download: the auto-pilot may only queue an order, and every model in it still has to pass
 * reserve_model_download().
 *
 *   node --test scripts/check-autopilot.mjs
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import {
  AUTOPILOT_LIMITS,
  AUTOPILOT_SCOPES,
  autopilotDue,
  autopilotFromJson,
  autopilotTargets,
  cadenceLabel,
  constantTimeEquals,
  cronAuthorised,
  CRON_PATH,
  mergeAutopilotInput,
  roundResultFromJson,
  roundSummary,
  sanitiseSlugs,
} from "../lib/autopilot.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const schema = readFileSync(join(ROOT, "supabase", "schema.sql"), "utf8");

const policy = (overrides = {}) => ({
  enabled: true,
  cadenceMinutes: 360,
  perRun: 1,
  scope: "weak",
  slugs: [],
  minScore: 75,
  nextRunAt: null,
  lastRunAt: null,
  lastResult: null,
  updatedBy: null,
  updatedAt: null,
  ...overrides,
});

const gap = (slug, { hasAsset = true, bestScore = 90, popularity = 50 } = {}) => ({
  slug,
  name: slug,
  hasAsset,
  bestScore,
  popularity,
  modelUrl: hasAsset ? "https://example.invalid/" + slug + ".glb" : "/models/" + slug + ".glb",
});

/* ---------------------------------------------------------------- the module */

test("an empty row is off, every six hours, one model at a time", () => {
  const parsed = autopilotFromJson({ id: "default" });
  assert.equal(parsed.enabled, false, "a fresh project must not start downloading because a page opened");
  assert.equal(parsed.cadenceMinutes, AUTOPILOT_LIMITS.defaultCadenceMinutes);
  assert.equal(parsed.perRun, 1);
  assert.equal(parsed.scope, "weak", "weak is the scope that also covers 'nothing at all'");
  assert.equal(parsed.minScore, AUTOPILOT_LIMITS.defaultMinScore);
  assert.deepEqual(parsed.slugs, []);
});

test("a row that is not the singleton, or not an object, is refused", () => {
  assert.equal(autopilotFromJson(null), null);
  assert.equal(autopilotFromJson("default"), null);
  assert.equal(autopilotFromJson({ id: "other" }), null);
  assert.ok(autopilotFromJson({ id: "default", enabled: true }));
});

test("every number is clamped to the range the UI offers", () => {
  const low = autopilotFromJson({ id: "default", cadence_minutes: 1, per_run: 0, min_score: -20 });
  assert.equal(low.cadenceMinutes, AUTOPILOT_LIMITS.minCadenceMinutes);
  assert.equal(low.perRun, AUTOPILOT_LIMITS.minPerRun);
  assert.equal(low.minScore, AUTOPILOT_LIMITS.minScoreFloor);

  const high = autopilotFromJson({ id: "default", cadence_minutes: 999_999, per_run: 400, min_score: 5_000 });
  assert.equal(high.cadenceMinutes, AUTOPILOT_LIMITS.maxCadenceMinutes);
  assert.equal(high.perRun, AUTOPILOT_LIMITS.maxPerRun, "five a round, because each one is a child process and a download");
  assert.equal(high.minScore, AUTOPILOT_LIMITS.minScoreCeiling);

  const silly = autopilotFromJson({ id: "default", cadence_minutes: "soon", per_run: null });
  assert.equal(silly.cadenceMinutes, AUTOPILOT_LIMITS.defaultCadenceMinutes, "a value that is not a number is not a zero");
});

test("an unknown scope falls back to weak instead of to the narrowest one", () => {
  assert.equal(autopilotFromJson({ id: "default", scope: "everything" }).scope, "weak");
  assert.deepEqual([...AUTOPILOT_SCOPES], ["unsourced", "weak", "named"]);
});

test("slugs are sanitised: no paths, no traversal, no duplicates, no shouting", () => {
  assert.deepEqual(sanitiseSlugs(["Lion", "lion", "../etc/passwd", "blue-whale", 42, ""]), ["lion", "blue-whale"]);
  assert.deepEqual(sanitiseSlugs("lion"), [], "a string is not a list");
});

test("a partial update keeps what it did not mention", () => {
  const current = policy({ scope: "named", slugs: ["lion"], perRun: 3, minScore: 80 });
  const merged = mergeAutopilotInput(current, { enabled: false });
  assert.equal(merged.enabled, false);
  assert.equal(merged.perRun, 3);
  assert.equal(merged.minScore, 80);
  assert.deepEqual(merged.slugs, ["lion"]);
  assert.equal(merged.scope, "named");
});

test("'named' with no names becomes 'weak' rather than asking for nothing forever", () => {
  const merged = mergeAutopilotInput(policy({ scope: "unsourced" }), { scope: "named", slugs: [] });
  assert.equal(merged.scope, "weak");
});

test("due means on, and past its next run", () => {
  const now = new Date("2026-09-25T12:00:00.000Z");
  assert.deepEqual(autopilotDue(policy({ enabled: false }), now), {
    due: false,
    reason: "the auto-pilot is switched off",
  });
  assert.equal(autopilotDue(policy({ nextRunAt: "2026-09-25T18:00:00.000Z" }), now).due, false);
  assert.match(autopilotDue(policy({ nextRunAt: "2026-09-25T18:00:00.000Z" }), now).reason, /not due until/);
  assert.equal(autopilotDue(policy({ nextRunAt: "2026-09-25T11:59:00.000Z" }), now).due, true);
  assert.equal(autopilotDue(policy({ nextRunAt: null }), now).due, true, "a row with no clock is due now");
});

test("unsourced means the database has no model_assets row for the species", () => {
  const gaps = [gap("lion"), gap("panda", { hasAsset: false }), gap("wolf", { hasAsset: false })];
  const plan = autopilotTargets(policy({ scope: "unsourced", perRun: 5 }), gaps);
  assert.deepEqual(plan.targets.sort(), ["panda", "wolf"]);
});

test("weak includes unsourced, and excludes anything at or above the threshold", () => {
  const gaps = [gap("lion", { bestScore: 90 }), gap("tiger", { bestScore: 75 }), gap("seal", { bestScore: 69.6 }), gap("anaconda", { hasAsset: false, bestScore: null })];
  const plan = autopilotTargets(policy({ scope: "weak", minScore: 75, perRun: 5 }), gaps);
  assert.deepEqual(plan.targets.sort(), ["anaconda", "seal"], "75 itself is not below 75, and no model at all is weakest");
});

test("named takes exactly the named species, whatever their score", () => {
  const gaps = [gap("lion"), gap("seal", { bestScore: 10 })];
  const plan = autopilotTargets(policy({ scope: "named", slugs: ["seal"], perRun: 5 }), gaps);
  assert.deepEqual(plan.targets, ["seal"]);

  // Naming a species is also how an admin replaces a model they do not like, so a name with a
  // perfect score is still fetched. That is the worker's rule, and the preview must not disagree.
  const replace = autopilotTargets(policy({ scope: "named", slugs: ["lion"], perRun: 5 }), gaps);
  assert.deepEqual(replace.targets, ["lion"]);

  const none = autopilotTargets(policy({ scope: "named", slugs: ["okapi"], perRun: 5 }), gaps);
  assert.deepEqual(none.targets, []);
  assert.match(none.reason, /none of the named species/);
});

test("the most popular species goes first, and the rest wait for later rounds", () => {
  const gaps = [
    gap("a", { hasAsset: false, popularity: 10 }),
    gap("b", { hasAsset: false, popularity: 90 }),
    gap("c", { hasAsset: false, popularity: 50 }),
  ];
  const plan = autopilotTargets(policy({ scope: "unsourced", perRun: 2 }), gaps);
  assert.deepEqual(plan.targets, ["b", "c"]);
  assert.deepEqual(plan.deferred, ["a"], "the panel says what is left, not just what is next");
  assert.equal(plan.reason, null);
});

test("species already in an open order are not asked for twice", () => {
  const gaps = [gap("lion", { hasAsset: false }), gap("panda", { hasAsset: false })];
  const plan = autopilotTargets(policy({ scope: "unsourced", perRun: 5 }), gaps, { openSlugs: ["lion"] });
  assert.deepEqual(plan.targets, ["panda"]);
});

test("a scope that selects nothing explains itself", () => {
  const plan = autopilotTargets(policy({ scope: "unsourced" }), [gap("lion")]);
  assert.deepEqual(plan.targets, []);
  assert.match(plan.reason, /already has a sourced model/);
  assert.match(autopilotTargets(policy({ scope: "weak", minScore: 10 }), [gap("lion", { bestScore: 90 })]).reason, /below 10/);
});

test("a round is summarised in one line a human can read", () => {
  assert.equal(roundSummary(null), "no round has run yet");
  assert.match(roundSummary(roundResultFromJson({ slugs: [], note: "the auto-pilot is switched off" })), /switched off/);
  const summary = roundSummary(roundResultFromJson({ slugs: ["lion", "panda"], downloaded: 1, refused: 1, failed: 0 }));
  assert.match(summary, /^2 asked for \(lion, panda\): 1 downloaded, 1 refused by the budget, 0 failed/);
});

test("comparing a secret does not leak where it differs", () => {
  assert.equal(constantTimeEquals("secret-value", "secret-value"), true);
  assert.equal(constantTimeEquals("secret-value", "secret-valuf"), false, "same length, last character");
  assert.equal(constantTimeEquals("secret", "secret-value"), false, "different lengths");
  assert.equal(constantTimeEquals("", ""), true);
  assert.equal(constantTimeEquals("", "x"), false);
  const source = readFileSync(join(ROOT, "lib", "autopilot.ts"), "utf8");
  const body = source.slice(source.indexOf("export function constantTimeEquals"), source.indexOf("export const CRON_PATH"));
  assert.ok(!/return false/.test(body), "the comparison must not return early: that is the leak");
  assert.match(body, /\^/, "lengths are mixed into the result rather than compared");
});

test("the cron endpoint refuses to run without a secret", () => {
  assert.match(cronAuthorised(null, null).reason, /CRON_SECRET is not set/);
  assert.match(cronAuthorised("Bearer x", null).reason, /CRON_SECRET is not set/, "an unset secret is never 'open'");
  assert.match(cronAuthorised(null, "s").reason, /expected an Authorization/);
  assert.match(cronAuthorised("Bearer wrong", "right").reason, /does not match/);
  assert.deepEqual(cronAuthorised("Bearer right", "right"), { ok: true, reason: null });
  assert.equal(CRON_PATH, "/api/cron/models");
});

test("the cadence is written the way a person says it", () => {
  assert.equal(cadenceLabel(15), "every 15 minutes");
  assert.equal(cadenceLabel(60), "every hour");
  assert.equal(cadenceLabel(360), "every 6 hours");
  assert.equal(cadenceLabel(1440), "every day");
  assert.equal(cadenceLabel(2880), "every 2 days");
});

/* ------------------------------------------------------------------- the SQL */

test("the database and the module agree on what a scope means", () => {
  for (const scope of AUTOPILOT_SCOPES) {
    assert.ok(schema.includes("'" + scope + "'"), "schema.sql knows the scope " + scope);
  }
  assert.match(schema, /scope\s+text not null default 'weak' check \(scope in \('unsourced', 'weak', 'named'\)\)/);
  assert.match(schema, /alter table public\.model_autopilot alter column scope\s+set default 'weak'/);
  assert.match(schema, /alter table public\.model_autopilot alter column min_score set default 75/);
});

test("the database clamps what the module clamps", () => {
  assert.match(schema, /cadence_minutes\s+integer not null default 360 check \(cadence_minutes between 5 and 10080\)/);
  assert.match(schema, /per_run\s+integer not null default 1 check \(per_run between 1 and 5\)/);
  assert.match(schema, /min_score\s+integer not null default 75 check \(min_score between 0 and 100\)/);
  assert.match(schema, /constraint model_autopilot_singleton check \(id = 'default'\)/);
  assert.match(schema, /scope <> 'named' or coalesce\(array_length\(slugs, 1\), 0\) > 0/);
});

test("the database picks the same species the module picks", () => {
  const fn = schema.slice(schema.indexOf("create or replace function public.start_autopilot_round"));
  const body = fn.slice(0, fn.indexOf("comment on function public.start_autopilot_round"));

  assert.match(body, /when 'named' then a\.slug = any \(aut\.slugs\)/, "named is the listed slugs");
  assert.match(body, /when 'weak'\s+then coalesce\(b\.score, -1\) < aut\.min_score/, "no model at all is the weakest case");
  assert.match(body, /else coalesce\(b\.assets, 0\) = 0/, "unsourced is 'no model_assets row'");
  assert.match(body, /left join best b on b\.animal_id = a\.id/, "the gap is measured against model_assets");
  assert.match(body, /order by a\.popularity desc nulls last, a\.slug/, "the same ordering the panel shows");
  assert.match(body, /limit aut\.per_run/, "the per-run limit is the database's, not the caller's");
});

test("a species already in an open order is skipped by the database too", () => {
  const fn = schema.slice(schema.indexOf("create or replace function public.start_autopilot_round"));
  assert.match(fn, /open_slugs as \([\s\S]{0,200}?status in \('queued', 'running'\)/);
  assert.match(fn, /not exists \(select 1 from open_slugs o where o\.slug = a\.slug\)/);
  assert.match(fn, /select count\(\*\) into open_count[\s\S]{0,160}?status in \('queued', 'running'\)/);
});

test("one round at a time, across processes", () => {
  const fn = schema.slice(schema.indexOf("create or replace function public.start_autopilot_round"));
  assert.match(fn, /perform pg_advisory_xact_lock\(hashtext\('kami3d:model_autopilot'\)\)/);
  assert.match(fn, /for update/);
  assert.match(schema.slice(schema.indexOf("create or replace function public.finish_autopilot_round")), /pg_advisory_xact_lock\(hashtext\('kami3d:model_autopilot'\)\)/);
});

test("the auto-pilot queues an order and cannot download anything itself", () => {
  const fn = schema.slice(schema.indexOf("create or replace function public.start_autopilot_round"));
  const body = fn.slice(0, fn.indexOf("comment on function public.start_autopilot_round"));

  assert.match(body, /insert into public\.model_source_orders \(created_by, status, providers, slugs, requested, note\)/);
  assert.match(body, /'auto-pilot'/);
  assert.ok(!/reserve_model_download|model_download_log|model_assets\s+insert/i.test(body), "no download, no budget spend, no record of an asset: only a queued order");
  assert.ok(!/update public\.model_download_policy/.test(body), "the auto-pilot never touches the budget it has to live inside");
  assert.match(body, /if not aut\.enabled and not p_force then/, "off means off unless an admin forces one round");
});

test("the auto-pilot is off, and empty, until an admin turns it on", () => {
  assert.match(schema, /insert into public\.model_autopilot \(id\) values \('default'\) on conflict \(id\) do nothing/);
  assert.match(schema, /enabled\s+boolean not null default false/);
  assert.match(schema, /alter table public\.model_autopilot enable row level security/);
  assert.match(schema, /create policy "model_autopilot_admin_read" on public\.model_autopilot\s+for select to authenticated using \(public\.is_admin\(\)\)/);
  assert.match(schema, /revoke all on public\.model_autopilot from anon, authenticated/);
  assert.match(schema, /revoke all on function public\.start_autopilot_round\(text, boolean, text\[\]\) from anon, authenticated/);
});

test("the providers a round may use are the ones the policy allows", () => {
  const fn = schema.slice(schema.indexOf("create or replace function public.start_autopilot_round"));
  assert.match(fn, /p_providers text\[\] default null/, "the app says which providers it has keys for");
  assert.match(fn, /where provider = any \(pol\.providers_allowed\)/, "and the policy says which of those may be used");
  assert.match(fn, /insert into public\.model_source_orders \(created_by, status, providers, slugs, requested, note\)[\s\S]{0,120}?values \(p_actor, 'queued', chosen/);
  assert.match(schema, /drop function if exists public\.start_autopilot_round\(text, boolean\);/, "the old signature must not stay callable");
});

test("an unattended order is held to a stricter standard than a hand-made one", () => {
  const worker = readFileSync(join(ROOT, "scripts", "model-orders.mjs"), "utf8");
  const cli = readFileSync(join(ROOT, "scripts", "fetch-models.mjs"), "utf8");

  assert.match(worker, /const unattended = order\.note === "auto-pilot"/);
  assert.match(worker, /if \(unattended\) \{[\s\S]{0,220}?argv\.push\("--strict-match"\)/);
  assert.match(worker, /argv\.push\(\"--min-score=" \+ minScore\)/);
  assert.match(worker, /model_autopilot\?select=min_score/, "the threshold is the admin's, read from the database");

  assert.match(cli, /minScore: 0/, "a hand-run keeps no floor");
  assert.match(cli, /arg\.startsWith\("--min-score="\)/);
  assert.match(cli, /entry\.score >= flags\.minScore/, "the floor is applied to the ranking, not printed and ignored");
});

test("the gap report is what the panel prints, and it counts assets, not intentions", () => {
  const fn = schema.slice(schema.indexOf("create or replace function public.model_gap_report"));
  assert.match(fn, /from public\.model_assets/);
  assert.match(fn, /'hasAsset', coalesce\(b\.assets, 0\) > 0/);
  assert.match(fn, /'bestScore', b\.score/);
  assert.match(fn, /'popularity', a\.popularity/);
  assert.match(fn, /security definer/);
  assert.match(schema, /revoke all on function public\.model_gap_report\(\) from anon, authenticated/);
});
