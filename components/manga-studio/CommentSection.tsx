"use client";

import { MessageSquare, Send, Trash2 } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { errorText, mangaRequest } from "@/components/manga-studio/api";
import type { MangaComment } from "@/lib/manga/types";
import { cn } from "@/lib/utils";

/**
 * Comments: read, write, delete.
 *
 * Two different levels of optimism on purpose.
 *
 *   - **Writing** waits for the server. A comment has an id, an author and a timestamp that only the
 *     database can issue, and inventing them locally would put a comment on screen that no one can
 *     reply to or delete. The server's own object is what gets appended.
 *   - **Deleting** is optimistic: the row disappears at once and comes back if the API refuses,
 *     because a delete that succeeds is the common case and a row lingering for a round trip reads as
 *     a broken button.
 *
 * The length limit is the same one the API enforces; the counter exists so the refusal is never a
 * surprise.
 */

export const COMMENT_MAX_LENGTH = 2000;

export function CommentSection({ projectId, className }: { projectId: string; className?: string }) {
  const [comments, setComments] = React.useState<MangaComment[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const path = "/api/manga/projects/" + encodeURIComponent(projectId) + "/comments";

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await mangaRequest<{ comments: MangaComment[] }>(path);
        if (!cancelled) setComments(data.comments ?? []);
      } catch (caught) {
        if (!cancelled) {
          setComments([]);
          setError(errorText(caught));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [path]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = draft.trim();
    if (content.length === 0 || busy) return;

    setBusy(true);
    setError(null);
    try {
      const data = await mangaRequest<{ comment: MangaComment }>(path, { method: "POST", body: { content } });
      setComments((current) => [data.comment, ...(current ?? [])]);
      setDraft("");
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusy(false);
    }
  }

  async function remove(comment: MangaComment) {
    const before = comments ?? [];
    setComments(before.filter((entry) => entry.id !== comment.id));
    setError(null);
    try {
      await mangaRequest<{ ok: true }>(path + "/" + encodeURIComponent(comment.id), { method: "DELETE" });
    } catch (caught) {
      setComments(before);
      setError(errorText(caught));
    }
  }

  return (
    <section className={cn("space-y-4", className)} aria-labelledby={"comments-" + projectId}>
      <h3
        id={"comments-" + projectId}
        className="flex items-center gap-2 text-sm font-semibold text-white/85"
      >
        <MessageSquare className="size-4 text-neon" aria-hidden />
        Comments
        {comments ? <span className="text-xs font-normal text-white/40">{comments.length}</span> : null}
      </h3>

      <form onSubmit={submit} className="space-y-2">
        <label className="block">
          <span className="sr-only">Your comment</span>
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            maxLength={COMMENT_MAX_LENGTH}
            rows={3}
            placeholder="Say something about this chapter…"
            className="w-full rounded-2xl bg-white/6 px-4 py-3 text-sm text-white placeholder:text-white/40 ring-1 ring-white/12 outline-none transition focus:bg-white/10 focus:ring-2 focus:ring-neon/60"
          />
        </label>
        <div className="flex items-center gap-3">
          <Button type="submit" size="sm" disabled={busy || draft.trim().length === 0}>
            <Send aria-hidden />
            {busy ? "Posting…" : "Post comment"}
          </Button>
          <span className="text-[11px] tabular-nums text-white/35">
            {draft.length} / {COMMENT_MAX_LENGTH}
          </span>
        </div>
      </form>

      {error ? (
        <p role="alert" className="rounded-xl bg-coral/10 px-3 py-2 text-xs leading-relaxed text-coral ring-1 ring-coral/25">
          {error}
        </p>
      ) : null}

      {comments === null ? (
        <p className="text-xs text-white/40">Loading comments…</p>
      ) : comments.length === 0 ? (
        <p className="text-xs text-white/40">No comments yet.</p>
      ) : (
        <ul className="space-y-3">
          {comments.map((comment) => (
            <li key={comment.id} className="glass rounded-2xl p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-[11px] text-white/40">
                  {new Date(comment.createdAt).toLocaleString()}
                </p>
                <button
                  type="button"
                  onClick={() => void remove(comment)}
                  aria-label="Delete this comment"
                  className="tap-target -mr-1 -mt-1 flex items-center gap-1.5 rounded-full px-2 text-[11px] text-white/45 transition-colors hover:bg-white/8 hover:text-coral"
                >
                  <Trash2 className="size-3.5" aria-hidden />
                  Delete
                </button>
              </div>
              <p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-relaxed text-white/75">
                {comment.content}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
