"use client";

import { CheckCircle2, Upload } from "lucide-react";
import * as React from "react";

import { LazyMap } from "@/components/map/LazyMap";
import { Button } from "@/components/ui/button";
import { IMPORT_KINDS } from "@/lib/geodata-import";
import { DEFAULT_LAYER_OPACITY, DEFAULT_LAYER_VISIBILITY, type MapLayerId } from "@/lib/map-query";
import { cn } from "@/lib/utils";
import type { GeodataFeature } from "@/types/geodata";

/**
 * The upload form.
 *
 * Everything it knows about validity comes from the server: `POST` without `publish` runs the
 * same gate the CLI runs and answers with the summary and the refusals, so the page cannot
 * disagree with the pipeline about what a valid import is. The preview is drawn on the same
 * map component `/map` uses, loaded lazily, so what an admin sees before publishing is what a
 * visitor would see after.
 */

interface PreviewState {
  summary: { features: number; points: number; polygons: number; bounds: [number, number, number, number] | null };
  warnings: string[];
  features: GeodataFeature[];
}

const EMPTY_VISIBILITY = Object.fromEntries(Object.keys(DEFAULT_LAYER_VISIBILITY).map((id) => [id, false])) as Record<MapLayerId, boolean>;

export function GeodataUploadForm({ species }: { species: { slug: string; name: string }[] }) {
  const [file, setFile] = React.useState("");
  const [slug, setSlug] = React.useState(species[0]?.slug ?? "");
  const [kind, setKind] = React.useState<string>(IMPORT_KINDS[0]);
  const [year, setYear] = React.useState("");
  const [source, setSource] = React.useState("");
  const [sourceUrl, setSourceUrl] = React.useState("");
  const [license, setLicense] = React.useState("CC0");
  const [attribution, setAttribution] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [errors, setErrors] = React.useState<string[]>([]);
  const [preview, setPreview] = React.useState<PreviewState | null>(null);
  const [published, setPublished] = React.useState<string | null>(null);

  async function send(publish: boolean) {
    setBusy(true);
    setErrors([]);
    setPublished(null);

    try {
      const response = await fetch("/api/admin/geodata", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          file,
          slug,
          kind,
          year: year.trim().length > 0 ? Number(year) : null,
          source,
          sourceUrl,
          license,
          attribution,
          publish,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setErrors(data.errors ?? [data.error ?? "The import was refused."]);
        return;
      }

      if (publish) {
        setPublished(`Published ${data.published} row(s) as ${data.version}.`);
        setPreview(null);
      } else {
        setPreview({ summary: data.summary, warnings: data.warnings ?? [], features: data.features ?? [] });
      }
    } catch (error) {
      setErrors([(error as Error).message]);
    } finally {
      setBusy(false);
    }
  }

  const bounds = preview?.summary.bounds ?? null;

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="space-y-4">
        <div className="glass rounded-[var(--radius-card)] p-4">
          <label htmlFor="geodata-file" className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">
            File contents (GeoJSON or CSV with coordinates)
          </label>
          <textarea
            id="geodata-file"
            value={file}
            onChange={(event) => setFile(event.target.value)}
            spellCheck={false}
            rows={10}
            placeholder='{"type":"FeatureCollection","features":[…]} or lat,lng rows'
            className="mt-2 w-full rounded-xl bg-white/6 p-3 font-mono text-[11px] text-white/85 outline-none ring-1 ring-white/10 placeholder:text-white/25 focus-visible:ring-neon/60"
          />
          <p className="mt-2 text-[10px] leading-relaxed text-white/35">
            Shapefiles are not read here — convert first: <code>ogr2ogr -f GeoJSON out.geojson in.shp</code>.
            Anything larger than 4 MB belongs in the CLI, which runs the same checks.
          </p>
        </div>

        {errors.length > 0 ? (
          <div role="alert" className="rounded-2xl bg-coral/12 p-4 text-xs leading-relaxed text-coral ring-1 ring-coral/25">
            <p className="font-medium">Refused</p>
            <ul className="mt-1 list-inside list-disc space-y-1">
              {errors.slice(0, 8).map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {published ? (
          <p role="status" className="flex items-center gap-2 rounded-2xl bg-neon/12 p-4 text-xs text-neon ring-1 ring-neon/25">
            <CheckCircle2 className="size-4" aria-hidden />
            {published}
          </p>
        ) : null}

        <div className="relative h-[320px] overflow-hidden rounded-[var(--radius-card)] ring-1 ring-white/10">
          {preview && preview.features.length > 0 ? (
            <LazyMap
              className="h-full w-full"
              features={preview.features}
              visible={{ ...EMPTY_VISIBILITY, [kind === "habitat_historic" ? "historic" : kind === "occurrence" ? "occurrence" : "habitat"]: true }}
              opacity={DEFAULT_LAYER_OPACITY}
              selectedSlug={slug}
              regionBounds={bounds}
              onSelect={() => undefined}
              speciesCount={1}
              regionCount={1}
            />
          ) : (
            <div className="grid h-full place-items-center bg-gradient-to-br from-surface to-abyss p-6 text-center text-xs text-white/40">
              Preview appears here — nothing is written until you publish.
            </div>
          )}
        </div>
      </div>

      <aside className="space-y-4">
        <div className="glass space-y-3 rounded-[var(--radius-card)] p-4">
          <label className="block text-[11px] uppercase tracking-wide text-white/40" htmlFor="geodata-slug">Species</label>
          <select
            id="geodata-slug"
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
            className="h-9 w-full rounded-full bg-white/6 px-3 text-xs text-white/85 outline-none ring-1 ring-white/10"
          >
            {species.map((entry) => (
              <option key={entry.slug} value={entry.slug} className="bg-abyss text-white">
                {entry.name}
              </option>
            ))}
          </select>

          <label className="block text-[11px] uppercase tracking-wide text-white/40" htmlFor="geodata-kind">Layer</label>
          <select
            id="geodata-kind"
            value={kind}
            onChange={(event) => setKind(event.target.value)}
            className="h-9 w-full rounded-full bg-white/6 px-3 text-xs text-white/85 outline-none ring-1 ring-white/10"
          >
            {IMPORT_KINDS.map((value) => (
              <option key={value} value={value} className="bg-abyss text-white">
                {value}
              </option>
            ))}
          </select>

          <label className="block text-[11px] uppercase tracking-wide text-white/40" htmlFor="geodata-year">
            Year (optional)
          </label>
          <input
            id="geodata-year"
            value={year}
            onChange={(event) => setYear(event.target.value)}
            inputMode="numeric"
            placeholder="present day"
            className="h-9 w-full rounded-full bg-white/6 px-3 text-xs text-white/85 outline-none ring-1 ring-white/10"
          />

          <label className="block text-[11px] uppercase tracking-wide text-white/40" htmlFor="geodata-source">Source</label>
          <input
            id="geodata-source"
            value={source}
            onChange={(event) => setSource(event.target.value)}
            placeholder="IUCN Red List"
            className="h-9 w-full rounded-full bg-white/6 px-3 text-xs text-white/85 outline-none ring-1 ring-white/10"
          />

          <label className="block text-[11px] uppercase tracking-wide text-white/40" htmlFor="geodata-source-url">Source URL</label>
          <input
            id="geodata-source-url"
            value={sourceUrl}
            onChange={(event) => setSourceUrl(event.target.value)}
            placeholder="https://…"
            className="h-9 w-full rounded-full bg-white/6 px-3 text-xs text-white/85 outline-none ring-1 ring-white/10"
          />

          <label className="block text-[11px] uppercase tracking-wide text-white/40" htmlFor="geodata-license">Licence</label>
          <select
            id="geodata-license"
            value={license}
            onChange={(event) => setLicense(event.target.value)}
            className="h-9 w-full rounded-full bg-white/6 px-3 text-xs text-white/85 outline-none ring-1 ring-white/10"
          >
            <option value="CC0" className="bg-abyss text-white">CC0</option>
            <option value="CC-BY" className="bg-abyss text-white">CC BY</option>
          </select>

          <label className="block text-[11px] uppercase tracking-wide text-white/40" htmlFor="geodata-attribution">Attribution</label>
          <input
            id="geodata-attribution"
            value={attribution}
            onChange={(event) => setAttribution(event.target.value)}
            placeholder="Dataset (CC BY 4.0)"
            className="h-9 w-full rounded-full bg-white/6 px-3 text-xs text-white/85 outline-none ring-1 ring-white/10"
          />

          <div className="flex flex-wrap gap-2 pt-1">
            <Button type="button" variant="secondary" size="sm" disabled={busy || file.length === 0} onClick={() => void send(false)}>
              <Upload className="size-3.5" /> Preview
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={busy || file.length === 0 || preview === null}
              onClick={() => void send(true)}
            >
              Publish
            </Button>
          </div>

          <p className="text-[10px] leading-relaxed text-white/35">
            Publishing adds a row per feature under a version name, so re-importing appends
            rather than overwrites. Nothing is deleted, ever.
          </p>
        </div>

        {preview ? (
          <div className="glass rounded-[var(--radius-card)] p-4 text-[11px] leading-relaxed text-white/60">
            <p className="font-medium text-white/85">Preview</p>
            <p className="mt-1">
              {preview.summary.features} feature(s) · {preview.summary.polygons} polygon(s) ·{" "}
              {preview.summary.points} point(s)
            </p>
            {preview.warnings.length > 0 ? (
              <ul className="mt-2 space-y-1 text-solar">
                {preview.warnings.slice(0, 6).map((warning) => (
                  <li key={warning}>! {warning}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-neon">Every row passed validation.</p>
            )}
          </div>
        ) : null}
      </aside>
    </div>
  );
}
