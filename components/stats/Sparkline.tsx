import { sparkline, type DailyCount } from "@/lib/trend";
import { cn } from "@/lib/utils";

/**
 * A species' last few weeks in one line.
 *
 * Plain SVG on the server: no chart library, no client JavaScript, and it survives
 * being rendered into static HTML. `preserveAspectRatio="none"` lets one set of
 * coordinates fill any container width, with `vectorEffect` keeping the stroke
 * from stretching with it.
 */
export function Sparkline({
  points,
  width = 120,
  height = 34,
  className,
  label,
  // A CSS variable rather than a hex value: the accent is darkened for the light
  // theme, and this SVG is rendered on the server in both.
  color = "var(--color-neon)",
}: {
  points: readonly DailyCount[];
  width?: number;
  height?: number;
  className?: string;
  color?: string;
  /**
   * What the line actually shows, for screen readers.
   *
   * The default describes the view trend this component was written for. Data2Map plots other
   * series through it, and a chart whose accessible name says "views" while it draws an NDVI curve
   * is the kind of small lie this project keeps designing out.
   */
  label?: string;
}) {
  const { line, area, total } = sparkline(points, width, height, 3);

  if (!line) {
    return <div className={cn("h-[34px] w-[120px]", className)} aria-hidden />;
  }

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={cn("overflow-visible", className)}
      role="img"
      aria-label={label ?? (total > 0 ? `View trend, ${total} views in this window` : "No views in this window")}
    >
      <path d={area} fill={color} fillOpacity={0.14} />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
