import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { clampBubble, nextPageNumber, panelRects, MANGA_TEMPLATES } from "../manga-layout.ts";
import type { MangaTemplate, PanelRect } from "../manga-layout.ts";
import { getPersonalDataClient } from "../personal-data.ts";
import { getSupabase } from "../supabase.ts";
import {
  MANGA_BUBBLE_MAX_CHARS,
  MANGA_COLUMNS,
  MANGA_DESCRIPTION_MAX_CHARS,
  MANGA_NOT_CONFIGURED,
  MANGA_PAGE_MAX_SLOTS,
  MANGA_PAGE_PATCH_MAX_BUBBLES,
  MANGA_SCRIPT_MAX_CHARS,
  MANGA_TABLE,
  MANGA_TITLE_MAX_CHARS,
  boundedText,
  coerceGenres,
  finiteNumber,
  httpUrl,
  isBubbleType,
  isMangaAgeRating,
  isMangaStatus,
  mangaFail,
  mangaOk,
  type MangaResult,
} from "./rules.ts";
import type {
  MangaAgeRating,
  MangaBubble,
  MangaChapter,
  MangaLayoutData,
  MangaPage,
  MangaPanel,
  MangaProject,
  MangaSlot,
  MangaStatus,
} from "./types.ts";

/**
 * Phase 24 (Manga Studio): projects, chapters, pages and bubbles.
 *
 * Three things this file is careful about.
 *
 * **Reads never throw.** A public gallery page renders with no database, a dropped connection or a
 * schema that has not been applied; all three return an empty list rather than an error page. Every
 * read here answers `null` or `[]` and logs one line.
 *
 * **Public reads go through the anonymous client, not the service role.** Row level security is what
 * decides that a draft is invisible to everybody but its author, so `getPublicProject` uses the anon
 * key where the policies apply. When a viewer is given (the studio showing the author their own
 * draft), the row is re-checked against that viewer's id *in code* before it is returned - because the
 * service-role fallback of `getPersonalDataClient()` bypasses RLS entirely, and "the database said so"
 * is only true when the database was allowed to speak.
 *
 * **Counts are real.** `chapterCount`, `pageCount`, `panelCount` and `likeCount` come from rows that
 * exist, counted in one batch per read rather than one query per card.
 */

/** How many counting rows one read will look at. See `loadProjectCounts`. */
const COUNT_ROW_LIMIT = 10_000;

/* ------------------------------------------------------------------------------------------- *
 * Rows and mappers
 * ------------------------------------------------------------------------------------------- */

export interface ProjectRow {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  genres: string[] | null;
  age_rating: string;
  status: string;
  is_public: boolean;
  is_webtoon: boolean;
  view_count: number;
  created_at: string;
  updated_at: string;
}

