"use client";

import { Loader2, Play, Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

import { Button } from "@/components/ui/button";
import type { PolicyRow, ProviderRow } from "@/lib/model-sourcing";
import { cn } from "@/lib/utils";

/**
 * The console's forms.
 *
 * Everything here is a request: the policy is saved to the database, an order is queued in it, and
 * the run spawns the worker. None of the three can widen what a download is allowed to be — the
 * licence allow-list, the per-model cap and the counters live in \`public.reserve_model_download()\`,
 * which the CLI calls for every model — so this file is a control panel rather than an enforcer.
 */

async function post(url: string, body?: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error((data && data.error) || "HTTP " + response.status);
  return data;
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] font-medium uppercase tracking-wide text-white/45">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-[10px] leading-relaxed text-white/35">{hint}</span> : null}
    </label>
  );
}

const input =
  "mt-1 w-full rounded-lg bg-white/6 px-3 py-2 text-sm text-white ring-1 ring-white/12 outline-none focus:ring-neon/50";

export function PolicyForm({ policy, providers }: { policy: PolicyRow; providers: ProviderRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [state, setState] = React.useState({
    enabled: policy.enabled,
    requireApproval: policy.requireApproval,
    maxPerDay: policy.maxPerDay,
    maxPerMonth: policy.maxPerMonth,
    maxTotal: policy.maxTotal,
    maxBytesPerModelMb: Math.round(policy.maxBytesPerModel / 1_048_576),
    maxBytesTotalMb: Math.round(policy.maxBytesTotal / 1_048_576),
    providersAllowed: policy.providersAllowed,
  });

  const toggleProvider = (id: string) =>
    setState((current) => ({
      ...current,
      providersAllowed: current.providersAllowed.includes(id)
        ? current.providersAllowed.filter((entry) => entry !== id)
        : [...current.providersAllowed, id],
    }));

  async function save() {
    setBusy(true);
    setMessage(null);
    try {
      await post("/api/admin/models/policy", state);
      setMessage("Saved. The database enforces this from the next download onward.");
      router.refresh();
    } catch (error) {
      setMessage("Not saved: " + (error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Per day" hint="resets at 00:00 UTC, the same clock the SQL counts by">
          <input
            className={input}
            type="number"
            min={0}
            value={state.maxPerDay}
            onChange={(event) => setState({ ...state, maxPerDay: Number(event.target.value) })}
          />
        </Field>
        <Field label="Per month">
          <input
            className={input}
            type="number"
            min={0}
            value={state.maxPerMonth}
            onChange={(event) => setState({ ...state, maxPerMonth: Number(event.target.value) })}
          />
        </Field>
        <Field label="In total">
          <input
            className={input}
            type="number"
            min={0}
            value={state.maxTotal}
            onChange={(event) => setState({ ...state, maxTotal: Number(event.target.value) })}
          />
        </Field>
        <Field label="Max MB per model" hint="a model larger than this is refused before it is fetched">
          <input
            className={input}
            type="number"
            min={1}
            value={state.maxBytesPerModelMb}
            onChange={(event) => setState({ ...state, maxBytesPerModelMb: Number(event.target.value) })}
          />
        </Field>
        <Field label="Total MB budget">
          <input
            className={input}
            type="number"
            min={1}
            value={state.maxBytesTotalMb}
            onChange={(event) => setState({ ...state, maxBytesTotalMb: Number(event.target.value) })}
          />
        </Field>
        <div className="flex flex-col justify-end gap-2 text-xs">
          <label className="flex items-center gap-2 text-white/70">
            <input
              type="checkbox"
              checked={state.enabled}
              onChange={(event) => setState({ ...state, enabled: event.target.checked })}
            />
            downloading enabled
          </label>
          <label className="flex items-center gap-2 text-white/70">
            <input
              type="checkbox"
              checked={state.requireApproval}
              onChange={(event) => setState({ ...state, requireApproval: event.target.checked })}
            />
            require approval per model
          </label>
        </div>
      </div>

      <div>
        <p className="text-[11px] font-medium uppercase tracking-wide text-white/45">Providers allowed</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {providers.map((provider) => {
            const on = state.providersAllowed.includes(provider.id);
            return (
              <button
                key={provider.id}
                type="button"
                onClick={() => toggleProvider(provider.id)}
                aria-pressed={on}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs ring-1 transition-colors",
                  on ? "bg-neon/15 text-white ring-neon/40" : "bg-white/5 text-white/50 ring-white/10 hover:text-white",
                )}
              >
                {provider.label}
                {provider.keyless ? " · keyless" : provider.configured ? "" : " · no token"}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" size="sm" onClick={save} disabled={busy}>
          {busy ? <Loader2 className="animate-spin" /> : <Save />}
          Save budget
        </Button>
        {message ? <span className="text-xs text-white/55">{message}</span> : null}
      </div>
    </div>
  );
}

export function OrderForm({ providers, slugs, remainingToday }: { providers: ProviderRow[]; slugs: string[]; remainingToday: number }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [requested, setRequested] = React.useState(Math.max(1, Math.min(remainingToday, 3)));
  const [named, setNamed] = React.useState("");
  const [chosen, setChosen] = React.useState<string[]>(providers.filter((p) => p.keyless).map((p) => p.id));
  const [note, setNote] = React.useState("");

  const toggle = (id: string) =>
    setChosen((current) => (current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id]));

  async function submit(run: boolean) {
    setBusy(true);
    setMessage(null);
    try {
      const order = await post("/api/admin/models/orders", {
        requested,
        providers: chosen,
        slugs: named
          .split(/[,\s]+/)
          .map((slug) => slug.trim())
          .filter(Boolean),
        note,
      });
      if (run) {
        const started = await post("/api/admin/models/run");
        setMessage(
          started?.started
            ? "Order queued and the worker started. This page refreshes as it fills in."
            : "Order queued. This runtime cannot start the worker: run " + (started?.command ?? "npm run models:work"),
        );
      } else {
        setMessage("Order queued. Run the worker when you are ready: npm run models:work");
      }
      if (order?.note) setMessage((current) => (current ? current + " " + order.note : order.note));
      router.refresh();
    } catch (error) {
      setMessage("Not queued: " + (error as Error).message);
    } finally {
      setBusy(false);
      router.refresh();
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="How many models" hint={"the budget allows " + remainingToday + " more today"}>
          <input
            className={input}
            type="number"
            min={1}
            max={200}
            value={requested}
            onChange={(event) => setRequested(Number(event.target.value))}
          />
        </Field>
        <Field
          label="Species (optional)"
          hint="leave empty to fill every species that has no model; name species to fetch or replace one of them"
        >
          <input
            className={input}
            placeholder={slugs.slice(0, 3).join(", ")}
            value={named}
            onChange={(event) => setNamed(event.target.value)}
          />
        </Field>
      </div>

      <div>
        <p className="text-[11px] font-medium uppercase tracking-wide text-white/45">Fetch from</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {providers.map((provider) => {
            const on = chosen.includes(provider.id);
            return (
              <button
                key={provider.id}
                type="button"
                onClick={() => toggle(provider.id)}
                aria-pressed={on}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs ring-1 transition-colors",
                  on ? "bg-neon/15 text-white ring-neon/40" : "bg-white/5 text-white/50 ring-white/10 hover:text-white",
                  provider.configured ? "" : "opacity-50",
                )}
                title={provider.configured ? provider.note : "no token configured, so this provider is off"}
              >
                {provider.label}
              </button>
            );
          })}
        </div>
      </div>

      <Field label="Note (optional)">
        <input className={input} value={note} onChange={(event) => setNote(event.target.value)} maxLength={280} />
      </Field>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" size="sm" onClick={() => submit(true)} disabled={busy || chosen.length === 0}>
          {busy ? <Loader2 className="animate-spin" /> : <Play />}
          Order and run now
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={() => submit(false)} disabled={busy || chosen.length === 0}>
          Queue only
        </Button>
        {message ? <span className="text-xs text-white/55">{message}</span> : null}
      </div>
    </div>
  );
}

export function CancelOrderButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await post("/api/admin/models/orders/" + id);
        } finally {
          setBusy(false);
          router.refresh();
        }
      }}
      title="Cancel a queued order"
    >
      <Trash2 className="size-3.5" />
    </Button>
  );
}
