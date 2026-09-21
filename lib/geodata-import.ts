// Relative, with the extension: `scripts/check-import.mjs` imports this module in plain
// Node, which knows nothing about the `@/` alias. Types are erased, values are not.
import { isValidLngLat, ringIsClosed, ringIsSimple } from "./geo.ts";
import type { GeodataFeature, GeodataKind, GeodataLicense } from "../types/geodata.ts";

/**
 * What an admin upload becomes, and why it might be refused.
 *
 * The phase brief for the admin pipeline has one hard rule: nothing reaches PostGIS that
 * PostGIS would have to guess about. So this module is the gate - it reads GeoJSON or a CSV
 * with coordinates, turns it into features, and collects every reason a row was rejected
 * instead of dropping it quietly. The same function serves the CLI (`--report` prints the
 * result, `--apply` writes it) and the admin page, which is the only way the two can agree
 * about what a valid import is.
 *
 * Dependency-free and pure: `scripts/check-import.mjs` runs it in plain Node.
 */

export const IMPORT_KINDS: readonly GeodataKind[] = [
  "habitat_current",
  "habitat_historic",
  "protected_area",
  "occurrence",
];

export interface ImportOptions {
  slug: string;
  kind: string;
  /** Null means present day, which is what `animal_geodata.year` means. */
  year: number | null;
  source: string;
  license: string;
  attribution: string;
  sourceUrl?: string | null;
}

export interface ImportSummary {
  features: number;
  points: number;
  polygons: number;
  /** `[west, south, east, north]`, or null when there is nothing to show. */
  bounds: [number, number, number, number] | null;
  areaKm2: number;
}

export interface ImportResult {
  features: GeodataFeature[];
  /** Fatal: nothing can be imported. */
  errors: string[];
  /** Per-row: that row was skipped, and here is why. */
  warnings: string[];
  summary: ImportSummary;
}

const empty = (errors: string[], warnings: string[] = []): ImportResult => ({
  features: [],
  errors,
  warnings,
  summary: { features: 0, points: 0, polygons: 0, bounds: null, areaKm2: 0 },
});

/** The header row of a CSV, lower-cased and stripped of quotes and spaces. */
export function csvHeader(line: string): string[] {
  return line
    .split(",")
    .map((cell) => cell.trim().replace(/^"|"$/g, "").toLowerCase());
}

/**
 * Which columns hold the coordinates.
 *
 * Checked in order of how unambiguous the name is: `decimalLatitude` from a GBIF export,
 * `latitude`, `lat`, then the same for longitude. A file without both is refused rather than
 * guessed at - importing a column of counts as latitude would put a species in the ocean.
 */
export function detectCoordinateColumns(columns: readonly string[]): { lat: string; lng: string } | null {
  const find = (candidates: string[]) => columns.find((column) => candidates.includes(column));

  const lat = find(["decimallatitude", "latitude", "lat", "y"]);
  const lng = find(["decimallongitude", "longitude", "lon", "lng", "long", "x"]);

  return lat && lng ? { lat, lng } : null;
}

