import { stripControl } from "../sanitize.ts";
import type { BubbleType } from "../manga-layout.ts";

/**
 * Phase 24 (Manga Studio): every number and every name the database enforces, in one place.
 *
 * Why this file exists rather than a literal in each route: the SQL in `supabase/schema.sql` is
 * frozen and is the real authority - it caps a bubble at 400 characters, a comment between 1 and
 * 1000, a title between 1 and 160, the bucket at 8 MB and four image types, and the status set at
 * three values. A route that keeps its own copy of those numbers drifts the first time one of them
 * changes, and the symptom is a Postgres error a visitor cannot act on. Here they are declared once,
 * the routes import them, and `scripts/check-manga.mjs` reads the SQL and fails if the two disagree.
 *
 * Nothing here touches the network, Supabase or the environment, so the check suite can import it
 * under plain `node --test`.
 */

/** Table names, spelled the way the SQL spells them. */
export const MANGA_TABLE = {
  projects: "manga_projects",
  chapters: "manga_chapters",
  panels: "manga_panels",
  pages: "manga_pages",
  bubbles: "manga_bubbles",
  likes: "manga_likes",
  comments: "manga_comments",
  follows: "manga_follows",
} as const;

/**
 * The columns each table is read with.
 *
 * Listed rather than selected with `*` for one reason: the row type in `lib/manga/project.ts` is
 * written by hand, and a column added to the database but not to this string would be silently
 * missing from every read. The check suite compares these lists against the CREATE TABLE statements.
 */
export const MANGA_COLUMNS = {
  projects:
    "id, user_id, title, description, cover_url, genres, age_rating, status, is_public, is_webtoon, view_count, created_at, updated_at",
  chapters: "id, project_id, title, chapter_number, script, status, created_at, updated_at",
  panels: "id, chapter_id, image_url, order_index, width, height, created_at, ai_prompt, ai_provider, ai_model",
  pages: "id, chapter_id, page_number, layout_data, created_at",
  bubbles: "id, page_id, panel_id, content, bubble_type, position, style, created_at",
  comments: "id, project_id, user_id, content, created_at",
  likes: "project_id, user_id, created_at",
  follows: "follower_id, following_id, created_at",
} as const;

/** `status in ('draft','published','archived')`, for both projects and chapters. */
export const MANGA_STATUSES = ["draft", "published", "archived"] as const;
/** `age_rating in ('all','teen','mature')`. */
export const MANGA_AGE_RATINGS = ["all", "teen", "mature"] as const;

/** `check (length(btrim(title)) between 1 and 160)`, on projects and chapters alike. */
export const MANGA_TITLE_MAX_CHARS = 160;
/** The database caps a bubble at 400 characters and nothing else. */
export const MANGA_BUBBLE_MAX_CHARS = 400;
/** `check (length(btrim(content)) between 1 and 1000)` on manga_comments. */
export const MANGA_COMMENT_MIN_CHARS = 1;
export const MANGA_COMMENT_MAX_CHARS = 1000;

/**
 * Lengths the database does not cap but the wire does.
 *
 * `description` and `script` are unbounded `text` columns, so without a ceiling a single request
 * could post megabytes into a row. These are generous limits, not artwork limits.
 */
export const MANGA_DESCRIPTION_MAX_CHARS = 4_000;
export const MANGA_SCRIPT_MAX_CHARS = 20_000;
export const MANGA_PROMPT_MAX_CHARS = 1_500;
export const MANGA_COVER_URL_MAX_CHARS = 2_048;
export const MANGA_MAX_GENRES = 12;
export const MANGA_GENRE_MAX_CHARS = 40;
/** One page holds at most this many panel slots: more than the largest template, and bounded. */
export const MANGA_PAGE_MAX_SLOTS = 12;
/** Bubbles moved in one composer save, and panels in one chapter, are both bounded. */
export const MANGA_PAGE_PATCH_MAX_BUBBLES = 200;

/** The storage bucket the SQL creates, and the limits it is created with. */
export const MANGA_PANEL_BUCKET = "manga-panels";
/** `file_size_limit` of the bucket: 8 MB. Checked before and during the upload. */
export const MANGA_PANEL_MAX_BYTES = 8_388_608;
/** `allowed_mime_types` of the bucket, in the order the SQL lists them. */
export const MANGA_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/avif"] as const;
export type MangaImageType = (typeof MANGA_IMAGE_TYPES)[number];

/** The environment variables the AI module reads. Named here so the docs and the code agree. */
export const MANGA_AI_ENV = {
  provider: "MANGA_AI_PROVIDER",
  apiKey: "MANGA_AI_API_KEY",
  model: "MANGA_AI_MODEL",
} as const;

/** The sentence every write route answers with when there is no database to write to. */
export const MANGA_NOT_CONFIGURED =
  "Manga Studio needs Supabase and a signed-in account. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, then sign in.";

/** One shape for "this failed, and here is what to tell the caller". */
export interface MangaFailure {
  ok: false;
  /** The HTTP status the route should answer with. */
  status: number;
  error: string;
}
export interface MangaSuccess<T> {
  ok: true;
  value: T;
}
export type MangaResult<T> = MangaSuccess<T> | MangaFailure;

export const mangaOk = <T>(value: T): MangaSuccess<T> => ({ ok: true, value });
export const mangaFail = (status: number, error: string): MangaFailure => ({ ok: false, status, error });

export function isMangaStatus(value: unknown): value is (typeof MANGA_STATUSES)[number] {
  return typeof value === "string" && (MANGA_STATUSES as readonly string[]).includes(value);
}

