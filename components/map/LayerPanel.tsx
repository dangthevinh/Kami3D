"use client";

import { Eye, EyeOff } from "lucide-react";
import * as React from "react";

import { MAP_LAYERS, type MapLayerId } from "@/lib/map-query";
import { cn } from "@/lib/utils";

/**
 * The layer switches.
 *
 * Every layer gets a hint, because "pressure" and "occurrence" mean nothing on their own
 * - and the opacity slider is per layer, since the reason to show two ranges at once is
 * usually to compare them, which needs one of them faint.
 *
 * A layer with no data behind it is disabled with the reason shown rather than hidden: a
 * visitor who cannot find the protected-areas switch does not know whether it is missing
 * or empty.
 */

export interface LayerPanelProps {
  visible: Record<MapLayerId, boolean>;
  opacity: Record<MapLayerId, number>;
  /** Which layers have any feature behind them right now. */
  available: Record<MapLayerId, number>;
  onToggle: (id: MapLayerId, visible: boolean) => void;
  onOpacity: (id: MapLayerId, opacity: number) => void;
}

export function LayerPanel({ visible, opacity, available, onToggle, onOpacity }: LayerPanelProps) {
  return (
    <div className="glass rounded-[var(--radius-card)] p-4">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">Layers</h2>

      <ul className="mt-3 space-y-3">
        {MAP_LAYERS.map((layer) => {
          const count = available[layer.id] ?? 0;
          const disabled = count === 0;
          const checked = visible[layer.id] && !disabled;

          return (
            <li key={layer.id}>
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  role="switch"
                  aria-checked={checked}
                  aria-label={layer.label}
                  data-layer={layer.id}
                  disabled={disabled}
                  onClick={() => onToggle(layer.id, !checked)}
                  className={cn(
                    "mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded border transition-colors",
                    checked ? "border-neon bg-neon/25 text-neon" : "border-white/25 text-transparent",
                    disabled ? "cursor-not-allowed opacity-40" : "hover:border-white/50",
                  )}
                >
                  {checked ? <Eye className="size-3" aria-hidden /> : <EyeOff className="size-3" aria-hidden />}
                </button>

                <div className="min-w-0 flex-1">
                  <p className={cn("text-xs font-medium", disabled ? "text-white/40" : "text-white/85")}>
                    {layer.label}
                    <span className="ml-1.5 text-[10px] font-normal text-white/35">
                      {disabled ? "no data yet" : count}
                    </span>
                  </p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-white/45">{layer.hint}</p>

                  {checked ? (
                    <label className="mt-2 flex items-center gap-2">
                      <span className="sr-only">Opacity for {layer.label}</span>
                      <input
                        type="range"
                        min={10}
                        max={100}
                        step={5}
                        value={Math.round(opacity[layer.id] * 100)}
                        onChange={(event) => onOpacity(layer.id, Number(event.target.value) / 100)}
                        className="h-1 w-24 cursor-pointer appearance-none rounded-full bg-white/12 accent-neon"
                      />
                      <span className="w-8 text-right text-[10px] tabular-nums text-white/40">
                        {Math.round(opacity[layer.id] * 100)}%
                      </span>
                    </label>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