export interface ChapterRow {
  id: string;
  project_id: string;
  title: string;
  chapter_number: number;
  script: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface PanelRow {
  id: string;
  chapter_id: string;
  image_url: string;
  order_index: number;
  width: number | null;
  height: number | null;
  created_at: string;
  ai_prompt: string | null;
  ai_provider: string | null;
  ai_model: string | null;
}

export interface PageRow {
  id: string;
  chapter_id: string;
  page_number: number;
  layout_data: unknown;
  created_at: string;
}

export interface BubbleRow {
  id: string;
  page_id: string;
  panel_id: string | null;
  content: string;
  bubble_type: string;
  position: unknown;
  style: unknown;
  created_at: string;
}

const STATUS_FALLBACK: MangaStatus = "draft";

const asStatus = (value: string): MangaStatus => (isMangaStatus(value) ? value : STATUS_FALLBACK);
const asAgeRating = (value: string): MangaAgeRating => (isMangaAgeRating(value) ? value : "all");

/** A rectangle from JSON: four finite numbers, positive size. Null when it is anything else. */
export function coerceRect(raw: unknown): PanelRect | null {
  if (typeof raw !== "object" || raw === null) return null;
  const candidate = raw as Record<string, unknown>;
  const x = finiteNumber(candidate.x);
  const y = finiteNumber(candidate.y);
  const w = finiteNumber(candidate.w);
  const h = finiteNumber(candidate.h);
  if (x === null || y === null || w === null || h === null) return null;
  if (w <= 0 || h <= 0) return null;
  return { x, y, w, h };
}

const PAGE_BOX: PanelRect = { x: 0, y: 0, w: 1, h: 1 };

/** A rectangle pulled inside the page. A slot that starts off the paper is clipped, not stored. */
export const clampToPage = (rect: PanelRect): PanelRect => clampBubble(rect, PAGE_BOX);

/**
 * `layout_data` as the UI expects it.
 *
 * The column is `jsonb not null default '{}'`, so every reader has to survive a row that was written
 * by hand, by an older version, or by nothing at all. When the stored value is unusable the page
 * falls back to its template's own rectangles with no panels attached - a page that renders empty is
 * recoverable; a page that throws is a white screen.
 */
export function coerceLayoutData(raw: unknown, template: MangaTemplate = "classic-4"): MangaLayoutData {
  const source = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
  const chosen = MANGA_TEMPLATES.find((entry) => entry.id === source.template)?.id ?? template;
  const rects = panelRects(chosen);
  const rawSlots = Array.isArray(source.slots) ? source.slots : [];

  const slots: MangaSlot[] = [];
  for (let index = 0; index < Math.max(rects.length, rawSlots.length); index += 1) {
    const fallback = rects[index] ?? rects[rects.length - 1];
    const entry = rawSlots[index];
    const rect = coerceRect(entry && typeof entry === "object" ? (entry as Record<string, unknown>).rect : null);
    const panelId = entry && typeof entry === "object" ? (entry as Record<string, unknown>).panelId : null;
    slots.push({
      rect: clampToPage(rect ?? fallback),
      panelId: typeof panelId === "string" && panelId.length > 0 ? panelId : null,
    });
  }

  return { template: chosen, slots };
}

/** Where a bubble sits when its stored position is unusable: the top-left of its panel. */
export const DEFAULT_BUBBLE_RECT: PanelRect = { x: 0.06, y: 0.06, w: 0.34, h: 0.14 };

/** The rectangle a bubble is clamped against: the panel it names, or the whole page. */
export function bubbleBounds(layout: MangaLayoutData, panelId: string | null): PanelRect {
  if (!panelId) return PAGE_BOX;
  const slot = layout.slots.find((entry) => entry.panelId === panelId);
  return slot ? slot.rect : PAGE_BOX;
}

export const mapPanel = (row: PanelRow): MangaPanel => ({
  id: row.id,
  chapterId: row.chapter_id,
  imageUrl: row.image_url,
  orderIndex: row.order_index,
  width: row.width,
  height: row.height,
  createdAt: row.created_at,
  aiPrompt: row.ai_prompt,
  aiProvider: row.ai_provider,
  aiModel: row.ai_model,
});

export const mapPage = (row: PageRow): MangaPage => ({
  id: row.id,
  chapterId: row.chapter_id,
  pageNumber: row.page_number,
  layoutData: coerceLayoutData(row.layout_data),
  createdAt: row.created_at,
});

export const mapBubble = (row: BubbleRow): MangaBubble => ({
  id: row.id,
  pageId: row.page_id,
  panelId: row.panel_id,
  content: row.content,
  bubbleType: isBubbleType(row.bubble_type) ? row.bubble_type : "speech",
  position: coerceRect(row.position) ?? DEFAULT_BUBBLE_RECT,
  style: typeof row.style === "object" && row.style !== null ? (row.style as Record<string, unknown>) : {},
  createdAt: row.created_at,
});

export const mapChapter = (row: ChapterRow, counts: { panels: number; pages: number } = { panels: 0, pages: 0 }): MangaChapter => ({
  id: row.id,
  projectId: row.project_id,
  title: row.title,
  chapterNumber: row.chapter_number,
  script: row.script,
  status: asStatus(row.status),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  panelCount: counts.panels,
  pageCount: counts.pages,
});

export const mapProject = (
  row: ProjectRow,
  counts: { chapters: number; pages: number; likes: number } = { chapters: 0, pages: 0, likes: 0 },
): MangaProject => ({
  id: row.id,
  userId: row.user_id,
  title: row.title,
  description: row.description,
  coverUrl: row.cover_url,
  genres: Array.isArray(row.genres) ? row.genres.filter((genre): genre is string => typeof genre === "string") : [],
  ageRating: asAgeRating(row.age_rating),
  status: asStatus(row.status),
  isPublic: row.is_public,
  isWebtoon: row.is_webtoon,
  viewCount: row.view_count,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  chapterCount: counts.chapters,
  pageCount: counts.pages,
  likeCount: counts.likes,
});

/* ------------------------------------------------------------------------------------------- *
 * Counting
 * ------------------------------------------------------------------------------------------- */

interface CountMaps {
  chapters: Map<string, number>;
  pages: Map<string, number>;
  likes: Map<string, number>;
}

const emptyCounts = (): CountMaps => ({ chapters: new Map(), pages: new Map(), likes: new Map() });

const bump = (map: Map<string, number>, key: string): void => {
  map.set(key, (map.get(key) ?? 0) + 1);
};

/**
 * Count chapters, pages and likes for a set of projects.
 *
 * Three queries for the whole list rather than three per card: a gallery of fifty projects would
 * otherwise be a hundred and fifty round trips. The row limit is stated rather than hidden - PostgREST
 * caps a response anyway, and a project with more than ten thousand pages is beyond anything the
 * composer can build.
 */
async function loadProjectCounts(supabase: SupabaseClient, projectIds: string[]): Promise<CountMaps> {
  const counts = emptyCounts();
  if (projectIds.length === 0) return counts;

  try {
    const chapters = await supabase.from(MANGA_TABLE.chapters).select("id, project_id").in("project_id", projectIds).limit(COUNT_ROW_LIMIT);
    if (chapters.error || !chapters.data) return counts;

    const rows = chapters.data as { id: string; project_id: string }[];
    const chapterOwner = new Map<string, string>();
    for (const row of rows) {
      chapterOwner.set(row.id, row.project_id);
      bump(counts.chapters, row.project_id);
    }

    const chapterIds = [...chapterOwner.keys()];
    if (chapterIds.length > 0) {
      const pages = await supabase.from(MANGA_TABLE.pages).select("chapter_id").in("chapter_id", chapterIds).limit(COUNT_ROW_LIMIT);
      for (const row of (pages.data ?? []) as { chapter_id: string }[]) {
        const projectId = chapterOwner.get(row.chapter_id);
        if (projectId) bump(counts.pages, projectId);
      }
    }

    const likes = await supabase.from(MANGA_TABLE.likes).select("project_id").in("project_id", projectIds).limit(COUNT_ROW_LIMIT);
    for (const row of (likes.data ?? []) as { project_id: string }[]) bump(counts.likes, row.project_id);
  } catch (error) {
    console.warn("[kami3d] manga counts unavailable:", error instanceof Error ? error.message : String(error));
  }

  return counts;
}

/** Panels and pages per chapter, in two queries for the whole list. */
async function loadChapterCounts(supabase: SupabaseClient, chapterIds: string[]): Promise<Map<string, { panels: number; pages: number }>> {
  const counts = new Map<string, { panels: number; pages: number }>();
  if (chapterIds.length === 0) return counts;

  const entry = (id: string) => {
    const current = counts.get(id) ?? { panels: 0, pages: 0 };
    counts.set(id, current);
    return current;
  };

  try {
    const panels = await supabase.from(MANGA_TABLE.panels).select("chapter_id").in("chapter_id", chapterIds).limit(COUNT_ROW_LIMIT);
    for (const row of (panels.data ?? []) as { chapter_id: string }[]) entry(row.chapter_id).panels += 1;

    const pages = await supabase.from(MANGA_TABLE.pages).select("chapter_id").in("chapter_id", chapterIds).limit(COUNT_ROW_LIMIT);
    for (const row of (pages.data ?? []) as { chapter_id: string }[]) entry(row.chapter_id).pages += 1;
  } catch (error) {
    console.warn("[kami3d] manga chapter counts unavailable:", error instanceof Error ? error.message : String(error));
  }

  return counts;
}

/* ------------------------------------------------------------------------------------------- *
 * Clients and ownership
 * ------------------------------------------------------------------------------------------- */

/** The anonymous, RLS-governed client. Null in Demo Mode. */
function publicClient(): SupabaseClient | null {
  return getSupabase();
}

export interface OwnedProjectRef {
  id: string;
  userId: string;
}

export interface OwnedChapterRef {
  id: string;
  projectId: string;
}

/**
 * "This row is mine", decided from the database and never from the request body.
 *
 * The query filters on `user_id`, so under the service role - which bypasses RLS - it is still the
 * thing that stops one account from editing another's manga. The id always comes from the verified
 * session; a body carrying `userId` is a body this code ignores.
 */
export async function requireOwnedProject(
  supabase: SupabaseClient,
  projectId: string,
  userId: string,
): Promise<MangaResult<OwnedProjectRef>> {
  const { data, error } = await supabase.from(MANGA_TABLE.projects).select("id, user_id").eq("id", projectId).eq("user_id", userId).maybeSingle();
  if (error) return mangaFail(502, "Could not read that project. Please try again.");
  if (!data) return mangaFail(404, "That manga does not exist, or it is not yours.");
  const row = data as { id: string; user_id: string };
  return mangaOk({ id: row.id, userId: row.user_id });
}

/** A chapter, checked through the project that owns it. */
export async function requireOwnedChapter(
  supabase: SupabaseClient,
  chapterId: string,
  userId: string,
): Promise<MangaResult<OwnedChapterRef>> {
  const { data, error } = await supabase.from(MANGA_TABLE.chapters).select("id, project_id").eq("id", chapterId).maybeSingle();
  if (error) return mangaFail(502, "Could not read that chapter. Please try again.");
  if (!data) return mangaFail(404, "That chapter does not exist.");

  const chapter = data as { id: string; project_id: string };
  const owned = await requireOwnedProject(supabase, chapter.project_id, userId);
  if (!owned.ok) return mangaFail(404, "That chapter does not exist, or it is not yours.");
  return mangaOk({ id: chapter.id, projectId: chapter.project_id });
}

/** A page, checked through its chapter and project. */
export async function requireOwnedPage(
  supabase: SupabaseClient,
  pageId: string,
  userId: string,
): Promise<MangaResult<{ id: string; chapterId: string }>> {
  const { data, error } = await supabase.from(MANGA_TABLE.pages).select("id, chapter_id").eq("id", pageId).maybeSingle();
  if (error) return mangaFail(502, "Could not read that page. Please try again.");
  if (!data) return mangaFail(404, "That page does not exist.");

  const page = data as { id: string; chapter_id: string };
  const owned = await requireOwnedChapter(supabase, page.chapter_id, userId);
  if (!owned.ok) return mangaFail(404, "That page does not exist, or it is not yours.");
  return mangaOk({ id: page.id, chapterId: page.chapter_id });
}

/** A bubble, checked through its page. */
export async function requireOwnedBubble(
  supabase: SupabaseClient,
  bubbleId: string,
  userId: string,
): Promise<MangaResult<{ id: string; pageId: string }>> {
  const { data, error } = await supabase.from(MANGA_TABLE.bubbles).select("id, page_id").eq("id", bubbleId).maybeSingle();
  if (error) return mangaFail(502, "Could not read that bubble. Please try again.");
  if (!data) return mangaFail(404, "That speech bubble does not exist.");

  const bubble = data as { id: string; page_id: string };
  const owned = await requireOwnedPage(supabase, bubble.page_id, userId);
  if (!owned.ok) return mangaFail(404, "That speech bubble does not exist, or it is not yours.");
  return mangaOk({ id: bubble.id, pageId: bubble.page_id });
}

/* ------------------------------------------------------------------------------------------- *
 * Reads
 * ------------------------------------------------------------------------------------------- */

async function projectRowsById(supabase: SupabaseClient, projectId: string): Promise<ProjectRow | null> {
  const { data, error } = await supabase.from(MANGA_TABLE.projects).select(MANGA_COLUMNS.projects).eq("id", projectId).maybeSingle();
  if (error) {
    console.warn("[kami3d] manga project read failed:", error.message);
    return null;
  }
  return (data as ProjectRow | null) ?? null;
}

/**
 * One project, readable by anybody when it is published, or by its author.
 *
 * `viewerId` is optional and only ever widens what the *author* can see: the second attempt reads
 * with the visitor's own Supabase client (or, where the deployment has no Clerk-to-Supabase token,
 * with the service role), so the returned row is compared against that id before it is handed back.
 */
export async function getPublicProject(projectId: string, viewerId: string | null = null): Promise<MangaProject | null> {
  const anon = publicClient();
  if (anon) {
    const row = await projectRowsById(anon, projectId);
    if (row) {
      const counts = await loadProjectCounts(anon, [row.id]);
      return mapProject(row, {
        chapters: counts.chapters.get(row.id) ?? 0,
        pages: counts.pages.get(row.id) ?? 0,
        likes: counts.likes.get(row.id) ?? 0,
      });
    }
  }

  if (!viewerId) return null;

  const personal = await getPersonalDataClient();
  if (!personal) return null;

  const row = await projectRowsById(personal, projectId);
  if (!row || row.user_id !== viewerId) return null;
  const counts = await loadProjectCounts(personal, [row.id]);
  return mapProject(row, {
    chapters: counts.chapters.get(row.id) ?? 0,
    pages: counts.pages.get(row.id) ?? 0,
    likes: counts.likes.get(row.id) ?? 0,
  });
}

/** Published, public projects for the gallery. Empty in Demo Mode. */
export async function listPublicProjects(limit = 60): Promise<MangaProject[]> {
  const supabase = publicClient();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from(MANGA_TABLE.projects)
      .select(MANGA_COLUMNS.projects)
      .eq("is_public", true)
      .eq("status", "published")
      .order("updated_at", { ascending: false })
      .limit(Math.min(Math.max(1, limit), 200));

    if (error || !data) return [];
    const rows = data as ProjectRow[];
    const counts = await loadProjectCounts(supabase, rows.map((row) => row.id));
    return rows.map((row) =>
      mapProject(row, {
        chapters: counts.chapters.get(row.id) ?? 0,
        pages: counts.pages.get(row.id) ?? 0,
        likes: counts.likes.get(row.id) ?? 0,
      }),
    );
  } catch (error) {
    console.warn("[kami3d] manga gallery unavailable:", error instanceof Error ? error.message : String(error));
    return [];
  }
}

