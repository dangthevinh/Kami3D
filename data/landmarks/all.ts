import { LANDMARKS, type Landmark } from "../landmarks.ts";
import { BATCH as WORLD_1 } from "./world-1.ts";
import { BATCH as WORLD_2 } from "./world-2.ts";

/**
 * The whole landmark catalogue: the fifteen that shipped first, plus the two researched batches.
 *
 * The three files are merged here rather than in `data/landmarks.ts` because the batches import the
 * `Landmark` **type** from that file, and a file that imports its own importers is a cycle. One
 * direction only: the type lives in `../landmarks.ts`, the entries live in the batches, and this file
 * knows about all three.
 *
 * The split is by when the data was written, not by subject - the same reason `data/species/batch-*.ts`
 * is split. A reader looking for one monument can search the folder.
 */
export const ALL_LANDMARKS: Landmark[] = [...LANDMARKS, ...WORLD_1, ...WORLD_2];

/** By slug, for the detail page and the fetch pipeline. Throws on a duplicate at module load. */
export const ALL_LANDMARKS_BY_SLUG: Record<string, Landmark> = (() => {
  const byslug: Record<string, Landmark> = {};
  for (const landmark of ALL_LANDMARKS) {
    if (byslug[landmark.slug]) throw new Error("two landmarks share the slug " + landmark.slug);
    byslug[landmark.slug] = landmark;
  }
  return byslug;
})();
