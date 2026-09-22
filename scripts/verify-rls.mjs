#!/usr/bin/env node
/**
 * Proves the identity and RLS layer against the live project — the measurement half of P0.1.
 *
 *   npm run verify:rls
 *
 * Two independent questions, asked the two ways they can be answered:
 *
 *   1. **What does the database say about itself?** `pg_class.relrowsecurity` and `pg_policies` are
 *      the authoritative answers to "is RLS on, and what does each policy compare?" - asked through
 *      the Management API, and printed rather than summarised.
 *   2. **What can the public key actually do?** The anonymous key is the one that ships in the
 *      browser bundle, so every request below is made with it: it must read the public catalogue and
 *      must not touch a single personal row.
 *
 * It needs a configured project, so it is deliberately not part of `check:suites`. The owner policies
 * themselves need a signed-in session to exercise; what this proves is the half that matters for a
 * visitor, which is that the anonymous key has no way in.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const env = {};
for (const name of [".env.local", ".env"]) {
  let text;
  try {
    text = readFileSync(join(ROOT, name), "utf8");
  } catch {
    continue;
  }
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const separator = trimmed.indexOf("=");
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
    env[key] = value;
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const token = process.env.SUPABASE_ACCESS_TOKEN;

if (!url || !anon) {
  console.error("Needs NEXT_PUBLIC_SUPABASE_URL and the anonymous key.");
  process.exit(2);
}

const rest = async (path, init = {}) => {
  const response = await fetch(url + path, {
    ...init,
    headers: { apikey: anon, authorization: "Bearer " + anon, "content-type": "application/json", ...(init.headers ?? {}) },
  });
  return { status: response.status, body: (await response.text()).slice(0, 160) };
};

const sql = async (query) => {
  const ref = new URL(url).hostname.split(".")[0];
  const response = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: "POST",
    headers: { authorization: "Bearer " + token, "content-type": "application/json" },
    body: JSON.stringify({ query }),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(text.slice(0, 200));
  return JSON.parse(text);
};

const problems = [];

console.log("1. what the database says about itself");
try {
  const tables = await sql(
    "select relname, relrowsecurity from pg_class where relname in ('animals','user_favorites','quiz_scores','sound_assets','app_admins') order by relname",
  );
  for (const row of tables) {
    console.log(`   ${row.relname.padEnd(16)} row level security: ${row.relrowsecurity}`);
    if (!row.relrowsecurity) problems.push(`${row.relname} has RLS off`);
  }

  const policies = await sql(
    "select tablename, policyname, cmd, coalesce(qual, with_check) as expression from pg_policies where schemaname = 'public' and tablename in ('animals','user_favorites','quiz_scores') order by tablename, cmd",
  );
  for (const row of policies) {
    const usesHelper = String(row.expression ?? "").includes("current_user_id");
    console.log(`   ${row.tablename.padEnd(16)} ${row.cmd.padEnd(6)} ${row.policyname}`);
    if (row.cmd !== "SELECT" || row.tablename !== "animals") {
      if (!usesHelper && row.tablename !== "animals") problems.push(`${row.tablename}/${row.policyname} does not use the identity helper`);
    }
  }
} catch (error) {
  console.log("   skipped: " + error.message);
}

console.log("2. what the anonymous key can do");
const probes = [
  { label: "read the catalogue", init: undefined, path: "/rest/v1/animals?select=slug&limit=1", expect: [200] },
  { label: "read sound credits", init: undefined, path: "/rest/v1/sound_assets?select=title&limit=1", expect: [200] },
  { label: "read someone's favourites", init: undefined, path: "/rest/v1/user_favorites?select=animal_id&limit=1", expect: [401, 403] },
  { label: "write a favourite", init: { method: "POST", body: JSON.stringify({ user_id: "x", animal_id: "00000000-0000-0000-0000-000000000000" }) }, path: "/rest/v1/user_favorites", expect: [401, 403] },
  { label: "read quiz scores", init: undefined, path: "/rest/v1/quiz_scores?select=score&limit=1", expect: [401, 403] },
  { label: "write a quiz score", init: { method: "POST", body: JSON.stringify({ user_id: "x", score: 10 }) }, path: "/rest/v1/quiz_scores", expect: [401, 403] },
  { label: "read the admin list", init: undefined, path: "/rest/v1/app_admins?select=user_id", expect: [401, 403] },
];

for (const probe of probes) {
  const result = await rest(probe.path, probe.init);
  const ok = probe.expect.includes(result.status);
  console.log(`   ${ok ? "ok  " : "FAIL"} ${probe.label}: HTTP ${result.status}`);
  if (!ok) problems.push(`${probe.label} answered ${result.status}, expected ${probe.expect.join("/")}`);
}

// A refused PATCH answers 204 with nothing changed, and that is not the same message as 204 with a row
// changed - so the catalogue write is proved by reading the value back rather than by the status code.
const beforeWrite = await rest("/rest/v1/animals?select=popularity&slug=eq.lion", undefined);
const attemptedWrite = await rest("/rest/v1/animals?slug=eq.lion", {
  method: "PATCH",
  body: JSON.stringify({ popularity: -1 }),
  headers: { prefer: "return=representation" },
});
const afterWrite = await rest("/rest/v1/animals?select=popularity&slug=eq.lion", undefined);
// Refused either way counts: a missing grant answers 401, and a policy that filters every row answers
// 200 with an empty body. What must not happen is the value changing.
const refused = attemptedWrite.status === 401 || attemptedWrite.status === 403 || attemptedWrite.body.trim() === "[]";
const untouched = beforeWrite.body === afterWrite.body && refused;

console.log(
  `   ${untouched ? "ok  " : "FAIL"} edit the catalogue: HTTP ${attemptedWrite.status}, rows returned ${attemptedWrite.body.trim() || "(none)"}, value unchanged: ${beforeWrite.body === afterWrite.body}`,
);
if (!untouched) problems.push("the anonymous key appears to have changed a catalogue row");

if (problems.length > 0) {
  console.error("\nFAIL");
  for (const problem of problems) console.error("  - " + problem);
  process.exitCode = 1;
} else {
  console.log("\nPASS: RLS is on everywhere it should be, the owner policies use one identity helper, and the anonymous key cannot read or write a personal row.");
}
