import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  DATA2MAP_SAMPLE_FILES,
  DATA2MAP_SAMPLE_IDS,
  isData2MapSampleId,
  parseData2MapSample,
  type Data2MapSampleId,
  type Data2MapSampleMap,
} from "@/lib/data2map/sample-files";

/**
 * The sample files, read from disk when a request asks for one.
 *
 * This is the half of the change that touches the filesystem, and it is deliberately small: which
 * files exist and what a valid one looks like is arithmetic and lives in \`sample-files.ts\`, where a
 * test can reach it. What is left here is the part that cannot be pure - a read, a JSON parse, and a
 * memo.
 *
 * \`next start\` runs from the repository root, which is where \`data/\` lives; the deployment already
 * depends on that directory because the auto-pilot spawns \`scripts/model-orders.mjs\` from the same
 * working directory.
 */

export { DATA2MAP_SAMPLE_IDS, isData2MapSampleId };
export type { Data2MapSampleId };

/** Where the file is. The name comes from a typed record, never from the request. */
export const sampleFilePath = (id: Data2MapSampleId): string =>
  path.join(process.cwd(), "data", DATA2MAP_SAMPLE_FILES[id]);

const parsed = new Map<Data2MapSampleId, unknown>();

/**
 * Read, parse and validate one sample.
 *
 * Throws a sentence that names the file and the reason - the route turns it into a 503 the page
 * prints, because a blank map with no explanation is the failure mode this project writes against.
 *
 * Parsed samples are kept for the life of the process in production, where a committed file cannot
 * change under a running server. In development they are re-read, so editing a dataset shows up
 * without a restart - which is exactly when someone is editing one.
 */
export async function readData2MapSample<Id extends Data2MapSampleId>(id: Id): Promise<Data2MapSampleMap[Id]> {
  const cached = parsed.get(id);
  if (cached !== undefined && process.env.NODE_ENV === "production") return cached as Data2MapSampleMap[Id];

  const file = sampleFilePath(id);

  let text: string;
  try {
    text = await readFile(file, "utf8");
  } catch (error) {
    throw new Error("the " + id + " sample could not be read (" + (error as Error).message + ")");
  }

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (error) {
    throw new Error("the " + id + " sample is not JSON (" + (error as Error).message + ")");
  }

  const sample = parseData2MapSample(id, raw);
  parsed.set(id, sample);
  return sample;
}
