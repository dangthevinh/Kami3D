#!/usr/bin/env node
/**
 * Proves the whole P0.1 chain end to end: Clerk → Supabase third-party auth → RLS.
 *
 *   node scripts/verify-clerk-rls.mjs
 *
 * It is the only check that needs a **real** Clerk token, which is why it is not in `check:suites` and
 * why it is explicit about what it does: it creates a short-lived session for the admin account through
 * the Clerk Backend API, mints the token from the `supabase` JWT template, presents it to PostgREST,
 * and then deletes the session it created. Nothing is left behind, and no personal data is read.
 *
 * Three things are being tested, and the third is the one that matters:
 *
 *   1. Supabase validates a Clerk-issued JWT at all (a wrong issuer or a stale JWKS fails here);
 *   2. `public.current_user_id()` resolves Clerk's `sub`, so the owner policies have an owner;
 *   3. **the policy refuses to let that user write a row belonging to somebody else** - which is the
 *      difference between RLS enforcing ownership and the application remembering a filter.
 *
 * Environment: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, CLERK_SECRET_KEY,
 * CLERK_SUPABASE_JWT_TEMPLATE (default `supabase`), VERIFY_CLERK_USER_ID (default: the admin user).
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
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
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const clerkKey = process.env.CLERK_SECRET_KEY;
const template = (process.env.CLERK_SUPABASE_JWT_TEMPLATE || "supabase").trim();
const userId = process.env.VERIFY_CLERK_USER_ID || "user_3Ja1siqFIUisqvpNzeflv0tkkA6";

if (!url || !anon || !clerkKey) {
  console.error("Needs NEXT_PUBLIC_SUPABASE_URL, the anonymous key and CLERK_SECRET_KEY.");
  process.exit(2);
}

const problems = [];
const clerk = (path, init = {}) =>
  fetch("https://api.clerk.com/v1" + path, {
    ...init,
    headers: { authorization: "Bearer " + clerkKey, "content-type": "application/json", ...(init.headers ?? {}) },
  });

let sessionId = null;

try {
  const created = await clerk("/sessions", { method: "POST", body: JSON.stringify({ user_id: userId }) });
  const session = await created.json();
  sessionId = session.id;
  if (!sessionId) throw new Error("no session: " + JSON.stringify(session).slice(0, 200));

  const minted = await clerk(`/sessions/${sessionId}/tokens/${template}`, { method: "POST" });
  const { jwt } = await minted.json();
  if (!jwt) {
    console.error(`The Clerk account has no JWT template called "${template}". Create it with the claim { "role": "authenticated" }.`);
    process.exit(1);
  }

  const claims = JSON.parse(Buffer.from(jwt.split(".")[1], "base64url").toString("utf8"));
  console.log("clerk token: iss=" + claims.iss + " sub=" + claims.sub + " role=" + claims.role);
  if (claims.role !== "authenticated") problems.push("the template must claim role=authenticated, or Postgres sees an anonymous role");
  if (claims.sub !== userId) problems.push("the token's subject is not the user it was minted for");

  const asUser = (path, init = {}) =>
    fetch(url + path, {
      ...init,
      headers: {
        apikey: anon,
        authorization: "Bearer " + jwt,
        "content-type": "application/json",
        ...(init.headers ?? {}),
      },
    });

  // 1. Supabase accepts the token: an authenticated role can list its own rows rather than being refused.
  const read = await asUser("/rest/v1/user_favorites?select=animal_id&limit=1");
  const readBody = (await read.text()).slice(0, 120);
  const readOk = read.status === 200;
  console.log(`${readOk ? "ok  " : "FAIL"} a Clerk token is accepted by PostgREST: HTTP ${read.status} ${readBody}`);
  if (!readOk) problems.push(`PostgREST answered ${read.status} to a Clerk token: ${readBody}`);

  // 2. The identity helper resolves the Clerk subject, so an owner policy has an owner: this insert
  //    carries the token's own subject and must be allowed.
  const animalResponse = await fetch(url + "/rest/v1/animals?select=id&limit=1", { headers: { apikey: anon } });
  const animalId = (await animalResponse.json())[0]?.id;
  if (!animalId) throw new Error("no animal to favourite");

  const own = await asUser("/rest/v1/user_favorites", {
    method: "POST",
    headers: { prefer: "return=minimal" },
    body: JSON.stringify({ user_id: userId, animal_id: animalId }),
  });
  const ownOk = own.status === 201 || own.status === 204;
  console.log(`${ownOk ? "ok  " : "FAIL"} writing a row for its own subject is allowed: HTTP ${own.status}`);
  if (!ownOk) problems.push(`the owner's own insert was refused with ${own.status}`);

  // 3. And it cannot write a row for somebody else — the test that separates RLS from an application filter.
  const foreign = await asUser("/rest/v1/user_favorites", {
    method: "POST",
    headers: { prefer: "return=minimal" },
    body: JSON.stringify({ user_id: "user_somebody_else", animal_id: animalId }),
  });
  const foreignOk = foreign.status === 401 || foreign.status === 403;
  console.log(`${foreignOk ? "ok  " : "FAIL"} writing a row for another user is refused: HTTP ${foreign.status}`);
  if (!foreignOk) problems.push(`impersonation was accepted with ${foreign.status}`);

  // Clean up the row this check created, with the same token.
  await asUser(`/rest/v1/user_favorites?user_id=eq.${encodeURIComponent(userId)}&animal_id=eq.${animalId}`, { method: "DELETE" });
} catch (error) {
  problems.push(error.message);
} finally {
  if (sessionId) {
    // The session this check created is revoked, not left active: a verification script must not
    // quietly leave a live session on somebody's account.
    const removed = await clerk(`/sessions/${sessionId}/revoke`, { method: "POST" });
    console.log("session revoked:", removed.status);
  }
}

if (problems.length > 0) {
  console.error("\nFAIL");
  for (const problem of problems) console.error("  - " + problem);
  process.exitCode = 1;
} else {
  console.log("\nPASS: Supabase trusts Clerk, the helper resolves the Clerk subject, and RLS refuses impersonation.");
}
