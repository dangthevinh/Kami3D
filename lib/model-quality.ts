/**
 * How good a 3D model candidate is, as a number a pipeline can sort by.
 *
 * Phase 12’s core change: the fetcher used to take the *first* licensed result a
 * provider returned. Search relevance is not quality — the first hit for "lion" is
 * regularly a 900k-triangle statue with no thumbnail and four downloads — so the
 * ranking now scores every licensed candidate on the four things a visitor can
 * actually perceive, plus the one that is a legal requirement:
 *
 *   title       30  does the title name this species at all
 *   licence     15  CC0 costs the site nothing to credit, CC BY does
 *   popularity  25  downloads and likes, log-scaled — a proxy for "this is the one
 *                   people use", and the only quality signal the APIs actually give
 *   complexity  20  face count against a mobile budget, with a penalty for models
 *                   that would need decimating before they can be shipped
 *   thumbnail   10  a clear thumbnail means a usable preview and social card
 *
 * The total is 0–100 and is stored verbatim in `model_assets.quality_score`, whose
 * CHECK constraint says so. Pure and dependency-free, so `scripts/check-models.mjs`
 * can pin every rule — a ranking that is tuned by feel is a ranking that silently
 * changes when someone edits a constant.
 */

/** The two licence values `model_assets.license` accepts. */
export const MODEL_LICENSES = ["CC0", "CC-BY"] as const;
export type ModelLicense = (typeof MODEL_LICENSES)[number];

/**
 * The database value for an SPDX id the licence allow-list resolved.
 *
 * Public domain is stored as CC0 because they are the same obligation — none — and a
 * third enum value would only invite a CHECK constraint to disagree with the UI.
 * `null` means "do not store this model": the column refuses anything else, which is
 * the point of putting the allow-list in the database as well as in the script.
 */
export function modelLicenseFromSpdx(spdx: string | null | undefined): ModelLicense | null {
  if (!spdx) return null;
  if (spdx === "CC0-1.0" || spdx === "PDM-1.0") return "CC0";
  if (spdx === "CC-BY-4.0") return "CC-BY";
  return null;
}

export const QUALITY_WEIGHTS = {
  title: 30,
  license: 15,
  popularity: 25,
  complexity: 20,
  thumbnail: 10,
} as const;

/**
 * The polygon budget a web viewer can afford.
 *
 * `ideal` is where a model needs no work at all; `max` is the point past which it has
 * to be decimated before it can ship, and is scored accordingly rather than refused,
 * because a decimation pass is exactly what `--compress` is for.
 */
/**
 * The polygon ceilings, raised on 2026-10-06 from `max: 800_000`.
 *
 * `max` is **eligibility**, not preference: the scorer already discounts a heavy model
 * (`heavy` and `max` bands take 70% and 40% of the complexity weight), so a 1.2M-face file only wins
 * when there is nothing better. What the old ceiling did instead was refuse outright - measured:
 * `eucalyptus-camaldulensis` was refused twice for a candidate at **1,499,999 faces**, and the entry
 * had to be dropped from the catalogue for want of any other model that named it.
 *
 * The cost is real and is not hidden by the number: a model above ~500k triangles is heavy on a phone,
 * even DRACO-compressed, and the viewer's watchdog gives it 15 seconds. The hover-card budget
 * (`lib/model-preview.ts`: 1.5 MB, 75k faces) is **unchanged**, so a heavy model still never loads on
 * hover - it is a detail-page asset.
 */
export const FACE_BUDGET = { crude: 500, ideal: 150_000, heavy: 500_000, max: 1_500_000 } as const;

/**
 * Words that mean "this is a stand-in wearing the subject's name".
 *
 * A "Bengal Tiger Voxel" scores 74 and is a toy; a "Pixel Neuschwanstein Castle (Low Poly)" is the
 * same failure for a building. The list lives here rather than in the audit script because two
 * pipelines now refuse on it - the audit reports these, `scripts/fetch-landmark-models.mjs` refuses
 * them outright - and a rule that decides what ships belongs next to the other quality constants.
 */
