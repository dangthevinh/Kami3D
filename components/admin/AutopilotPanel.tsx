"use client";

import { Bot, Loader2, Play, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  AUTOPILOT_LIMITS,
  cadenceLabel,
  roundSummary,
  SCOPE_LABELS,
  type AutopilotPolicy,
  type AutopilotRoundResult,
  type AutopilotScope,
  type TargetPlan,
} from "@/lib/autopilot";

/**
 * The auto-pilot switch (Phase 21).
 *
 * Two things this panel is careful about, because both are the point of the phase:
 *
 *   1. **It shows the decision, not just the switch.** "Would this run right now?" is answered from
 *      the same rules the database applies, so an admin sees "7 species are below 75" or "nothing is
 *      missing" *before* switching anything on, and the answer comes with the species' names.
 *   2. **Run now reports what happened.** The round runs in the server process and comes back with
 *      the order's counts and the worker's own output — the difference between telling someone a
 *      download started and telling them what it downloaded.
 *
 * Nothing here can widen what a download is allowed to be: the licence allow-list, the per-model cap
 * and the counters live in `public.reserve_model_download()`, which every model still passes through.
 */

interface RoundReport extends AutopilotRoundResult {
  ok: boolean;
  started: boolean;
  reason: string | null;
  pending: boolean;
  output: string | null;
  tookMs: number;
}

async function post(body: unknown): Promise<RoundReport & { policy?: AutopilotPolicy | null; error?: string }> {
  const response = await fetch("/api/admin/models/autopilot", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error((data && (data.error || data.reason)) || "HTTP " + response.status);
  return data;
}

const input =
  "mt-1 w-full rounded-lg bg-white/6 px-3 py-2 text-sm text-white ring-1 ring-white/12 outline-none focus:ring-neon/50";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] font-medium uppercase tracking-wide text-white/45">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-[10px] leading-relaxed text-white/35">{hint}</span> : null}
    </label>
  );
}

