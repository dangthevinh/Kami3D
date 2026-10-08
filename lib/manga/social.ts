import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { getPersonalDataClient } from "../personal-data.ts";
import { getSupabase } from "../supabase.ts";
import {
  MANGA_COLUMNS,
  MANGA_COMMENT_MAX_CHARS,
  MANGA_COMMENT_MIN_CHARS,
  MANGA_NOT_CONFIGURED,
  MANGA_TABLE,
  boundedText,
  mangaFail,
  mangaOk,
  type MangaResult,
} from "./rules.ts";
import type { MangaComment } from "./types.ts";

/**
 * Phase 24 (Manga Studio): likes, comments and follows.
 *
 * Two rules from `supabase/schema.sql` shape this file, and both are enforced in the database rather
 * than here - this code follows them so that it never needs to be trusted:
 *
 *   1. **A double tap cannot count twice.** `manga_likes` and `manga_follows` have composite primary
 *      keys `(project_id, user_id)` and `(follower_id, following_id)`, so a second insert is a
 *      duplicate-key error, not a second row. That error is treated as "already liked", which makes
 *      the endpoint idempotent under a double click rather than 500 under one.
 *   2. **Counts come from the database.** `likeCount` is a `count: "exact"` over the rows that exist,
 *      never a number the client sent up. A client that says "there are 900 likes" is answering a
 *      question nobody asked.
 *
 * Comments are 1 to 1000 characters, which is the database's own check; follows refuse a self-follow
 * for the same reason the table has `check (follower_id <> following_id)`.
 */

/** Who may like or comment on a project: the whole world once it is published, and its author. */
async function viewableProject(
  supabase: SupabaseClient,
  projectId: string,
  userId: string,
): Promise<MangaResult<{ id: string; userId: string }>> {
  const { data, error } = await supabase.from(MANGA_TABLE.projects).select("id, user_id, is_public, status").eq("id", projectId).maybeSingle();
  if (error) return mangaFail(502, "Could not read that manga. Please try again.");
  if (!data) return mangaFail(404, "That manga does not exist.");

  const row = data as { id: string; user_id: string; is_public: boolean; status: string };
  const published = row.is_public && row.status === "published";
  if (!published && row.user_id !== userId) return mangaFail(404, "That manga does not exist, or it is not published.");
  return mangaOk({ id: row.id, userId: row.user_id });
}

/** How many likes a project has, counted in the database. */
export async function likeCountFor(projectId: string): Promise<number> {
  const supabase = getSupabase();
  if (!supabase) return 0;

  const { count, error } = await supabase
    .from(MANGA_TABLE.likes)
    .select("project_id", { count: "exact", head: true })
    .eq("project_id", projectId);

  if (error || typeof count !== "number") {
    console.warn("[kami3d] manga like count failed:", error?.message ?? "no count");
    return 0;
  }
  return count;
}

export interface LikeState {
  liked: boolean;
  likeCount: number;
}

/**
 * Like, or take the like back.
 *
 * The row is read first so the answer says what happened; the insert is still guarded by the primary
 * key, so two requests that arrive together cannot both create a like - the loser gets 23505, which
 * is reported as "you already like this" rather than as a failure.
 */
export async function toggleLike(projectId: string, userId: string): Promise<MangaResult<LikeState>> {
  const supabase = await getPersonalDataClient();
  if (!supabase) return mangaFail(503, MANGA_NOT_CONFIGURED);

  const viewable = await viewableProject(supabase, projectId, userId);
  if (!viewable.ok) return viewable;

  const existing = await supabase.from(MANGA_TABLE.likes).select("user_id").eq("project_id", projectId).eq("user_id", userId).maybeSingle();
  if (existing.error) return mangaFail(502, "Could not read your likes. Please try again.");

  let liked: boolean;
  if (existing.data) {
    const { error } = await supabase.from(MANGA_TABLE.likes).delete().eq("project_id", projectId).eq("user_id", userId);
    if (error) {
      console.warn("[kami3d] manga unlike failed:", error.message);
      return mangaFail(502, "Could not remove that like. Please try again.");
    }
    liked = false;
  } else {
    const { error } = await supabase.from(MANGA_TABLE.likes).insert({ project_id: projectId, user_id: userId });
    if (error && error.code !== "23505") {
      console.warn("[kami3d] manga like failed:", error.message);
      return mangaFail(502, "Could not save that like. Please try again.");
    }
    // 23505 means the row was created by a request that raced this one. The like exists either way.
    liked = true;
  }

  return mangaOk({ liked, likeCount: await countLikes(supabase, projectId) });
}

async function countLikes(supabase: SupabaseClient, projectId: string): Promise<number> {
  const { count, error } = await supabase
    .from(MANGA_TABLE.likes)
    .select("project_id", { count: "exact", head: true })
    .eq("project_id", projectId);
  if (error || typeof count !== "number") return 0;
  return count;
}

/** Newest first, which is the order a comment thread is read in. */
export async function listComments(projectId: string, limit = 200): Promise<MangaComment[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from(MANGA_TABLE.comments)
      .select(MANGA_COLUMNS.comments)
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(Math.min(Math.max(1, limit), 500));

    if (error || !data) return [];
    return (data as CommentRow[]).map(mapComment);
  } catch (error) {
    console.warn("[kami3d] manga comments unavailable:", error instanceof Error ? error.message : String(error));
    return [];
  }
}