/**
 * Words that name something **of** the subject rather than the subject.
 *
 * A different failure from `PLACEHOLDER_WORDS`, and it needed its own list. A placeholder is a stand-in
 * wearing the subject's name ("Low Poly Oak Tree", "LEGO Himeji Castle"). These are real objects that
 * *belong to* or *depict* the subject: a doorbell from the building, a souvenir of it, a miniature of
 * it. The gate asks "does the title name this thing", and "Hagia Sophia Doorbell" answers yes to that
 * question while being a doorbell.
 *
 * Measured, not imagined: with the query widened to `Hagia Sophia`, the landmark pipeline shipped
 * **"Hagia Sophia Doorbell" (55,282 faces)** for Hagia Sophia - the gate had no word for it - and the
 * next candidate down the list was **"Miniature Mosque (Hagia Sophia)"**. Both are in this list's
 * territory and neither is the building.
 *
 * Checked against every shipped title before it was added: no animal or landmark already in the
 * catalogue carries one of these words, so nothing that is already on the site became inadmissible.
 */
export const OBJECT_WORDS = [
  "souvenir",
  "keychain",
  "keyring",
  "magnet",
  "postcard",
  "bookmark",
  "puzzle",
  "miniature",
  "figurine",
  "diorama",
  "replica",
  "mockup",
  "mug",
  "sticker",
  "doorbell",
  "knocker",
  "lamp",
  "cake",
  "cookie",
  "charm",
] as const;

/**
 * Below this many triangles, a monument with **no texture at all** is a diagram of a building.
 *
 * Two rules in one, and both halves are needed. Triangles alone cannot decide: the Moai ships at 2,210
 * triangles and the Himeji keep at 2,536, and both look right because their texture carries the detail.
 * Textures alone cannot decide either: a 500-triangle box with a photograph wrapped on it is a picture
 * of a building - which is exactly what the Forbidden City turned out to be (10,388 triangles for a
 * 72-hectare complex of 980 buildings, with a single image painted over a slab 8.4 times wider than it
 * is tall, so no gate in this file would have caught it and a person looking at the card did).
 *
 * What the two together **can** catch is the case that is indefensible on its own terms: nothing to
 * look at in the geometry and nothing painted on it either. Measured across the shipped catalogue that
 * is one model - Marina Bay Sands at 524 triangles and **zero** images, three flat materials standing
 * in for three towers and a SkyPark - while the three other untextured models (the Statue of Liberty
 * at 42,090, the Parthenon at 60,031, the Golden Gate Bridge at 159,902) are detailed enough to carry
 * themselves.
 */
export const CRUDE_MONUMENT_FACES = 5_000;

/** True when a parsed glTF carries no image at all. */
export function modelHasNoTexture(gltf: { images?: unknown[] }): boolean {
  return (gltf.images ?? []).length === 0;
}

/**
 * Can this model show a colour at all?
 *
 * A glTF material that declares neither a base-colour texture nor a base-colour factor renders as
 * white, and a model where nothing declares either is a white model however good its geometry is.
 * That is a fact about the file, not about the subject, and it is checkable before anyone looks at it:
 * the Colosseum arrived as 27 materials carrying nothing but `metallicFactor: 0`, and the Great Wall
 * and the Taj Mahal arrived with their colour inside `KHR_materials_pbrSpecularGlossiness`, which
 * three.js does not implement.
 *
 * It takes the parsed glTF JSON rather than a file so the pipeline, the check suite and any future
 * reader share one implementation.
 */
export function modelCanShowColour(gltf: {
  materials?: Array<{
    pbrMetallicRoughness?: { baseColorTexture?: unknown; baseColorFactor?: unknown };
    extensions?: Record<string, { diffuseTexture?: unknown; diffuseFactor?: unknown } | undefined>;
  }>;
  images?: unknown[];
}): boolean {
  if ((gltf.images ?? []).length > 0) return true;
  return (gltf.materials ?? []).some((material) => {
    const pbr = material.pbrMetallicRoughness ?? {};
    const specGloss = material.extensions?.KHR_materials_pbrSpecularGlossiness;
    return Boolean(pbr.baseColorTexture || pbr.baseColorFactor || specGloss?.diffuseTexture || specGloss?.diffuseFactor);
  });
}

export const PLACEHOLDER_WORDS = [
  "voxel",
  "lowpoly",
  "low-poly",
  "chick",
  "baby",
  "toy",
  "cute",
  "stylized",
  "cartoon",
  "blocky",
  "pixel",
  "minecraft",
  "lego",
  "papercraft",
] as const;