/** The signed-in author's own projects, drafts included. */
export async function listOwnProjects(userId: string): Promise<MangaProject[]> {
  const supabase = await getPersonalDataClient();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from(MANGA_TABLE.projects)
      .select(MANGA_COLUMNS.projects)
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(200);

    if (error || !data) return [];
    const rows = data as ProjectRow[];
    const counts = await loadProjectCounts(supabase, rows.map((row) => row.id));
    return rows.map((row) =>
      mapProject(row, {
        chapters: counts.chapters.get(row.id) ?? 0,
        pages: counts.pages.get(row.id) ?? 0,
        likes: counts.likes.get(row.id) ?? 0,
      }),
    );
  } catch (error) {
    console.warn("[kami3d] manga project list unavailable:", error instanceof Error ? error.message : String(error));
    return [];
  }
}

/** A project's chapters, in reading order. Null when the project is not readable at all. */
export async function listProjectChapters(projectId: string, viewerId: string | null = null): Promise<MangaChapter[] | null> {
  const project = await getPublicProject(projectId, viewerId);
  if (!project) return null;

  const supabase = publicClient() ?? (viewerId ? await getPersonalDataClient() : null);
  if (!supabase) return [];

  const { data, error } = await supabase
    .from(MANGA_TABLE.chapters)
    .select(MANGA_COLUMNS.chapters)
    .eq("project_id", projectId)
    .order("chapter_number", { ascending: true })
    .limit(500);

  if (error) {
    console.warn("[kami3d] manga chapter list failed:", error.message);
    return [];
  }

  const rows = (data ?? []) as ChapterRow[];
  const counts = await loadChapterCounts(supabase, rows.map((row) => row.id));
  return rows.map((row) => mapChapter(row, counts.get(row.id) ?? { panels: 0, pages: 0 }));
}

/** Everything the reader and the composer need for one chapter. */
export interface MangaChapterBundle {
  chapter: MangaChapter;
  panels: MangaPanel[];
  pages: MangaPage[];
  bubbles: MangaBubble[];
}

async function loadBundle(supabase: SupabaseClient, chapterId: string): Promise<(MangaChapterBundle & { ownerId: string }) | null> {
  const chapter = await supabase.from(MANGA_TABLE.chapters).select(MANGA_COLUMNS.chapters).eq("id", chapterId).maybeSingle();
  if (chapter.error || !chapter.data) return null;
  const chapterRow = chapter.data as ChapterRow;

  const project = await supabase.from(MANGA_TABLE.projects).select("id, user_id").eq("id", chapterRow.project_id).maybeSingle();
  if (project.error || !project.data) return null;
  const ownerId = (project.data as { user_id: string }).user_id;

  const [panelRows, pageRows, chapterCounts] = await Promise.all([
    supabase.from(MANGA_TABLE.panels).select(MANGA_COLUMNS.panels).eq("chapter_id", chapterId).order("order_index", { ascending: true }).limit(500),
    supabase.from(MANGA_TABLE.pages).select(MANGA_COLUMNS.pages).eq("chapter_id", chapterId).order("page_number", { ascending: true }).limit(500),
    loadChapterCounts(supabase, [chapterId]),
  ]);

  const pages = (pageRows.data ?? []) as PageRow[];
  const pageIds = pages.map((row) => row.id);

  let bubbleRows: BubbleRow[] = [];
  if (pageIds.length > 0) {
    const bubbles = await supabase.from(MANGA_TABLE.bubbles).select(MANGA_COLUMNS.bubbles).in("page_id", pageIds).limit(COUNT_ROW_LIMIT);
    bubbleRows = (bubbles.data ?? []) as BubbleRow[];
  }

  return {
    ownerId,
    chapter: mapChapter(chapterRow, chapterCounts.get(chapterId) ?? { panels: 0, pages: 0 }),
    panels: ((panelRows.data ?? []) as PanelRow[]).map(mapPanel),
    pages: pages.map(mapPage),
    bubbles: bubbleRows.map(mapBubble),
  };
}

