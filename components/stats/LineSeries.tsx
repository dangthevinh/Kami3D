import { cn } from "@/lib/utils";

/**
 * Accuracy per round, over time.
 *
 * The y axis is always 0–100%, because an accuracy chart that rescales to its own range makes a
 * run of 40s look like a mountain range. The optional threshold is the line above which a round
 * counts towards a run (\`ROUND_GOOD_PERCENT\`), drawn so the chart and the streak figure cannot
 * disagree about where "good" starts.
 */
export function LineSeries({
  points,
  height = 96,
  threshold,
  className,
  label,
}: {
  /** Oldest first. */
  points: readonly { at: string; accuracy: number }[];
  height?: number;
  threshold?: number;
  className?: string;
  label: string;
}) {
  if (points.length === 0) {
    return <div className={cn("h-24 rounded-xl bg-white/4", className)} />;
  }

  const width = 100;
  const step = points.length > 1 ? width / (points.length - 1) : 0;
  const y = (accuracy: number) => height - (Math.max(0, Math.min(accuracy, 100)) / 100) * height;

  const line = points.map((point, index) => (index === 0 ? "M" : "L") + (index * step).toFixed(3) + " " + y(point.accuracy).toFixed(3)).join(" ");
  const area = line + " L" + width + " " + height + " L0 " + height + " Z";

  return (
    <svg
      viewBox={"0 0 " + width + " " + height}
      preserveAspectRatio="none"
      className={cn("w-full", className)}
      style={{ height }}
      role="img"
      aria-label={label}
    >
      {/* A single round has no line to draw, so it gets a dot. */}
      {points.length > 1 ? (
        <>
          <path d={area} className="fill-neon/12" />
          <path
            d={line}
            fill="none"
            strokeWidth={1.8}
            vectorEffect="non-scaling-stroke"
            strokeLinejoin="round"
            strokeLinecap="round"
            className="stroke-neon"
          />
        </>
      ) : (
        <circle cx={0} cy={y(points[0].accuracy)} r={2.4} vectorEffect="non-scaling-stroke" className="fill-neon" />
      )}

      {threshold !== undefined ? (
        <line
          x1={0}
          x2={width}
          y1={y(threshold)}
          y2={y(threshold)}
          strokeWidth={1}
          strokeDasharray="3 3"
          vectorEffect="non-scaling-stroke"
          className="stroke-white/25"
        />
      ) : null}
    </svg>
  );
}
