"use client";

import { Pause, Play, RotateCcw } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";
import { advanceProgress, progressPerSecond } from "@/lib/migration";
import { formatYear, type TimelineEvent } from "@/lib/timeline";
import type { MigrationRoute } from "@/types/migration";

/**
 * The timeline controls.
 *
 * Both halves avoid the animation library the plan originally asked for, and for the same
 * reason: an `<input type="range">` is already a slider with keyboard support, and the path
 * animation is one number advanced by `requestAnimationFrame`. No Framer Motion (the bundle
 * check forbids it), and nothing that a phone cannot drag.
 *
 * Autoplay is disabled when the visitor has asked for reduced motion - either through the
 * operating system or through `/settings`. A moving dot is exactly the kind of continuous
 * motion that preference exists to stop, and the phase brief makes that a requirement rather
 * than a nicety.
 */

/**
 * The words the slider uses.
 *
 * The animal map steps through **years** and the trends page steps through **hours of the day**;
 * the numbers, the keyboard behaviour and the reduced-motion rule are identical, so the component
 * is parameterised rather than forked. A second slider would have been two places to fix every bug.
 */
export interface TimelineLabels {
  heading?: string;
  /** The slider's accessible name. "Year" by default, "Hour of day" for the clock. */
  aria?: string;
  play?: string;
  pause?: string;
  reset?: string;
  /** The line under the slider: how many steps, and the range. */
  span?: (count: number, from: number, to: number) => string;
  empty?: string;
}

export interface TimelinePanelProps {
  years: number[];
  year: number;
  onYear: (year: number) => void;
  events: TimelineEvent[];
  gapMessage: string;
  reduceMotion: boolean;
  /** How one step is written. A year by default; the trends page passes an hour. */
  format?: (value: number) => string;
  labels?: TimelineLabels;
  /** How long a step stays on screen while playing. */
  stepMs?: number;
}

const DEFAULT_LABELS: Required<Pick<TimelineLabels, "heading" | "aria" | "play" | "pause" | "reset">> = {
  heading: "Timeline",
  aria: "Year",
  play: "Play the timeline",
  pause: "Pause the timeline",
  reset: "Back to the earliest year with data",
};