/**
 * A chapter with its panels, pages and bubbles.
 *
 * The anonymous attempt comes first so a published chapter costs one set of reads; the author's own
 * draft needs the second, and that one is re-checked against `viewerId` because the client it uses
 * may hold the service role.
 */
export async function getChapterBundle(chapterId: string, viewerId: string | null = null): Promise<MangaChapterBundle | null> {
  const anon = publicClient();
  if (anon) {
    const bundle = await loadBundle(anon, chapterId);
    if (bundle) return stripOwner(bundle);
  }

  if (!viewerId) return null;

  const personal = await getPersonalDataClient();
  if (!personal) return null;

  const bundle = await loadBundle(personal, chapterId);
  if (!bundle || bundle.ownerId !== viewerId) return null;
  return stripOwner(bundle);
}

/** The owner id is used for the check above and never leaves this module. */
function stripOwner(bundle: MangaChapterBundle & { ownerId: string }): MangaChapterBundle {
  return { chapter: bundle.chapter, panels: bundle.panels, pages: bundle.pages, bubbles: bundle.bubbles };
}

/* ------------------------------------------------------------------------------------------- *
 * Project writes
 * ------------------------------------------------------------------------------------------- */

export interface CreateProjectInput {
  title: string;
  description: string | null;
  genres: string[];
  ageRating: MangaAgeRating;
  isWebtoon: boolean;
}

/** Validate the create body once, here, so the route stays a thin translation layer. */
export function readCreateProjectInput(body: Record<string, unknown>): MangaResult<CreateProjectInput> {
  const title = boundedText(body.title, MANGA_TITLE_MAX_CHARS);
  if (!title) return mangaFail(400, "A title is required, and it can be at most " + MANGA_TITLE_MAX_CHARS + " characters.");

  let description: string | null = null;
  if (body.description !== undefined && body.description !== null) {
    if (typeof body.description !== "string" || body.description.length > MANGA_DESCRIPTION_MAX_CHARS) {
      return mangaFail(400, "That description is longer than " + MANGA_DESCRIPTION_MAX_CHARS + " characters.");
    }
    const trimmed = body.description.trim();
    description = trimmed.length === 0 ? null : trimmed;
  }

  const genres = coerceGenres(body.genres);
  if (genres === null) return mangaFail(400, "Genres must be a short list of short words.");

  const ageRating = body.ageRating === undefined ? "all" : body.ageRating;
  if (!isMangaAgeRating(ageRating)) return mangaFail(400, "ageRating must be all, teen or mature.");

  if (body.isWebtoon !== undefined && typeof body.isWebtoon !== "boolean") {
    return mangaFail(400, "isWebtoon must be true or false.");
  }

  return mangaOk({ title, description, genres, ageRating, isWebtoon: body.isWebtoon === true });
}

export async function createProject(userId: string, input: CreateProjectInput): Promise<MangaResult<MangaProject>> {
  const supabase = await getPersonalDataClient();
  if (!supabase) return mangaFail(503, MANGA_NOT_CONFIGURED);

  const { data, error } = await supabase
    .from(MANGA_TABLE.projects)
    .insert({
      user_id: userId,
      title: input.title,
      description: input.description,
      genres: input.genres,
      age_rating: input.ageRating,
      is_webtoon: input.isWebtoon,
      status: "draft",
      is_public: false,
    })
    .select(MANGA_COLUMNS.projects)
    .single();

  if (error || !data) {
    console.warn("[kami3d] manga project create failed:", error?.message ?? "no row");
    return mangaFail(502, "Could not create that manga. Please try again.");
  }

  return mangaOk(mapProject(data as ProjectRow));
}

export interface UpdateProjectInput {
  title?: string;
  description?: string | null;
  genres?: string[];
  ageRating?: MangaAgeRating;
  isWebtoon?: boolean;
  coverUrl?: string | null;
}

export function readUpdateProjectInput(body: Record<string, unknown>): MangaResult<UpdateProjectInput> {
  const patch: UpdateProjectInput = {};
  let touched = 0;

  if (body.title !== undefined) {
    const title = boundedText(body.title, MANGA_TITLE_MAX_CHARS);
    if (!title) return mangaFail(400, "A title cannot be empty, and it can be at most " + MANGA_TITLE_MAX_CHARS + " characters.");
    patch.title = title;
    touched += 1;
  }

  if (body.description !== undefined) {
    if (body.description === null) patch.description = null;
    else {
      if (typeof body.description !== "string" || body.description.length > MANGA_DESCRIPTION_MAX_CHARS) {
        return mangaFail(400, "That description is longer than " + MANGA_DESCRIPTION_MAX_CHARS + " characters.");
      }
      const trimmed = body.description.trim();
      patch.description = trimmed.length === 0 ? null : trimmed;
    }
    touched += 1;
  }

  if (body.genres !== undefined) {
    const genres = coerceGenres(body.genres);
    if (genres === null) return mangaFail(400, "Genres must be a short list of short words.");
    patch.genres = genres;
    touched += 1;
  }

  if (body.ageRating !== undefined) {
    if (!isMangaAgeRating(body.ageRating)) return mangaFail(400, "ageRating must be all, teen or mature.");
    patch.ageRating = body.ageRating;
    touched += 1;
  }

  if (body.isWebtoon !== undefined) {
    if (typeof body.isWebtoon !== "boolean") return mangaFail(400, "isWebtoon must be true or false.");
    patch.isWebtoon = body.isWebtoon;
    touched += 1;
  }

  if (body.coverUrl !== undefined) {
    if (body.coverUrl === null || body.coverUrl === "") patch.coverUrl = null;
    else {
      const url = httpUrl(body.coverUrl);
      if (!url) return mangaFail(400, "coverUrl must be an http(s) link to an uploaded image.");
      patch.coverUrl = url;
    }
    touched += 1;
  }

  if (touched === 0) return mangaFail(400, "Nothing to update: send title, description, genres, ageRating, isWebtoon or coverUrl.");
  return mangaOk(patch);
}

