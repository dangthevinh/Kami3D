import type { Animal } from "../../types/animal";

import { BATCH_1 } from "./batch-1.ts";
import { BATCH_2 } from "./batch-2.ts";

/**
 * The catalogue after Phase 23: the hundred species added to the original twenty-four, grouped by
 * the batch file each one was written in. `data/animals.ts` is the only thing that imports this, so
 * every reader of the catalogue sees one list.
 */
export const EXTRA_ANIMALS: Animal[] = [
  ...BATCH_1,
  ...BATCH_2,
];
