"use client";

import { Filter, RotateCcw, Search } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useExploreStore, type SortKey } from "@/lib/store";
import { cn } from "@/lib/utils";
import {
  CONSERVATION_STATUSES,
  REGIONS,
  TAXONOMIC_CLASSES,
  type ConservationStatus,
  type Region,
  type TaxonomicClass,
} from "@/types/animal";

const SELECT_CLASS =
  "h-10 rounded-full bg-white/6 px-3.5 text-sm text-white/85 ring-1 ring-white/10 backdrop-blur transition hover:ring-white/20 focus:outline-none focus:ring-2 focus:ring-neon/60 [&>option]:bg-abyss [&>option]:text-white";

export interface FilterBarProps {
  /** Species count after filtering, shown to the user. */
  resultCount: number;
  totalCount: number;
  className?: string;
}

export function FilterBar({ resultCount, totalCount, className }: FilterBarProps) {
  const {
    region,
    category,
    status,
    query,
    sort,
    showPrehistoric,
    prehistoricOnly,
    setRegion,
    setCategory,
    setStatus,
    setQuery,
    setSort,
    setShowPrehistoric,
    setPrehistoricOnly,
    reset,
  } = useExploreStore();

  const filtersActive =
    region !== "All" ||
    category !== "All" ||
    status !== "All" ||
    query.trim() !== "" ||
    !showPrehistoric ||
    prehistoricOnly;

  return (
    <section
      aria-label="Species filters"
      className={cn("glass flex flex-col gap-3 rounded-[var(--radius-card)] p-3 sm:p-4", className)}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-white/40" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name, class, habitat…"
            aria-label="Search species"
            className="pl-10"
          />
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:w-auto">
          <label className="sr-only" htmlFor="filter-region">
            Region
          </label>
          <select
            id="filter-region"
            value={region}
            onChange={(event) => setRegion(event.target.value as Region | "All")}
            className={SELECT_CLASS}
          >
            <option value="All">All regions</option>
            {REGIONS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <label className="sr-only" htmlFor="filter-category">
            Class
          </label>
          <select
            id="filter-category"
            value={category}
            onChange={(event) => setCategory(event.target.value as TaxonomicClass | "All")}
            className={SELECT_CLASS}
          >
            <option value="All">All classes</option>
            {TAXONOMIC_CLASSES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <label className="sr-only" htmlFor="filter-status">
            Conservation status
          </label>
          <select
            id="filter-status"
            value={status}
            onChange={(event) => setStatus(event.target.value as ConservationStatus | "All")}
            className={SELECT_CLASS}
          >
            <option value="All">Any status</option>
            {CONSERVATION_STATUSES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <label className="sr-only" htmlFor="filter-sort">
            Sort
          </label>
          <select
            id="filter-sort"
            value={sort}
            onChange={(event) => setSort(event.target.value as SortKey)}
            className={SELECT_CLASS}
          >
            <option value="popularity">Most popular</option>
            <option value="name">A → Z</option>
            <option value="size">Largest first</option>
          </select>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-white/55">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/6 px-3 py-1.5 ring-1 ring-white/10">
          <Filter className="size-3 text-neon" />
          <strong className="font-semibold text-white">{resultCount}</strong>
          <span>/ {totalCount} species</span>
        </span>

        <button
          type="button"
          onClick={() => setShowPrehistoric(!showPrehistoric)}
          aria-pressed={showPrehistoric}
          className={cn(
            "rounded-full px-3 py-1.5 ring-1 transition-colors",
            showPrehistoric
              ? "bg-white/6 text-white/70 ring-white/12 hover:text-white"
              : "bg-solar/15 text-solar ring-solar/35",
          )}
        >
          {showPrehistoric ? "Including prehistoric" : "Prehistoric hidden"}
        </button>

        <button
          type="button"
          onClick={() => setPrehistoricOnly(!prehistoricOnly)}
          aria-pressed={prehistoricOnly}
          className={cn(
            "rounded-full px-3 py-1.5 ring-1 transition-colors",
            prehistoricOnly
              ? "bg-solar/15 text-solar ring-solar/35"
              : "bg-white/6 text-white/70 ring-white/12 hover:text-white",
          )}
        >
          Prehistoric only
        </button>

        {filtersActive ? (
          <Button type="button" variant="ghost" size="sm" onClick={reset} className="ml-auto">
            <RotateCcw />
            Clear filters
          </Button>
        ) : null}
      </div>
    </section>
  );
}