export interface QualityInput {
  title: string;
  /** Terms a title has to contain to count as a match: the species name, its latin name, its class. */
  terms: readonly string[];
  /** SPDX id from `LICENSE_ALLOWLIST`, or null when the licence is not allowed. */
  spdx?: string | null;
  faceCount?: number | null;
  downloadCount?: number | null;
  likeCount?: number | null;
  hasThumbnail?: boolean | null;
}

export interface QualityBreakdown {
  /** 0–100. What `model_assets.quality_score` stores. */
  total: number;
  title: number;
  license: number;
  popularity: number;
  complexity: number;
  thumbnail: number;
  /** True when the title names the species, which is what `--strict-match` filters on. */
  matched: boolean;
}

const round = (value: number) => Math.round(value * 10) / 10;

function titleScore(title: string, terms: readonly string[]): { score: number; matched: boolean } {
  const normalised = title.trim().toLowerCase();
  // A term the caller does not have is not a term. Three pipelines pass terms from three different data
  // shapes, and the first run of the catalogue pipeline crashed on every entry because a planet has no
  // binomial and passed `null` where a species passes a string - "Cannot read properties of null
  // (reading 'trim')" sixteen times. A missing term is skipped; it is not an error and not a match.
  const wanted = terms
    .filter((term): term is string => typeof term === "string")
    .map((term) => term.trim().toLowerCase())
    .filter(Boolean);

  if (wanted.some((term) => normalised === term)) return { score: QUALITY_WEIGHTS.title, matched: true };
  if (wanted.some((term) => normalised.includes(term))) return { score: round(QUALITY_WEIGHTS.title * 0.75), matched: true };
  // The other direction: a provider that returns "Panthera leo" for a title of
  // "Lion" is still a match, but a weaker one than a title that says it outright.
  if (wanted.some((term) => term.includes(normalised) && normalised.length > 3)) {
    return { score: round(QUALITY_WEIGHTS.title * 0.4), matched: true };
  }
  return { score: 0, matched: false };
}

/** Downloads and likes, log-scaled: 1 000 downloads is "known", 1 000 000 is not 1 000× better. */
function popularityScore(downloadCount?: number | null, likeCount?: number | null): number {
  const downloads = Math.max(0, Number(downloadCount) || 0);
  const likes = Math.max(0, Number(likeCount) || 0);
  const fromDownloads = (Math.log10(1 + downloads) / 3) * (QUALITY_WEIGHTS.popularity * 0.6);
  const fromLikes = (Math.log10(1 + likes) / 3) * (QUALITY_WEIGHTS.popularity * 0.4);
  return round(Math.min(QUALITY_WEIGHTS.popularity, fromDownloads + fromLikes));
}

function complexityScore(faceCount?: number | null): number {
  const budget = QUALITY_WEIGHTS.complexity;
  // Unknown is *neutral*, not zero and not full marks: most providers simply do not
  // report a face count, and scoring them as if they had would be inventing data.
  if (typeof faceCount !== "number" || !Number.isFinite(faceCount)) return round(budget * 0.6);
  if (faceCount < FACE_BUDGET.crude) return round(budget * 0.2);
  if (faceCount <= FACE_BUDGET.ideal) return budget;
  if (faceCount <= FACE_BUDGET.heavy) return round(budget * 0.7);
  if (faceCount <= FACE_BUDGET.max) return round(budget * 0.4);
  return round(budget * 0.1);
}

/** Scores one candidate. Never throws: a missing field is a missing signal, not an error. */
export function scoreModelQuality(input: QualityInput): QualityBreakdown {
  const title = titleScore(input.title ?? "", input.terms ?? []);
  const license = input.spdx === "CC0-1.0" || input.spdx === "PDM-1.0"
    ? QUALITY_WEIGHTS.license
    : input.spdx === "CC-BY-4.0"
      ? round(QUALITY_WEIGHTS.license * 0.55)
      : 0;

  const popularity = popularityScore(input.downloadCount, input.likeCount);
  const complexity = complexityScore(input.faceCount);
  const thumbnail = input.hasThumbnail ? QUALITY_WEIGHTS.thumbnail : 0;

  return {
    total: round(title.score + license + popularity + complexity + thumbnail),
    title: title.score,
    license,
    popularity,
    complexity,
    thumbnail,
    matched: title.matched,
  };
}

/** A short label for the report, so a human can read a score without the weights. */
export function describeQuality(total: number): string {
  if (total >= 75) return "excellent";
  if (total >= 55) return "good";
  if (total >= 35) return "usable";
  return "poor";
}
