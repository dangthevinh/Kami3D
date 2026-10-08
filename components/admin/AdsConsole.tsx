"use client";

import { Loader2, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PLANS } from "@/lib/payments/plans";
import { UNLOCK_METHODS } from "@/lib/unlock";
import { cn } from "@/lib/utils";

/**
 * The console for the two Phase 33 switches.
 *
 * Design rules, all of them about not lying to the person using it:
 *
 *   - an enabled position that draws nothing shows **why** (the reason comes from the server, where the
 *     same function the page uses decided it);
 *   - a save answers with the server's own sentence when it refuses, verbatim, rather than "failed";
 *   - the locked-content form refuses to guess: the content key is typed, and the server validates its
 *     shape, the methods and the plan, so this component does not carry a second copy of those rules.
 */

interface Placement {
  id: string;
  label: string | null;
  enabled: boolean;
  provider: string | null;
  slot_id: string | null;
  note: string | null;
}

interface LockedRow {
  content_id: string;
  label: string;
  kind: string;
  unlock_methods: string[];
  purchase_plan: string | null;
  ad_seconds: number;
  active: boolean;
  updated_at?: string;
}

export function AdsConsole({
  placements,
  catalogue,
  drawing,
  reasons,
  locks,
  adsenseConfigured,
}: {
  placements: Placement[];
  catalogue: { id: string; label: string; where: string }[];
  drawing: string[];
  reasons: { id: string; reason: string }[];
  locks: LockedRow[];
  adsenseConfigured: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState<string | null>(null);
  const [note, setNote] = React.useState<{ kind: "ok" | "bad"; text: string } | null>(null);

  const [drafts, setDrafts] = React.useState(() =>
    Object.fromEntries(
      placements.map((row) => [
        row.id,
        { enabled: row.enabled, provider: row.provider ?? "placeholder", slotId: row.slot_id ?? "" },
      ]),
    ),
  );

  const [form, setForm] = React.useState<{
    contentId: string;
    label: string;
    kind: string;
    ad: boolean;
    purchase: boolean;
    purchasePlan: string;
    adSeconds: number;
    active: boolean;
  }>({
    contentId: "",
    label: "",
    kind: "model",
    ad: true,
    purchase: false,
    purchasePlan: PLANS[0]?.id ?? "",
    adSeconds: 15,
    active: true,
  });

  async function post(url: string, body: Record<string, unknown>, tag: string) {
    setBusy(tag);
    setNote(null);
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setNote({ kind: "bad", text: payload?.error ?? "The server refused that (" + response.status + ")." });
        return false;
      }
      setNote({ kind: "ok", text: "Saved." });
      router.refresh();
      return true;
    } catch (thrown) {
      setNote({ kind: "bad", text: thrown instanceof Error ? thrown.message : "The request failed." });
      return false;
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-8">
      {note ? (
        <p
          role="status"
          className={cn(
            "rounded-xl px-3 py-2 text-xs ring-1",
            note.kind === "ok" ? "bg-neon/10 text-neon ring-neon/25" : "bg-solar/12 text-solar ring-solar/25",
          )}
        >
          {note.text}
        </p>
      ) : null}

      <section className="glass rounded-[var(--radius-card)] p-5">
        <h2 className="font-display text-lg font-semibold text-white">Ad positions</h2>
        <p className="mt-1 text-xs text-white/45">
          A position draws nothing until it is switched on here. {adsenseConfigured ? "AdSense is configured." : "NEXT_PUBLIC_ADSENSE_CLIENT is not set, so only the placeholder provider can render."}
        </p>

        <ul className="mt-4 space-y-4">
          {catalogue.map((entry) => {
            const draft = drafts[entry.id] ?? { enabled: false, provider: "placeholder", slotId: "" };
            const isDrawing = drawing.includes(entry.id);
            const reason = reasons.find((item) => item.id === entry.id)?.reason ?? null;

            return (
              <li key={entry.id} className="rounded-2xl bg-white/3 p-4 ring-1 ring-white/8">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-white">
                      {entry.label} <span className="font-mono text-[11px] text-white/35">{entry.id}</span>
                    </p>
                    <p className="mt-1 max-w-xl text-xs leading-relaxed text-white/45">{entry.where}</p>
                  </div>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[11px] ring-1",
                      isDrawing ? "bg-neon/12 text-neon ring-neon/25" : "bg-white/5 text-white/45 ring-white/10",
                    )}
                  >
                    {isDrawing ? "Drawing" : "Nothing drawn"}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap items-end gap-3">
                  <label className="flex items-center gap-2 text-xs text-white/60">
                    <input
                      type="checkbox"
                      checked={draft.enabled}
                      onChange={(event) => setDrafts({ ...drafts, [entry.id]: { ...draft, enabled: event.target.checked } })}
                    />
                    Enabled
                  </label>

                  <label className="text-xs text-white/60">
                    Provider
                    <select
                      className="ml-2 rounded-lg bg-void/60 px-2 py-1 text-xs text-white ring-1 ring-white/12"
                      value={draft.provider}
                      onChange={(event) => setDrafts({ ...drafts, [entry.id]: { ...draft, provider: event.target.value } })}
                    >
                      <option value="placeholder">placeholder</option>
                      <option value="adsense">adsense</option>
                      <option value="ezoic">ezoic</option>
                    </select>
                  </label>

                  <label className="text-xs text-white/60">
                    Ad unit id
                    <Input
                      className="ml-2 inline-block h-8 w-40 text-xs"
                      value={draft.slotId}
                      placeholder="1234567890"
                      onChange={(event) => setDrafts({ ...drafts, [entry.id]: { ...draft, slotId: event.target.value } })}
                    />
                  </label>

                  <Button
                    size="sm"
                    disabled={busy === "ad:" + entry.id}
                    onClick={() =>
                      void post(
                        "/api/admin/ads",
                        { id: entry.id, enabled: draft.enabled, provider: draft.provider, slotId: draft.slotId },
                        "ad:" + entry.id,
                      )
                    }
                  >
                    {busy === "ad:" + entry.id ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                    Save
                  </Button>
                </div>

                {reason ? <p className="mt-2 text-[11px] leading-relaxed text-solar">{reason}</p> : null}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="glass rounded-[var(--radius-card)] p-5">
        <h2 className="font-display text-lg font-semibold text-white">Locked content</h2>
        <p className="mt-1 text-xs text-white/45">
          Nothing is locked by default. A key looks like <code className="text-white/70">model:tyrannosaurus-rex</code>,{" "}
          <code className="text-white/70">chapter:&lt;uuid&gt;</code> or{" "}
          <code className="text-white/70">catalog-entry:space/uranus</code>.
        </p>

        {locks.length === 0 ? (
          <p className="mt-4 text-xs text-white/45">Nothing is locked right now, which is what a fresh deployment looks like.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[42rem] text-left text-xs">
              <thead className="text-white/45">
                <tr>
                  <th className="px-3 py-2 font-medium">Content</th>
                  <th className="px-3 py-2 font-medium">Kind</th>
                  <th className="px-3 py-2 font-medium">Ways out</th>
                  <th className="px-3 py-2 font-medium">Plan</th>
                  <th className="px-3 py-2 font-medium">Ad</th>
                  <th className="px-3 py-2 font-medium">Active</th>
                </tr>
              </thead>
              <tbody className="text-white/70">
                {locks.map((row) => (
                  <tr key={row.content_id} className="border-t border-white/10">
                    <td className="px-3 py-2">
                      <span className="font-mono text-[11px]">{row.content_id}</span>
                      <span className="block text-white/45">{row.label}</span>
                    </td>
                    <td className="px-3 py-2">{row.kind}</td>
                    <td className="px-3 py-2">{row.unlock_methods.join(" or ")}</td>
                    <td className="px-3 py-2 font-mono text-[11px]">{row.purchase_plan ?? "—"}</td>
                    <td className="px-3 py-2">{row.ad_seconds}s</td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        className={cn("rounded-full px-2.5 py-1 text-[11px] ring-1", row.active ? "bg-neon/12 text-neon ring-neon/25" : "bg-white/5 text-white/45 ring-white/10")}
                        disabled={busy === "lock:" + row.content_id}
                        onClick={() =>
                          void post(
                            "/api/admin/locked",
                            {
                              contentId: row.content_id,
                              label: row.label,
                              kind: row.kind,
                              methods: row.unlock_methods,
                              purchasePlan: row.purchase_plan,
                              adSeconds: row.ad_seconds,
                              active: !row.active,
                            },
                            "lock:" + row.content_id,
                          )
                        }
                      >
                        {row.active ? "locked" : "public"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-5 grid gap-3 rounded-2xl bg-white/3 p-4 ring-1 ring-white/8 sm:grid-cols-2">
          <label className="text-xs text-white/60">
            Content key
            <Input
              className="mt-1 h-9 text-xs"
              value={form.contentId}
              placeholder="model:tyrannosaurus-rex"
              onChange={(event) => setForm({ ...form, contentId: event.target.value })}
            />
          </label>
          <label className="text-xs text-white/60">
            Label
            <Input
              className="mt-1 h-9 text-xs"
              value={form.label}
              placeholder="Tyrannosaurus rex"
              onChange={(event) => setForm({ ...form, label: event.target.value })}
            />
          </label>

          <label className="text-xs text-white/60">
            Kind
            <select
              className="mt-1 block w-full rounded-lg bg-void/60 px-2 py-2 text-xs text-white ring-1 ring-white/12"
              value={form.kind}
              onChange={(event) => setForm({ ...form, kind: event.target.value })}
            >
              <option value="model">model</option>
              <option value="chapter">chapter</option>
              <option value="catalog-entry">catalog-entry</option>
            </select>
          </label>

          <label className="text-xs text-white/60">
            Ad length (seconds)
            <Input
              className="mt-1 h-9 text-xs"
              type="number"
              min={5}
              max={120}
              value={form.adSeconds}
              onChange={(event) => setForm({ ...form, adSeconds: Number(event.target.value) })}
            />
          </label>

          <div className="text-xs text-white/60">
            Ways out
            <div className="mt-1 flex gap-4">
              {UNLOCK_METHODS.map((method) => (
                <label key={method} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={method === "ad" ? form.ad : form.purchase}
                    onChange={(event) =>
                      setForm(method === "ad" ? { ...form, ad: event.target.checked } : { ...form, purchase: event.target.checked })
                    }
                  />
                  {method}
                </label>
              ))}
            </div>
          </div>

          <label className="text-xs text-white/60">
            Plan that unlocks it (needed when buying is one of the ways out)
            <select
              className="mt-1 block w-full rounded-lg bg-void/60 px-2 py-2 text-xs text-white ring-1 ring-white/12"
              value={form.purchasePlan}
              onChange={(event) => setForm({ ...form, purchasePlan: event.target.value })}
            >
              {PLANS.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name} — {plan.id}
                </option>
              ))}
            </select>
          </label>

          <div className="sm:col-span-2">
            <Button
              disabled={busy === "new-lock"}
              onClick={() =>
                void post(
                  "/api/admin/locked",
                  {
                    contentId: form.contentId,
                    label: form.label,
                    kind: form.kind,
                    methods: [...(form.ad ? ["ad"] : []), ...(form.purchase ? ["purchase"] : [])],
                    purchasePlan: form.purchase ? form.purchasePlan : null,
                    adSeconds: form.adSeconds,
                    active: true,
                  },
                  "new-lock",
                )
              }
            >
              {busy === "new-lock" ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Lock this content
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
