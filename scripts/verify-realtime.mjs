#!/usr/bin/env node
/**
 * Proves the realtime half of D7 end to end, without a browser.
 *
 *   node scripts/verify-realtime.mjs
 *
 * What it does, in order: subscribes to the same Supabase Realtime channel and table the page
 * subscribes to - with the **anonymous** key, exactly as a visitor would - then runs the simulator,
 * and waits for the inserts to arrive. It also confirms that the anonymous key cannot write a
 * position, because a pipeline where the reader can also write is a pipeline that cannot be trusted
 * with anything real.
 *
 * It needs the network and a seeded project, so it is deliberately **not** part of `check:suites`.
 */

import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { createClient } from "@supabase/supabase-js";

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
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.error("Needs NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  process.exit(2);
}

const received = [];
let subscribed = false;
const client = createClient(url, anonKey, { auth: { persistSession: false } });

const channel = client
  .channel("fleet-positions")
  .on("postgres_changes", { event: "INSERT", schema: "public", table: "vehicle_positions" }, (payload) => {
    received.push(payload.new);
  })
  .subscribe((status) => {
    if (status === "SUBSCRIBED") subscribed = true;
    console.log("realtime status: " + status);
  });

const deadline = Date.now() + 45_000;
while (!subscribed && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 200));
if (!subscribed) {
  console.error("FAIL: the channel never subscribed - is Realtime enabled for the project?");
  await client.removeChannel(channel);
  process.exit(1);
}

console.log("subscribed as anon; running the simulator…");
await new Promise((resolve, reject) => {
  const child = spawn(process.execPath, [join(ROOT, "scripts", "simulate-fleet.mjs"), "--once"], { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"] });
  let out = "";
  child.stdout.on("data", (chunk) => (out += chunk));
  child.stderr.on("data", (chunk) => (out += chunk));
  child.on("exit", (code) => (code === 0 ? resolve(out.trim().split("\n").pop()) : reject(new Error(out.slice(0, 300)))));
});

while (received.length < 6 && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 200));

const newest = received[received.length - 1];
console.log("received " + received.length + " insert event(s)");
if (newest) {
  console.log(
    "newest: " + newest.vehicle_id + " at " + newest.at + " (" + newest.lng + ", " + newest.lat + ") source=" + newest.source,
  );
}

// The reader must not be able to write.
const attempt = await fetch(url + "/rest/v1/vehicle_positions", {
  method: "POST",
  headers: { apikey: anonKey, authorization: "Bearer " + anonKey, "content-type": "application/json" },
  body: JSON.stringify({ vehicle_id: "verify-write", lng: 106.7, lat: 10.7 }),
});
console.log("anon insert attempt: HTTP " + attempt.status + (attempt.ok ? " (WRONG - it succeeded)" : " (refused, as designed)"));

await client.removeChannel(channel);

const ok = received.length >= 6 && !attempt.ok && received.every((row) => row.synthetic === true && row.source === "Kami3D synthetic");
console.log(ok ? "PASS: the stream works and only the simulator can write to it." : "FAIL: see the lines above.");
process.exit(ok ? 0 : 1);
