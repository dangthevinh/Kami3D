import plantsManifest from "@/data/plants-attribution.json";
import spaceManifest from "@/data/space-attribution.json";
import vehiclesManifest from "@/data/vehicles-attribution.json";

/**
 * The credit line for an entry of one of the new catalogues.
 *
 * Every model this site shows names its author, its licence and where it came from - that is the rule
 * the whole project is built on, and it is why a model the pipeline cannot credit is a model that is
 * deleted rather than shown. The manifest is written by the pipeline that downloaded the file, so the
 * credit cannot drift from the asset: `scripts/check-catalogues.mjs` fails if the manifest and the
 * catalogue disagree about which entries have a model at all.
 *
 * The animals and the landmarks have their own manifests and their own readers (`lib/attribution.ts`,
 * `lib/landmark-attribution.ts`); this one covers the three catalogues that share `CatalogEntry`.
 */

export interface CatalogCredit {
  title: string;
  author: string;
  authorUrl: string;
  license: string;
  licenseUrl: string;
  sourceUrl: string;
  provider: string;
  file: string;
  /** True when the licence obliges us to name the author - which this site does in every case. */
  attributionRequired: boolean;
  faceCount: number | null;
  /** Present when the model was generated from a text prompt rather than modelled or scanned. */
  generated: { provider: string } | null;
}

/** What the manifest actually holds: the same fields, any of which the provider may have left empty. */
interface ManifestEntry {
  title?: string | null;
  author?: string | null;
  authorUrl?: string | null;
  license?: string | null;
  licenseUrl?: string | null;
  sourceUrl?: string | null;
  provider?: string | null;
  file?: string | null;
  attributionRequired?: boolean | null;
  faceCount?: number | null;
  generated?: { provider?: string | null } | null;
}

const MANIFESTS: Record<string, Record<string, ManifestEntry>> = {
  space: spaceManifest as Record<string, ManifestEntry>,
  plants: plantsManifest as Record<string, ManifestEntry>,
  vehicles: vehiclesManifest as Record<string, ManifestEntry>,
};

/** The credit for one entry, or null when the file is not in the manifest. */
export function getCatalogCredit(categoryId: string, slug: string): CatalogCredit | null {
  const record = MANIFESTS[categoryId]?.[slug];
  if (!record || !record.file) return null;

  return {
    title: record.title ?? slug,
    author: record.author ?? "Unknown",
    authorUrl: record.authorUrl ?? "",
    license: record.license ?? "Unknown",
    licenseUrl: record.licenseUrl ?? "",
    sourceUrl: record.sourceUrl ?? "",
    provider: record.provider ?? "unknown",
    file: record.file ?? "",
    attributionRequired: record.attributionRequired ?? true,
    faceCount: typeof record.faceCount === "number" ? record.faceCount : null,
    generated: record.generated ? { provider: record.generated.provider ?? "an AI generator" } : null,
  };
}

/** One line naming the author, the licence and the source - the sentence a page renders. */
export function formatCatalogCredit(credit: CatalogCredit): string {
  return credit.title + " by " + credit.author + " (" + credit.license + ", via " + credit.provider + ")";
}
