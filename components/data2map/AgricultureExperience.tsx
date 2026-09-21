"use client";

import { AlertTriangle, Info, Leaf, Layers, Sprout } from "lucide-react";
import dynamic from "next/dynamic";
import * as React from "react";

import { LayerPanel } from "@/components/map/LayerPanel";
import { MapSkeleton } from "@/components/map/LazyMap";
import { RangeTimeline } from "@/components/map/TimelinePanel";
import { useSettings } from "@/components/settings/SettingsProvider";
import { MountWhenVisible } from "@/components/3d/MountWhenVisible";
import { DailyBars } from "@/components/stats/DailyBars";
import { Sparkline } from "@/components/stats/Sparkline";
import {
  fieldSeasonMean,
  harvestByMonth,
  productionByProvince,
  type AgricultureSample,
  type FieldProperties,
} from "@/lib/data2map/agriculture";
import {
  NDVI_CLASSES,
  NDVI_NODATA_COLOR,
  adviceFor,
  classifyNdvi,
  cropModel,
  estimateYield,
} from "@/lib/data2map/ndvi";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import type { Data2MapLayer } from "@/lib/data2map";

/**
 * The agriculture dashboard: a real raster, a simulated sample, and the line between them drawn in
 * public.
 *
 * The clock steps through the **8-day composites NASA actually publishes** (28 of them, February to
 * September 2025) and the raster tile is built from the selected date, so what is on screen is a
 * real MODIS NDVI composite for that period. The parcels underneath are a simulated sample: their
 * colour comes from a simulated series, and every number in the panel says where it came from -
 * which for the yield is a printed coefficient list, not a citation it has not earned.
 */

const AgricultureCanvasView = dynamic(
  () => import("@/components/data2map/AgricultureCanvas").then((mod) => mod.AgricultureCanvas),
  { ssr: false, loading: () => <MapSkeleton /> },
);

export interface AgricultureExperienceProps {
  sample: AgricultureSample;
  layers: Data2MapLayer[];
  sources: Record<string, string>;
  omittedLayers: string[];
}

/** The parcels, with the NDVI class of the selected period attached for the renderer. */
function fieldsAtPeriod(sample: AgricultureSample, index: number): FeatureCollection<Geometry> {
  const features = sample.fields.map((field) => {
    const value = field.properties.ndvi_series[index] ?? null;
    const entry = classifyNdvi(value);

    return {
      ...field,
      properties: { ...field.properties, ndvi_now: value, class_id: entry ? entry.id : "nodata" },
    };
  });

  return { type: "FeatureCollection", features } as unknown as FeatureCollection<Geometry>;
}