export function isMangaAgeRating(value: unknown): value is (typeof MANGA_AGE_RATINGS)[number] {
  return typeof value === "string" && (MANGA_AGE_RATINGS as readonly string[]).includes(value);
}

export function isMangaImageType(value: string): value is MangaImageType {
  return (MANGA_IMAGE_TYPES as readonly string[]).includes(value);
}

export function isBubbleType(value: unknown): value is BubbleType {
  return value === "speech" || value === "thought" || value === "narration" || value === "scream";
}

/** The file extension a stored panel gets, one per allowed type. */
export const MANGA_IMAGE_EXTENSIONS: Record<MangaImageType, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/avif": "avif",
};

/**
 * What an upload actually is, from its first bytes.
 *
 * The bucket's `allowed_mime_types` is checked against the content type the *client* declares, and a
 * browser sets that from the file extension: a text file renamed to `.png` arrives labelled
 * `image/png`. Sniffing the signature is what makes the label mean something. Returns null when the
 * bytes match none of the four allowed types - which is a refusal, not a fallback.
 */
export function sniffImageType(bytes: Uint8Array): MangaImageType | null {
  const at = (index: number, ...expected: number[]): boolean =>
    expected.every((value, offset) => bytes[index + offset] === value);

  const ascii = (index: number, text: string): boolean =>
    [...text].every((char, offset) => bytes[index + offset] === char.charCodeAt(0));

  if (bytes.length >= 8 && at(0, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return "image/png";
  if (bytes.length >= 3 && at(0, 0xff, 0xd8, 0xff)) return "image/jpeg";
  if (bytes.length >= 12 && ascii(0, "RIFF") && ascii(8, "WEBP")) return "image/webp";
  // ISO base media file format: the brand sits after the 'ftyp' box header.
  if (bytes.length >= 12 && ascii(4, "ftyp") && (ascii(8, "avif") || ascii(8, "avis"))) return "image/avif";
  return null;
}

/**
 * The pixel size of a stored panel, from its header.
 *
 * The reader uses it to reserve space before an image loads, which is what stops a webtoon from
 * jumping under the reader's thumb. Only PNG and JPEG are parsed, because those are what the browser
 * canvas and the image APIs hand back; anything else returns null and the reader falls back to the
 * template's aspect ratio rather than to a guessed number.
 */
export function imageDimensions(bytes: Uint8Array): { width: number; height: number } | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  // PNG: the IHDR chunk is first and always at a fixed offset - 8 signature bytes, then
  // 4 length + 4 type, and the two uint32s are big endian.
  if (bytes.length >= 24 && sniffImageType(bytes) === "image/png") {
    const width = view.getUint32(16, false);
    const height = view.getUint32(20, false);
    if (width > 0 && height > 0) return { width, height };
    return null;
  }

  if (bytes.length >= 4 && sniffImageType(bytes) === "image/jpeg") {
    let offset = 2; // past SOI
    while (offset + 9 < bytes.length) {
      if (bytes[offset] !== 0xff) {
        offset += 1;
        continue;
      }
      const marker = bytes[offset + 1];
      // Start-of-frame markers carry the size. C4, C8 and CC are DHT, JPG and DAC - not frames.
      const isFrame = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
      if (isFrame) {
        const height = view.getUint16(offset + 5, false);
        const width = view.getUint16(offset + 7, false);
        return width > 0 && height > 0 ? { width, height } : null;
      }
      // A standalone marker (no length field) is two bytes; everything else carries its length.
      if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
        offset += 2;
        continue;
      }
      const length = view.getUint16(offset + 2, false);
      if (length < 2) return null;
      offset += 2 + length;
    }
    return null;
  }

  return null;
}

/** Trim, drop empties, dedupe, keep the order the author typed, and cap the list. Null = unusable. */
export function coerceGenres(value: unknown): string[] | null {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) return null;
  if (value.length > MANGA_MAX_GENRES * 4) return null;

  const seen = new Set<string>();
  for (const entry of value) {
    if (typeof entry !== "string") return null;
    const genre = entry.trim().replace(/\s+/g, " ");
    if (genre.length === 0 || genre.length > MANGA_GENRE_MAX_CHARS) return null;
    seen.add(genre);
  }
  if (seen.size > MANGA_MAX_GENRES) return null;
  return [...seen];
}

/**
 * A trimmed string within a limit, or null when the request did not send one.
 *
 * Phase 31 added the first half of that job: control characters and zero-width/bidi marks are dropped
 * before the length is measured (`lib/sanitize.ts`). They survive JSON, are invisible in the editor
 * that typed them, break a log line, and — in the case of a bidi override — let a title read one way in
 * the database and another way on the page. Newlines and tabs are kept: a script is typed with both.
 *
 * The length rule itself is unchanged, and it is the strict one: a value over the cap is **refused**
 * rather than silently cut, because a truncated manga line is somebody's sentence with the end missing.
 */
export function boundedText(value: unknown, max: number): string | null {
  if (value === undefined) return null;
  if (typeof value !== "string") return null;
  const text = stripControl(value).trim();
  if (text.length === 0) return null;
  return text.length > max ? null : text;
}

/** An absolute http(s) URL, which is all the database stores (a Storage public URL fits). */
export function httpUrl(value: unknown): string | null {
  if (value === undefined) return null;
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (text.length === 0 || text.length > MANGA_COVER_URL_MAX_CHARS) return null;
  try {
    const parsed = new URL(text);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}

/** `Number.isFinite`, for values arriving as JSON. */
export function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