export async function updateProject(projectId: string, userId: string, patch: UpdateProjectInput): Promise<MangaResult<MangaProject>> {
  const supabase = await getPersonalDataClient();
  if (!supabase) return mangaFail(503, MANGA_NOT_CONFIGURED);

  const owned = await requireOwnedProject(supabase, projectId, userId);
  if (!owned.ok) return owned;

  const { data, error } = await supabase
    .from(MANGA_TABLE.projects)
    .update({
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...(patch.description !== undefined ? { description: patch.description } : {}),
      ...(patch.genres !== undefined ? { genres: patch.genres } : {}),
      ...(patch.ageRating !== undefined ? { age_rating: patch.ageRating } : {}),
      ...(patch.isWebtoon !== undefined ? { is_webtoon: patch.isWebtoon } : {}),
      ...(patch.coverUrl !== undefined ? { cover_url: patch.coverUrl } : {}),
    })
    .eq("id", projectId)
    .eq("user_id", userId)
    .select(MANGA_COLUMNS.projects)
    .maybeSingle();

  if (error || !data) {
    console.warn("[kami3d] manga project update failed:", error?.message ?? "no row");
    return mangaFail(502, "Could not save that change. Please try again.");
  }

  return mangaOk(await withProjectCounts(supabase, data as ProjectRow));
}

/** A project row plus its three counts, read back after a write so the response is complete. */
async function withProjectCounts(supabase: SupabaseClient, row: ProjectRow): Promise<MangaProject> {
  const counts = await loadProjectCounts(supabase, [row.id]);
  return mapProject(row, {
    chapters: counts.chapters.get(row.id) ?? 0,
    pages: counts.pages.get(row.id) ?? 0,
    likes: counts.likes.get(row.id) ?? 0,
  });
}

export async function deleteProject(projectId: string, userId: string): Promise<MangaResult<true>> {
  const supabase = await getPersonalDataClient();
  if (!supabase) return mangaFail(503, MANGA_NOT_CONFIGURED);

  const owned = await requireOwnedProject(supabase, projectId, userId);
  if (!owned.ok) return owned;

  // Chapters, panels, pages, bubbles and likes all cascade from the project row, in the SQL rather
  // than in this function: a delete that only removed the project would leave orphaned panels behind.
  const { error } = await supabase.from(MANGA_TABLE.projects).delete().eq("id", projectId).eq("user_id", userId);
  if (error) {
    console.warn("[kami3d] manga project delete failed:", error.message);
    return mangaFail(502, "Could not delete that manga. Please try again.");
  }
  return mangaOk(true);
}

export async function setProjectPublished(projectId: string, userId: string, publish: boolean): Promise<MangaResult<MangaProject>> {
  const supabase = await getPersonalDataClient();
  if (!supabase) return mangaFail(503, MANGA_NOT_CONFIGURED);

  const owned = await requireOwnedProject(supabase, projectId, userId);
  if (!owned.ok) return owned;

  const { data, error } = await supabase
    .from(MANGA_TABLE.projects)
    .update({ status: publish ? "published" : "draft", is_public: publish })
    .eq("id", projectId)
    .eq("user_id", userId)
    .select(MANGA_COLUMNS.projects)
    .maybeSingle();

  if (error || !data) {
    console.warn("[kami3d] manga publish failed:", error?.message ?? "no row");
    return mangaFail(502, "Could not change the publishing state. Please try again.");
  }

  return mangaOk(await withProjectCounts(supabase, data as ProjectRow));
}

/* ------------------------------------------------------------------------------------------- *
 * Chapter writes
 * ------------------------------------------------------------------------------------------- */

export interface CreateChapterInput {
  title: string;
  chapterNumber: number | null;
  script: string | null;
}

export function readCreateChapterInput(body: Record<string, unknown>): MangaResult<CreateChapterInput> {
  const title = boundedText(body.title, MANGA_TITLE_MAX_CHARS);
  if (!title) return mangaFail(400, "A chapter needs a title of at most " + MANGA_TITLE_MAX_CHARS + " characters.");

  let chapterNumber: number | null = null;
  if (body.chapterNumber !== undefined && body.chapterNumber !== null) {
    const value = finiteNumber(body.chapterNumber);
    if (value === null || !Number.isInteger(value) || value < 1 || value > 100_000) {
      return mangaFail(400, "chapterNumber must be a whole number of at least 1.");
    }
    chapterNumber = value;
  }

  let script: string | null = null;
  if (body.script !== undefined && body.script !== null) {
    if (typeof body.script !== "string" || body.script.length > MANGA_SCRIPT_MAX_CHARS) {
      return mangaFail(400, "The script can be at most " + MANGA_SCRIPT_MAX_CHARS + " characters.");
    }
    script = body.script.trim().length === 0 ? null : body.script;
  }

  return mangaOk({ title, chapterNumber, script });
}

export async function createChapter(projectId: string, userId: string, input: CreateChapterInput): Promise<MangaResult<MangaChapter>> {
  const supabase = await getPersonalDataClient();
  if (!supabase) return mangaFail(503, MANGA_NOT_CONFIGURED);

  const owned = await requireOwnedProject(supabase, projectId, userId);
  if (!owned.ok) return owned;

  // The next number, counted from the chapters that exist rather than from the ones the client has
  // loaded: `unique (project_id, chapter_number)` would reject a wrong guess with a Postgres error.
  let chapterNumber = input.chapterNumber;
  if (chapterNumber === null) {
    const { data } = await supabase
      .from(MANGA_TABLE.chapters)
      .select("chapter_number")
      .eq("project_id", projectId)
      .order("chapter_number", { ascending: false })
      .limit(1);
    const highest = ((data ?? []) as { chapter_number: number }[])[0]?.chapter_number ?? 0;
    chapterNumber = highest + 1;
  }

  const { data, error } = await supabase
    .from(MANGA_TABLE.chapters)
    .insert({ project_id: projectId, title: input.title, chapter_number: chapterNumber, script: input.script, status: "draft" })
    .select(MANGA_COLUMNS.chapters)
    .single();

  if (error || !data) {
    const duplicate = error?.code === "23505" || (error?.message ?? "").includes("manga_chapters_number_unique");
    console.warn("[kami3d] manga chapter create failed:", error?.message ?? "no row");
    return duplicate
      ? mangaFail(409, "This manga already has a chapter " + chapterNumber + ". Pick another number.")
      : mangaFail(502, "Could not create that chapter. Please try again.");
  }

  return mangaOk(mapChapter(data as ChapterRow));
}

export interface UpdateChapterInput {
  title?: string;
  script?: string | null;
  status?: MangaStatus;
}

export function readUpdateChapterInput(body: Record<string, unknown>): MangaResult<UpdateChapterInput> {
  const patch: UpdateChapterInput = {};
  let touched = 0;

  if (body.title !== undefined) {
    const title = boundedText(body.title, MANGA_TITLE_MAX_CHARS);
    if (!title) return mangaFail(400, "A chapter title cannot be empty, and it can be at most " + MANGA_TITLE_MAX_CHARS + " characters.");
    patch.title = title;
    touched += 1;
  }

  if (body.script !== undefined) {
    if (body.script === null) patch.script = null;
    else {
      if (typeof body.script !== "string" || body.script.length > MANGA_SCRIPT_MAX_CHARS) {
        return mangaFail(400, "The script can be at most " + MANGA_SCRIPT_MAX_CHARS + " characters.");
      }
      patch.script = body.script.trim().length === 0 ? null : body.script;
    }
    touched += 1;
  }

  if (body.status !== undefined) {
    if (!isMangaStatus(body.status)) return mangaFail(400, "status must be draft, published or archived.");
    patch.status = body.status;
    touched += 1;
  }

  if (touched === 0) return mangaFail(400, "Nothing to update: send title, script or status.");
  return mangaOk(patch);
}