export function AgricultureExperience({ sample, layers, sources, omittedLayers }: AgricultureExperienceProps) {
  const reduceMotion = useSettings().settings.reduceMotion;

  const [period, setPeriod] = React.useState(10);
  const [selectedId, setSelectedId] = React.useState<string | null>(sample.fields[0]?.properties.field_id ?? null);
  const [visible, setVisible] = React.useState<Record<string, boolean>>(() =>
    Object.fromEntries(layers.map((layer) => [layer.id, layer.defaultVisible])),
  );
  const [opacity, setOpacity] = React.useState<Record<string, number>>(() =>
    Object.fromEntries(layers.map((layer) => [layer.id, layer.defaultOpacity])),
  );

  const index = Math.min(period, sample.periods.length - 1);
  const date = sample.periods[index]?.date ?? sample.periods[0].date;
  const fields = React.useMemo(() => fieldsAtPeriod(sample, index), [sample, index]);
  const production = React.useMemo(() => productionByProvince(sample), [sample]);
  const months = React.useMemo(() => harvestByMonth(sample), [sample]);

  const selected = sample.fields.find((field) => field.properties.field_id === selectedId) ?? null;

  const analysis = React.useMemo(() => {
    if (!selected) return null;
    const properties: FieldProperties = selected.properties;
    const ndviNow = properties.ndvi_series[index] ?? null;
    const mean = fieldSeasonMean(selected);
    const estimate = estimateYield({ crop: properties.crop as never, meanNdvi: mean, areaHa: properties.area_ha });
    const gaps = properties.ndvi_series.filter((value) => value === null).length;

    return {
      properties,
      ndviNow,
      classNow: classifyNdvi(ndviNow),
      mean,
      estimate,
      gaps,
      advice: adviceFor(properties.crop as never, mean),
      province: sample.provinces.find((entry) => entry.properties.province_id === properties.province_id)?.properties.name ?? "",
      model: cropModel(properties.crop as never),
    };
  }, [selected, index, sample]);

  const available = {
    ndvi: sample.periods.length,
    rain: sample.periods.length,
    province: sample.provinces.length,
    field: sample.fields.length,
  };

  const sampledArea = Math.round(sample.fields.reduce((sum, field) => sum + field.properties.area_ha, 0));
  const sampledTonnes = Math.round(sample.fields.reduce((sum, field) => sum + (field.properties.yield_tonnes ?? 0), 0));
  const withYield = sample.fields.filter((field) => (field.properties.yield_tonnes ?? 0) > 0).length;

  const entry = (layer: Data2MapLayer) => ({
    id: layer.id,
    label: layer.label,
    hint: layer.hint,
    source: sources[layer.id] ?? "no dataset yet",
    license: layer.id === "ndvi" || layer.id === "rain" ? "Public domain" : "CC0",
  });

  const series = analysis
    ? analysis.properties.ndvi_series
        .map((value, position) => ({ day: String(position), views: value === null ? null : Math.round(value * 100) }))
        .filter((point): point is { day: string; views: number } => point.views !== null)
    : [];

  return (
    <div className="grid gap-4 lg:grid-cols-[22rem_minmax(0,1fr)]">
      <aside className="space-y-4">
        <RangeTimeline
          years={sample.periods.map((_, position) => position)}
          year={index}
          onYear={setPeriod}
          events={[]}
          gapMessage="The raster behind this map is real: NASA MODIS NDVI, 8-day composites. The parcels and their numbers are a simulated sample, and say so."
          reduceMotion={reduceMotion}
          format={(position) => sample.periods[position]?.label ?? "—"}
          labels={{
            heading: "8-day composite",
            aria: "Composite date",
            play: "Play the season",
            pause: "Pause the season",
            reset: "Back to the first composite",
            span: (count) => count + " composites of the 2025 season",
            empty: "Nothing is annotated here: the season is a series of satellite composites, not events.",
          }}
          stepMs={900}
        />

        <div className="glass rounded-[var(--radius-card)] p-4">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">Legend</h2>
            <span className="text-[10px] text-glow">NDVI</span>
          </div>
          <ul className="mt-3 space-y-2">
            {NDVI_CLASSES.map((entryClass) => (
              <li key={entryClass.id} className="flex items-start gap-2">
                <span className="mt-1 size-2.5 shrink-0 rounded-sm" style={{ backgroundColor: entryClass.color }} aria-hidden />
                <span className="text-[10px] leading-relaxed text-white/60">
                  <span className="text-white/80">{entryClass.label}</span> · {entryClass.from} to {entryClass.to}
                  <span className="block text-white/35">{entryClass.hint}</span>
                </span>
              </li>
            ))}
            <li className="flex items-start gap-2">
              <span className="mt-1 size-2.5 shrink-0 rounded-sm" style={{ backgroundColor: NDVI_NODATA_COLOR }} aria-hidden />
              <span className="text-[10px] leading-relaxed text-white/60">
                <span className="text-white/80">No reading</span>
                <span className="block text-white/35">Cloud, water or a swath gap. Drawn as an absence, never as healthy vegetation.</span>
              </span>
            </li>
          </ul>
        </div>

        <div className="glass rounded-[var(--radius-card)] p-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">Sample</h2>
          <ul className="mt-3 space-y-1.5 text-[10px]">
            <li className="flex justify-between gap-2">
              <span className="text-white/60">Parcels</span>
              <span className="tabular-nums text-white/80">{sample.fields.length}</span>
            </li>
            <li className="flex justify-between gap-2">
              <span className="text-white/60">Sampled area</span>
              <span className="tabular-nums text-white/80">{sampledArea.toLocaleString("en-US")} ha</span>
            </li>
            <li className="flex justify-between gap-2">
              <span className="text-white/60">Estimated yield</span>
              <span className="tabular-nums text-white/80">{sampledTonnes.toLocaleString("en-US")} t</span>
            </li>
            <li className="flex justify-between gap-2">
              <span className="text-white/60">Parcels with an estimate</span>
              <span className="tabular-nums text-white/80">{withYield}/{sample.fields.length}</span>
            </li>
          </ul>

          <p className="mt-3 text-[10px] uppercase tracking-wide text-white/35">Harvested area by month, simulated calendar</p>
          <DailyBars
            points={months.map((month) => ({ day: month.label, views: Math.round(month.value) }))}
            height={40}
            label={
              "Simulated harvested area by month across the sample, in hectares: " +
              months.map((month) => month.label + ": " + Math.round(month.value)).join(", ")
            }
          />

          <ul className="mt-3 space-y-1 text-[10px] text-white/55">
            {production.slice(0, 4).map((province) => (
              <li key={province.provinceId} className="flex justify-between gap-2">
                <span>{province.name}</span>
                <span className="tabular-nums text-white/45">
                  {province.sampledTonnes} t · {Math.round(province.simulatedShare * 100)}% share
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[10px] leading-relaxed text-white/35">
            Tonnes are the sum of the parcels in this sample, not a provincial harvest; the share beside it is the
            simulated supply distribution the file carries.
          </p>
        </div>

        <LayerPanel<"ndvi" | "rain" | "province" | "field">
          layers={layers.map(entry)}
          visible={visible}
          opacity={opacity}
          available={available}
          onToggle={(id, next) => setVisible((current) => ({ ...current, [id]: next }))}
          onOpacity={(id, next) => setOpacity((current) => ({ ...current, [id]: next }))}
        />


        {analysis ? (
          <div className="glass rounded-[var(--radius-card)] p-4">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">This parcel</h2>
              <span className="text-[10px] tabular-nums text-white/45">{analysis.properties.field_id}</span>
            </div>

            <p className="mt-2 flex items-center gap-2 text-[11px] text-white/80">
              <Sprout className="size-3.5 text-neon" aria-hidden />
              {analysis.properties.crop_label} · {analysis.province} · {analysis.properties.area_ha} ha
            </p>

            <ul className="mt-3 space-y-1.5 text-[10px]">
              <li className="flex justify-between gap-2">
                <span className="text-white/60">NDVI at this composite</span>
                <span className="tabular-nums text-white/80">
                  {analysis.ndviNow === null ? (
                    <span className="text-solar">no reading</span>
                  ) : (
                    analysis.ndviNow + (analysis.classNow ? " · " + analysis.classNow.label : "")
                  )}
                </span>
              </li>
              <li className="flex justify-between gap-2">
                <span className="text-white/60">Season mean</span>
                <span className="tabular-nums text-white/80">{analysis.mean ?? "—"}</span>
              </li>
              <li className="flex justify-between gap-2">
                <span className="text-white/60">Sowing month</span>
                <span className="tabular-nums text-white/80">{analysis.properties.sowing_month}</span>
              </li>
              <li className="flex justify-between gap-2">
                <span className="text-white/60">Estimated yield</span>
                <span className="tabular-nums text-white/80">
                  {analysis.estimate ? analysis.estimate.tonnesPerHa + " t/ha · " + analysis.estimate.tonnes + " t" : "—"}
                </span>
              </li>
            </ul>

            <p className="mt-3 text-[10px] uppercase tracking-wide text-white/35">
              Simulated season · {analysis.gaps} cloud gap(s) omitted
            </p>
            <Sparkline
              points={series}
              width={220}
              height={40}
              className="w-full"
              label={"Simulated NDVI for " + analysis.properties.field_id + ", season mean " + analysis.mean}
            />

            <p className="mt-3 flex items-start gap-2 rounded-xl bg-white/5 px-3 py-2 text-[10px] leading-relaxed text-white/60 ring-1 ring-white/10">
              <Leaf className="mt-0.5 size-3 shrink-0 text-neon" aria-hidden />
              {analysis.advice}
            </p>

            <p className="mt-3 flex items-start gap-2 text-[10px] leading-relaxed text-white/35">
              <Info className="mt-0.5 size-3 shrink-0" aria-hidden />
              t/ha = {analysis.model.baseYieldTPerHa} × vigour, where vigour is the season mean NDVI between the crop's
              floor ({analysis.model.ndviFloor}) and its reference ({analysis.model.ndviAtBase}), clamped at both ends.
              Coefficients: {analysis.properties.yield_source}
            </p>
          </div>
        ) : null}

        {omittedLayers.length > 0 ? (
          <div className="glass rounded-[var(--radius-card)] p-4 text-[10px] leading-relaxed text-white/45">
            <p className="font-medium text-white/70">Not drawn</p>
            <ul className="mt-1 list-inside list-disc space-y-1">
              {omittedLayers.map((entryText) => (
                <li key={entryText}>{entryText}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <p className="flex items-start gap-2 text-[10px] leading-relaxed text-white/30">
          <Layers className="mt-0.5 size-3 shrink-0" aria-hidden />
          {sample.attribution}
        </p>
      </aside>

      <div className="relative h-[460px] overflow-hidden rounded-[var(--radius-card)] ring-1 ring-white/10 sm:h-[560px] lg:h-[640px]">
        <MountWhenVisible className="h-full w-full" placeholder={<MapSkeleton />}>
          <AgricultureCanvasView
            provinces={{ type: "FeatureCollection", features: sample.provinces as unknown as Feature<Geometry>[] }}
            fields={fields}
            date={date}
            visible={visible}
            opacity={opacity}
            bounds={null}
            onPickField={setSelectedId}
          />
        </MountWhenVisible>

        <p className="pointer-events-none absolute bottom-3 left-3 z-10 rounded-full bg-void/70 px-3 py-1.5 text-[10px] text-white/55 backdrop-blur">
          NASA GIBS · MODIS NDVI · {sample.periods[index]?.label} · parcels simulated
        </p>
      </div>
    </div>
  );
}

