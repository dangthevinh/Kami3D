"use client";

import { Check, Download, Loader2, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

import { Button } from "@/components/ui/button";
import type { ProviderRow } from "@/lib/model-sourcing";
import { cn } from "@/lib/utils";

/**
 * Search the provider catalogues, then download the model the admin picks.
 *
 * This is the half of the sourcing console that was missing: an order names a species and a provider and
 * lets the Phase 12 ranking choose the model, while this lets a person look at what is actually out there
 * — quality score, face count, size, the credit that would be published — and pick one.
 *
 * The button's state is the point. It is enabled only when \`public.reserve_model_download()\` would allow
 * that exact candidate (the route asks it per row), and when it is not, the row says why in the words the
 * database used: daily budget spent, licence not on the allow-list, over the per-model cap. A disabled
 * button with a reason is the honest version of a button that fails on click.
 */

interface Candidate {
  provider: string;
  providerId: string;
  title: string;
  author: string | null;
  authorUrl: string | null;
  sourceUrl: string | null;
  licenseLabel: string | null;
  licenseUrl: string | null;
  license: string | null;
  licenseVerdict: string;
  faceCount: number | null;
  bytes: number | null;
  sizeEstimated: boolean;
  quality: { total: number; summary: string };
  credit: string;
  matched: boolean;
  allowed: boolean;
  blockedReason: string | null;
}

const kb = (bytes: number | null) => (bytes ? (bytes / 1048576).toFixed(2) + " MB" : "—");

export function ModelSearch({
  providers,
  slugs,
}: {
  providers: ProviderRow[];
  /** Every species, so the download can be assigned to the one the admin means. */
  slugs: string[];
}) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [slug, setSlug] = React.useState(slugs[0] ?? "");
  const [chosen, setChosen] = React.useState<string[]>(
    providers.filter((provider) => provider.configured && provider.keyless).map((provider) => provider.id),
  );
  const [busy, setBusy] = React.useState(false);
  const [rows, setRows] = React.useState<Candidate[] | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);
  const [log, setLog] = React.useState<string | null>(null);
  const [working, setWorking] = React.useState<string | null>(null);

  const toggle = (id: string) =>
    setChosen((current) => (current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id]));

  async function search() {
    setBusy(true);
    setMessage(null);
    setLog(null);
    try {
      const response = await fetch("/api/admin/models/search", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: query || slug, slug, providers: chosen }),
      });
      const data = await response.json();
      if (!response.ok && !data?.candidates) throw new Error(data?.error ?? "HTTP " + response.status);
      setRows(data.candidates ?? []);
      if (data?.command) setMessage("The search could not run here. On this host, run: " + data.command);
      else if ((data.candidates ?? []).length === 0) setMessage("Nothing found for that query in the chosen providers.");
    } catch (error) {
      setRows(null);
      setMessage("Search failed: " + (error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function download(candidate: Candidate) {
    setWorking(candidate.provider + ":" + candidate.providerId);
    setLog(null);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/models/download", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          provider: candidate.provider,
          providerId: candidate.providerId,
          title: candidate.title,
          slug,
        }),
      });
      const data = await response.json();
      setLog(data.output ?? data.error ?? null);
      setMessage(
        data.ok
          ? "Downloaded and wired to " + slug + ". The species page shows it now."
          : "Nothing was downloaded" + (data.refused ? " — the budget refused it" : "") + ".",
      );
      router.refresh();
    } catch (error) {
      setMessage("Download failed: " + (error as Error).message);
    } finally {
      setWorking(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <label className="block">
          <span className="text-[11px] font-medium uppercase tracking-wide text-white/45">Search the catalogues</span>
          <input
            className="mt-1 w-full rounded-lg bg-white/6 px-3 py-2 text-sm text-white ring-1 ring-white/12 outline-none focus:ring-neon/50"
            placeholder="snow leopard, duck, whale skeleton…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void search();
            }}
          />
        </label>
        <div className="flex items-end gap-2">
          <label className="block">
            <span className="text-[11px] font-medium uppercase tracking-wide text-white/45">Assign to</span>
            <select
              className="mt-1 rounded-lg bg-white/6 px-3 py-2 text-sm text-white ring-1 ring-white/12 outline-none focus:ring-neon/50"
              value={slug}
              onChange={(event) => {
                setSlug(event.target.value);
                if (!query) setQuery(event.target.value.replace(/-/g, " "));
              }}
            >
              {slugs.map((entry) => (
                <option key={entry} value={entry} className="bg-void">
                  {entry}
                </option>
              ))}
            </select>
          </label>
          <Button type="button" size="sm" onClick={search} disabled={busy || chosen.length === 0}>
            {busy ? <Loader2 className="animate-spin" /> : <Search />}
            Search
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
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
              title={provider.configured ? "search " + provider.label : "no token configured"}
            >
              {provider.label}
            </button>
          );
        })}
      </div>

      {message ? <p className="text-xs text-white/55">{message}</p> : null}

      {rows && rows.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead className="text-[10px] uppercase tracking-wide text-white/40">
              <tr>
                <th className="py-2 pr-3">Score</th>
                <th className="py-2 pr-3">Model</th>
                <th className="py-2 pr-3">Provider</th>
                <th className="py-2 pr-3">Licence</th>
                <th className="py-2 pr-3">Faces</th>
                <th className="py-2 pr-3">Size</th>
                <th className="py-2 pr-3">Credit that would be published</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody className="text-white/70">
              {rows.map((candidate) => {
                const key = candidate.provider + ":" + candidate.providerId;
                return (
                  <tr key={key} className="border-t border-white/6 align-top">
                    <td className="py-2 pr-3 tabular-nums">
                      <span className="text-white/90">{candidate.quality.total}</span>
                      <span className="block text-[10px] text-white/35">{candidate.quality.summary}</span>
                    </td>
                    <td className="max-w-[220px] py-2 pr-3">
                      {candidate.sourceUrl ? (
                        <a
                          href={candidate.sourceUrl}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="text-white/85 underline decoration-white/20 underline-offset-2"
                        >
                          {candidate.title}
                        </a>
                      ) : (
                        candidate.title
                      )}
                      {candidate.matched ? null : <span className="ml-1 text-solar/70" title="the title does not name the species">?</span>}
                    </td>
                    <td className="py-2 pr-3">{candidate.provider}</td>
                    <td className="py-2 pr-3">
                      {candidate.license ? (
                        candidate.licenseUrl ? (
                          <a href={candidate.licenseUrl} target="_blank" rel="noreferrer noopener" className="underline decoration-white/20 underline-offset-2">
                            {candidate.licenseLabel ?? candidate.license}
                          </a>
                        ) : (
                          candidate.licenseLabel ?? candidate.license
                        )
                      ) : (
                        <span className="text-solar/80" title={candidate.licenseVerdict}>
                          refused
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-3 tabular-nums">{candidate.faceCount?.toLocaleString() ?? "—"}</td>
                    <td className="py-2 pr-3 tabular-nums">
                      {kb(candidate.bytes)}
                      {candidate.sizeEstimated ? <span className="block text-[10px] text-white/35">unknown until fetched</span> : null}
                    </td>
                    <td className="max-w-[260px] py-2 pr-3 text-white/45">{candidate.credit}</td>
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant={candidate.allowed ? "default" : "secondary"}
                          disabled={!candidate.allowed || working === key}
                          title={candidate.allowed ? "Download this model and assign it to " + slug : candidate.blockedReason ?? ""}
                          onClick={() => download(candidate)}
                        >
                          {working === key ? <Loader2 className="animate-spin" /> : candidate.allowed ? <Download /> : <X />}
                          {candidate.allowed ? "Download" : "Blocked"}
                        </Button>
                      </div>
                      {candidate.allowed ? null : (
                        <p className="mt-1 max-w-[200px] text-[10px] leading-relaxed text-solar/80">{candidate.blockedReason}</p>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      {log ? (
        <details className="rounded-lg bg-void/50 p-3 text-[11px] text-white/50 ring-1 ring-white/8">
          <summary className="cursor-pointer text-white/70">
            <Check className="mr-1 inline size-3" aria-hidden />
            What the pipeline did
          </summary>
          <pre className="mt-2 whitespace-pre-wrap font-mono">{log}</pre>
        </details>
      ) : null}
    </div>
  );
}
