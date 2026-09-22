/**
 * Checks for the identity and row level security layer — the code half of P0.1.
 *
 * The policies themselves live in `supabase/schema.sql` and are asserted here as text, because there
 * is no Postgres in CI. The decision about *which* client a visitor's rows go through is a pure
 * function and is driven directly, including the case that matters most: Clerk configured but the
 * third-party auth prerequisite missing, where the fallback must be the service role and must be
 * visible rather than silent.
 *
 * Run with: npm run check:rls
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import {
  CLERK_SUPABASE_TEMPLATE_ENV,
  DEFAULT_CLERK_SUPABASE_TEMPLATE,
  SESSION_TOKEN_MARKER,
  clerkSupabaseTemplate,
  templateKind,
  personalDataMode,
  rlsIsEnforcing,
} from "../lib/personal-data-mode.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const schema = readFileSync(join(root, "supabase", "schema.sql"), "utf8");
const personalData = readFileSync(join(root, "lib", "personal-data.ts"), "utf8");

test("the client a visitor's rows go through is decided once, and RLS enforces in two of three cases", () => {
  assert.equal(personalDataMode({ provider: "none" }), null, "Demo Mode has no identity and no table");
  assert.equal(rlsIsEnforcing(null), false);

  assert.equal(personalDataMode({ provider: "supabase" }), "supabase-session");
  assert.equal(rlsIsEnforcing("supabase-session"), true, "Supabase Auth carries a JWT RLS understands");

  assert.equal(personalDataMode({ provider: "clerk", template: "supabase" }), "clerk-token");
  assert.equal(rlsIsEnforcing("clerk-token"), true, "third-party auth makes Clerk a JWT Supabase trusts");

  assert.equal(personalDataMode({ provider: "clerk", template: null }), "service-role");
  assert.equal(personalDataMode({ provider: "clerk", template: "   " }), "service-role");
  assert.equal(rlsIsEnforcing("service-role"), false, "and that is the case P0.1 exists to remove");
});

test("a template name is configuration, and a blank one is not a template", () => {
  assert.equal(clerkSupabaseTemplate("supabase"), "supabase");
  assert.equal(clerkSupabaseTemplate("  supabase  "), "supabase");
  assert.equal(clerkSupabaseTemplate(""), null);
  assert.equal(clerkSupabaseTemplate(undefined), null);
  assert.equal(clerkSupabaseTemplate(null), null);
  assert.equal(DEFAULT_CLERK_SUPABASE_TEMPLATE, "supabase");
  assert.equal(CLERK_SUPABASE_TEMPLATE_ENV, "CLERK_SUPABASE_JWT_TEMPLATE");

  // The marker for the modern path: Clerk's "Connect with Supabase" customizes the **session** token
  // rather than a JWT template, so this value must be read as "no template, use the session token".
  assert.equal(SESSION_TOKEN_MARKER, "session");
  assert.equal(clerkSupabaseTemplate(SESSION_TOKEN_MARKER), "session");
  assert.equal(personalDataMode({ provider: "clerk", template: SESSION_TOKEN_MARKER }), "clerk-token");

  // Three shapes arrive in .env files, and telling them apart is the difference between a working
  // integration and a 401 nobody can explain.
  assert.equal(templateKind("session"), "session");
  assert.equal(templateKind("supabase"), "name");
  assert.equal(templateKind("jtmp_3JgfQXdRJrtFEmJZ7eRi6hfDdnH"), "id");
  assert.equal(templateKind("  jtmp_abc123  "), "id");
  assert.equal(templateKind(""), null);
  assert.equal(templateKind(undefined), null);
  assert.equal(templateKind("jtmp-abc"), "name", "an id-shaped value with the wrong separator is a name");
});

test("the identity helper speaks both providers", () => {
  assert.ok(/create or replace function public\.current_user_id\(\)/.test(schema), "the helper is missing");
  assert.ok(schema.includes("(select auth.uid())::text"), "it must still answer Supabase Auth");
  assert.ok(/auth\.jwt\(\)\) ->> 'sub'/.test(schema), "and Clerk's subject claim");
  assert.ok(/revoke all on function public\.current_user_id\(\) from public/.test(schema));
});

test("every personal table has row level security on and no anonymous write path", () => {
  for (const table of ["animals", "user_favorites", "quiz_scores", "sound_assets"]) {
    // The file aligns its column of `enable row level security` statements, so the gap between the
    // table name and the keyword is whitespace, not a single space.
    assert.ok(
      new RegExp(`alter table public\\.${table}\\s+enable row level security`).test(schema),
      `${table} has row level security off`,
    );
  }

  // The anonymous key must not be able to write anything a visitor owns.
  for (const table of ["user_favorites", "quiz_scores"]) {
    assert.ok(new RegExp(`revoke all on public\\.${table} from anon`).test(schema), `${table} still grants anon`);
    assert.ok(
      !new RegExp(`on public\\.${table} for (insert|update|delete)[\\s\\S]{0,80}?to anon`).test(schema),
      `${table} hands a write policy to anon`,
    );
  }

  assert.ok(/revoke update on public\.animals from anon, authenticated/.test(schema), "the catalogue is writable");
  assert.ok(!/on public\.animals for (insert|update|delete)/.test(schema), "the catalogue must only be written by the seed");
});

test("ownership policies ask the identity helper, never a client-supplied id", () => {
  for (const table of ["user_favorites", "quiz_scores"]) {
    const block = schema.slice(schema.indexOf(`on public.${table} for select`));
    const policy = block.slice(0, 260);
    assert.ok(policy.includes("public.current_user_id()"), `${table}'s read policy does not use the verified identity`);
    assert.ok(!/user_id\s*=\s*'/.test(policy), `${table} compares against a literal`);
  }

  // Admin rights are a row in a table read through the same helper, and empty means nobody.
  assert.ok(/create or replace function public\.is_admin\(\)/.test(schema));
  assert.ok(/from public\.app_admins a\s*\n\s*where a\.user_id = public\.current_user_id\(\)/.test(schema));
});

test("the Clerk token path exists, is per-request, and cannot silently become the service role", () => {
  assert.ok(personalData.includes("getClerkTokenClient"), "there is no Clerk token client");
  assert.ok(/accessToken: async \(\)/.test(personalData), "the token must be minted per request");
  assert.ok(
    /getToken\(\{ template: resolved \}\)/.test(personalData),
    "and minted from the configured JWT template, not a hand-rolled claim",
  );
  assert.ok(
    /resolved === SESSION_TOKEN_MARKER \? await getToken\(\)/.test(personalData),
    "the session-token path - what Clerk's Connect with Supabase sets up - must be honoured too",
  );
  assert.ok(
    /templateKind\(template\) === "id"/.test(personalData) && /resolveTemplateName/.test(personalData),
    "a template id from the dashboard must be resolved to its name, not passed through",
  );
  assert.ok(/return null;/.test(personalData), "a token that cannot be minted must come back empty, not as the admin");
  assert.ok(
    /mode === "service-role"\) return getSupabaseAdmin\(\)/.test(personalData),
    "the documented fallback must stay explicit",
  );
  assert.ok(
    !/clerk-token"\) return getSupabaseAdmin/.test(personalData),
    "the Clerk path must not quietly hand back the service role",
  );
});

test("every route that touches a visitor's rows goes through that one decision", () => {
  for (const route of ["app/api/favorites/route.ts", "app/api/quiz/route.ts"]) {
    const source = readFileSync(join(root, route), "utf8");
    assert.ok(source.includes("getPersonalDataClient"), route + " builds its own Supabase client");
    assert.ok(!source.includes("getSupabaseAdmin"), route + " reaches for the service role directly");
  }
});
