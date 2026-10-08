import Link from "next/link";

import { CategoryIcon } from "@/components/catalog/CategoryIcon";
import type { CategoryWithCount } from "@/lib/catalog";
// The type-only import above is erased at build time, so this file stays a server component and no
// browser bundle ever reaches the Supabase client in lib/catalog.ts.
import { cn } from "@/lib/utils";

/**
 * The rail that names the subjects.
 *
 * It renders on `/categories`, on a category page and on the home page, and it is a **server**
 * component: there is no state to keep, the active entry is decided by the route it was rendered on,
 * and making it interactive would put a hydration boundary around five links.
 *
 * A category with no entries still appears, and says how many it holds - zero. Hiding it would be the
 * more flattering choice and the wrong one: the section is being built, and a visitor who was told
 * four subjects exist should be able to see which one is still empty.
 */

export interface CategoryNavProps {
  categories: CategoryWithCount[];
  /** The id of the category the reader is inside, if any. */
  active?: string;
  className?: string;
}

export function CategoryNav({ categories, active, className }: CategoryNavProps) {
  return (
    <nav aria-label="Catalogue subjects" className={cn("flex flex-wrap gap-2", className)}>
      {categories.map((category) => {
        const isActive = category.id === active;

        return (
          <Link
            key={category.id}
            href={category.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "group inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              isActive
                ? "bg-white/12 text-white ring-1 ring-white/25"
                : "text-white/60 ring-1 ring-white/10 hover:bg-white/8 hover:text-white",
            )}
          >
            <CategoryIcon name={category.icon} className="h-3.5 w-3.5" />
            <span>{category.name}</span>
            <span className={cn("tabular-nums", isActive ? "text-white/60" : "text-white/35")}>{category.count}</span>
          </Link>
        );
      })}
    </nav>
  );
}
