import { Eye } from "lucide-react";
import Link from "next/link";

import { Sparkline } from "@/components/stats/Sparkline";
import type { SpeciesTrend } from "@/lib/stats";
import { cn, formatCount } from "@/lib/utils";
import type { Animal } from "@/types/animal";

/**
 * The ranking itself.
 *
 * The bar is relative to the leader, not to a fixed scale, so the shape of the
 * gap between first and tenth is readable even when the totals are small.
 */
export function LeaderboardList({
  species,
  trends,
  className,
}: {
  species: Animal[];
  trends: Map<string, SpeciesTrend>;
  className?: string;
}) {
  const leader = Math.max(...species.map((animal) => animal.view_count ?? 0), 1);

  return (
    <ol className={cn("space-y-2", className)}>
      {species.map((animal, index) => {
        const views = animal.view_count ?? 0;
        const trend = trends.get(animal.slug);
        const share = Math.round((views / leader) * 100);

        return (
          <li key={animal.id}>
            <Link
              href={`/animal/${animal.slug}`}
              className="group flex items-center gap-3 rounded-2xl bg-white/4 p-3 ring-1 ring-white/8 transition-colors hover:bg-white/8 hover:ring-neon/30 sm:gap-4 sm:p-4"
            >
              <span
                className={cn(
                  "grid size-9 shrink-0 place-items-center rounded-xl font-display text-sm font-bold tabular-nums",
                  index === 0
                    ? "bg-solar/20 text-solar ring-1 ring-solar/40"
                    : index < 3
                      ? "bg-white/10 text-white/80 ring-1 ring-white/15"
                      : "bg-white/5 text-white/45 ring-1 ring-white/10",
                )}
                aria-label={`Rank ${index + 1}`}
              >
                {index + 1}
              </span>

              <span className="grid size-10 shrink-0 place-items-center rounded-xl text-xl ring-1 ring-white/10" style={{ background: `linear-gradient(140deg, ${animal.accent[0]}33, ${animal.accent[1]}66)` }} aria-hidden>
                {animal.emoji}
              </span>

              <span className="min-w-0 flex-1">
                <span className="flex items-baseline gap-2">
                  <span className="truncate font-display text-sm font-semibold text-white transition-colors group-hover:text-neon sm:text-base">
                    {animal.name}
                  </span>
                  <span className="hidden truncate text-xs italic text-white/40 sm:inline">{animal.latin_name}</span>
                </span>

                {/* Share of the leader, as a bar. */}
                <span className="mt-1.5 block h-1.5 w-full overflow-hidden rounded-full bg-white/8">
                  <span
                    className="block h-full rounded-full bg-gradient-to-r from-neon to-glow transition-[width] duration-500"
                    style={{ width: `${Math.max(share, views > 0 ? 3 : 0)}%` }}
                  />
                </span>
              </span>

              {trend ? (
                <Sparkline points={trend.points} className="hidden h-[34px] w-[110px] shrink-0 md:block" />
              ) : null}

              <span className="flex w-16 shrink-0 flex-col items-end sm:w-20">
                <span className="inline-flex items-center gap-1 font-display text-sm font-semibold tabular-nums text-white">
                  <Eye className="size-3.5 text-glow/70" />
                  {formatCount(views)}
                </span>
                <span className="text-[10px] uppercase tracking-wide text-white/35">views</span>
              </span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
