import plantsIndex from "@/data/plants-preview.json";
import spaceIndex from "@/data/space-preview.json";
import vehiclesIndex from "@/data/vehicles-preview.json";
import { withinPreviewBudget } from "@/lib/model-preview";

/**
 * May a card fetch this catalogue entry's model on a hover?
 *
 * The same budget the species and landmark cards use - `withinPreviewBudget`, 1.5 MB and 75k triangles,
 * imported rather than restated - and one index per catalogue, written by the pipeline that downloaded
 * the files, for the same reason the other two have one: a card decides in the browser whether it may
 * fetch a file, and it must not import a credit manifest to do it.
 *
 * Separate indexes rather than one merged file, because the catalogues are filled by separate runs and
 * one run must not be able to empty another's.
 */

interface PreviewIndex {
  /** `slug -> [bytes, triangles]`, triangles null when the provider did not report them. */
  models: Record<string, number[] | undefined>;
}

const INDEXES: Record<string, Record<string, number[] | undefined>> = {
  space: (spaceIndex as unknown as PreviewIndex).models ?? {},
  plants: (plantsIndex as unknown as PreviewIndex).models ?? {},
  vehicles: (vehiclesIndex as unknown as PreviewIndex).models ?? {},
};

/** True when the file is inside the hover budget. An unknown entry is not previewable. */
export function isPreviewableItem(categoryId: string, slug: string): boolean {
  const record = INDEXES[categoryId]?.[slug];
  if (!record) return false;
  const [bytes, faceCount] = record;
  return withinPreviewBudget({ bytes, faceCount });
}

/** The same answer for a whole grid, in the shape the card component takes. */
export function itemPreviewMap(categoryId: string, slugs: readonly string[]): Record<string, boolean> {
  return Object.fromEntries(slugs.map((slug) => [slug, isPreviewableItem(categoryId, slug)]));
}