interface CommentRow {
  id: string;
  project_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

export const mapComment = (row: CommentRow): MangaComment => ({
  id: row.id,
  projectId: row.project_id,
  userId: row.user_id,
  content: row.content,
  createdAt: row.created_at,
});

/**
 * Post a comment.
 *
 * The length rule lives in the SQL (`check (length(btrim(content)) between 1 and 1000)`) and is
 * restated here so a too-long comment is a 400 with a sentence rather than a 500 from Postgres.
 */
export async function addComment(projectId: string, userId: string, content: unknown): Promise<MangaResult<MangaComment>> {
  const text = typeof content === "string" ? content.trim() : boundedText(content, MANGA_COMMENT_MAX_CHARS);
  if (text === null || text.length < MANGA_COMMENT_MIN_CHARS || text.length > MANGA_COMMENT_MAX_CHARS) {
    return mangaFail(400, "A comment needs between " + MANGA_COMMENT_MIN_CHARS + " and " + MANGA_COMMENT_MAX_CHARS + " characters.");
  }

  const supabase = await getPersonalDataClient();
  if (!supabase) return mangaFail(503, MANGA_NOT_CONFIGURED);

  const viewable = await viewableProject(supabase, projectId, userId);
  if (!viewable.ok) return viewable;

  const { data, error } = await supabase
    .from(MANGA_TABLE.comments)
    .insert({ project_id: projectId, user_id: userId, content: text })
    .select(MANGA_COLUMNS.comments)
    .single();

  if (error || !data) {
    console.warn("[kami3d] manga comment failed:", error?.message ?? "no row");
    return mangaFail(502, "Could not post that comment. Please try again.");
  }

  return mangaOk(mapComment(data as CommentRow));
}

/**
 * Delete a comment. Only its author may, which is exactly what the SQL policy says
 * (`using (user_id = public.current_user_id())`) - not the project's owner, who would otherwise be
 * able to rewrite a thread about their own work.
 */
export async function deleteComment(projectId: string, commentId: string, userId: string): Promise<MangaResult<true>> {
  const supabase = await getPersonalDataClient();
  if (!supabase) return mangaFail(503, MANGA_NOT_CONFIGURED);

  const { data, error } = await supabase.from(MANGA_TABLE.comments).select("id, project_id, user_id").eq("id", commentId).maybeSingle();
  if (error) return mangaFail(502, "Could not read that comment. Please try again.");
  if (!data) return mangaFail(404, "That comment does not exist.");

  const comment = data as { id: string; project_id: string; user_id: string };
  if (comment.project_id !== projectId) return mangaFail(404, "That comment is not on this manga.");
  if (comment.user_id !== userId) return mangaFail(403, "Only the person who wrote a comment can delete it.");

  const deleted = await supabase.from(MANGA_TABLE.comments).delete().eq("id", commentId).eq("user_id", userId);
  if (deleted.error) {
    console.warn("[kami3d] manga comment delete failed:", deleted.error.message);
    return mangaFail(502, "Could not delete that comment. Please try again.");
  }

  return mangaOk(true);
}

export interface FollowState {
  following: boolean;
}

/**
 * Follow, or stop following.
 *
 * `follower_id <> following_id` is a CHECK constraint in the database; checking it here as well turns
 * a Postgres error into a sentence. The id being followed is opaque - Kami3D keeps no local account
 * table to validate it against - so the only guarantee is the one the key gives: it is whatever the
 * signed-in visitor sent, recorded once.
 */
export async function toggleFollow(followerId: string, followingId: string): Promise<MangaResult<FollowState>> {
  if (!followingId || followingId.length > 128) return mangaFail(400, "That account id is not usable.");
  if (followerId === followingId) return mangaFail(400, "You cannot follow yourself.");

  const supabase = await getPersonalDataClient();
  if (!supabase) return mangaFail(503, MANGA_NOT_CONFIGURED);

  const existing = await supabase
    .from(MANGA_TABLE.follows)
    .select("following_id")
    .eq("follower_id", followerId)
    .eq("following_id", followingId)
    .maybeSingle();
  if (existing.error) return mangaFail(502, "Could not read who you follow. Please try again.");

  if (existing.data) {
    const { error } = await supabase.from(MANGA_TABLE.follows).delete().eq("follower_id", followerId).eq("following_id", followingId);
    if (error) {
      console.warn("[kami3d] manga unfollow failed:", error.message);
      return mangaFail(502, "Could not unfollow. Please try again.");
    }
    return mangaOk({ following: false });
  }

  const { error } = await supabase.from(MANGA_TABLE.follows).insert({ follower_id: followerId, following_id: followingId });
  if (error && error.code !== "23505") {
    console.warn("[kami3d] manga follow failed:", error.message);
    return mangaFail(502, "Could not follow. Please try again.");
  }
  // 23505 is a racing duplicate: the follow exists, which is the answer the caller wanted.
  return mangaOk({ following: true });
}

/** How many accounts follow this one. Public, per the `manga follows readable` policy. */
export async function followerCount(userId: string): Promise<number> {
  const supabase = getSupabase();
  if (!supabase) return 0;

  const { count, error } = await supabase
    .from(MANGA_TABLE.follows)
    .select("following_id", { count: "exact", head: true })
    .eq("following_id", userId);

  if (error || typeof count !== "number") return 0;
  return count;
}
