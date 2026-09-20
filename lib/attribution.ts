import rawManifest from "@/data/model-attribution.json";
import rawSoundManifest from "@/data/sound-attribution.json";

/**
 * 3D model credits.
 *
 * The manifest is imported at build time rather than read from disk, so this
 * works identically on a Node server, in a serverless function and during static
 * generation — no filesystem access at request time.
 *
 * It is written by `scripts/fetch-models.mjs`, which refuses to download any
 * model whose licence is not on its allow-list and always records the author, so
 * a CC-BY model can never reach a species page without its credit.
 */

export interface ModelAttribution {
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
}

const manifest = rawManifest as Record<string, ModelAttribution>;

const LICENSE_NAMES: Record<string, string> = {
  "CC0-1.0": "CC0 1.0 (public domain)",
  "PDM-1.0": "Public Domain Mark",
  "CC-BY-4.0": "CC BY 4.0",
};

/** Human-readable licence name for the credit line. */
export function describeLicense(license: string): string {
  return LICENSE_NAMES[license] ?? license;
}

export function getModelAttribution(slug: string): ModelAttribution | null {
  return manifest[slug] ?? null;
}

/** Every credited model, e.g. for an /about credits list. */
export function getAllAttributions(): Array<{ slug: string; attribution: ModelAttribution }> {
  return Object.entries(manifest).map(([slug, attribution]) => ({ slug, attribution }));
}

/* -------------------------------------------------------------------------- */
/* Call recordings                                                            */
/* -------------------------------------------------------------------------- */

/**
 * A recording's credit.
 *
 * CC BY obliges us to name the author, so the credit is part of the asset rather
 * than a nicety: `scripts/fetch-sounds.mjs` refuses to download a file it cannot
 * credit, and `npm run check:sounds` fails if a species with a `sound_url` has no
 * entry here.
 */
export interface SoundAttribution {
  title: string;
  provider: string;
  /** Normalised: CC0 or CC-BY. */
  license: string;
  /** The provider's own label, kept verbatim. */
  licenseLabel: string;
  licenseUrl: string | null;
  author: string | null;
  sourceUrl: string | null;
  /** Ready-to-render one-liner. */
  credit: string;
  file: string;
  bytes: number;
  duration: number;
  downloadedAt: string;
}

const soundManifest = rawSoundManifest as Record<string, SoundAttribution>;

export function getSoundAttribution(slug: string): SoundAttribution | null {
  return soundManifest[slug] ?? null;
}

export function getAllSoundAttributions(): Array<{ slug: string; attribution: SoundAttribution }> {
  return Object.entries(soundManifest).map(([slug, attribution]) => ({ slug, attribution }));
}

/** "CC BY" reads better than the database's spelling in a credit line. */
export function describeSoundLicense(licenseLabel: string, license: string): string {
  if (licenseLabel && licenseLabel !== license) return licenseLabel;
  return license === "CC0" ? "CC0 (public domain)" : "CC BY";
}