/** A CSV with coordinates becomes one MultiPoint feature - the shape the map already draws. */
export function featuresFromCsv(text: string, options: ImportOptions): ImportResult {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));

  if (lines.length < 2) return empty(["A CSV needs a header row and at least one data row."]);

  const columns = csvHeader(lines[0]);
  const coordinates = detectCoordinateColumns(columns);
  if (!coordinates) {
    return empty([
      `No coordinate columns found. Expected something like latitude,longitude; the header was: ${columns.join(", ")}`,
    ]);
  }

  const latIndex = columns.indexOf(coordinates.lat);
  const lngIndex = columns.indexOf(coordinates.lng);
  const points: [number, number][] = [];
  const warnings: string[] = [];
  const seen = new Set<string>();

  for (let index = 1; index < lines.length; index += 1) {
    const cells = lines[index].split(",").map((cell) => cell.trim().replace(/^"|"$/g, ""));
    const lat = Number(cells[latIndex]);
    const lng = Number(cells[lngIndex]);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      warnings.push(`Line ${index + 1}: "${lines[index].slice(0, 40)}" has no usable coordinates`);
      continue;
    }

    if (!isValidLngLat([lng, lat])) {
      warnings.push(`Line ${index + 1}: ${lat},${lng} is outside the world`);
      continue;
    }

    const key = `${lng},${lat}`;
    if (seen.has(key)) continue;
    seen.add(key);
    points.push([lng, lat]);
  }

  if (points.length === 0) return empty(["No usable rows: every line was refused."], warnings);

  const feature: GeodataFeature = {
    type: "Feature",
    properties: {
      slug: options.slug,
      name: options.slug,
      kind: options.kind as GeodataKind,
      year: options.year,
      source: options.source,
      license: options.license as GeodataLicense,
      records: points.length,
      note: `Imported from a CSV: ${points.length} coordinate pair(s).`,
    },
    geometry: { type: "MultiPoint", coordinates: points },
  };

  const lngs = points.map((point) => point[0]);
  const lats = points.map((point) => point[1]);

  return {
    features: [feature],
    errors: [],
    warnings,
    summary: {
      features: 1,
      points: points.length,
      polygons: 0,
      bounds: [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)],
      areaKm2: 0,
    },
  };
}

/** Every ring of a polygon, checked the way PostGIS will check it again on insert. */
function polygonErrors(coordinates: unknown): string[] {
  const rings = Array.isArray(coordinates) ? coordinates : [];
  const problems: string[] = [];

  rings.forEach((ring, index) => {
    if (!Array.isArray(ring) || ring.length < 4) {
      problems.push(`ring ${index} has fewer than four points`);
      return;
    }
    if (!ring.every((point) => Array.isArray(point) && isValidLngLat(point as number[]))) {
      problems.push(`ring ${index} has a coordinate outside the world`);
      return;
    }
    if (!ringIsClosed(ring as number[][])) problems.push(`ring ${index} is not closed`);
    if (!ringIsSimple(ring as number[][])) problems.push(`ring ${index} crosses itself`);
  });

  return problems;
}

