/**
 * Whether a species card may fetch a model on hover.
 *
 * Pure and dependency-free so that `scripts/check-preview.mjs` can run the rule against the
 * real manifest; `lib/attribution.ts` is the thin lookup that feeds it a record.
 *
 * The numbers are the repository's own shipping budget (public/models/README.md,
 * docs/ASSETS.md): under ~1.5 MB and ~75k triangles. The card draws the real .glb instead of
 * a procedural stand-in now, which is better in every way except one — a hover is not a
 * request to download a 2.8 MB elephant. Inside the budget: the model. Outside it: the
 * silhouette, with the full viewer on the species page unchanged.
 *
 * A missing face count is not a refusal. Unknown is a missing signal, not a bad one, which
 * is the same reading `lib/model-quality.ts` takes of an unknown triangle count.
 */

export const PREVIEW_BUDGET = { bytes: 1_500_000, faces: 75_000 } as const;

export interface PreviewCandidate {
  bytes: number;
  faceCount?: number | null;
}

export function withinPreviewBudget(record: PreviewCandidate): boolean {
  if (!Number.isFinite(record.bytes) || record.bytes <= 0) return false;
  if (record.bytes > PREVIEW_BUDGET.bytes) return false;
  return (record.faceCount ?? 0) <= PREVIEW_BUDGET.faces;
}
