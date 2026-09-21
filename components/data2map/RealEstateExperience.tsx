"use client";

import { AlertTriangle, Info, Layers } from "lucide-react";
import dynamic from "next/dynamic";
import * as React from "react";

import { LayerPanel } from "@/components/map/LayerPanel";
import { MapSkeleton } from "@/components/map/LazyMap";
import { Switch } from "@/components/settings/Controls";
import { MountWhenVisible } from "@/components/3d/MountWhenVisible";
import { pointInPolygon } from "@/lib/geo";
import { assessPotential, medianPrice, POTENTIAL_WEIGHTS } from "@/lib/data2map/score";
import { cn } from "@/lib/utils";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import type { Data2MapLayer } from "@/lib/data2map";

/**
 * The real-estate page: map, layers, and a score you can argue with.
 *
 * The click handler does the real work: it finds which hex, parcel and flood band the visitor
 * clicked, counts the amenities within a kilometre, and hands the four inputs to
 * `assessPotential` - a pure function with its own check suite. The panel then prints the score
 * **and every input behind it**, including which ones were missing, because this number is meant
 * to inform a purchase decision and a bare figure would be dishonest.
 *
 * The map itself is loaded lazily, exactly like `/map`: a route with a map pays for the renderer,
 * and the landing page does not.
 */

const RealEstateCanvasView = dynamic(
  () => import("@/components/data2map/RealEstateCanvas").then((mod) => mod.RealEstateCanvas),
  { ssr: false, loading: () => <MapSkeleton /> },
);

const rad = Math.PI / 180;

function distanceKm(a: { lng: number; lat: number }, b: { lng: number; lat: number }) {
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}

export interface RealEstateExperienceProps {
  features: FeatureCollection<Geometry>;
  layers: Data2MapLayer[];
  attribution: string;
  area: { west: number; south: number; east: number; north: number };
  /** Why the pollution layer is not here, so the page can say it rather than omit it. */
  omittedLayers: string[];
}

const AMENITY_RADIUS_KM = 1;