export function featuresFromGeoJson(text: string, options: ImportOptions): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    return empty([`Not valid JSON: ${(error as Error).message}`]);
  }

  const collection = parsed as { type?: string; features?: unknown[]; geometry?: unknown };
  const GEOMETRY_TYPES = ["Point", "MultiPoint", "Polygon", "MultiPolygon", "LineString"];

  // Three shapes arrive in practice: a FeatureCollection, a single Feature, and a bare
  // geometry pasted straight out of a tool. The third one has to be wrapped, or every
  // feature looks like it is missing its geometry.
  const raw =
    collection.type === "FeatureCollection"
      ? collection.features ?? []
      : collection.type && GEOMETRY_TYPES.includes(collection.type)
        ? [{ type: "Feature", properties: {}, geometry: parsed }]
        : [parsed];
  if (raw.length === 0) return empty(["The file has no features."]);

  const features: GeodataFeature[] = [];
  const warnings: string[] = [];
  let points = 0;
  let polygons = 0;

  raw.forEach((entry, index) => {
    const feature = entry as { type?: string; properties?: Record<string, unknown>; geometry?: { type?: string; coordinates?: unknown } };
    const geometry = feature.geometry;

    if (!geometry?.type) {
      warnings.push(`Feature ${index}: no geometry`);
      return;
    }

    if (geometry.type === "Polygon" || geometry.type === "MultiPolygon") {
      const polygonsRings =
        geometry.type === "Polygon"
          ? [(geometry.coordinates as unknown[]) ?? []]
          : ((geometry.coordinates as unknown[]) ?? []).map((polygon) => (Array.isArray(polygon) ? polygon[0] : []));

      const problems: string[] = [];
      if (geometry.type === "Polygon") {
        problems.push(...polygonErrors(geometry.coordinates).map((problem) => `feature ${index}: ${problem}`));
      } else {
        (geometry.coordinates as unknown[]).forEach((polygon, polygonIndex) => {
          problems.push(...polygonErrors(polygon).map((problem) => `feature ${index} polygon ${polygonIndex}: ${problem}`));
        });
      }

      if (problems.length > 0) {
        warnings.push(...problems);
        return;
      }

      polygons += geometry.type === "Polygon" ? 1 : (geometry.coordinates as unknown[]).length;
      void polygonsRings;
    } else if (geometry.type === "Point" || geometry.type === "MultiPoint") {
      const coordinates =
        geometry.type === "Point" ? [geometry.coordinates as number[]] : ((geometry.coordinates as number[][]) ?? []);

      if (!coordinates.every((point) => isValidLngLat(point))) {
        warnings.push(`Feature ${index}: a coordinate is outside the world`);
        return;
      }
      points += coordinates.length;
    } else {
      warnings.push(`Feature ${index}: ${geometry.type} is not a habitat shape - a path belongs in the migrations pipeline`);
      return;
    }

    features.push({
      type: "Feature",
      properties: {
        ...(feature.properties ?? {}),
        slug: options.slug,
        name: options.slug,
        kind: options.kind as GeodataKind,
        year: options.year,
        source: options.source,
        license: options.license as GeodataLicense,
      },
      geometry: geometry as GeodataFeature["geometry"],
    });
  });

  if (features.length === 0) return empty(["Every feature was refused."], warnings);

  const allPoints = features.flatMap((feature) => {
    const coordinates = feature.geometry.coordinates as never;
    if (feature.geometry.type === "Point") return [coordinates as unknown as number[]];
    if (feature.geometry.type === "MultiPoint") return coordinates as unknown as number[][];
    if (feature.geometry.type === "Polygon") return (coordinates as number[][][])[0] ?? [];
    return ((coordinates as number[][][][]) ?? []).flatMap((polygon) => polygon[0] ?? []);
  });

  const lngs = allPoints.map((point) => point[0]);
  const lats = allPoints.map((point) => point[1]);

  return {
    features,
    errors: [],
    warnings,
    summary: {
      features: features.length,
      points,
      polygons,
      bounds: lngs.length > 0 ? [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)] : null,
      areaKm2: 0,
    },
  };
}

/**
 * Either format, decided by the first character.
 *
 * `{` is GeoJSON; anything else is treated as CSV, and a CSV that turns out not to have
 * coordinates says so with the header it read.
 */
export function parseImport(text: string, options: ImportOptions): ImportResult {
  const trimmed = text.trim();
  if (trimmed.length === 0) return empty(["Nothing to import."]);

  const structural = validateOptions(options);
  if (structural.length > 0) return empty(structural);

  return trimmed.startsWith("{") ? featuresFromGeoJson(trimmed, options) : featuresFromCsv(trimmed, options);
}

export function validateOptions(options: ImportOptions): string[] {
  const problems: string[] = [];

  if (!/^[a-z0-9-]{2,64}$/.test(options.slug)) problems.push("slug must be a catalogue slug (lower case, dashes)");
  if (!IMPORT_KINDS.includes(options.kind as GeodataKind)) problems.push(`kind must be one of: ${IMPORT_KINDS.join(", ")}`);
  if (options.year !== null && !Number.isInteger(options.year)) problems.push("year must be an integer or empty");
  if (options.year !== null && (options.year < -10000 || options.year > 2100)) {
    problems.push("year must be between -10000 and 2100");
  }
  if (!["CC0", "CC-BY"].includes(options.license)) problems.push("licence must be CC0 or CC-BY");
  if (options.attribution.trim().length < 5) problems.push("an attribution is required - a row without a credit is not importable");
  if (options.source.trim().length < 2) problems.push("a source is required");

  return problems;
}
