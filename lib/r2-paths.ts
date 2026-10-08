/**
 * Where a file lives, once there is only one bucket.
 *
 * Supabase gave every asset kind its own bucket — `animal-assets`, `animal-sounds`, `manga-panels` —
 * and R2 gives this project one. So the old bucket name becomes a key prefix, and the mapping from
 * "a path in a Supabase bucket" to "a key in R2" is a rule that three different callers need:
 *
 *   - the app, when it stores a model, a recording or a manga panel (`lib/r2-storage.ts`,
 *     `lib/manga/panel.ts`);
 *   - the pipelines, when they upload what they downloaded (`scripts/fetch-*.mjs`);
 *   - the migration, when it proves an old object is safely on R2 before deleting it
 *     (`scripts/migrate-storage-to-r2.mjs`).
 *
 * That is exactly the shape of rule that drifts when it is copied: the first version of the migration
 * looked for `lion.ogg` where the key is `sounds/lion.ogg` and reported six files as missing that had
 * been there all along. So it lives here once, in a module with **no imports**, which is what lets the
 * plain-Node suites import it directly (`scripts/check-r2.mjs`).
 */

/** The prefix every Supabase Storage public URL shares. */
export const STORAGE_PUBLIC_MARKER = "/storage/v1/object/public/";

/** R2 key prefixes that replaced whole Supabase buckets. */
export const R2_PREFIXES = {
  sounds: "sounds",
  panels: "panels",
  /**
   * Where an as-downloaded original goes when R2 already serves a different file at the natural key.
   *
   * `models/axolotl.glb` on R2 is the file the site serves *and* the file `public/models/` holds; the
   * two must stay byte-identical or the CDN and the repository have quietly forked. The Supabase copy
   * of that name is the uncompressed original it was made from, so it is parked rather than put on top.
   */
  originals: "originals",
} as const;

/** The manga panel prefix, under its own name because so much of the manga code says "panel". */
export const PANEL_PREFIX = R2_PREFIXES.panels;

/**
 * The R2 key for an object that lived in a Supabase bucket.
 *
 * `animal-assets` is the exception that proves the rule: its paths were already namespaced
 * (`models/…`, `uploads/…`), so they are used verbatim. That is why `model_assets.storage_path` —
 * written years before R2 existed — is still a valid R2 key today, and why nothing in the database had
 * to be re-keyed.
 */
export function r2KeyFor(bucket: string, path: string): string {
  const clean = path.replace(/^\/+/, "");
  if (bucket === "animal-sounds") return R2_PREFIXES.sounds + "/" + clean;
  if (bucket === "manga-panels") return R2_PREFIXES.panels + "/" + clean;
  return clean;
}

/** The object key for a panel path, which is what every R2 call takes. */
export function panelKey(path: string): string {
  return PANEL_PREFIX + "/" + path.replace(/^\/+/, "");
}

/**
 * The object path, recovered from the public URL a row stores.
 *
 * Two markers, not one: rows written before the move point at Supabase Storage and rows written after
 * it point at R2, and a panel uploaded last month must still be deletable today. Recognising only the
 * new shape would strand every old row with an image nobody could remove.
 *
 * Note that the returned path does **not** include the `panels/` prefix — it is the path *inside* the
 * panel area, which is what `panelKey()` takes back.
 */
export function panelObjectPath(imageUrl: string): string | null {
  const markers = ["/" + PANEL_PREFIX + "/", STORAGE_PUBLIC_MARKER + "manga-panels/"];

  for (const marker of markers) {
    const at = imageUrl.indexOf(marker);
    if (at === -1) continue;
    const path = imageUrl.slice(at + marker.length).split("?")[0];
    if (path.length > 0) return decodeURIComponent(path);
  }

  return null;
}

/** `<host>/storage/v1/object/public/<bucket>/<path>` → `{ bucket, path }`, or null for anything else. */
export function parseStorageUrl(url: string): { bucket: string; path: string } | null {
  const at = url.indexOf(STORAGE_PUBLIC_MARKER);
  if (at === -1) return null;

  const rest = url.slice(at + STORAGE_PUBLIC_MARKER.length);
  const slash = rest.indexOf("/");
  if (slash === -1) return null;

  return { bucket: rest.slice(0, slash), path: rest.slice(slash + 1) };
}
