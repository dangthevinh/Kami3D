import rawManifest from "@/data/landmark-attribution.json";

/**
 * 3D model credits for the landmark catalogue.
 *
 * The same manifest the animals use, in the same shape and for the same reason: a CC BY model may not
 * reach a page without its author, its licence and a link to where it came from. It is written by
 * `scripts/fetch-landmark-models.mjs`, which refuses anything whose licence is not on the allow-list -
 * the allow-list lives in `scripts/fetch-models.mjs` and is shared, because a licence rule is not
 * about animals or buildings, it is about what may be redistributed.
 *
 * It is a separate file from `data/model-attribution.json` so the two pipelines cannot overwrite each
 * other's credits, and it is imported at build time like the other one, so this works on a server, in
 * a serverless function and during static generation without touching the filesystem.
 */

export interface LandmarkAttribution {
  title: string;
  author: string;
  authorUrl: string | null;
  /** SPDX identifier, e.g. "CC0-1.0" or "CC-BY-4.0". */
  license: string;
  licenseUrl: string | null;
  sourceUrl: string;
  provider: string;
  file: string;
  format: string;
  bytes: number;
  sha256: string;
  attributionRequired: boolean;
  fetchedAt: string;
  faceCount?: number | null;
  /** True when DRACO compression made the file smaller and was kept. */
  compressed?: boolean;
}

const manifest = rawManifest as Record<string, LandmarkAttribution>;

const LICENSE_NAMES: Record<string, string> = {
  "CC0-1.0": "CC0 1.0 (public domain)",
  "PDM-1.0": "Public Domain Mark",
  "CC-BY-4.0": "CC BY 4.0",
};

/** Human-readable licence name for the credit line. */
export function describeLandmarkLicense(license: string): string {
  return LICENSE_NAMES[license] ?? license;
}

export function getLandmarkAttribution(slug: string): LandmarkAttribution | null {
  return manifest[slug] ?? null;
}

export function getAllLandmarkAttributions(): Array<{ slug: string; attribution: LandmarkAttribution }> {
  return Object.entries(manifest).map(([slug, attribution]) => ({ slug, attribution }));
}
