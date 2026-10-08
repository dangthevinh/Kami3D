import { cn } from "@/lib/utils";

/**
 * The numbers under a catalogue entry, built from its `metadata`.
 *
 * Every category stores something different - a planet's mass, a plant's family, a car's top speed - and
 * the schema's answer to that is one `metadata` object rather than a column per field. This turns that
 * object into a table, which is the whole reason the field exists: a new category needs data, not a
 * component.
 *
 * Three things are deliberately **not** rendered:
 *
 *   - **`source`**, which is a citation rather than a specification - the page prints it under the table
 *     where a reader expects to find where the numbers came from;
 *   - **`kind`**, which the page has already said in the header;
 *   - **nulls**, because a row that says "unknown" is noise dressed as information. A figure nobody could
 *     trace is left out and said so in the catalogue file, not printed as a dash.
 *
 * A key ending in `_km`, `_kg`, `_m`, `_c`, `_kmh` or `_days` is printed with its unit; other keys are
 * printed as they are, so a count stays a count.
 */

const UNITS: Record<string, string> = {
  kg: "kg",
  km: "km",
  m: "m",
  c: "°C",
  kmh: "km/h",
  hours: "hours",
  days: "days",
  years: "years",
};

const MAX_SAFE = Number.MAX_SAFE_INTEGER;

function formatValue(key: string, value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (typeof value === "string") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value) || Math.abs(value) > MAX_SAFE) return null;
    const unit = UNITS[key.split("_").pop() ?? ""];
    const rounded = Number.isInteger(value) ? value.toLocaleString("en-GB") : value.toLocaleString("en-GB", { maximumFractionDigits: 2 });
    return unit ? rounded + " " + unit : rounded;
  }
  return null;
}

function label(key: string): string {
  const withoutUnit = key.replace(/_(kg|km|m|c|kmh|hours|days|years)$/, "");
  const words = withoutUnit.replace(/_/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export interface ItemSpecsProps {
  metadata: Record<string, unknown>;
  className?: string;
}

export function ItemSpecs({ metadata, className }: ItemSpecsProps) {
  const rows = Object.entries(metadata)
    .filter(([key]) => key !== "source" && key !== "kind" && key !== "facts" && key !== "subtitle")
    .map(([key, value]) => ({ key, label: label(key), value: formatValue(key, value) }))
    .filter((row): row is { key: string; label: string; value: string } => row.value !== null);

  if (rows.length === 0) return null;

  return (
    <dl className={cn("grid gap-x-6 gap-y-2 sm:grid-cols-2", className)}>
      {rows.map((row) => (
        <div key={row.key} className="flex items-baseline justify-between gap-4 border-b border-white/8 py-1.5">
          <dt className="text-xs uppercase tracking-wide text-white/40">{row.label}</dt>
          <dd className="text-sm font-medium text-white/85">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
