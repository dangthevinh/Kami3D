import "server-only";

import type { ChildProcess, spawn as SpawnFunction } from "node:child_process";

import { roundResultFromJson, type AutopilotRoundResult } from "@/lib/autopilot";
import { providersWithAvailability } from "@/lib/model-sourcing";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * One round of the auto-pilot, start to finish.
 *
 * The whole of "automatic" is in this file, and it is deliberately small, because the tempting
 * version - a second, in-process downloader that skips the CLI - is exactly the fork this project
 * refuses to make. A round does three things:
 *
 *   1. asks the database (`start_autopilot_round`) whether a round is owed and which species it
 *      covers: the decision, the clock and the queue are all one transaction, so a scheduler, a cron
 *      endpoint and a button pressed at the same second can only ever produce one order;
 *   2. runs `scripts/model-orders.mjs --order=<id> --upload` - the same worker `npm run models:work`
 *      runs, with `--upload` being the "put it on Kami3D" half: the file goes to Supabase Storage,
 *      a `model_assets` row records its licence and credit, and `animals.model_url` is pointed at
 *      the public URL, so the species page serves the new model without a rebuild;
 *   3. writes the result back (`finish_autopilot_round`), so the panel shows what happened rather
 *      than that something was attempted.
 *
 * What it cannot do: skip the budget. The order is an ordinary row, and every model in it still
 * passes `reserve_model_download()`.
 */

export type AutopilotTrigger = "panel" | "cron" | "scheduler";

export interface AutopilotRunReport extends AutopilotRoundResult {
  ok: boolean;
  started: boolean;
  reason: string | null;
  /** True when the worker was still running when the caller's patience ran out. */
  pending: boolean;
  /** The worker's own output, trimmed - the panel prints it, so it is not swallowed. */
  output: string | null;
  tookMs: number;
}

const WORKER = "scripts/model-orders.mjs";
const OUTPUT_LIMIT = 4_000;

function tail(text: string, limit = OUTPUT_LIMIT): string {
  const trimmed = text.trim();
  return trimmed.length <= limit ? trimmed : "…" + trimmed.slice(trimmed.length - limit);
}

/**
 * Load `spawn` at call time, with the specifier left alone by the bundler.
 *
 * `instrumentation.ts` is bundled for **both** runtimes - this project has a middleware, so Next
 * compiles a copy for the edge as well - and the edge build cannot resolve `node:child_process` at
 * all. A static import here therefore fails the production build (measured: CI, "Reading from
 * \"node:child_process\" is not handled by plugins"), even though the code that uses it only ever
 * runs under `nodejs`. A type-only import above is erased, and this one is fetched when a round
 * actually needs to start a process - which on an edge runtime never happens, and is answered
 * honestly when it does.
 */
async function loadSpawn(): Promise<typeof SpawnFunction | null> {
  try {
    const specifier = "node:child_process";
    const module = (await import(/* webpackIgnore: true */ specifier)) as { spawn: typeof SpawnFunction };
    return module.spawn;
  } catch {
    return null;
  }
}

/**
 * Run the worker and wait for it, but not forever.
 *
 * A download batch can take minutes; a request cannot. So the wait is bounded by the caller (the
 * panel waits longer than a cron endpoint) and a worker that outlives it is *left running*: killing
 * a download halfway would leave a half-written file, and the order row already carries the truth.
 */
async function waitForWorker(orderId: string, waitMs: number): Promise<{ finished: boolean; output: string; spawnError: string | null }> {
  const spawn = await loadSpawn();
  if (!spawn) {
    return { finished: false, output: "", spawnError: "this runtime has no child processes" };
  }

  return new Promise((resolve) => {
    let output = "";
    let settled = false;
    const finish = (value: { finished: boolean; output: string; spawnError: string | null }) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(value);
    };

    let child: ChildProcess;
    try {
      child = spawn(process.execPath, [WORKER, "--order=" + orderId, "--upload"], {
        cwd: process.cwd(),
        env: process.env,
        stdio: ["ignore", "pipe", "pipe"],
      });
    } catch (error) {
      // A host without child processes (or without the repository) says so, and names the command.
      resolve({ finished: false, output: "", spawnError: String(error).split("\n")[0] });
      return;
    }

    const timer = setTimeout(() => finish({ finished: false, output, spawnError: null }), Math.max(5_000, waitMs));

    child.stdout?.on("data", (chunk: Buffer) => {
      output += chunk.toString();
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      output += chunk.toString();
    });
    child.on("error", (error) => finish({ finished: false, output, spawnError: String(error.message) }));
    child.on("close", () => finish({ finished: true, output, spawnError: null }));
  });
}

