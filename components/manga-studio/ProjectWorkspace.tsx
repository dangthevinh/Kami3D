"use client";

import { ArrowRight, Eye, EyeOff, Loader2, Plus, RefreshCw, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

import { ProjectForm } from "@/components/manga-studio/ProjectForm";
import { errorText, mangaRequest } from "@/components/manga-studio/api";
import { useMangaQuery } from "@/components/manga-studio/hooks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { MangaChapter, MangaProject } from "@/lib/manga/types";

/**
 * One project: metadata, cover, publish state and the chapter list.
 *
 * The publish switch is the only control here whose effect is visible to strangers, so it is also the
 * one that reports what the server decided - `POST …/publish` answers with the updated project, and
 * the switch is drawn from that project rather than from the click. A toggle that shows "published"
 * because someone pressed it, on a project the API refused to publish, is the bug this avoids.
 */

interface ProjectPayload {
  project: MangaProject;
  chapters: MangaChapter[];
}

export function ProjectWorkspace({ projectId }: { projectId: string }) {
  const router = useRouter();
  const query = useMangaQuery<ProjectPayload>("/api/manga/projects/" + encodeURIComponent(projectId));

  const [project, setProject] = React.useState<MangaProject | null>(null);
  const [chapters, setChapters] = React.useState<MangaChapter[] | null>(null);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [note, setNote] = React.useState<string | null>(null);

  // Local state so a write can be reflected without a refetch; the fetch is still the source of truth
  // whenever it lands.
  React.useEffect(() => {
    if (!query.data) return;
    setProject(query.data.project);
    setChapters(query.data.chapters);
  }, [query.data]);

  const current = project ?? query.data?.project ?? null;
  const list = chapters ?? query.data?.chapters ?? [];

  async function publish(publishIt: boolean) {
    setBusy("publish");
    setError(null);
    setNote(null);
    try {
      const data = await mangaRequest<{ project: MangaProject }>(
        "/api/manga/projects/" + encodeURIComponent(projectId) + "/publish",
        { method: "POST", body: { publish: publishIt } },
      );
      setProject(data.project);
      setNote(publishIt ? "Published. It is in the public gallery now." : "Unpublished: it is a draft again.");
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    if (!window.confirm("Delete this project, its chapters, panels and pages? This cannot be undone.")) return;
    setBusy("delete");
    setError(null);
    try {
      await mangaRequest<{ ok: true }>("/api/manga/projects/" + encodeURIComponent(projectId), { method: "DELETE" });
      router.push("/manga-studio");
    } catch (caught) {
      setError(errorText(caught));
      setBusy(null);
    }
  }

  async function deleteChapter(chapter: MangaChapter) {
    if (!window.confirm("Delete chapter " + chapter.chapterNumber + " and everything in it?")) return;
    setBusy("chapter:" + chapter.id);
    setError(null);
    try {
      await mangaRequest<{ ok: true }>("/api/manga/chapters/" + encodeURIComponent(chapter.id), { method: "DELETE" });
      setChapters((currentList) => (currentList ?? []).filter((entry) => entry.id !== chapter.id));
      query.reload();
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusy(null);
    }
  }

  if (query.status === "loading" && !current) {
    return (
      <div className="space-y-4" aria-busy="true">
        <span className="sr-only">Loading this project</span>
        <Skeleton className="h-40 rounded-[var(--radius-card)]" />
        <Skeleton className="h-72 rounded-[var(--radius-card)]" />
      </div>
    );
  }

  if (!current) {
    return (
      <div className="glass rounded-[var(--radius-card)] p-6">
        <h2 className="font-display text-lg font-semibold text-white">This project could not be read</h2>
        <p className="mt-2 text-sm leading-relaxed text-white/60">{query.error}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button variant="secondary" size="sm" onClick={query.reload}>
            <RefreshCw aria-hidden />
            Try again
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/manga-studio">Back to the studio</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="glass rounded-[var(--radius-card)] p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={current.status === "published" ? "neon" : "solar"}>{current.status}</Badge>
          <Badge variant="default">{current.isWebtoon ? "Webtoon" : "Manga"}</Badge>
          {current.isPublic ? <Badge variant="iris">Public</Badge> : null}
          <span className="text-[11px] text-white/40">{current.genres.join(" · ") || "no genres yet"}</span>

          <div className="ml-auto flex flex-wrap gap-2">
            <Button asChild variant="secondary" size="sm">
              <Link href={"/manga-studio/reader/" + encodeURIComponent(projectId)}>Open the reader</Link>
            </Button>
            <Button
              type="button"
              size="sm"
              variant={current.status === "published" ? "outline" : "default"}
              disabled={busy === "publish"}
              onClick={() => void publish(current.status !== "published")}
            >
              {busy === "publish" ? <Loader2 className="animate-spin" aria-hidden /> : current.status === "published" ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
              {current.status === "published" ? "Unpublish" : "Publish"}
            </Button>
            <Button type="button" variant="danger" size="sm" disabled={busy === "delete"} onClick={() => void remove()}>
              <Trash2 aria-hidden />
              Delete
            </Button>
          </div>
        </div>

        <p className="mt-3 text-xs leading-relaxed text-white/50">
          Publishing puts this project in the public gallery for anyone to read, like and comment on. Until then only
          this account sees it.
        </p>

        {note ? (
          <p role="status" className="mt-3 rounded-xl bg-neon/10 px-3 py-2 text-xs text-neon ring-1 ring-neon/25">
            {note}
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="mt-3 rounded-xl bg-coral/10 px-3 py-2 text-xs leading-relaxed text-coral ring-1 ring-coral/25">
            {error}
          </p>
        ) : null}
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-4">
          <ProjectForm project={current} onSaved={setProject} />
        </div>

        <div className="space-y-4">
          <section className="glass overflow-hidden rounded-[var(--radius-card)]" aria-labelledby="project-cover">
            <h2 id="project-cover" className="px-5 pt-5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">
              Cover
            </h2>
            <div className="mt-3 aspect-[4/3] w-full bg-gradient-to-br from-surface to-abyss">
              {current.coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- a Supabase Storage or provider URL.
                <img src={current.coverUrl} alt={"Cover of " + current.title} className="size-full object-cover" />
              ) : (
                <div className="grid size-full place-items-center text-xs text-white/35">
                  No cover — paste a URL in the form beside this.
                </div>
              )}
            </div>
            <p className="px-5 py-4 text-[11px] leading-relaxed text-white/40">
              {current.chapterCount} chapter(s) · {current.pageCount} page(s) · {current.likeCount} like(s) ·{" "}
              {current.viewCount} view(s)
            </p>
          </section>
        </div>
      </div>

      <ChapterList
        projectId={projectId}
        chapters={list}
        busy={busy}
        onDelete={(chapter) => void deleteChapter(chapter)}
        onCreated={(chapter) => {
          setChapters((currentList) => [...(currentList ?? []), chapter]);
          query.reload();
        }}
        onError={setError}
      />
    </div>
  );
}

/** Create and list the chapters. Kept in this file because it shares the project page's state. */
function ChapterList({
  projectId,
  chapters,
  busy,
  onDelete,
  onCreated,
  onError,
}: {
  projectId: string;
  chapters: MangaChapter[];
  busy: string | null;
  onDelete: (chapter: MangaChapter) => void;
  onCreated: (chapter: MangaChapter) => void;
  onError: (message: string) => void;
}) {
  const [title, setTitle] = React.useState("");
  const [script, setScript] = React.useState("");
  const [creating, setCreating] = React.useState(false);

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const clean = title.trim();
    if (clean.length === 0 || creating) return;

    setCreating(true);
    try {
      const data = await mangaRequest<{ chapter: MangaChapter }>(
        "/api/manga/projects/" + encodeURIComponent(projectId) + "/chapters",
        { method: "POST", body: { title: clean, script: script.trim().length > 0 ? script.trim() : null } },
      );
      onCreated(data.chapter);
      setTitle("");
      setScript("");
    } catch (caught) {
      onError(errorText(caught));
    } finally {
      setCreating(false);
    }
  }

  const input =
    "mt-1 w-full rounded-xl bg-white/6 px-3.5 py-2.5 text-sm text-white placeholder:text-white/40 ring-1 ring-white/12 outline-none transition focus:bg-white/10 focus:ring-2 focus:ring-neon/60";

  return (
    <section className="glass rounded-[var(--radius-card)] p-5" aria-labelledby="project-chapters">
      <h2 id="project-chapters" className="text-sm font-semibold text-white/85">
        Chapters ({chapters.length})
      </h2>

      <form onSubmit={create} className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,18rem)_minmax(0,1fr)_auto] sm:items-end">
        <label className="block">
          <span className="text-[11px] font-medium uppercase tracking-wide text-white/45">Chapter title</span>
          <input value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={120} placeholder="Chapter 1 — Rain" className={input} />
        </label>
        <label className="block">
          <span className="text-[11px] font-medium uppercase tracking-wide text-white/45">Opening note (optional)</span>
          <input value={script} onChange={(event) => setScript(event.target.value)} maxLength={400} placeholder="What happens in it" className={input} />
        </label>
        <Button type="submit" size="sm" disabled={creating || title.trim().length === 0}>
          {creating ? <Loader2 className="animate-spin" aria-hidden /> : <Plus aria-hidden />}
          Add chapter
        </Button>
      </form>

      <p className="mt-2 text-[11px] text-white/35">
        Chapter numbers are assigned by the API, so two chapters added at the same moment cannot claim the same number.
      </p>

      {chapters.length === 0 ? (
        <p className="mt-4 text-xs text-white/45">No chapters yet.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {chapters.map((chapter) => (
            <li key={chapter.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
              <span className="text-xs tabular-nums text-white/40">#{chapter.chapterNumber}</span>
              <span className="min-w-0 flex-1 text-sm text-white/80">{chapter.title}</span>
              <Badge variant={chapter.status === "published" ? "neon" : "solar"}>{chapter.status}</Badge>
              <span className="text-[11px] text-white/35">
                {chapter.panelCount} panel(s) · {chapter.pageCount} page(s)
              </span>
              <Button asChild variant="secondary" size="sm">
                <Link href={"/manga-studio/" + encodeURIComponent(projectId) + "/chapters/" + encodeURIComponent(chapter.id)}>
                  Open
                  <ArrowRight aria-hidden />
                </Link>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={"Delete chapter " + chapter.chapterNumber}
                disabled={busy === "chapter:" + chapter.id}
                onClick={() => onDelete(chapter)}
              >
                <Trash2 aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
