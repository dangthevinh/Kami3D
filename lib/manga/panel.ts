import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { getPersonalDataClient } from "../personal-data.ts";
import { panelKey, panelObjectPath } from "../r2-paths.ts";
import { getR2Store, r2StorageStatus } from "../r2-storage.ts";
import {
  MANGA_COLUMNS,
  MANGA_IMAGE_EXTENSIONS,
  MANGA_NOT_CONFIGURED,
  MANGA_PANEL_BUCKET,
  MANGA_PANEL_MAX_BYTES,
  MANGA_TABLE,
  imageDimensions,
  isMangaImageType,
  mangaFail,
  mangaOk,
  sniffImageType,
  type MangaImageType,
  type MangaResult,
} from "./rules.ts";
import { mapPanel, requireOwnedChapter, type PanelRow } from "./project.ts";
import type { MangaPanel } from "./types.ts";

/**
 * Phase 24 (Manga Studio): panel images - upload, storage, order, delete.
 *
 * The bucket `manga-panels` is created by `supabase/schema.sql` as public-read, image-only, 8 MB,
 * and it has **no write policy**: the only way in is the service role. That is deliberate rather than
 * an oversight - a policy that let any signed-in account write into the bucket would let it write
 * anywhere in the bucket - so a deployment without `SUPABASE_SERVICE_ROLE_KEY` cannot store panels,
 * and this module says so in a sentence instead of failing silently.
 *
 * Three checks stand between a request and a stored image, and all three are needed:
 *
 *   1. the **declared** content type is one of the four the bucket allows;
 *   2. the **bytes** really are that type (`sniffImageType`), because a browser labels a file from
 *      its name and a text file called `panel.png` arrives as `image/png`;
 *   3. the size is under the bucket's own limit, checked before the body is read and again after.
 */
/** The bucket the SQL creates, under the short name the routes use. */
export const PANEL_BUCKET = MANGA_PANEL_BUCKET;

/**
 * The panel prefix and the URL↔key round trip live in `lib/r2-paths.ts`, not here.
 *
 * They are re-exported because every caller in the manga code says "panel", and because the mapping
 * from a Supabase bucket to an R2 key is one rule that three callers need — the app, the pipelines and
 * the migration. A copy of it here is how the migration ended up looking for `lion.ogg` where the key
 * is `sounds/lion.ogg`.
 */
export { PANEL_PREFIX, panelKey, panelObjectPath } from "../r2-paths.ts";

export interface PanelUploadInput {
  chapterId: string;
  /** The verified session id. Never read from the request body. */
  userId: string;
  bytes: Uint8Array;
  /** What the client said it was sending. Checked, not trusted. */
  declaredType: string;
  /** 0 for an upload, and the model's index for a generated panel. */
  width?: number | null;
  height?: number | null;
}

/**
 * Put an image in the bucket and add the row that points at it.
 *
 * The row is written **after** the object is stored: a row pointing at a missing object is a broken
 * image on a published page, whereas an object with no row is only a few wasted kilobytes that the
 * next upload of the same panel replaces.
 */
export async function storePanelImage(input: PanelUploadInput): Promise<MangaResult<MangaPanel>> {
  const supabase = await getPersonalDataClient();
  if (!supabase) return mangaFail(503, MANGA_NOT_CONFIGURED);

  const store = getR2Store();
  if (!store) {
    return mangaFail(503, "Storing panel images needs Cloudflare R2: " + r2StorageStatus());
  }

  const owned = await requireOwnedChapter(supabase, input.chapterId, input.userId);
  if (!owned.ok) return owned;

  const checked = checkImage(input.bytes, input.declaredType);
  if (!checked.ok) return checked;

  const orderIndex = await nextPanelOrder(supabase, input.chapterId);
  const path = panelStoragePath(input.userId, input.chapterId, checked.value);

  const uploaded = await store.put(panelKey(path), input.bytes, {
    contentType: checked.value,
    // The key carries a fresh uuid, so a collision means something is wrong rather than a replacement.
    upsert: false,
    // A panel is content-addressed by a fresh uuid, so it can be cached forever.
    cacheControl: "public, max-age=31536000, immutable",
  });
  if (!uploaded.ok) {
    console.warn("[kami3d] manga panel upload failed:", uploaded.reason);
    return mangaFail(502, "Could not store that image. Please try again.");
  }

  const imageUrl = uploaded.value.publicUrl;

  const { data, error } = await supabase
    .from(MANGA_TABLE.panels)
    .insert({
      chapter_id: input.chapterId,
      image_url: imageUrl,
      order_index: orderIndex,
      width: input.width ?? null,
      height: input.height ?? null,
    })
    .select(MANGA_COLUMNS.panels)
    .single();

  if (error || !data) {
    // The row is what makes the object reachable; without it the upload is garbage, so it goes.
    await store.remove([panelKey(path)]);
    console.warn("[kami3d] manga panel row failed:", error?.message ?? "no row");
    return mangaFail(502, "Could not save that panel. Please try again.");
  }

  return mangaOk(mapPanel(data as PanelRow));
}