export function RangeTimeline({
  years,
  year,
  onYear,
  events,
  gapMessage,
  reduceMotion,
  format = formatYear,
  labels,
  stepMs = 1600,
}: TimelinePanelProps) {
  const [playing, setPlaying] = React.useState(false);
  const index = Math.max(0, years.indexOf(year));
  const words = { ...DEFAULT_LABELS, ...labels };
  const written = format(year);

  // Stepping through the years that have data, rather than every year in between: a
  // timeline that spends 10 000 ticks on the Pleistocene before reaching 2026 is not a
  // timeline anybody watches.
  React.useEffect(() => {
    if (!playing) return;
    if (reduceMotion) {
      setPlaying(false);
      return;
    }

    const timer = window.setInterval(() => {
      const next = (years.indexOf(year) + 1) % Math.max(1, years.length);
      onYear(years[next]);
      if (next === 0) setPlaying(false);
    }, stepMs);

    return () => window.clearInterval(timer);
  }, [playing, reduceMotion, years, year, onYear, stepMs]);

  const markers = events.filter((event) => Number.isFinite(event.year));
  const span = years.length > 1 ? { from: Math.min(...years), to: Math.max(...years) } : null;

  return (
    <div className="glass rounded-[var(--radius-card)] p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">{words.heading}</h2>
        <span className="text-[11px] tabular-nums text-white/70">{written}</span>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setPlaying((value) => !value)}
          disabled={reduceMotion || years.length < 2}
          aria-label={playing ? words.pause : words.play}
          title={reduceMotion ? "Autoplay is off because you asked for reduced motion" : undefined}
          className={cn(
            "grid size-8 shrink-0 place-items-center rounded-full ring-1 transition-colors",
            reduceMotion || years.length < 2
              ? "cursor-not-allowed text-white/25 ring-white/10"
              : "text-white/80 ring-white/15 hover:bg-white/10 hover:text-white",
          )}
        >
          {playing ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
        </button>

        <input
          type="range"
          min={0}
          max={Math.max(0, years.length - 1)}
          step={1}
          value={index}
          aria-label={words.aria}
          aria-valuetext={written}
          onChange={(event) => onYear(years[Number(event.target.value)] ?? year)}
          // The map tries to take every gesture; a timeline that cannot be dragged on a
          // phone is a timeline nobody uses.
          style={{ touchAction: "pan-y" }}
          className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-white/12 accent-neon"
        />

        <button
          type="button"
          onClick={() => onYear(years[0] ?? year)}
          aria-label={words.reset}
          className="grid size-8 shrink-0 place-items-center rounded-full text-white/60 ring-1 ring-white/15 transition-colors hover:bg-white/10 hover:text-white"
        >
          <RotateCcw className="size-3.5" />
        </button>
      </div>

      {span ? (
        <p className="mt-2 flex justify-between text-[10px] text-white/35">
          <span>{format(span.from)}</span>
          <span>{labels?.span ? words.span?.(years.length, span.from, span.to) : `${years.length} year(s) with a published shape`}</span>
          <span>{format(span.to)}</span>
        </p>
      ) : null}

      {gapMessage ? (
        <p className="mt-3 rounded-xl bg-solar/10 px-3 py-2 text-[11px] leading-relaxed text-solar ring-1 ring-solar/20">
          {gapMessage}
        </p>
      ) : null}

      {markers.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {markers.map((event) => (
            <li key={event.id} className="text-[11px] leading-relaxed">
              <span className="flex items-baseline justify-between gap-2">
                <span className="font-medium text-white/85">{event.title}</span>
                <span className="shrink-0 tabular-nums text-white/45">{format(event.year)}</span>
              </span>
              <span className="text-white/55">{event.summary}</span>
              <a
                href={event.sourceUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="mt-0.5 block text-[10px] text-neon hover:text-white"
              >
                {event.source}
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-[11px] leading-relaxed text-white/35">
          {words.empty ??
            "No cited event falls near this year. Annotations are ours, dated and sourced; a year without one is a year we have nothing to say about."}
        </p>
      )}
    </div>
  );
}

export interface PathPlayerProps {
  routes: MigrationRoute[];
  slug: string | null;
  onSlug: (slug: string) => void;
  reduceMotion: boolean;
  onProgress: (progress: number) => void;
  progress: number;
  speciesName: (slug: string) => string;
}

export function PathPlayer({ routes, slug, onSlug, reduceMotion, onProgress, progress, speciesName }: PathPlayerProps) {
  const [playing, setPlaying] = React.useState(false);
  const route = routes.find((entry) => entry.slug === slug) ?? routes[0] ?? null;
  const seconds = 18;

  React.useEffect(() => {
    if (!playing) return;
    if (reduceMotion) {
      setPlaying(false);
      return;
    }

    let frame = 0;
    let previous = performance.now();
    const perSecond = progressPerSecond(seconds);

    const tick = (now: number) => {
      const delta = (now - previous) / 1000;
      previous = now;
      onProgress(advanceProgress(progressRef.current, perSecond, delta));
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, reduceMotion, onProgress]);

  // The loop reads the latest progress without re-subscribing every frame.
  const progressRef = React.useRef(progress);
  progressRef.current = progress;

  if (routes.length === 0) {
    return (
      <div className="glass rounded-[var(--radius-card)] p-4 text-[11px] leading-relaxed text-white/45">
        No seasonal path is available: it is derived from the observation record, and this
        deployment has none. Run <code className="text-white/60">npm run migrations:fetch</code>.
      </div>
    );
  }

  return (
    <div className="glass rounded-[var(--radius-card)] p-4">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">Seasonal path</h2>

      <label className="mt-3 block text-[10px] uppercase tracking-wide text-white/35" htmlFor="path-species">
        Species
      </label>
      <select
        id="path-species"
        value={route?.slug ?? ""}
        onChange={(event) => {
          onSlug(event.target.value);
          onProgress(0);
        }}
        className="mt-1 h-9 w-full rounded-full bg-white/6 px-3 text-xs text-white/85 outline-none ring-1 ring-white/10 focus-visible:ring-neon/60"
      >
        {routes.map((entry) => (
          <option key={entry.slug} value={entry.slug} className="bg-abyss text-white">
            {speciesName(entry.slug)}
          </option>
        ))}
      </select>

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setPlaying((value) => !value)}
          disabled={reduceMotion}
          aria-label={playing ? "Pause the path" : "Play the path"}
          title={reduceMotion ? "Autoplay is off because you asked for reduced motion" : undefined}
          className={cn(
            "grid size-8 shrink-0 place-items-center rounded-full ring-1 transition-colors",
            reduceMotion
              ? "cursor-not-allowed text-white/25 ring-white/10"
              : "text-white/80 ring-white/15 hover:bg-white/10 hover:text-white",
          )}
        >
          {playing ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
        </button>

        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={Math.round(progress * 100)}
          aria-label="Position along the path"
          onChange={(event) => onProgress(Number(event.target.value) / 100)}
          style={{ touchAction: "pan-y" }}
          className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-white/12 accent-neon"
        />
      </div>

      {route ? (
        <div className="mt-3 space-y-2 text-[10px] leading-relaxed text-white/45">
          <p>
            {route.stops.length} monthly stops · {Number(route.properties.length_km ?? 0).toLocaleString("en-US")} km · 
            {route.properties.records?.toLocaleString("en-US") ?? "?"} records
          </p>
          <p>
            Mean monthly spread {Number(route.properties.mean_spread_km ?? 0).toLocaleString("en-US")} km
            {route.properties.coherence ? ` (${route.properties.coherence}x the route)` : ""}.
          </p>
          <p className="rounded-xl bg-solar/10 px-3 py-2 text-solar ring-1 ring-solar/20">
            {route.properties.note ?? "A derived path, not a tracked route."} Method: {route.properties.method}
          </p>
          <p>
            <a href={route.sourceUrl ?? "#"} target="_blank" rel="noreferrer noopener" className="text-neon hover:text-white">
              {route.source}
            </a>{" "}· {route.license}
          </p>
        </div>
      ) : null}
    </div>
  );
}
