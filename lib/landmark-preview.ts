import rawIndex from "@/data/landmark-preview.json";
import { withinPreviewBudget, PREVIEW_BUDGET } from "@/lib/model-preview";

/**
 * May a landmark card fetch its model on a hover?
 *
 * The same budget the species cards use, imported rather than restated: `withinPreviewBudget` and
 * `PREVIEW_BUDGET` are the repository's shipping numbers (1.5 MB, 75k triangles), and a second copy
 * of them here would be a second thing to keep in step. A hover is not a request to download a
 * photogrammetry scan of the Great Wall, and the species cards already learned that.
 *
 * The index is separate from the animals' because the two catalogues are separate files, written by
 * separate pipelines, and one must not be able to empty the other.
 */

interface PreviewIndex {
  /** `slug -> [bytes, triangles]`, triangles null when the provider did not report them. */
  models: Record<string, number[] | undefined>;
}

const models = (rawIndex as unknown as PreviewIndex).models ?? {};

/** True when the file is inside the hover budget. An unknown landmark is not previewable. */
export function isPreviewableLandmark(slug: string): boolean {
  const record = models[slug];
  if (!record) return false;
  const [bytes, faceCount] = record;
  return withinPreviewBudget({ bytes, faceCount });
}

/**
 * The same answer for a whole list, in the shape `LandmarkGrid` takes.
 *
 * Two pages draw the landmark cards - `/landmarks` and the catalogue's Architecture and Modern
 * Buildings subjects - and each of them needs this map. It lives here rather than being written out
 * three times, so a card cannot be previewable on one page and not on another.
 */
export function previewMap(slugs: readonly string[]): Record<string, boolean> {
  return Object.fromEntries(slugs.map((slug) => [slug, isPreviewableLandmark(slug)]));
}

export { PREVIEW_BUDGET };
