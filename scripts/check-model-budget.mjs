/**
 * Assertions for the download budget and the provider registry.
 *
 * Phase 18B lets an admin order models from a list of free providers, and puts a budget on it. Three
 * properties are worth a test rather than a promise:
 *
 *   1. **The UI and the database agree, and where they could disagree the database wins.**
 *      \`evaluateBudget\` exists so the console can grey out a button and say why without a round trip.
 *      It must therefore never allow something \`public.reserve_model_download()\` would refuse — the
 *      direction of the disagreement is fixed and is asserted here.
 *   2. **A missing number is a refusal, not a benefit of the doubt.** No policy, no usage, no size:
 *      each one refuses, because otherwise the budget can be spent by making the counters unreadable.
 *   3. **The registry and the implementations describe the same providers.** The console reads
 *      data/model-providers.json and the CLI owns the code; drift between them would show an admin a
 *      provider that does not exist, or hide one that does.
 *
 * Run with: npm run check:model-budget
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import {
  ALLOWED_LICENSES,
  evaluateBudget,
  planBatch,
  policyFromJson,
  usageFromJson,
  utcDayKey,
  utcMonthKey,
} from "../lib/model-budget.ts";

const providerData = JSON.parse(readFileSync(join(process.cwd(), "data", "model-providers.json"), "utf8"));
const MODEL_PROVIDERS = providerData.providers;
const REFUSED_MODEL_PROVIDERS = providerData.refused;
const { PROVIDERS, PROVIDER_REGISTRY, REFUSED_PROVIDERS } = await import("../scripts/fetch-models.mjs");

const policy = {
  enabled: true,
  maxPerDay: 5,
  maxPerMonth: 40,
  maxTotal: 400,
  maxBytesTotal: 100 * 1_048_576,
  maxBytesPerModel: 12 * 1_048_576,
  providersAllowed: ["khronos", "nasa"],
  requireApproval: true,
};

const usage = { today: 0, thisMonth: 0, total: 0, bytesTotal: 0 };
const candidate = { provider: "khronos", bytes: 1_000_000, license: "CC0" };

const decide = (patch = {}) =>
  evaluateBudget({
    policy: patch.policy === undefined ? policy : patch.policy,
    usage: patch.usage === undefined ? usage : patch.usage,
    candidate: patch.candidate === undefined ? candidate : patch.candidate,
    approved: patch.approved === undefined ? true : patch.approved,
  });

test("a good candidate inside the budget is allowed, and the remaining room is reported", () => {
  const decision = decide();
  assert.equal(decision.allowed, true);
  assert.equal(decision.reason, null);
  assert.equal(decision.remainingToday, 5);
  assert.equal(decision.remainingTotal, 400);
});

test("missing numbers refuse rather than pass", () => {
  assert.equal(decide({ policy: null }).allowed, false, "no policy means no download");
  assert.equal(decide({ usage: null }).allowed, false, "an unreadable log means no download");
  assert.match(decide({ usage: null }).reason, /unknown/);
  assert.equal(decide({ candidate: { provider: "khronos", bytes: null, license: "CC0" } }).allowed, false);
  assert.equal(decide({ candidate: { provider: "khronos", bytes: 0, license: "CC0" } }).allowed, false);
});

test("each quota refuses on its own, with a reason an operator can act on", () => {
  assert.match(decide({ policy: { ...policy, enabled: false } }).reason, /switched off/);
  assert.match(decide({ approved: false }).reason, /approval/);
  assert.match(decide({ candidate: { ...candidate, provider: "thingiverse" } }).reason, /providers_allowed/);
  assert.match(decide({ candidate: { ...candidate, license: "CC-BY-NC" } }).reason, /allow-list/);
  assert.match(decide({ candidate: { ...candidate, license: null } }).reason, /allow-list/);
  assert.match(decide({ candidate: { ...candidate, bytes: 20 * 1_048_576 } }).reason, /per-model cap/);
  assert.match(decide({ usage: { ...usage, today: 5 } }).reason, /daily budget/);
  assert.match(decide({ usage: { ...usage, thisMonth: 40 } }).reason, /monthly budget/);
  assert.match(decide({ usage: { ...usage, total: 400 } }).reason, /total budget/);
  assert.match(
    decide({ usage: { ...usage, bytesTotal: 100 * 1_048_576 } }).reason,
    /storage budget/,
    "a full storage budget refuses even when the slot counts are free",
  );
});

test("the allow-list is the one the database checks", () => {
  assert.deepEqual([...ALLOWED_LICENSES], ["CC0", "CC-BY"], "mirrors the CHECK in model_assets");
  for (const licence of ["CC-BY-NC", "CC-BY-ND", "CC-BY-NC-SA", "", "Standard"]) {
    assert.equal(decide({ candidate: { ...candidate, license: licence } }).allowed, false, licence + " must be refused");
  }
  assert.equal(decide({ candidate: { ...candidate, license: "CC-BY" } }).allowed, true);
});

test("a batch is trimmed to the budget, not hoped at", () => {
  assert.equal(planBatch(decide(), 3), 3);
  assert.equal(planBatch(decide({ usage: { ...usage, today: 3 } }), 5), 2, "only the day's remainder");
  assert.equal(planBatch(decide({ usage: { ...usage, total: 398 } }), 5), 2, "and the lifetime remainder");
  assert.equal(planBatch(decide({ usage: { ...usage, today: 5 } }), 5), 0, "an exhausted budget plans nothing");
});

test("the day and month boundaries are UTC, because the SQL counts in UTC", () => {
  // 23:30 UTC on the last day of a month is still that month, in every timezone the operator is in.
  const boundary = new Date("2026-03-31T23:30:00Z");
  assert.equal(utcDayKey(boundary), "2026-03-31");
  assert.equal(utcMonthKey(boundary), "2026-03");

  const after = new Date("2026-04-01T00:30:00Z");
  assert.equal(utcDayKey(after), "2026-04-01");
  assert.equal(utcMonthKey(after), "2026-04");
});

test("the policy and usage readers refuse a partial row", () => {
  assert.equal(policyFromJson(null), null);
  assert.equal(policyFromJson({ enabled: true }), null, "a policy missing its quotas is no policy");
  assert.equal(usageFromJson({ today: 1, thisMonth: 1 }), null, "a usage missing a counter is unknown");

  const parsed = policyFromJson({
    enabled: true,
    max_per_day: 5,
    max_per_month: 40,
    max_total: 400,
    max_bytes_total: 100,
    max_bytes_per_model: 12,
    providers_allowed: ["khronos", 7, "nasa"],
    require_approval: true,
  });
  assert.deepEqual(parsed.providersAllowed, ["khronos", "nasa"], "only strings survive");
});

test("the console's registry and the CLI's implementations are the same providers", () => {
  const fromJson = MODEL_PROVIDERS.map((entry) => entry.id).sort();
  const fromCli = PROVIDER_REGISTRY.map((entry) => entry.id).sort();
  assert.deepEqual(fromJson, fromCli, "data/model-providers.json must describe exactly the implemented providers");
  assert.deepEqual(Object.keys(PROVIDERS).sort(), fromCli, "every registered provider has an implementation");

  const refusedJson = REFUSED_MODEL_PROVIDERS.map((entry) => entry.id).sort();
  assert.deepEqual(refusedJson, REFUSED_PROVIDERS.map((entry) => entry.id).sort());
  assert.ok(
    REFUSED_PROVIDERS.every((entry) => typeof entry.reason === "string" && entry.reason.length > 10),
    "a refusal without a reason is an omission pretending to be a decision",
  );
});

test("every provider declares a licence the allow-list can accept", () => {
  for (const provider of MODEL_PROVIDERS) {
    const declared = provider.license;
    const acceptable =
      declared === "CC0" || declared === "CC-BY" || /per model|declared per entry/.test(declared);
    assert.ok(acceptable, provider.id + " declares " + declared + ", which is not an allow-listed or per-model licence");
    assert.equal(typeof provider.keyless, "boolean", provider.id + " must say whether it needs a token");
    if (!provider.keyless) {
      assert.match(provider.needsKey ?? "", /^[A-Z0-9_]+$/, provider.id + " must name the environment variable it needs");
    }
  }
  assert.ok(
    MODEL_PROVIDERS.some((provider) => provider.keyless),
    "at least one provider must work with no configuration, or a fresh clone cannot use this feature",
  );
});

test("the budget is enforced in one place, and both callers go through it", () => {
  const cli = readFileSync(join(process.cwd(), "scripts", "fetch-models.mjs"), "utf8");
  const order = cli.indexOf("reserveDownload({ candidate, licence, animal, flags })");
  const download = cli.indexOf("await provider.download(candidate, destination)");
  assert.ok(order > 0 && download > 0, "both calls must exist");
  assert.ok(order < download, "the reservation must come first: nothing is fetched before it is allowed");
  assert.ok(cli.includes('settleDownload(reservation.id, "downloaded"'), "a success settles the attempt");
  assert.ok(cli.includes('settleDownload(reservation.id, "failed"'), "and a failure hands the slot back");

  // No escape hatch: a flag that switched the budget off would make it a suggestion.
  assert.ok(!/--no-budget|--ignore-budget|--force-budget/.test(cli), "there is no flag that turns the budget off");

  const schema = readFileSync(join(process.cwd(), "supabase", "schema.sql"), "utf8");
  // `includes` rather than `match`: a failure here should name the missing line, not print the schema.
  assert.ok(
    schema.includes("create or replace function public.reserve_model_download("),
    "the decision function exists",
  );
  assert.ok(schema.includes("pg_advisory_xact_lock"), "and takes a lock, so two workers cannot both spend the last slot");
  assert.ok(
    /outcome\s+text not null check \(outcome in \('downloaded','refused','failed'\)\)/.test(schema),
    "the log's outcome is constrained",
  );
  assert.ok(schema.includes("p_license not in ('CC0', 'CC-BY')"), "the allow-list is repeated inside the database");
  assert.ok(
    schema.includes("alter table public.model_download_log    enable row level security"),
    "the log is behind RLS as well as behind the function",
  );
});
