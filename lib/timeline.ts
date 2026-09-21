import type { GeodataFeature } from "@/types/geodata";

/**
 * The timeline, as arithmetic.
 *
 * Two rules from the phase brief are enforced here rather than in the UI:
 *
 *   1. **annotations and ranges are different things.** An event is a dated, cited
 *      statement; a range is a polygon somebody published for a year. They are stored in
 *      different tables and this module never derives one from the other.
 *   2. **a gap is shown as a gap.** When there is no polygon for the year the visitor is
 *      looking at, the frame says so and names the nearest years that do have one. It does
 *      not interpolate a shape between two years, because that shape was never published.
 *
 * Dependency-free: `scripts/check-timeline.mjs` imports it in plain Node.
 */

export interface TimelineEvent {
  id: string;
  year: number;
  title: string;
  summary: string;
  kind: string;
  slug: string | null;
  source: string;
  sourceUrl: string;
  attribution: string;
}

export interface TimelineFrame {
  /** The year being shown. */
  year: number;
  /** Range polygons that exist for it - possibly none. */
  ranges: GeodataFeature[];
  /** Annotations within the window, newest first. */
  events: TimelineEvent[];
  /** False when this year has no polygon at all, which the UI has to say out loud. */
  hasRange: boolean;
  /** The nearest years that do have one, for the "no data" message. */
  nearestYears: number[];
}

/**
 * The years a set of features can speak for.
 *
 * `year === null` is the present day (the convention `animal_geodata` uses), and it is
 * returned as a real year so the timeline can put it on the same axis as the rest.
 */
export function yearsWithRanges(features: readonly GeodataFeature[], presentYear = new Date().getUTCFullYear()): number[] {
  const years = new Set<number>();

  for (const feature of features) {
    const kind = feature.properties.kind;
    if (kind !== "habitat_current" && kind !== "habitat_historic") continue;

    const year = feature.properties.year;
    years.add(year === null || year === undefined ? presentYear : Number(year));
  }

  return [...years].sort((a, b) => a - b);
}

/** The nearest years that actually have a polygon, closest first. */
export function nearestYearsWithData(years: readonly number[], year: number, count = 2): number[] {
  return [...years].sort((a, b) => Math.abs(a - year) - Math.abs(b - year) || a - b).slice(0, count);
}

/** Annotations within `window` years of the chosen one, most recent first. */
export function eventsForYear(
  events: readonly TimelineEvent[],
  year: number,
  window = 0,
): TimelineEvent[] {
  return events
    .filter((event) => Math.abs(event.year - year) <= window)
    .sort((a, b) => b.year - a.year || a.title.localeCompare(b.title));
}

/**
 * Everything the timeline shows for one year.
 *
 * `window` widens the event search: a 1900-2026 timeline cannot show an annotation per
 * pixel, so a marker stands for the events near it - and the panel lists them with their
 * real years, never the year of the marker.
 */
export function frameForYear({
  features,
  events,
  year,
  window = 0,
  presentYear,
}: {
  features: readonly GeodataFeature[];
  events: readonly TimelineEvent[];
  year: number;
  window?: number;
  presentYear?: number;
}): TimelineFrame {
  const years = yearsWithRanges(features, presentYear);

  const ranges = features.filter((feature) => {
    const kind = feature.properties.kind;
    if (kind !== "habitat_current" && kind !== "habitat_historic") return false;

    const own = feature.properties.year;
    const value = own === null || own === undefined ? (presentYear ?? new Date().getUTCFullYear()) : Number(own);
    return value === year;
  });

  return {
    year,
    ranges,
    events: eventsForYear(events, year, window),
    hasRange: ranges.length > 0,
    nearestYears: ranges.length > 0 ? [] : nearestYearsWithData(years, year),
  };
}

/**
 * The sentence to show when a year has no polygon.
 *
 * Written here rather than in the component so the wording is pinned by a test: the point
 * of this string is that it is never empty and never implies a shape exists.
 */
export function describeGap(frame: TimelineFrame, label = (year: number) => String(year)): string {
  if (frame.hasRange) return "";
  if (frame.nearestYears.length === 0) return `No range data has been published for ${label(frame.year)}.`;

  const near = frame.nearestYears.map(label).join(" and ");
  return `No range data for ${label(frame.year)} — the closest years with a published shape are ${near}.`;
}

/** Evenly spaced tick years across a scale, plus the ends. */
export function timelineTicks(from: number, to: number, count = 5): number[] {
  // A degenerate or backwards scale still has to produce something drawable: one tick,
  // and never the same year twice.
  if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from || count < 2) {
    return [...new Set([from, to])].filter(Number.isFinite);
  }

  const step = (to - from) / (count - 1);
  const ticks = [];
  for (let index = 0; index < count; index += 1) ticks.push(Math.round(from + step * index));
  return [...new Set(ticks)];
}

/** A year that reads the way a person writes it: `800 BCE`, `2020`. */
export function formatYear(year: number): string {
  if (year < 0) return `${Math.abs(year).toLocaleString("en-US")} BCE`;
  return String(year);
}
