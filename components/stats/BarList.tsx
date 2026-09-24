import { cn } from "@/lib/utils";

/**
 * A ranked breakdown as horizontal bars.
 *
 * Server-rendered, plain markup — no chart library, no client JavaScript — because the numbers
 * are already computed in \`lib/insights.ts\` and a bar is a rectangle. The width is a percentage of
 * the largest count rather than of the total, so a long tail stays legible next to a leader.
 */
export function BarList({
  items,
  emptyLabel,
  className,
  suffix = "",
}: {
  /** Already sorted; this component does not decide an order. */
  items: readonly { label: string; count: number; share: number | null }[];
  /** Shown when there is nothing to plot, instead of an empty chart. */
  emptyLabel: string;
  className?: string;
  /** Appended to the count, e.g. " rounds". */
  suffix?: string;
}) {
  if (items.length === 0) {
    return <p className={cn("text-xs text-white/40", className)}>{emptyLabel}</p>;
  }

  const largest = Math.max(...items.map((item) => item.count));

  return (
    <ul className={cn("space-y-1.5", className)}>
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-3 text-xs">
          <span className="w-28 shrink-0 truncate text-white/70" title={item.label}>
            {item.label}
          </span>
          <span className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-white/8">
            <span
              className="block h-full rounded-full bg-neon/70"
              style={{ width: Math.max(2, (item.count / largest) * 100) + "%" }}
            />
          </span>
          <span className="w-14 shrink-0 text-right tabular-nums text-white/80">
            {item.count}
            {suffix}
          </span>
          <span className="w-12 shrink-0 text-right tabular-nums text-white/40">
            {item.share === null ? "—" : Math.round(item.share * 100) + "%"}
          </span>
        </li>
      ))}
    </ul>
  );
}
