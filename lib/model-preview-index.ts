import index from "@/data/model-preview.json";
import { withinPreviewBudget } from "@/lib/model-preview";

/**
 * Whether this species' model may be fetched into a hover preview.
 *
 * The lookup reads `data/model-preview.json` — about a kilobyte of `slug -> [bytes, faces]` —
 * rather than the credit manifest, and that is not a micro-optimisation. The card has to make
 * this decision in the browser, and importing the manifest to make it dragged both credit
 * files (every author, licence, source URL and sha256) into the client bundle of /quiz,
 * /explore and / — measured at **+5.6 kB gzip**, which pushed /quiz past its budget. The
 * index is written by `scripts/fetch-models.mjs` from the same object it writes the manifest
 * from, so the two cannot drift, and `npm run check:preview` fails if they ever do.
 */

interface PreviewIndex {
  /** `slug -> [bytes, triangles]`, triangles null when the provider did not report them. */
  models: Record<string, number[] | undefined>;
}

const MODELS = (index as unknown as PreviewIndex).models;

export function isPreviewableModel(slug: string): boolean {
  const entry = MODELS[slug];
  if (!entry) return false;
  return withinPreviewBudget({ bytes: entry[0] ?? 0, faceCount: entry[1] ?? null });
}
