import structure from "@/data/model-structure.json";

import { describeStructure, type ModelStructure } from "@/lib/model-structure-text";

/**
 * The structure index, as read by a page.
 *
 * `scripts/probe-model-structure.mjs --write` measures every shipped .glb and records what is inside it;
 * this reads that record. The sentence a page prints, and the reasoning behind printing a sentence
 * instead of a toggle, live in `lib/model-structure-text.ts` - which is where they can be tested.
 */

interface StructureFile {
  models: Record<string, ModelStructure | undefined>;
}

const MODELS = (structure as unknown as StructureFile).models ?? {};

/** `<catalogue>/<slug>`, e.g. `landmarks/taj-mahal`. Null when the file is not in the index. */
export function getModelStructure(catalogue: string, slug: string): ModelStructure | null {
  return MODELS[`${catalogue}/${slug}`] ?? null;
}

export { describeStructure };
export type { ModelStructure };
