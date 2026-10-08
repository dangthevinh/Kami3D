import { assetUrl } from "@/lib/r2";

/**
 * The picture of a model, for the place where a live one would be a download.
 *
 * A card used to draw the model itself on hover: `lib/model-preview.ts` decided which files were small
 * enough for that to be reasonable, and anything over 1.5 MB fell back to an emoji. That rule had two
 * problems — a hover is not a request to download 1.4 MB, and most of the catalogue (the landmarks, the
 * big animals) could never show anything but an emoji.
 *
 * So every model was rendered once, off-screen, by `scripts/render-model-previews.mjs`, and the result
 * is what a card shows before anything is fetched.
 *
 * ## Why this module has no imports but one
 *
 * The obvious implementation reads `data/previews.json` and checks whether a key is in it. That file is
 * ~40 KB, and these cards are client components, so "is there a preview?" would ship the whole catalogue's
 * index to every visitor — against a project that enforces JS budgets per route (`npm run check:bundle`).
 *
 * So there is no lookup. The path is derived from the model URL, and a card that finds no file falls back
 * to the emoji it has always shown; the `<img>` reports that with `onError`. Deriving the path is also
 * what makes this work in Demo Mode, where there is no database column to read a preview from.
 *
 * The manifest still exists, and it still matters — but as a **receipt**: it records what was rendered,
 * with bytes and md5, so a test can compare the repository against it (`scripts/check-r2.mjs`) instead of
 * trusting a directory listing.
 */

/**
 * The preview key for a model URL — `models/` removed, extension dropped.
 *
 * It looks for `/models/` anywhere in the string rather than anchoring at the start, because the same
 * value arrives three ways: repo-relative (`/models/lion.glb`), absolute from R2 when the CDN cutover is
 * on, and absolute from Supabase Storage for a model published before the move. In all three, what
 * follows `/models/` is the identity of the file, which is why nothing has to be normalised first.
 */
export function previewKeyFor(modelUrl: string | null | undefined): string | null {
  if (!modelUrl) return null;

  const marker = "/models/";
  const at = modelUrl.indexOf(marker);
  if (at === -1) return null;

  const relative = modelUrl.slice(at + marker.length).split("?")[0].replace(/\.glb$/i, "");
  return relative.length > 0 ? relative : null;
}

/**
 * The URL a card should draw, or `null` when there is nothing to draw.
 *
 * No existence check, deliberately: the file either resolves or the `<img>` fires `onError` and the card
 * keeps its emoji. A missing preview is a missing picture, not a broken page.
 */
export function previewImageFor(modelUrl: string | null | undefined): string | null {
  const key = previewKeyFor(modelUrl);
  return key === null ? null : assetUrl("/previews/" + key + ".webp");
}
