import "server-only";

import { cache } from "react";

import bundled from "@/data/data2map-registry.json";
import { getSupabaseUncached } from "@/lib/supabase";

/**
 * The Data2Map registry, from the database when there is one and from the bundled file when
 * there is not.
 *
 * The same arrangement as every other dataset in this repository: `data/data2map-registry.json`
 * is the source of truth and the two tables are a copy of it, so a fresh clone opens
 * `/data2map` and sees the module rather than an empty page.
 *
 * Every layer carries the provenance of the dataset behind it - source, licence, year, and
 * whether it is simulated - because that is the discipline the animal maps were held to and a
 * data product with unattributed layers is worse than one with fewer layers.
 *
 * The read goes through `getSupabaseUncached()`: the pages that call this are static, so the
 * registry is read once per build, and a cached GET from a previous build would serve a layer list
 * that no longer matches the database. See `lib/supabase.ts`.
 */

export interface Data2MapDataset {
  slug: string;
  name: string;
  product: string;
  kind: string;
  source: string;
  sourceUrl: string | null;
  license: string;
  licenseLabel: string | null;
  attribution: string;
  year: number | null;
  geometryKind: string | null;
  recordCount: number | null;
  synthetic: boolean;
  note: string | null;
  status: "planned" | "live" | "retired";
}

export interface Data2MapLayer {
  id: string;
  label: string;
  hint: string;
  product: string;
  datasetSlug: string | null;
  defaultVisible: boolean;
  defaultOpacity: number;
  sortOrder: number;
}

export interface Data2MapRegistry {
  datasets: Data2MapDataset[];
  layers: Data2MapLayer[];
  source: "database" | "bundled";
}

interface BundledDataset {
  slug: string;
  name: string;
  product: string;
  kind: string;
  source: string;
  sourceUrl?: string | null;
  license: string;
  licenseLabel?: string | null;
  attribution: string;
  year?: number | null;
  geometryKind?: string | null;
  recordCount?: number | null;
  synthetic?: boolean;
  note?: string | null;
  status: Data2MapDataset["status"];
}

interface BundledLayer {
  id: string;
  label: string;
  hint: string;
  product: string;
  datasetSlug?: string | null;
  defaultVisible?: boolean;
  defaultOpacity: number;
  sortOrder?: number;
}

const BUNDLED = bundled as unknown as { datasets: BundledDataset[]; layers: BundledLayer[] };

function fromBundled(): Data2MapRegistry {
  return {
    datasets: BUNDLED.datasets.map((dataset) => ({
      slug: dataset.slug,
      name: dataset.name,
      product: dataset.product,
      kind: dataset.kind,
      source: dataset.source,
      sourceUrl: dataset.sourceUrl ?? null,
      license: dataset.license,
      licenseLabel: dataset.licenseLabel ?? null,
      attribution: dataset.attribution,
      year: dataset.year ?? null,
      geometryKind: dataset.geometryKind ?? null,
      recordCount: dataset.recordCount ?? null,
      synthetic: dataset.synthetic === true,
      note: dataset.note ?? null,
      status: dataset.status,
    })),
    layers: BUNDLED.layers.map((layer) => ({
      id: layer.id,
      label: layer.label,
      hint: layer.hint,
      product: layer.product,
      datasetSlug: layer.datasetSlug ?? null,
      defaultVisible: layer.defaultVisible === true,
      defaultOpacity: layer.defaultOpacity,
      sortOrder: layer.sortOrder ?? 0,
    })),
    source: "bundled",
  };
}

interface DatasetRow {
  slug: string;
  name: string;
  product: string;
  kind: string;
  source: string;
  source_url: string | null;
  license: string;
  license_label: string | null;
  attribution: string;
  year: number | null;
  geometry_kind: string | null;
  record_count: number | null;
  synthetic: boolean;
  note: string | null;
  status: Data2MapDataset["status"];
}

interface LayerRow {
  id: string;
  label: string;
  hint: string;
  product: string;
  dataset_slug: string | null;
  default_visible: boolean;
  default_opacity: number;
  sort_order: number;
}

async function loadRegistry(): Promise<Data2MapRegistry> {
  const supabase = getSupabaseUncached();
  if (!supabase) return fromBundled();

  try {
    const [datasets, layers] = await Promise.all([
      supabase.from("data2map_datasets").select("*").order("product"),
      supabase.from("data2map_layers").select("*").order("sort_order"),
    ]);

    if (datasets.error) throw datasets.error;
    if (layers.error) throw layers.error;
    if (!datasets.data || datasets.data.length === 0) return fromBundled();

    return {
      datasets: (datasets.data as unknown as DatasetRow[]).map((row) => ({
        slug: row.slug,
        name: row.name,
        product: row.product,
        kind: row.kind,
        source: row.source,
        sourceUrl: row.source_url,
        license: row.license,
        licenseLabel: row.license_label,
        attribution: row.attribution,
        year: row.year,
        geometryKind: row.geometry_kind,
        recordCount: row.record_count,
        synthetic: row.synthetic,
        note: row.note,
        status: row.status,
      })),
      layers: ((layers.data ?? []) as unknown as LayerRow[]).map((row) => ({
        id: row.id,
        label: row.label,
        hint: row.hint,
        product: row.product,
        datasetSlug: row.dataset_slug,
        defaultVisible: row.default_visible,
        defaultOpacity: Number(row.default_opacity),
        sortOrder: row.sort_order,
      })),
      source: "database",
    };
  } catch (error) {
    console.warn("[kami3d] falling back to the bundled Data2Map registry:", (error as Error).message);
    return fromBundled();
  }
}

/** Deduped per request, like the catalogue and the geodata. */
export const getData2MapRegistry = cache(loadRegistry);

/** The layers one product page draws, in registry order. */
export function layersForProduct(registry: Data2MapRegistry, product: string): Data2MapLayer[] {
  return registry.layers
    .filter((layer) => layer.product === product)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));
}

/** The dataset behind a layer, or null when the layer has no data yet. */
export function datasetForLayer(registry: Data2MapRegistry, layer: Data2MapLayer): Data2MapDataset | null {
  if (!layer.datasetSlug) return null;
  return registry.datasets.find((dataset) => dataset.slug === layer.datasetSlug) ?? null;
}
