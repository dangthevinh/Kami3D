#!/usr/bin/env node
/**
 * Seeds the timeline annotations from `data/range-events.json`.
 *
 *   npm run events:seed      # upsert every event
 *   npm run events:status    # what the database holds
 *
 * The file is the source of truth and the table is a copy, like every other dataset here.
 * Each entry is our own summary of a cited source: the annotation text is ours (CC0), the
 * source is a link, and the licence of the *source page* never has to travel with it - which
 * is exactly why annotations can exist where digitised historical ranges cannot.
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const EVENTS_FILE = join(ROOT, "data", "range-events.json");

function supabaseConfig() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "";
  return { url, key, ready: Boolean(url && key) };
}

async function rest(supabase, path, init = {}) {
  const response = await fetch(`${supabase.url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: supabase.key,
      authorization: `Bearer ${supabase.key}`,
      "content-type": "application/json",
      prefer: "resolution=merge-duplicates,return=minimal",
      ...(init.headers ?? {}),
    },
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) throw new Error(`${init.method ?? "GET"} ${path} failed: ${response.status} ${await response.text()}`);
  return response.status === 204 ? null : response.json().catch(() => null);
}

async function loadEnvFiles() {
  for (const name of [".env.local", ".env"]) {
    const file = join(ROOT, name);
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const separator = trimmed.indexOf("=");
      if (separator === -1) continue;
      const key = trimmed.slice(0, separator).trim();
      let value = trimmed.slice(separator + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
      if (!process.env[key]) process.env[key] = value;
    }
  }
}

function readEvents() {
  if (!existsSync(EVENTS_FILE)) throw new Error("data/range-events.json is missing");
  const parsed = JSON.parse(readFileSync(EVENTS_FILE, "utf8"));
  if (!Array.isArray(parsed.events)) throw new Error("data/range-events.json has no events array");

  const problems = [];
  for (const event of parsed.events) {
    if (!Number.isInteger(event.year)) problems.push(`${event.title}: year is not an integer`);
    if (!event.sourceUrl?.startsWith("http")) problems.push(`${event.title}: no source URL`);
    if (!event.summary || event.summary.length < 40) problems.push(`${event.title}: summary too short to be useful`);
  }
  if (problems.length > 0) throw new Error(`refusing to seed: ${problems.slice(0, 4).join("; ")}`);

  return parsed;
}

async function main() {
  await loadEnvFiles();
  const supabase = supabaseConfig();

  if (!supabase.ready) {
    console.error("Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (see README).");
    process.exitCode = 2;
    return;
  }

  const parsed = readEvents();

  if (process.argv.includes("--status")) {
    const rows = await rest(supabase, "range_events?select=year,kind");
    console.log(`${rows.length} event(s) in public.range_events`);
    const byKind = rows.reduce((counts, row) => {
      counts[row.kind] = (counts[row.kind] ?? 0) + 1;
      return counts;
    }, {});
    for (const [kind, count] of Object.entries(byKind).sort()) console.log(`  ${kind.padEnd(12)} ${count}`);
    return;
  }

  const animals = await rest(supabase, "animals?select=id,slug");
  const idBySlug = new Map(animals.map((animal) => [animal.slug, animal.id]));
  const slugs = [...new Set(parsed.events.map((event) => event.slug).filter(Boolean))];
  const missing = slugs.filter((slug) => !idBySlug.has(slug));
  if (missing.length > 0) throw new Error(`no animals row for: ${missing.join(", ")} - run "npm run db:seed" first`);

  const rows = parsed.events.map((event) => ({
    animal_id: event.slug ? idBySlug.get(event.slug) : null,
    year: event.year,
    title: event.title,
    summary: event.summary,
    kind: event.kind ?? "event",
    location: event.lat != null && event.lng != null ? { type: "Point", coordinates: [event.lng, event.lat] } : null,
    source: event.source,
    source_url: event.sourceUrl,
    license: "CC0",
    attribution: parsed.attribution,
  }));

  await rest(supabase, "range_events?on_conflict=year,title", { method: "POST", body: JSON.stringify(rows) });
  console.log(`Wrote ${rows.length} event(s) to public.range_events.`);
}

await main();