export function AutopilotPanel({
  policy,
  plan,
  scopeCounts,
  cronReady,
}: {
  policy: AutopilotPolicy | null;
  plan: TargetPlan;
  /** How many species each scope would select, so the choice is informed rather than guessed. */
  scopeCounts: Record<AutopilotScope, number>;
  cronReady: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState<null | "configure" | "run" | "enqueue">(null);
  const [message, setMessage] = React.useState<string | null>(null);
  const [report, setReport] = React.useState<RoundReport | null>(null);
  const [state, setState] = React.useState({
    enabled: policy?.enabled ?? false,
    cadenceMinutes: policy?.cadenceMinutes ?? AUTOPILOT_LIMITS.defaultCadenceMinutes,
    perRun: policy?.perRun ?? AUTOPILOT_LIMITS.defaultPerRun,
    scope: policy?.scope ?? ("weak" as AutopilotScope),
    minScore: policy?.minScore ?? AUTOPILOT_LIMITS.defaultMinScore,
    slugs: (policy?.slugs ?? []).join(", "),
  });

  if (!policy) {
    return (
      <p className="text-sm text-white/55">
        No auto-pilot row in the database: run <code className="text-white/80">npm run db:schema</code> to apply the
        Phase 21 schema.
      </p>
    );
  }

  async function send(action: "configure" | "run" | "enqueue") {
    setBusy(action);
    setMessage(null);
    try {
      const body =
        action === "configure"
          ? {
              action,
              enabled: state.enabled,
              cadenceMinutes: state.cadenceMinutes,
              perRun: state.perRun,
              scope: state.scope,
              minScore: state.minScore,
              slugs: state.slugs.split(",").map((slug) => slug.trim()).filter(Boolean),
            }
          : { action };

      const data = await post(body);
      if (action === "configure") {
        setMessage(state.enabled ? "Saved. The server's clock will run a round when it is due." : "Saved: the auto-pilot is off.");
      } else {
        setReport(data);
        setMessage(
          data.started
            ? data.pending
              ? "The order is still running; its progress is in the orders table."
              : "Round finished: " + roundSummary(data)
            : "No round ran: " + (data.reason ?? "no reason given"),
        );
      }
      router.refresh();
    } catch (error) {
      setMessage("Failed: " + (error as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setState((current) => ({ ...current, enabled: !current.enabled }))}
          aria-pressed={state.enabled}
          className={
            "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition " +
            (state.enabled ? "bg-neon/15 text-neon ring-neon/40" : "bg-white/5 text-white/55 ring-white/12")
          }
        >
          <Bot className="size-3.5" aria-hidden />
          {state.enabled ? "Auto-pilot is ON" : "Auto-pilot is OFF"}
        </button>
        <span className="text-xs text-white/45">
          {state.enabled
            ? "A round runs " + cadenceLabel(state.cadenceMinutes).replace("every ", "every ") + (policy.nextRunAt ? ", next at " + policy.nextRunAt.slice(0, 16).replace("T", " ") + " UTC" : "")
            : "Nothing is fetched until you switch this on."}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Field label="Every" hint="the shortest is 5 minutes, the longest a week">
          <select
            className={input}
            value={state.cadenceMinutes}
            onChange={(event) => setState({ ...state, cadenceMinutes: Number(event.target.value) })}
          >
            {[15, 60, 360, 720, 1440, 10080].map((minutes) => (
              <option key={minutes} value={minutes} className="bg-night">
                {cadenceLabel(minutes)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Models per round" hint="each one is a download and a child process">
          <input
            className={input}
            type="number"
            min={AUTOPILOT_LIMITS.minPerRun}
            max={AUTOPILOT_LIMITS.maxPerRun}
            value={state.perRun}
            onChange={(event) => setState({ ...state, perRun: Number(event.target.value) })}
          />
        </Field>
        <Field label="Score floor" hint="only with the 'weak' scope: below this, a model is worth replacing">
          <input
            className={input}
            type="number"
            min={AUTOPILOT_LIMITS.minScoreFloor}
            max={AUTOPILOT_LIMITS.minScoreCeiling}
            value={state.minScore}
            onChange={(event) => setState({ ...state, minScore: Number(event.target.value) })}
          />
        </Field>
        <Field label="Scope" hint={SCOPE_LABELS[state.scope]}>
          <select
            className={input}
            value={state.scope}
            onChange={(event) => setState({ ...state, scope: event.target.value as AutopilotScope })}
          >
            {(Object.keys(SCOPE_LABELS) as AutopilotScope[]).map((scope) => (
              <option key={scope} value={scope} className="bg-night">
                {scope} ({scopeCounts[scope]})
              </option>
            ))}
          </select>
        </Field>
      </div>

      {state.scope === "named" ? (
        <Field label="Species" hint="comma-separated slugs, e.g. weddell-seal, gooty-tarantula">
          <input
            className={input}
            value={state.slugs}
            onChange={(event) => setState({ ...state, slugs: event.target.value })}
            placeholder="lion, bengal-tiger"
          />
        </Field>
      ) : null}

      <div className="rounded-xl bg-white/4 p-3 ring-1 ring-white/10">
        <p className="text-[11px] font-medium uppercase tracking-wide text-white/45">The next round would ask for</p>
        {plan.targets.length > 0 ? (
          <p className="mt-1 text-sm text-white/80">
            {plan.targets.join(", ")}
            {plan.deferred.length > 0 ? <span className="text-white/45"> — then {plan.deferred.length} more in later rounds</span> : null}
          </p>
        ) : (
          <p className="mt-1 text-sm text-white/55">
            nothing{plan.reason ? " — " + plan.reason : ""}
            {state.scope === "weak" ? <span className="text-white/40"> (lower the score floor to widen it)</span> : null}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => send("configure")}>
          {busy === "configure" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Save className="size-4" aria-hidden />}
          Save
        </Button>
        <Button size="sm" disabled={busy !== null} onClick={() => send("run")}>
          {busy === "run" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Play className="size-4" aria-hidden />}
          Run one round now
        </Button>
        <Button size="sm" variant="ghost" disabled={busy !== null} onClick={() => send("enqueue")}>
          Queue only
        </Button>
      </div>

      {message ? <p className="text-xs leading-relaxed text-white/65">{message}</p> : null}

      <div className="rounded-xl bg-white/4 p-3 text-xs text-white/60 ring-1 ring-white/10">
        <p className="text-[11px] font-medium uppercase tracking-wide text-white/45">Last round recorded in the database</p>
        <p className="mt-1">{roundSummary(policy.lastResult)}</p>
        {policy.lastRunAt ? <p className="mt-1 text-white/40">ran {policy.lastRunAt.slice(0, 16).replace("T", " ")} UTC, by {policy.updatedBy ?? "unknown"}</p> : null}
        {policy.lastResult?.note ? <p className="mt-1 text-amber-200/80">{policy.lastResult.note}</p> : null}
        <p className="mt-2 text-white/40">
          The clock lives in the server process, so it only ticks while this app is running.{" "}
          {cronReady
            ? "A scheduler outside can call /api/cron/models with the CRON_SECRET header for the same round."
            : "Set CRON_SECRET to let a scheduler outside drive the same round (/api/cron/models)."}
        </p>
      </div>

      {report ? (
        <div className="rounded-xl bg-black/40 p-3 ring-1 ring-white/10">
          <p className="text-[11px] font-medium uppercase tracking-wide text-white/45">
            This run{report.orderId ? " — order " + report.orderId.slice(0, 8) : ""} ({Math.round(report.tookMs / 1000)}s)
          </p>
          <p className="mt-1 text-xs text-white/70">
            {report.downloaded} downloaded, {report.refused} refused by the budget, {report.failed} failed or skipped
            {report.status ? " — status " + report.status : ""}
            {report.pending ? " (still running)" : ""}
          </p>
          {report.output ? (
            <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-[11px] leading-relaxed text-white/50">
              {report.output}
            </pre>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
