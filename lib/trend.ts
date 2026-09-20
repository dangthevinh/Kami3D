/**
 * Trend maths for the leaderboard charts.
 *
 * Pure functions, no chart library and no DOM: the charts are plain SVG so they
 * render on the server (no client JavaScript, no layout shift), and the geometry
 * behind them can be asserted in Node.
 *
 * Everything works in UTC. The daily rows are written by Postgres `current_date`,
 * so filling in the quiet days from a local clock would slide the series by a day
 * for anyone west of Greenwich and make the chart disagree with the table.
 */

export interface DailyCount {
  /** `YYYY-MM-DD`, UTC. */
  day: string;
  views: number;
}

const MS_PER_DAY = 86_400_000;

/** `YYYY-MM-DD` for a UTC instant. */
export function toDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** The last `days` day-keys, oldest first, ending at `today` inclusive. */
export function dayRange(days: number, today: Date = new Date()): string[] {
  const end = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const keys: string[] = [];

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    keys.push(toDayKey(new Date(end - offset * MS_PER_DAY)));
  }

  return keys;
}

/**
 * Turn sparse rows into a complete series.
 *
 * Days with no row are real zeros — nobody looked that day — and leaving them out
 * would compress the x-axis and misrepresent the shape of the trend. Rows outside
 * the window are ignored, and duplicate days are summed rather than dropped.
 */
export function fillDays(rows: readonly DailyCount[], days: number, today: Date = new Date()): DailyCount[] {
  const totals = new Map<string, number>();
  for (const row of rows) {
    totals.set(row.day, (totals.get(row.day) ?? 0) + row.views);
  }

  return dayRange(days, today).map((day) => ({ day, views: totals.get(day) ?? 0 }));
}

export interface Sparkline {
  /** SVG path data for the line itself. */
  line: string;
  /** Path data for the filled area beneath it, for an area chart. */
  area: string;
  max: number;
  total: number;
}

/**
 * Sparkline geometry for a series.
 *
 * A flat series is drawn along the middle rather than the baseline: a species with
 * no views yet should read as "nothing happening", not as a filled chart touching
 * the top.
 */
export function sparkline(points: readonly DailyCount[], width: number, height: number, padding = 2): Sparkline {
  const views = points.map((point) => point.views);
  const max = views.length ? Math.max(...views) : 0;
  const total = views.reduce((sum, value) => sum + value, 0);

  const innerWidth = Math.max(width - padding * 2, 1);
  const innerHeight = Math.max(height - padding * 2, 1);
  const step = points.length > 1 ? innerWidth / (points.length - 1) : 0;

  const coordinates = points.map((point, index) => {
    const x = padding + index * step;
    const ratio = max > 0 ? point.views / max : 0.5;
    const y = padding + innerHeight - ratio * innerHeight;
    return [Number(x.toFixed(2)), Number(y.toFixed(2))] as const;
  });

  if (coordinates.length === 0) return { line: "", area: "", max, total };

  const line = coordinates.map(([x, y], index) => `${index === 0 ? "M" : "L"} ${x} ${y}`).join(" ");
  const baseline = padding + innerHeight;
  const area = `${line} L ${coordinates[coordinates.length - 1][0]} ${baseline} L ${coordinates[0][0]} ${baseline} Z`;

  return { line, area, max, total };
}

export interface Bar {
  x: number;
  y: number;
  width: number;
  height: number;
  day: string;
  views: number;
}

/** Bar geometry for a daily chart, oldest day on the left. */
export function bars(points: readonly DailyCount[], width: number, height: number, gap = 2): Bar[] {
  if (points.length === 0) return [];

  const max = Math.max(...points.map((point) => point.views), 1);
  const slot = width / points.length;
  const barWidth = Math.max(slot - gap, 1);

  return points.map((point, index) => {
    const barHeight = (point.views / max) * height;
    return {
      x: Number((index * slot).toFixed(2)),
      y: Number((height - barHeight).toFixed(2)),
      width: Number(barWidth.toFixed(2)),
      height: Number(barHeight.toFixed(2)),
      day: point.day,
      views: point.views,
    };
  });
}

export interface TrendSummary {
  total: number;
  peak: number;
  peakDay: string | null;
  average: number;
  /** Percentage change of the second half against the first, or null when the
   * first half had no views to compare against. */
  changePct: number | null;
}

/** Headline figures for a series. */
export function summarise(points: readonly DailyCount[]): TrendSummary {
  if (points.length === 0) {
    return { total: 0, peak: 0, peakDay: null, average: 0, changePct: null };
  }

  const total = points.reduce((sum, point) => sum + point.views, 0);
  let peak = 0;
  let peakDay: string | null = null;

  for (const point of points) {
    if (point.views > peak) {
      peak = point.views;
      peakDay = point.day;
    }
  }

  const midpoint = Math.floor(points.length / 2);
  const firstHalf = points.slice(0, midpoint).reduce((sum, point) => sum + point.views, 0);
  const secondHalf = points.slice(midpoint).reduce((sum, point) => sum + point.views, 0);

  return {
    total,
    peak,
    peakDay,
    average: total / points.length,
    changePct: firstHalf > 0 ? ((secondHalf - firstHalf) / firstHalf) * 100 : null,
  };
}
