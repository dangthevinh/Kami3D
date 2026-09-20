import { bars, type DailyCount } from "@/lib/trend";
import { cn } from "@/lib/utils";

/**
 * One bar per day. Same approach as the sparkline: server-rendered SVG, stretched
 * from a fixed coordinate space so the geometry is computed once and the layout
 * decides the size.
 */
export function DailyBars({
  points,
  className,
  height = 44,
  label,
}: {
  points: readonly DailyCount[];
  className?: string;
  height?: number;
  label?: string;
}) {
  const geometry = bars(points, 100, height, 1.2);
  const busiest = points.reduce((best, point) => (point.views > best.views ? point : best), { day: "", views: 0 });

  return (
    <svg
      viewBox={`0 0 100 ${height}`}
      preserveAspectRatio="none"
      className={cn("w-full", className)}
      style={{ height }}
      role="img"
      aria-label={label ?? `Daily views, busiest day ${busiest.views} views`}
    >
      {geometry.map((bar) => (
        // A zero day still gets a hairline so the axis reads as continuous.
        <rect
          key={bar.day}
          x={bar.x}
          y={bar.views > 0 ? bar.y : height - 0.8}
          width={bar.width}
          height={bar.views > 0 ? Math.max(bar.height, 1) : 0.8}
          className={bar.views > 0 ? "fill-neon/75" : "fill-white/12"}
        />
      ))}
    </svg>
  );
}