export function RealEstateExperience({ features, layers, attribution, area, omittedLayers }: RealEstateExperienceProps) {
  const [visible, setVisible] = React.useState<Record<string, boolean>>(() =>
    Object.fromEntries(layers.map((layer) => [layer.id, layer.defaultVisible])),
  );
  const [opacity, setOpacity] = React.useState<Record<string, number>>(() =>
    Object.fromEntries(layers.map((layer) => [layer.id, layer.defaultOpacity])),
  );
  const [satellite, setSatellite] = React.useState(false);
  const [amenities, setAmenities] = React.useState<FeatureCollection<Geometry> | null>(null);
  const [amenityNote, setAmenityNote] = React.useState<string | null>(null);
  const [picked, setPicked] = React.useState<{ lng: number; lat: number } | null>(null);

  const median = React.useMemo(
    () => medianPrice(features.features.filter((f) => (f.properties as { layer?: string })?.layer === "land_price").map((f) => Number((f.properties as { price_vnd_m2?: number }).price_vnd_m2 ?? 0))),
    [features],
  );

  // The one real layer: OpenStreetMap through our own endpoint, which stores nothing (ODbL).
  React.useEffect(() => {
    let cancelled = false;

    fetch(`/api/data2map/amenities?west=${area.west}&south=${area.south}&east=${area.east}&north=${area.north}`)
      .then(async (response) => {
        const data = await response.json();
        if (cancelled) return;
        if (!response.ok) {
          setAmenityNote(data.error ?? "Amenities are unavailable right now.");
          return;
        }
        setAmenities({ type: "FeatureCollection", features: data.features ?? [] });
        setAmenityNote(`${(data.features ?? []).length} amenities from OpenStreetMap (ODbL).`);
      })
      .catch(() => setAmenityNote("Amenities are unavailable right now."));

    return () => {
      cancelled = true;
    };
  }, [area]);

  const available = React.useMemo(() => {
    const counts: Record<string, number> = {};
    for (const layer of layers) {
      counts[layer.id] = features.features.filter((feature) => (feature.properties as { layer?: string })?.layer === layer.id).length;
    }
    if (amenities) counts.amenity = amenities.features.length;
    return counts;
  }, [features, layers, amenities]);

  /** Everything the score needs, resolved from the click. */
  const selection = React.useMemo(() => {
    if (!picked) return null;
    const point = [picked.lng, picked.lat];

    const findIn = (layer: string) =>
      features.features.find((feature) => {
        const props = feature.properties as { layer?: string } | null;
        if (props?.layer !== layer) return false;
        if (feature.geometry.type === "Polygon") return pointInPolygon(point, feature.geometry.coordinates as number[][][]);
        return false;
      });

    const hex = findIn("land_price");
    const parcel = findIn("zoning");
    const flood = findIn("flood");

    const near = (amenities?.features ?? []).filter((feature: Feature<Geometry>) => {
      const geometry = feature.geometry;
      if (geometry.type !== "Point") return false;
      const [lng, lat] = geometry.coordinates as [number, number];
      return distanceKm({ lng, lat }, picked) <= AMENITY_RADIUS_KM;
    });

    const counts: Record<string, number> = { school: 0, hospital: 0, market: 0, park: 0 };
    for (const feature of near) {
      const kind = String((feature.properties as { kind?: string } | null)?.kind ?? "");
      if (kind in counts) counts[kind] += 1;
    }

    const price = hex ? Number((hex.properties as { price_vnd_m2?: number }).price_vnd_m2 ?? 0) : null;
    const zone = parcel ? String((parcel.properties as { zone?: string }).zone ?? "") : null;
    const far = parcel ? Number((parcel.properties as { far?: number }).far ?? 0) : null;
    const level = flood ? String((flood.properties as { level?: string }).level ?? "") : "none";

    return {
      price,
      zone,
      far,
      level,
      counts,
      amenitiesKnown: amenities !== null,
      breakdown: assessPotential({
        priceVndM2: price,
        medianVndM2: median,
        amenities: amenities === null ? null : counts,
        floodLevel: level,
        zone,
        far,
      }),
    };
  }, [picked, features, amenities, median]);

  const entry = (layer: Data2MapLayer) => ({
    id: layer.id,
    label: layer.label,
    hint: layer.hint,
    source: layer.datasetSlug ? layer.datasetSlug : "no dataset yet",
    license: layer.id === "amenity" ? "ODbL" : "CC0",
  });

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_21rem]">
      <div className="relative h-[460px] overflow-hidden rounded-[var(--radius-card)] ring-1 ring-white/10 sm:h-[560px] lg:h-[640px]">
        <MountWhenVisible className="h-full w-full" placeholder={<MapSkeleton />}>
          <RealEstateCanvasView
            features={features}
            amenities={amenities}
            visible={visible}
            opacity={opacity}
            satellite={satellite}
            bounds={null}
            onPick={({ lng, lat }) => setPicked({ lng, lat })}
          />
        </MountWhenVisible>

        <p className="pointer-events-none absolute bottom-3 left-3 z-10 rounded-full bg-void/70 px-3 py-1.5 text-[10px] text-white/55 backdrop-blur">
          Click a hex to score the plot
        </p>
      </div>

      <aside className="space-y-4">
        <div className="glass rounded-[var(--radius-card)] p-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">Base</h2>
          <div className="mt-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-white/85">Satellite imagery</p>
              <p className="mt-0.5 text-[10px] leading-relaxed text-white/45">
                NASA GIBS, public domain — daily imagery from a 2024-01-01 snapshot, not a survey photograph.
              </p>
            </div>
            <Switch label="Satellite imagery" checked={satellite} onChange={setSatellite} setting="satellite" />
          </div>
        </div>

        <LayerPanel<"land_price" | "zoning" | "amenity" | "flood">
          layers={layers.map(entry)}
          visible={visible}
          opacity={opacity}
          available={available}
          onToggle={(id, next) => setVisible((current) => ({ ...current, [id]: next }))}
          onOpacity={(id, next) => setOpacity((current) => ({ ...current, [id]: next }))}
        />

        {amenityNote ? (
          <p className="flex items-start gap-2 text-[10px] leading-relaxed text-white/40">
            <Layers className="mt-0.5 size-3 shrink-0" aria-hidden />
            {amenityNote}
          </p>
        ) : null}

        {selection ? (
          <div className="glass rounded-[var(--radius-card)] p-4">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">Potential</h2>
              <span className={cn("text-lg font-semibold tabular-nums", selection.breakdown.band.textClass)}>
                {selection.breakdown.score ?? "—"}
              </span>
            </div>
            <p className={cn("text-[11px]", selection.breakdown.band.textClass)}>{selection.breakdown.band.label}</p>

            <ul className="mt-3 space-y-1.5 text-[10px]">
              <li className="flex justify-between gap-2">
                <span className="text-white/60">Price</span>
                <span className="tabular-nums text-white/80">
                  {selection.price ? `${Math.round(selection.price / 1_000_000)} tr/m²` : "no hex here"}
                </span>
              </li>
              <li className="flex justify-between gap-2">
                <span className="text-white/60">Area median</span>
                <span className="tabular-nums text-white/80">{median ? `${Math.round(median / 1_000_000)} tr/m²` : "—"}</span>
              </li>
              <li className="flex justify-between gap-2">
                <span className="text-white/60">Zoning</span>
                <span className="text-white/80">
                  {selection.zone ? `${selection.zone}${selection.far ? ` · FAR ${selection.far}` : ""}` : "unzoned in this sample"}
                </span>
              </li>
              <li className="flex justify-between gap-2">
                <span className="text-white/60">Flood</span>
                <span className="text-white/80">{selection.level}</span>
              </li>
              <li className="flex justify-between gap-2">
                <span className="text-white/60">Amenities within 1 km</span>
                <span className="text-white/80">
                  {selection.amenitiesKnown
                    ? Object.entries(selection.counts).filter(([, count]) => count > 0).map(([kind, count]) => `${count} ${kind}`).join(", ") || "none"
                    : "not loaded"}
                </span>
              </li>
            </ul>

            {selection.breakdown.missing.length > 0 ? (
              <p className="mt-3 flex items-start gap-2 rounded-xl bg-solar/10 px-3 py-2 text-[10px] leading-relaxed text-solar ring-1 ring-solar/20">
                <AlertTriangle className="mt-0.5 size-3 shrink-0" aria-hidden />
                Scored on {Math.round(selection.breakdown.coverage * 100)}% of the weight: {selection.breakdown.missing.join(", ")} missing.
              </p>
            ) : null}

            <p className="mt-3 flex items-start gap-2 text-[10px] leading-relaxed text-white/35">
              <Info className="mt-0.5 size-3 shrink-0" aria-hidden />
              A Kami3D index, not an appraisal: price {POTENTIAL_WEIGHTS.price}, amenities {POTENTIAL_WEIGHTS.amenity}, flood {POTENTIAL_WEIGHTS.flood}, zoning {POTENTIAL_WEIGHTS.zoning}. The price, zoning and flood layers are simulated; the amenities are real.
            </p>
          </div>
        ) : null}

        {omittedLayers.length > 0 ? (
          <div className="glass rounded-[var(--radius-card)] p-4 text-[10px] leading-relaxed text-white/45">
            <p className="font-medium text-white/70">Not drawn</p>
            <ul className="mt-1 list-inside list-disc space-y-1">
              {omittedLayers.map((entry) => (
                <li key={entry}>{entry}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <p className="text-[10px] leading-relaxed text-white/30">{attribution}</p>
      </aside>
    </div>
  );
}