export async function updateChapter(chapterId: string, userId: string, patch: UpdateChapterInput): Promise<MangaResult<MangaChapter>> {
  const supabase = await getPersonalDataClient();
  if (!supabase) return mangaFail(503, MANGA_NOT_CONFIGURED);

  const owned = await requireOwnedChapter(supabase, chapterId, userId);
  if (!owned.ok) return owned;

  const { data, error } = await supabase
    .from(MANGA_TABLE.chapters)
    .update({
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...(patch.script !== undefined ? { script: patch.script } : {}),
      ...(patch.status !== undefined ? { status: patch.status } : {}),
    })
    .eq("id", chapterId)
    .select(MANGA_COLUMNS.chapters)
    .maybeSingle();

  if (error || !data) {
    console.warn("[kami3d] manga chapter update failed:", error?.message ?? "no row");
    return mangaFail(502, "Could not save that chapter. Please try again.");
  }

  const counts = await loadChapterCounts(supabase, [chapterId]);
  return mangaOk(mapChapter(data as ChapterRow, counts.get(chapterId) ?? { panels: 0, pages: 0 }));
}

export async function deleteChapter(chapterId: string, userId: string): Promise<MangaResult<true>> {
  const supabase = await getPersonalDataClient();
  if (!supabase) return mangaFail(503, MANGA_NOT_CONFIGURED);

  const owned = await requireOwnedChapter(supabase, chapterId, userId);
  if (!owned.ok) return owned;

  const { error } = await supabase.from(MANGA_TABLE.chapters).delete().eq("id", chapterId);
  if (error) {
    console.warn("[kami3d] manga chapter delete failed:", error.message);
    return mangaFail(502, "Could not delete that chapter. Please try again.");
  }
  return mangaOk(true);
}

/* ------------------------------------------------------------------------------------------- *
 * Page writes
 * ------------------------------------------------------------------------------------------- */

export interface CreatePageInput {
  template: MangaTemplate;
  slots: MangaSlot[];
}

/**
 * Read `{template, slots}` from a request.
 *
 * `panelRects` decides how many slots a template has, so a client that sends three slots for a
 * five-panel template gets five, with the extra rectangles empty - the geometry is not something a
 * request body gets to redefine. A slot's rectangle is clamped into the page with `clampBubble`,
 * which is the same arithmetic that keeps a speech bubble inside its panel.
 */
export function readPageInput(body: Record<string, unknown>): MangaResult<CreatePageInput> {
  const template = MANGA_TEMPLATES.find((entry) => entry.id === body.template);
  if (!template) return mangaFail(400, "Unknown page template: " + MANGA_TEMPLATES.map((entry) => entry.id).join(", ") + ".");

  const rawSlots = body.slots === undefined ? [] : body.slots;
  if (!Array.isArray(rawSlots)) return mangaFail(400, "slots must be an array.");
  if (rawSlots.length > MANGA_PAGE_MAX_SLOTS) return mangaFail(400, "A page holds at most " + MANGA_PAGE_MAX_SLOTS + " panel slots.");

  const slots: MangaSlot[] = template.panels.map((rect, index) => {
    const entry = rawSlots[index];
    const source = typeof entry === "object" && entry !== null ? (entry as Record<string, unknown>) : {};
    const placed = coerceRect(source.rect) ?? rect;
    const panelId = source.panelId;
    return { rect: clampToPage(placed), panelId: typeof panelId === "string" && panelId.length > 0 ? panelId : null };
  });

  return mangaOk({ template: template.id, slots });
}

/** Every panel id in a set of slots must belong to the chapter the page is going into. */
async function slotsBelongToChapter(supabase: SupabaseClient, chapterId: string, slots: MangaSlot[]): Promise<MangaResult<true>> {
  const ids = [...new Set(slots.map((slot) => slot.panelId).filter((id): id is string => typeof id === "string"))];
  if (ids.length === 0) return mangaOk(true);

  const { data, error } = await supabase.from(MANGA_TABLE.panels).select("id").eq("chapter_id", chapterId).in("id", ids);
  if (error) return mangaFail(502, "Could not check those panels. Please try again.");

  const found = new Set(((data ?? []) as { id: string }[]).map((row) => row.id));
  if (ids.some((id) => !found.has(id))) return mangaFail(400, "Those panels are not in this chapter.");
  return mangaOk(true);
}

export async function createPage(chapterId: string, userId: string, input: CreatePageInput): Promise<MangaResult<MangaPage>> {
  const supabase = await getPersonalDataClient();
  if (!supabase) return mangaFail(503, MANGA_NOT_CONFIGURED);

  const owned = await requireOwnedChapter(supabase, chapterId, userId);
  if (!owned.ok) return owned;

  const belongs = await slotsBelongToChapter(supabase, chapterId, input.slots);
  if (!belongs.ok) return belongs;

  const existing = await supabase.from(MANGA_TABLE.pages).select("page_number").eq("chapter_id", chapterId).limit(COUNT_ROW_LIMIT);
  const pageNumber = nextPageNumber(((existing.data ?? []) as { page_number: number }[]).map((row) => row.page_number));

  const { data, error } = await supabase
    .from(MANGA_TABLE.pages)
    .insert({
      chapter_id: chapterId,
      page_number: pageNumber,
      layout_data: { template: input.template, slots: input.slots },
    })
    .select(MANGA_COLUMNS.pages)
    .single();

  if (error || !data) {
    console.warn("[kami3d] manga page create failed:", error?.message ?? "no row");
    return mangaFail(502, "Could not add that page. Please try again.");
  }

  return mangaOk(mapPage(data as PageRow));
}

export interface UpdatePageInput {
  layout?: MangaLayoutData;
  bubbles?: { id: string; content?: string; position?: PanelRect; bubbleType?: string }[];
  /**
   * Move the page to another reading position, swapping with whoever holds it.
   *
   * Webtoon mode has no page turning, so its reading order **is** the page order, and the editor
   * reorders by swapping two pages' numbers. That is the whole reason this field exists: the layout
   * half of this file draws rectangles, and the order they are read in is a different question.
   */
  pageNumber?: number;
}

