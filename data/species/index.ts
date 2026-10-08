import type { Animal } from "../../types/animal";

import { BATCH_1 } from "./batch-1.ts";
import { BATCH_2 } from "./batch-2.ts";
import { BATCH_3 } from "./batch-3.ts";
import { BATCH_4 } from "./batch-4.ts";
import { BATCH_5 } from "./batch-5.ts";
import { BATCH_6 } from "./batch-6.ts";

/**
 * The catalogue after Phase 23: the hundred species added to the original twenty-four, grouped by
 * the batch file each one was written in. `data/animals.ts` is the only thing that imports this, so
 * every reader of the catalogue sees one list.
 */
export const EXTRA_ANIMALS: Animal[] = [
  ...BATCH_1,
  ...BATCH_2,
  ...BATCH_3,
  ...BATCH_4,
  ...BATCH_5,
  ...BATCH_6,
];
