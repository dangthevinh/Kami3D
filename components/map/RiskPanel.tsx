"use client";

import { AlertTriangle } from "lucide-react";
import * as React from "react";

import { RISK_BANDS, RISK_WEIGHTS, type RiskBreakdown } from "@/lib/risk";
import { cn } from "@/lib/utils";

/**
 * The risk index, shown with its inputs.
 *
 * Two things this panel refuses to do: present the score as an IUCN assessment, and hide
 * which inputs went into it. The band legend, the weights and the list of missing inputs are
 * all on screen, because a single number between "Endangered" and "how much of the range is
 * urban" invites exactly the wrong reading.
 */

const PART_LABELS: Record<string, string> = {
  status: "IUCN status",
  range: "Range size",
  threat: "Threat overlap",
  trend: "Observation trend",
};

const PART_NOTES: Record<string, string> = {
  status: "The category the catalogue carries.",
  range: "Smaller ranges score higher. Today this is a demo envelope.",
  threat: "Share of the range an urban area overlaps, measured with ST_Intersects.",
  trend: "Recent GBIF records against earlier ones - effort-dependent.",
};

export interface RiskRow {
  slug: string;
  name: string;
  breakdown: RiskBreakdown;
}

export function RiskLegend({ className }: { className?: string }) {
  return (
    <div className={cn("glass rounded-[var(--radius-card)] p-4", className)}>
      <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">
        <AlertTriangle className="size-3.5 text-solar" aria-hidden />
        Risk index
      </h2>

      <ul className="mt-3 space-y-1.5">
        {RISK_BANDS.map((band) => (
          <li key={band.id} className="flex items-center gap-2 text-[11px]">
            <span aria-hidden className="size-2.5 rounded-full" style={{ background: band.color }} />
            <span className="text-white/80">{band.label}</span>
            <span className="ml-auto tabular-nums text-white/40">{band.from}+</span>
          </li>
        ))}
      </ul>

      <p className="mt-3 text-[10px] leading-relaxed text-white/45">
        A Kami3D index, not an IUCN assessment: a weighted mean of IUCN status (
        {RISK_WEIGHTS.status}), range size ({RISK_WEIGHTS.range}), threat overlap ({RISK_WEIGHTS.threat}) and the
        observation trend ({RISK_WEIGHTS.trend}). A missing input is left out and listed, never counted as zero.
      </p>
    </div>
  );
}

export function RiskPanel({
  rows,
  selectedSlug,
  onSelect,
}: {
  rows: RiskRow[];
  selectedSlug: string | null;
  onSelect: (slug: string | null) => void;
}) {
  if (rows.length === 0) {
    return (
      <div className="glass rounded-[var(--radius-card)] p-4 text-[11px] leading-relaxed text-white/45">
        No species could be scored: the risk index needs at least one input, and none of the
        layers behind it are available in this deployment.
      </div>
    );
  }

  return (
    <div className="glass rounded-[var(--radius-card)] p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">Species at risk</h2>
        <span className="text-[10px] text-white/35">{rows.length} scored</span>
      </div>

      <ol className="mt-3 space-y-1.5">
        {rows.slice(0, 8).map((row) => {
          const score = row.breakdown.score ?? 0;
          const active = row.slug === selectedSlug;

          return (
            <li key={row.slug}>
              <button
                type="button"
                onClick={() => onSelect(active ? null : row.slug)}
                aria-pressed={active}
                data-risk={row.slug}
                className={cn(
                  "w-full rounded-xl px-2.5 py-2 text-left transition-colors",
                  active ? "bg-white/12 ring-1 ring-neon/40" : "hover:bg-white/8",
                )}
              >
                <span className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-xs text-white/85">{row.name}</span>
                  <span className={cn("shrink-0 text-[11px] font-medium tabular-nums", row.breakdown.band.textClass)}>
                    {score}
                  </span>
                </span>

                <span className="mt-1 flex items-center gap-1.5">
                  <span className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
                    <span
                      className="block h-full rounded-full"
                      style={{ width: `${score}%`, background: row.breakdown.band.color }}
                    />
                  </span>
                  <span className="text-[10px] text-white/40">{row.breakdown.band.label}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** The inputs behind one species, for the detail card. */
export function RiskBreakdownList({ breakdown }: { breakdown: RiskBreakdown }) {
  const keys = Object.keys(RISK_WEIGHTS);

  return (
    <ul className="mt-3 space-y-1.5">
      {keys.map((key) => {
        const value = breakdown.parts[key as keyof typeof RISK_WEIGHTS];
        const weight = RISK_WEIGHTS[key as keyof typeof RISK_WEIGHTS];
        const missing = value === null;

        return (
          <li key={key} className="text-[10px] leading-relaxed">
            <span className="flex items-baseline justify-between gap-2">
              <span className={missing ? "text-white/30" : "text-white/70"}>
                {PART_LABELS[key] ?? key}
                <span className="ml-1 text-white/25">w{weight}</span>
              </span>
              <span className={missing ? "text-white/30" : "tabular-nums text-white/70"}>
                {missing ? "not available" : `${Math.round((value as number) * 100)}%`}
              </span>
            </span>
            <span className="text-white/30">{PART_NOTES[key] ?? ""}</span>
          </li>
        );
      })}
    </ul>
  );
}