export function readUpdatePageInput(body: Record<string, unknown>, current: MangaLayoutData): MangaResult<UpdatePageInput> {
  const patch: UpdatePageInput = {};
  let touched = 0;

  if (body.template !== undefined || body.slots !== undefined) {
    const parsed = readPageInput({ template: body.template ?? current.template, slots: body.slots ?? current.slots });
    if (!parsed.ok) return parsed;
    patch.layout = { template: parsed.value.template, slots: parsed.value.slots };
    touched += 1;
  }

  if (body.bubbles !== undefined) {
    if (!Array.isArray(body.bubbles)) return mangaFail(400, "bubbles must be an array.");
    if (body.bubbles.length > MANGA_PAGE_PATCH_MAX_BUBBLES) {
      return mangaFail(400, "At most " + MANGA_PAGE_PATCH_MAX_BUBBLES + " bubbles can be moved in one save.");
    }

    const moves: NonNullable<UpdatePageInput["bubbles"]> = [];
    for (const entry of body.bubbles) {
      if (typeof entry !== "object" || entry === null) return mangaFail(400, "Every bubble entry needs an id.");
      const candidate = entry as Record<string, unknown>;
      if (typeof candidate.id !== "string" || candidate.id.length === 0) return mangaFail(400, "Every bubble entry needs an id.");

      const move: NonNullable<UpdatePageInput["bubbles"]>[number] = { id: candidate.id };
      if (candidate.content !== undefined) {
        const content = typeof candidate.content === "string" ? candidate.content.trim() : null;
        if (content === null || content.length === 0 || content.length > MANGA_BUBBLE_MAX_CHARS) {
          return mangaFail(400, "A speech bubble holds between 1 and " + MANGA_BUBBLE_MAX_CHARS + " characters.");
        }
        move.content = content;
      }
      if (candidate.position !== undefined) {
        const rect = coerceRect(candidate.position);
        if (!rect) return mangaFail(400, "Every bubble position needs finite x, y, w and h.");
        move.position = rect;
      }
      if (candidate.bubbleType !== undefined) {
        if (!isBubbleType(candidate.bubbleType)) return mangaFail(400, "bubbleType must be speech, thought, narration or scream.");
        move.bubbleType = candidate.bubbleType;
      }
      moves.push(move);
    }

    patch.bubbles = moves;
    touched += 1;
  }

  if (body.pageNumber !== undefined) {
    const number = body.pageNumber;
    if (typeof number !== "number" || !Number.isInteger(number) || number < 1) {
      return mangaFail(400, "A page number is a whole number from 1 up.");
    }
    patch.pageNumber = number;
    touched += 1;
  }

  if (touched === 0) return mangaFail(400, "Nothing to update: send template, slots, bubbles or pageNumber.");
  return mangaOk(patch);
}

/**
 * Move a page to another reading position, swapping with the page that holds it.
 *
 * `manga_pages` is `unique (chapter_id, page_number)` and the constraint is not deferrable, so a swap
 * cannot be two updates: the first would collide with the row that is still sitting there. The page
 * holding the target is therefore parked on a number nobody uses - one past the chapter's highest -
 * and then both land. A failure between the two steps leaves the parked page at the end of the
 * chapter, which is a wrong order rather than a lost page: that is the failure this shape is chosen
 * for.
 *
 * A target number nobody holds is a plain move, not a swap, and the chapter's numbering is left with
 * a hole for the author to fill - renumbering everything behind their back would move pages they did
 * not touch.
 */
async function movePageTo(
  supabase: SupabaseClient,
  pageId: string,
  chapterId: string,
  from: number,
  target: number,
): Promise<MangaResult<true>> {
  if (target === from) return mangaOk(true);

  const { data, error } = await supabase
    .from(MANGA_TABLE.pages)
    .select("id, page_number")
    .eq("chapter_id", chapterId)
    .limit(COUNT_ROW_LIMIT);

  if (error) return mangaFail(502, "Could not read this chapter's pages. Please try again.");

  const rows = (data ?? []) as { id: string; page_number: number }[];
  const occupant = rows.find((row) => row.page_number === target && row.id !== pageId) ?? null;
  const highest = rows.reduce((max, row) => Math.max(max, row.page_number), 0);

  if (occupant) {
    const parked = await supabase.from(MANGA_TABLE.pages).update({ page_number: highest + 1 }).eq("id", occupant.id);
    if (parked.error) return mangaFail(502, "Could not move that page. Please try again.");
  }

  const moved = await supabase.from(MANGA_TABLE.pages).update({ page_number: target }).eq("id", pageId);
  if (moved.error) return mangaFail(502, "Could not move that page. Please try again.");

  if (occupant) {
    const landed = await supabase.from(MANGA_TABLE.pages).update({ page_number: from }).eq("id", occupant.id);
    if (landed.error) {
      console.warn("[kami3d] manga page swap second half failed; " + occupant.id + " is parked at " + (highest + 1));
      return mangaFail(502, "The two pages were moved but their numbers did not settle. Reorder once more.");
    }
  }

  return mangaOk(true);
}

/**
 * Save a page.
 *
 * Takes the raw body rather than a parsed patch because half of a layout update is a merge: a request
 * that sends only `slots` keeps the template the page already has, so the current row is read here
 * where the write is, instead of the route reading it and passing it in.
 */
export async function updatePage(pageId: string, userId: string, body: Record<string, unknown>): Promise<MangaResult<MangaPage>> {
  const supabase = await getPersonalDataClient();
  if (!supabase) return mangaFail(503, MANGA_NOT_CONFIGURED);

  const owned = await requireOwnedPage(supabase, pageId, userId);
  if (!owned.ok) return owned;

  const { data: currentRow, error: currentError } = await supabase.from(MANGA_TABLE.pages).select(MANGA_COLUMNS.pages).eq("id", pageId).maybeSingle();
  if (currentError || !currentRow) return mangaFail(404, "That page does not exist.");

  const parsed = readUpdatePageInput(body, coerceLayoutData((currentRow as PageRow).layout_data));
  if (!parsed.ok) return parsed;
  const patch = parsed.value;

  if (patch.layout) {
    const belongs = await slotsBelongToChapter(supabase, owned.value.chapterId, patch.layout.slots);
    if (!belongs.ok) return belongs;

    const { error } = await supabase
      .from(MANGA_TABLE.pages)
      .update({ layout_data: { template: patch.layout.template, slots: patch.layout.slots } })
      .eq("id", pageId);
    if (error) {
      console.warn("[kami3d] manga page layout update failed:", error.message);
      return mangaFail(502, "Could not save that layout. Please try again.");
    }
  }

  if (patch.pageNumber !== undefined) {
    const moved = await movePageTo(supabase, pageId, owned.value.chapterId, (currentRow as PageRow).page_number, patch.pageNumber);
    if (!moved.ok) return moved;
  }

  if (patch.bubbles && patch.bubbles.length > 0) {
    const { data: pageRow } = await supabase.from(MANGA_TABLE.pages).select(MANGA_COLUMNS.pages).eq("id", pageId).maybeSingle();
    const layout = coerceLayoutData((pageRow as PageRow | null)?.layout_data);

    const ids = patch.bubbles.map((move) => move.id);
    const { data: storedRows, error: readError } = await supabase.from(MANGA_TABLE.bubbles).select("id, panel_id").eq("page_id", pageId).in("id", ids);
    if (readError) return mangaFail(502, "Could not read those bubbles. Please try again.");

    const stored = new Map(((storedRows ?? []) as { id: string; panel_id: string | null }[]).map((row) => [row.id, row.panel_id]));
    for (const move of patch.bubbles) {
      if (!stored.has(move.id)) return mangaFail(400, "A bubble in that save is not on this page.");

      const update: Record<string, unknown> = {};
      if (move.content !== undefined) update.content = move.content;
      if (move.bubbleType !== undefined) update.bubble_type = move.bubbleType;
      // Clamped, not stored as sent: a drag that ends past the panel edge is pulled back inside it,
      // which is the rule the composer draws with and the reader relies on.
      if (move.position !== undefined) update.position = clampBubble(move.position, bubbleBounds(layout, stored.get(move.id) ?? null));

      if (Object.keys(update).length === 0) continue;
      const { error } = await supabase.from(MANGA_TABLE.bubbles).update(update).eq("id", move.id);
      if (error) {
        console.warn("[kami3d] manga bubble update failed:", error.message);
        return mangaFail(502, "Could not save those bubbles. Please try again.");
      }
    }
  }

  const { data, error } = await supabase.from(MANGA_TABLE.pages).select(MANGA_COLUMNS.pages).eq("id", pageId).maybeSingle();
  if (error || !data) return mangaFail(502, "Could not read that page back. Please try again.");
  return mangaOk(mapPage(data as PageRow));
}

