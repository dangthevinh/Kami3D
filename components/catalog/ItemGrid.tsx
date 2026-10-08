"use client";

import * as React from "react";

import { ItemCard } from "@/components/catalog/ItemCard";
import { itemHref, itemSubtitle } from "@/lib/catalog-links";
import type { CatalogItem } from "@/lib/catalog-project";
import { cn } from "@/lib/utils";

/**
 * The grid over one category, with the two filters a catalogue of 73 entries actually needs.
 *
 * Filtering happens in the browser, like `/explore` and the landmark grid: the page is static, and a
 * query-string filter would make it render on every request. The two chips are chosen from what the
 * catalogue can answer without knowing anything about the subject - "has a model" and a text match -
 * rather than from fields only one category has.
 *
 * A filter that matches nothing says so, and says which filter did it. An empty grid with no
 * explanation is the thing this project keeps writing itself out of.
 */

export interface ItemGridProps {
  items: CatalogItem[];
  /** What to call the entries in the empty state: "species", "monuments", "entries". */
  noun?: string;
  /** slug -> may this card fetch its model on hover. Decided on the server from the credit manifest. */
  previewable?: Record<string, boolean>;
}

export function ItemGrid({ items, noun = "entries", previewable = {} }: ItemGridProps) {
  const [query, setQuery] = React.useState("");
  const [withModel, setWithModel] = React.useState(false);

  const needle = query.trim().toLowerCase();
  const shown = items.filter((item) => {
    if (withModel && !item.has_model) return false;
    if (needle.length === 0) return true;
    return (
      item.name.toLowerCase().includes(needle) ||
      (item.latin_name ?? "").toLowerCase().includes(needle) ||
      itemSubtitle(item)?.toLowerCase().includes(needle) === true
    );
  });

  const modelCount = items.filter((item) => item.has_model).length;

  const chip = (active: boolean, label: string, onClick: () => void) => (
    <button
      key={label}
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full px-3 py-1.5 text-xs transition-colors",
        active ? "bg-white/12 text-white ring-1 ring-white/20" : "text-white/55 hover:bg-white/8 hover:text-white",
      )}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor="catalog-filter">
          Filter {noun} by name
        </label>
        <input
          id="catalog-filter"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={`Filter ${items.length} ${noun}`}
          className="w-full max-w-xs rounded-full bg-white/6 px-4 py-2 text-sm text-white placeholder:text-white/35 ring-1 ring-white/10 outline-none focus:ring-white/25"
        />
        <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Filter entries">
          {chip(!withModel, `All ${items.length}`, () => setWithModel(false))}
          {chip(withModel, `With a 3D model ${modelCount}`, () => setWithModel(true))}
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="rounded-2xl bg-white/4 p-6 text-sm text-white/60 ring-1 ring-white/8">
          {items.length === 0
            ? `No ${noun} here yet. This section is being built, and the page says so rather than showing an empty grid.`
            : `Nothing matches ${withModel ? "“with a 3D model”" : ""}${withModel && needle ? " and " : ""}${
                needle ? `“${query.trim()}”` : ""
              }. Clear the filter to see all ${items.length}.`}
        </p>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {shown.map((item) => (
            <li key={item.id}>
              <ItemCard
                item={item}
                href={itemHref(item)}
                subtitle={itemSubtitle(item)}
                previewable={previewable[item.slug] === true}
                className="h-full"
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
