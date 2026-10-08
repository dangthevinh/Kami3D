/**
 * What counts as evidence that a 3D model really is the thing the catalogue claims.
 *
 * Every gate this project had before this file read **text**: a licence label, a search-result title, a
 * texture count, a byte count. Text cannot tell a walrus from a walrus skull, and the catalogue proved
 * it by shipping a meerkat that was a skull and an octopus that was a sphere on a plane. This is the
 * gate that reads the picture instead, and it is a pure module so the rule can be tested without a
 * browser, a model file or a vision model.
 *
 * ## The rule, in one sentence
 *
 * **A verdict counts when a reviewer looked at an image, said the model is what the catalogue claims,
 * and the image it looked at is still the image on disk.**
 *
 * Each clause is a thing that has actually gone wrong in this repository:
 *
 *   - **a reviewer has to have looked.** `verdict` is one of three words and `subject` is a sentence
 *     about what was seen. A row with a verdict and no description is a checkbox, not evidence.
 *   - **"matches" and nothing else.** `mismatch` and `unclear` are useful answers that do not license
 *     a wire: a render too dark to read is not proof of anything, and the pipeline already refuses to
 *     write a frame below a coverage floor for the same reason.
 *   - **the image has to be the one that was judged.** `imageMd5` is the whole reason a re-render does
 *     not silently inherit an old verdict: `npm run models:previews -- --force` reproduces 228 of 234
 *     images bit-for-bit and shifts six, so a verdict tied to a file *name* would outlive its evidence.
 *     When the md5 does not match, the record is **stale** - not wrong, just no longer about this file.
 *
 * `data/model-verification.json` is written by `scripts/model-vision-review.mjs --record`, which is the
 * only thing that writes it, and the reviewer model is recorded per row: a verdict is only as good as
 * the reviewer, and a future run on a different model must not look like the same evidence.
 */

/** The three answers a reviewer may give. Nothing else is a verdict. */
export const VISION_VERDICTS = ["matches", "mismatch", "unclear"] as const;
export type VisionVerdict = (typeof VISION_VERDICTS)[number];

/** One row of the ledger: one vision check of one image of one model file. */
export interface VerificationRecord {
  verdict: VisionVerdict;
  /** What the reviewer says it actually saw - the sentence a stranger can check against the image. */
  subject: string;
  /** Why that verdict follows from what was seen. */
  reason: string;
  /** The model that did the looking, so a verdict is never anonymous. */
  reviewer: string;
  image: string;
  /** The md5 of the exact image that was judged. This is what makes a verdict expire. */
  imageMd5: string;
  model: string;
  modelSha256: string;
  /** The catalogue entries that point at this file, as they were when it was judged. */
  claims: { catalogue: string; slug: string; name: string; latin: string | null }[];
  checkedAt: string;
}

export interface VerificationLedger {
  note?: string;
  reviewer?: string;
  generatedAt?: string;
  entries: Record<string, VerificationRecord>;
}

/**
 * The shortest a description may be and still be a description.
 *
 * "looks right" is 11 characters and says nothing a second person could check; the floor exists so the
 * ledger cannot be filled with answers that are formally present and substantively empty.
 */
export const MIN_DESCRIPTION_LENGTH = 12;

/** True when a string is a verdict this module knows about. */
export function isVerdict(value: unknown): value is VisionVerdict {
  return typeof value === "string" && (VISION_VERDICTS as readonly string[]).includes(value);
}

/**
 * Where a model file is, written the way the ledger writes it: a path in the repository that a person
 * can open, the same form `image` uses.
 *
 * The catalogue's own `model_url` is the other form ("/models/lion.glb"), because that is what a
 * browser fetches. The two are one `public/` apart, and the ledger uses the openable one on purpose:
 * every field in a row is meant to be something a stranger can go and look at.
 */
export function modelPathFor(key: string): string {
  return "public/models/" + key + ".glb";
}

/**
 * Why a record is not evidence about the image in hand - or null when it is.
 *
 * One function rather than a scatter of conditions, because "is this verified" is asked in the review
 * report, in the wiring gate and in the tests, and three copies of the rule is three rules.
 */
export function rejectionReason(
  record: VerificationRecord | null | undefined,
  imageMd5: string | null,
): string | null {
  if (!record) return "no verdict has been recorded for this model";
  if (!isVerdict(record.verdict)) return "the recorded verdict is not one of " + VISION_VERDICTS.join("/");
  if (record.verdict === "mismatch") return "the reviewer says this model is not what the catalogue claims";
  if (record.verdict === "unclear") return "the reviewer could not tell what the render showed";
  if (!imageMd5) return "there is no image to check the verdict against";
  if (record.imageMd5 !== imageMd5) return "the image has been re-rendered since the verdict was recorded";
  if (typeof record.subject !== "string" || record.subject.trim().length < MIN_DESCRIPTION_LENGTH) {
    return "the verdict does not describe what was seen";
  }
  return null;
}

/** Shorthand for the one question the wiring gate asks. */
export function isVerified(record: VerificationRecord | null | undefined, imageMd5: string | null): boolean {
  return rejectionReason(record, imageMd5) === null;
}

/**
 * The sentence a wiring writes down as its evidence, so the reason a model was allowed in is readable
 * from the catalogue change alone rather than only from a ledger row nobody looks at.
 */
export function evidenceLine(record: VerificationRecord): string {
  return (
    'vision review by "' + record.reviewer + '": "' + record.subject.trim() + '" (' + record.reason.trim() +
    ") - image " + record.image + " md5 " + record.imageMd5
  );
}