export async function deletePage(pageId: string, userId: string): Promise<MangaResult<true>> {
  const supabase = await getPersonalDataClient();
  if (!supabase) return mangaFail(503, MANGA_NOT_CONFIGURED);

  const owned = await requireOwnedPage(supabase, pageId, userId);
  if (!owned.ok) return owned;

  const { error } = await supabase.from(MANGA_TABLE.pages).delete().eq("id", pageId);
  if (error) {
    console.warn("[kami3d] manga page delete failed:", error.message);
    return mangaFail(502, "Could not delete that page. Please try again.");
  }
  return mangaOk(true);
}

/* ------------------------------------------------------------------------------------------- *
 * Bubble writes
 * ------------------------------------------------------------------------------------------- */

export interface CreateBubbleInput {
  panelId: string | null;
  content: string;
  bubbleType: MangaBubble["bubbleType"];
  position: PanelRect;
}

export function readCreateBubbleInput(body: Record<string, unknown>): MangaResult<CreateBubbleInput> {
  const content = typeof body.content === "string" ? body.content.trim() : null;
  if (content === null || content.length === 0) return mangaFail(400, "A speech bubble needs some text.");
  if (content.length > MANGA_BUBBLE_MAX_CHARS) {
    return mangaFail(400, "A speech bubble holds at most " + MANGA_BUBBLE_MAX_CHARS + " characters.");
  }

  const bubbleType = body.bubbleType === undefined ? "speech" : body.bubbleType;
  if (!isBubbleType(bubbleType)) return mangaFail(400, "bubbleType must be speech, thought, narration or scream.");

  if (body.panelId !== undefined && body.panelId !== null && typeof body.panelId !== "string") {
    return mangaFail(400, "panelId must be a panel id, or null for a bubble that floats on the page.");
  }

  const position = coerceRect(body.position) ?? DEFAULT_BUBBLE_RECT;
  return mangaOk({ panelId: (body.panelId as string | null | undefined) ?? null, content, bubbleType, position });
}

export async function createBubble(pageId: string, userId: string, input: CreateBubbleInput): Promise<MangaResult<MangaBubble>> {
  const supabase = await getPersonalDataClient();
  if (!supabase) return mangaFail(503, MANGA_NOT_CONFIGURED);

  const owned = await requireOwnedPage(supabase, pageId, userId);
  if (!owned.ok) return owned;

  const { data: pageRow, error: pageError } = await supabase.from(MANGA_TABLE.pages).select(MANGA_COLUMNS.pages).eq("id", pageId).maybeSingle();
  if (pageError || !pageRow) return mangaFail(404, "That page does not exist.");
  const layout = coerceLayoutData((pageRow as PageRow).layout_data);

  if (input.panelId) {
    const belongs = await slotsBelongToChapter(supabase, owned.value.chapterId, [{ rect: PAGE_BOX, panelId: input.panelId }]);
    if (!belongs.ok) return mangaFail(400, "That panel is not in this chapter.");
    // A panel that exists but is not placed in a slot still belongs to the chapter; the bubble is then
    // clamped against the whole page rather than against a rectangle it is not inside.
  }

  const { data, error } = await supabase
    .from(MANGA_TABLE.bubbles)
    .insert({
      page_id: pageId,
      panel_id: input.panelId,
      content: input.content,
      bubble_type: input.bubbleType,
      position: clampBubble(input.position, bubbleBounds(layout, input.panelId)),
      style: {},
    })
    .select(MANGA_COLUMNS.bubbles)
    .single();

  if (error || !data) {
    console.warn("[kami3d] manga bubble create failed:", error?.message ?? "no row");
    return mangaFail(502, "Could not add that speech bubble. Please try again.");
  }

  return mangaOk(mapBubble(data as BubbleRow));
}

export interface UpdateBubbleInput {
  content?: string;
  position?: PanelRect;
}

export function readUpdateBubbleInput(body: Record<string, unknown>): MangaResult<UpdateBubbleInput> {
  const patch: UpdateBubbleInput = {};
  let touched = 0;

  if (body.content !== undefined) {
    const content = typeof body.content === "string" ? body.content.trim() : null;
    if (content === null || content.length === 0) return mangaFail(400, "A speech bubble needs some text.");
    if (content.length > MANGA_BUBBLE_MAX_CHARS) {
      return mangaFail(400, "A speech bubble holds at most " + MANGA_BUBBLE_MAX_CHARS + " characters.");
    }
    patch.content = content;
    touched += 1;
  }

  if (body.position !== undefined) {
    const rect = coerceRect(body.position);
    if (!rect) return mangaFail(400, "A position needs finite x, y, w and h.");
    patch.position = rect;
    touched += 1;
  }

  if (touched === 0) return mangaFail(400, "Nothing to update: send content or position.");
  return mangaOk(patch);
}

export async function updateBubble(bubbleId: string, userId: string, patch: UpdateBubbleInput): Promise<MangaResult<MangaBubble>> {
  const supabase = await getPersonalDataClient();
  if (!supabase) return mangaFail(503, MANGA_NOT_CONFIGURED);

  const owned = await requireOwnedBubble(supabase, bubbleId, userId);
  if (!owned.ok) return owned;

  const update: Record<string, unknown> = {};
  if (patch.content !== undefined) update.content = patch.content;

  if (patch.position !== undefined) {
    const { data: pageRow } = await supabase.from(MANGA_TABLE.pages).select(MANGA_COLUMNS.pages).eq("id", owned.value.pageId).maybeSingle();
    const layout = coerceLayoutData((pageRow as PageRow | null)?.layout_data);
    const { data: bubbleRow } = await supabase.from(MANGA_TABLE.bubbles).select("panel_id").eq("id", bubbleId).maybeSingle();
    const panelId = (bubbleRow as { panel_id: string | null } | null)?.panel_id ?? null;
    update.position = clampBubble(patch.position, bubbleBounds(layout, panelId));
  }

  const { data, error } = await supabase
    .from(MANGA_TABLE.bubbles)
    .update(update)
    .eq("id", bubbleId)
    .select(MANGA_COLUMNS.bubbles)
    .maybeSingle();

  if (error || !data) {
    console.warn("[kami3d] manga bubble update failed:", error?.message ?? "no row");
    return mangaFail(502, "Could not save that speech bubble. Please try again.");
  }

  return mangaOk(mapBubble(data as BubbleRow));
}

export async function deleteBubble(bubbleId: string, userId: string): Promise<MangaResult<true>> {
  const supabase = await getPersonalDataClient();
  if (!supabase) return mangaFail(503, MANGA_NOT_CONFIGURED);

  const owned = await requireOwnedBubble(supabase, bubbleId, userId);
  if (!owned.ok) return owned;

  const { error } = await supabase.from(MANGA_TABLE.bubbles).delete().eq("id", bubbleId);
  if (error) {
    console.warn("[kami3d] manga bubble delete failed:", error.message);
    return mangaFail(502, "Could not delete that speech bubble. Please try again.");
  }
  return mangaOk(true);
}
