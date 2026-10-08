import type { BubbleType, MangaTemplate, PanelRect } from "@/lib/manga-layout";

/**
 * Phase 24 (Manga Studio): the shape every other half of this feature agrees on.
 *
 * This file is the contract between the data layer (`lib/manga/*`, the API routes) and the studio
 * UI. It holds types only, imports nothing that runs, and can therefore be imported from a client
 * component: the one import above is type-only and is erased at build time.
 *
 * Every field named here exists as a column in `supabase/schema.sql` under a snake_case name; the
 * mapping from row to type lives in `lib/manga/project.ts`, and `scripts/check-manga.mjs` fails the
 * build if a column is renamed without the mapping following it.
 */

export type MangaAgeRating = "all" | "teen" | "mature";
export type MangaStatus = "draft" | "published" | "archived";

export interface MangaProject {
  id: string; userId: string; title: string; description: string | null; coverUrl: string | null;
  genres: string[]; ageRating: MangaAgeRating; status: MangaStatus; isPublic: boolean; isWebtoon: boolean;
  viewCount: number; createdAt: string; updatedAt: string;
  chapterCount: number; pageCount: number; likeCount: number;
}
export interface MangaChapter {
  id: string; projectId: string; title: string; chapterNumber: number; script: string | null;
  status: MangaStatus; createdAt: string; updatedAt: string; panelCount: number; pageCount: number;
}
export interface MangaPanel {
  id: string; chapterId: string; imageUrl: string; orderIndex: number;
  width: number | null; height: number | null; createdAt: string;
  aiPrompt: string | null; aiProvider: string | null; aiModel: string | null;
}
export interface MangaSlot { rect: PanelRect; panelId: string | null }
export interface MangaLayoutData { template: MangaTemplate; slots: MangaSlot[] }
export interface MangaPage { id: string; chapterId: string; pageNumber: number; layoutData: MangaLayoutData; createdAt: string }
export interface MangaBubble {
  id: string; pageId: string; panelId: string | null; content: string;
  bubbleType: BubbleType; position: PanelRect; style: Record<string, unknown>; createdAt: string;
}
export interface MangaComment { id: string; projectId: string; userId: string; content: string; createdAt: string }
export interface MangaAiStatus { configured: boolean; provider: string | null; model: string | null; reason: string | null }