export async function runAutopilotRound(options: {
  actor: string;
  trigger: AutopilotTrigger;
  force?: boolean;
  waitMs?: number;
  /** Queue the order and return: the panel's "add to the queue" without waiting for a download. */
  enqueueOnly?: boolean;
}): Promise<AutopilotRunReport> {
  const started = Date.now();
  const empty = (extra: Partial<AutopilotRunReport>): AutopilotRunReport => ({
    ok: false,
    started: false,
    reason: null,
    pending: false,
    output: null,
    orderId: null,
    slugs: [],
    downloaded: 0,
    refused: 0,
    failed: 0,
    status: null,
    trigger: options.trigger,
    at: new Date().toISOString(),
    note: null,
    tookMs: Date.now() - started,
    ...extra,
  });

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return empty({ reason: "the auto-pilot needs Supabase: the queue and the budget both live in the database" });
  }

  // The providers this deployment can actually reach. The database keeps the last word - it drops
  // anything the policy does not allow - but a round that asked for a provider with no key would
  // spend its budget on nothing.
  const reachable = providersWithAvailability()
    .filter((provider) => provider.configured)
    .map((provider) => provider.id);

  const claimed = await supabase.rpc("start_autopilot_round", {
    p_actor: options.actor,
    p_force: options.force === true,
    p_providers: reachable,
  });

  if (claimed.error) return empty({ reason: "the database refused to start a round: " + claimed.error.message });

  const decision = (claimed.data ?? {}) as Record<string, unknown>;
  if (decision.started !== true) {
    return empty({ reason: typeof decision.reason === "string" ? decision.reason : "no round was started" });
  }

  const orderId = typeof decision.orderId === "string" ? decision.orderId : null;
  const slugs = Array.isArray(decision.slugs) ? decision.slugs.filter((slug): slug is string => typeof slug === "string") : [];
  const providers = Array.isArray(decision.providers)
    ? decision.providers.filter((provider): provider is string => typeof provider === "string")
    : [];

  if (!orderId) return empty({ ok: true, started: true, slugs, reason: "the round started but queued no order" });
  if (options.enqueueOnly) {
    return empty({ ok: true, started: true, orderId, slugs, status: "queued", reason: null, output: "queued; run the worker or leave it to the auto-pilot" });
  }

  const worker = await waitForWorker(orderId, options.waitMs ?? 120_000);

  // The order row is the record, so it is read rather than parsed out of the worker's chatter.
  const { data: orderRow } = await supabase
    .from("model_source_orders")
    .select("status,downloaded,refused,failed,last_error")
    .eq("id", orderId)
    .maybeSingle();

  const row = (orderRow ?? {}) as Record<string, unknown>;
  const via = providers.length > 0 ? " via " + providers.join(", ") : " via the worker's keyless default";
  const note = worker.spawnError
    ? "this host cannot start the worker (" + worker.spawnError + "); run: npm run models:work -- --order=" + orderId
    : worker.finished
      ? null
      : "the worker is still running" + via + "; the order will finish on its own";

  const result: AutopilotRoundResult = {
    orderId,
    slugs,
    downloaded: Number(row.downloaded ?? 0),
    refused: Number(row.refused ?? 0),
    failed: Number(row.failed ?? 0),
    status: typeof row.status === "string" ? row.status : worker.finished ? null : "running",
    trigger: options.trigger,
    at: new Date().toISOString(),
    note,
  };

  const written = await supabase.rpc("finish_autopilot_round", { p_result: result });

  return {
    ...result,
    ok: !written.error,
    started: true,
    reason: written.error ? "the round finished but its report could not be stored: " + written.error.message : null,
    pending: !worker.finished,
    output: tail(worker.output) || null,
    tookMs: Date.now() - started,
  };
}

/** The last round, as stored, for a page that renders before any round has run in this process. */
export function lastRoundFrom(value: unknown): AutopilotRoundResult | null {
  return roundResultFromJson(value);
}