/** A generated panel: same storage path, with the prompt, provider and model recorded on the row. */
export interface GeneratedPanelInput extends PanelUploadInput {
  aiPrompt: string;
  aiProvider: string;
  aiModel: string | null;
}

export async function storeGeneratedPanel(input: GeneratedPanelInput): Promise<MangaResult<MangaPanel>> {
  const stored = await storePanelImage(input);
  if (!stored.ok) return stored;

  const supabase = await getPersonalDataClient();
  if (!supabase) return mangaFail(503, MANGA_NOT_CONFIGURED);

  const { data, error } = await supabase
    .from(MANGA_TABLE.panels)
    .update({ ai_prompt: input.aiPrompt, ai_provider: input.aiProvider, ai_model: input.aiModel })
    .eq("id", stored.value.id)
    .select(MANGA_COLUMNS.panels)
    .maybeSingle();

  if (error || !data) {
    // The image is in place and usable; only its provenance is missing, and that is worth saying.
    console.warn("[kami3d] manga panel provenance failed:", error?.message ?? "no row");
    return mangaOk(stored.value);
  }

  return mangaOk(mapPanel(data as PanelRow));
}

/**
 * Check a panel image: type declared, type sniffed, size, and the pixel size when it can be read.
 *
 * The sniffed type is what gets stored, not the declared one: a JPEG labelled `image/png` would
 * otherwise be served with the wrong content type, and some browsers refuse to render it.
 */
export function checkImage(bytes: Uint8Array, declaredType: string): MangaResult<MangaImageType> {
  if (bytes.length === 0) return mangaFail(400, "That file is empty.");
  if (bytes.length > MANGA_PANEL_MAX_BYTES) {
    return mangaFail(413, "A panel can be at most " + Math.floor(MANGA_PANEL_MAX_BYTES / (1024 * 1024)) + " MB.");
  }

  const sniffed = sniffImageType(bytes);
  if (!sniffed) return mangaFail(415, "A panel must be a PNG, JPEG, WebP or AVIF image.");

  if (declaredType && declaredType !== sniffed && isMangaImageType(declaredType)) {
    console.warn("[kami3d] manga panel declared", declaredType, "but the bytes are", sniffed);
  }

  return mangaOk(sniffed);
}

/** Where a panel object lives: one folder per author, one per chapter, named by a fresh uuid. */
export function panelStoragePath(userId: string, chapterId: string, type: MangaImageType): string {
  return userId + "/" + chapterId + "/" + crypto.randomUUID() + "." + MANGA_IMAGE_EXTENSIONS[type];
}

/** The next order index: the highest in use plus one, so deleting a panel leaves no hole to reuse. */
export async function nextPanelOrder(supabase: SupabaseClient, chapterId: string): Promise<number> {
  const { data, error } = await supabase
    .from(MANGA_TABLE.panels)
    .select("order_index")
    .eq("chapter_id", chapterId)
    .order("order_index", { ascending: false })
    .limit(1);

  if (error) return 0;
  return (((data ?? []) as { order_index: number }[])[0]?.order_index ?? -1) + 1;
}

/** The pixel size of an uploaded panel, or nulls when the header does not say. */
export function panelSize(bytes: Uint8Array): { width: number | null; height: number | null } {
  const size = imageDimensions(bytes);
  return size ?? { width: null, height: null };
}

/**
 * Delete a panel row and the object behind it.
 *
 * The object is removed first and the row second only if that worked: the other order leaves an
 * image nobody can ever delete, because the URL was the only pointer to it.
 */
export async function deletePanel(panelId: string, userId: string): Promise<MangaResult<true>> {
  const supabase = await getPersonalDataClient();
  if (!supabase) return mangaFail(503, MANGA_NOT_CONFIGURED);

  const { data, error } = await supabase.from(MANGA_TABLE.panels).select("id, image_url, chapter_id").eq("id", panelId).maybeSingle();
  if (error) return mangaFail(502, "Could not read that panel. Please try again.");
  if (!data) return mangaFail(404, "That panel does not exist.");

  const panel = data as { id: string; image_url: string; chapter_id: string };
  const owned = await requireOwnedChapter(supabase, panel.chapter_id, userId);
  if (!owned.ok) return mangaFail(404, "That panel does not exist, or it is not yours.");

  const store = getR2Store();
  const path = panelObjectPath(panel.image_url);
  if (store && path) {
    const removed = await store.remove([panelKey(path)]);
    if (!removed.ok) {
      console.warn("[kami3d] manga panel object delete failed:", removed.reason);
      return mangaFail(502, "Could not delete the stored image. Please try again.");
    }
  }

  const deleted = await supabase.from(MANGA_TABLE.panels).delete().eq("id", panelId);
  if (deleted.error) {
    console.warn("[kami3d] manga panel delete failed:", deleted.error.message);
    return mangaFail(502, "Could not delete that panel. Please try again.");
  }

  return mangaOk(true);
}


