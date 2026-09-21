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

/**
 * The layers the panel can show: the animal map ones by default, or Data2Map's registry.
 *
 * Generic over the id type rather than welded to `MapLayerId`: the module has its own layer
 * vocabulary (`land_price`, `zoning`, …) and the plan for it says explicitly not to fork this
 * component. One panel, two lists of layers.
 */
export interface LayerPanelEntry {
  id: string;
  label: string;
  hint: string;
  source: string;
  license: string;
  unavailable?: string;
}

export interface LayerPanelProps<T extends string = MapLayerId> {
  visible: Record<T, boolean>;
  opacity: Record<T, number>;
  /** Which layers have any feature behind them right now. */
  available: Record<T, number>;
  onToggle: (id: T, visible: boolean) => void;
  onOpacity: (id: T, opacity: number) => void;
  /** Defaults to the animal map catalogue; Data2Map passes its registry. */
  layers?: readonly LayerPanelEntry[];
}

export function LayerPanel<T extends string = MapLayerId>({
  visible,
  opacity,
  available,
  onToggle,
  onOpacity,
  layers = MAP_LAYERS,
}: LayerPanelProps<T>) {
  return (
    <div className="glass rounded-[var(--radius-card)] p-4">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">Layers</h2>

      <ul className="mt-3 space-y-3">
        {layers.map((layer) => {
          const count = available[layer.id as T] ?? 0;
          const disabled = count === 0;
          const checked = Boolean(visible[layer.id as T]) && !disabled;

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
                  onClick={() => onToggle(layer.id as T, !checked)}
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

                  {/* Source, licence and year on every layer: a map layer without
                      provenance is a claim without a citation. */}
                  <p className="mt-1 text-[10px] text-white/35">
                    {layer.source} · {layer.license}
                  </p>

                  {layer.unavailable ? (
                    <p className="mt-1 text-[10px] leading-relaxed text-solar/80">{layer.unavailable}</p>
                  ) : null}

                  {checked ? (
                    <label className="mt-2 flex items-center gap-2">
                      <span className="sr-only">Opacity for {layer.label}</span>
                      <input
                        type="range"
                        min={10}
                        max={100}
                        step={5}
                        value={Math.round(opacity[layer.id as T] * 100)}
                        onChange={(event) => onOpacity(layer.id as T, Number(event.target.value) / 100)}
                        className="h-1 w-24 cursor-pointer appearance-none rounded-full bg-white/12 accent-neon"
                      />
                      <span className="w-8 text-right text-[10px] tabular-nums text-white/40">
                        {Math.round(opacity[layer.id as T] * 100)}%
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
