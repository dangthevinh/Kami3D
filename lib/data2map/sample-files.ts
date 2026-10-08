import { readAgricultureSample, type AgricultureSample } from "./agriculture.ts";
import { readLogisticsSample, type LogisticsSample } from "./logistics.ts";
import { readRealEstateSample, type RealEstateSample } from "./real-estate.ts";
import { readTrendsSample, type TrendsSample } from "./trends.ts";

/**
 * The Data2Map samples: which files exist, and what a valid one looks like - as pure functions.
 *
 * ## Why this file exists at all
 *
 * Every product page used to import its GeoJSON directly. A page module is part of the build's module
 * graph, so every \`next build\` parsed 430 kB of data that only a browser ever draws: it was bundled
 * into the server chunk, serialised into the webpack persistent cache (the "Serializing big strings
 * (277kiB)" warnings) and then embedded whole in the prerendered HTML. The samples are now read from
 * disk when a request asks for one (\`sample-source.ts\`) and fetched by the client
 * (\`lib/use-data2map-sample.ts\`).
 *
 * That move is only safe if the rules the build used to enforce still hold, so this module is
 * deliberately free of \`fs\`, of \`server-only\` and of the \`@/\` alias: it is arithmetic, and
 * \`scripts/check-data2map-samples.mjs\` imports it directly the way every other suite imports
 * \`lib/*.ts\`. The file reading lives one door away, in the module that also memoises it.
 *
 * Two rules are worth naming, because both were real bugs waiting to happen:
 *
 *   1. **An allow-list, never a path.** A dataset name is only a key into \`DATA2MAP_SAMPLE_FILES\`.
 *      Nothing from a request is joined onto a filesystem path, so \`../\` cannot mean anything here.
 *   2. **The reader is the reader that already existed.** \`readAgricultureSample\` and its siblings
 *      were written for the build and are covered by their own suites; serving a sample late must not
 *      weaken what they refuse.
 */

export const DATA2MAP_SAMPLE_IDS = ["agriculture", "trends", "logistics", "real-estate"] as const;

export type Data2MapSampleId = (typeof DATA2MAP_SAMPLE_IDS)[number];

export interface Data2MapSampleMap {
  agriculture: AgricultureSample;
  trends: TrendsSample;
  logistics: LogisticsSample;
  "real-estate": RealEstateSample;
}

export type Data2MapSample = Data2MapSampleMap[Data2MapSampleId];

/** The file behind each id. The key set and \`DATA2MAP_SAMPLE_IDS\` are the same set, by type. */
export const DATA2MAP_SAMPLE_FILES: Record<Data2MapSampleId, string> = {
  agriculture: "data2map-agriculture.json",
  trends: "data2map-trends.json",
  logistics: "data2map-logistics.json",
  "real-estate": "data2map-real-estate.json",
};

/** True only for an exact id. \`agriculture/../secrets\` and \`AGRICULTURE\` are both refused. */
export function isData2MapSampleId(value: unknown): value is Data2MapSampleId {
  return typeof value === "string" && (DATA2MAP_SAMPLE_IDS as readonly string[]).includes(value);
}

const READERS = {
  agriculture: readAgricultureSample,
  trends: readTrendsSample,
  logistics: readLogisticsSample,
  "real-estate": readRealEstateSample,
} satisfies Record<Data2MapSampleId, (raw: unknown) => unknown>;

/**
 * One parsed file, checked the way its page used to check it at build time.
 *
 * The return type is per id - \`parseData2MapSample("logistics", raw)\` is a \`LogisticsSample\` - which is
 * why the reader is looked up in a map rather than in a \`switch\`: a switch would have to be kept in
 * step with \`DATA2MAP_SAMPLE_IDS\` by hand, and the \`satisfies\` above already makes the compiler do it.
 */
export function parseData2MapSample<Id extends Data2MapSampleId>(id: Id, raw: unknown): Data2MapSampleMap[Id] {
  const read = READERS[id] as (value: unknown) => Data2MapSampleMap[Id];
  return read(raw);
}
