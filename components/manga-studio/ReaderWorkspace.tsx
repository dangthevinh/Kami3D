"use client";

import { ArrowLeft, RefreshCw } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { CommentSection } from "@/components/manga-studio/CommentSection";
import { FollowButton } from "@/components/manga-studio/FollowButton";
import { LikeButton } from "@/components/manga-studio/LikeButton";
import { MangaReader } from "@/components/manga-studio/MangaReader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { mangaRequest } from "@/components/manga-studio/api";
import { useMangaQuery } from "@/components/manga-studio/hooks";
import { AGE_RATING_LABEL } from "@/components/manga-studio/ProjectCard";
import type { MangaBubble, MangaChapter, MangaPage, MangaPanel, MangaProject } from "@/lib/manga/types";
import { formatCount } from "@/lib/utils";

/**
 * The public reader: project, chapter switcher, the pages themselves, and the social half.
 *
 * Everything here is readable by a stranger, which is why the route is public and why nothing on this
 * screen needs a session: `scope=public` decides what exists, and liking, following or commenting
 * simply reports the API's refusal when there is nobody signed in.
 *
 * The view count is incremented once per project **per tab**, guarded in `sessionStorage` as well as on
 * the server: the row is only ever changed by the API's own SECURITY DEFINER function, and this guard
 * is here so that clicking through twelve chapters is one view from this browser rather than twelve.
 */

interface ProjectPayload {
  project: MangaProject;
  chapters: MangaChapter[];
}

interface ChapterPayload {
  chapter: MangaChapter;
  panels: MangaPanel[];
  pages: MangaPage[];
  bubbles: MangaBubble[];
}

const VIEW_KEY_PREFIX = "kami3d:manga-view:";

export function ReaderWorkspace({
  projectId,
  initialChapterId,
  embedded = false,
}: {
  projectId: string;
  /** `?chapter=` from the URL, when the server could read it. */
  initialChapterId?: string | null;
  /** True when the studio is previewing its own draft: the social half is hidden. */
  embedded?: boolean;
}) {
  const projectQuery = useMangaQuery<ProjectPayload>("/api/manga/projects/" + encodeURIComponent(projectId));
  const [chapterId, setChapterId] = React.useState<string>(initialChapterId ?? "");
  const chapters = projectQuery.data?.chapters ?? [];

  // The first chapter is the sensible default, and it is chosen from the server's list rather than
  // guessed from a number so a chapter deleted in another tab cannot leave this one pointing at it.
  React.useEffect(() => {
    if (chapterId && chapters.some((chapter) => chapter.id === chapterId)) return;
    if (chapters.length > 0) setChapterId(chapters[0].id);
  }, [chapters, chapterId]);

  const chapterQuery = useMangaQuery<ChapterPayload>(
    chapterId ? "/api/manga/chapters/" + encodeURIComponent(chapterId) : null,
  );

  const [viewCount, setViewCount] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (embedded || !projectQuery.data) return;
    try {
      if (window.sessionStorage.getItem(VIEW_KEY_PREFIX + projectId) === "1") return;
      window.sessionStorage.setItem(VIEW_KEY_PREFIX + projectId, "1");
    } catch {
      // Private mode: the request still goes, the API's own dedupe is what bounds it.
    }

    let cancelled = false;
    void (async () => {
      try {
        const data = await mangaRequest<{ viewCount: number }>(
          "/api/manga/projects/" + encodeURIComponent(projectId) + "/view",
          { method: "POST" },
        );
        if (!cancelled) setViewCount(data.viewCount);
      } catch {
        // A view that was not counted is not worth an error box on a reader.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [embedded, projectId, projectQuery.data]);

  const project = projectQuery.data?.project ?? null;
  const chapter = chapterQuery.data?.chapter ?? null;

  if (projectQuery.status === "loading") {
    return (
      <div className="space-y-4" aria-busy="true">
        <span className="sr-only">Loading this project</span>
        <Skeleton className="h-28 rounded-[var(--radius-card)]" />
        <Skeleton className="h-96 rounded-[var(--radius-card)]" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="glass rounded-[var(--radius-card)] p-6">
        <h2 className="font-display text-lg font-semibold text-white">This project cannot be read</h2>
        <p className="mt-2 text-sm leading-relaxed text-white/60">{projectQuery.error}</p>
        <p className="mt-2 text-xs leading-relaxed text-white/45">
          A draft is only readable by its author; the public gallery lists the projects that have been published.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button variant="secondary" size="sm" onClick={projectQuery.reload}>
            <RefreshCw aria-hidden />
            Try again
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/manga-studio/gallery">Public gallery</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="glass rounded-[var(--radius-card)] p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="default">{project.isWebtoon ? "Webtoon" : "Manga"}</Badge>
          <Badge variant="outline">{AGE_RATING_LABEL[project.ageRating]}</Badge>
          {project.genres.slice(0, 3).map((genre) => (
            <Badge key={genre} variant="outline">
              {genre}
            </Badge>
          ))}
          <span className="text-[11px] text-white/40">
            {formatCount(viewCount ?? project.viewCount)} view(s) · {formatCount(project.likeCount)} like(s)
          </span>
        </div>

        <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight text-white">{project.title}</h2>
        {project.description ? (
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/60">{project.description}</p>
        ) : null}

        {!embedded ? (
          <div className="mt-4 flex flex-wrap items-start gap-4">
            <LikeButton projectId={project.id} initialCount={project.likeCount} />
            <FollowButton userId={project.userId} />
          </div>
        ) : null}
      </section>

      <nav aria-label="Chapters" className="flex flex-wrap items-center gap-2">
        <Link
          href={embedded ? "/manga-studio/" + encodeURIComponent(projectId) : "/manga-studio/gallery"}
          className="tap-target flex items-center gap-1.5 rounded-full px-3 text-xs text-white/50 transition-colors hover:bg-white/8 hover:text-white"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          {embedded ? "Back to the project" : "Gallery"}
        </Link>

        {chapters.length > 1 ? (
          <label className="flex items-center gap-2 text-xs text-white/55">
            <span className="sr-only">Choose a chapter</span>
            <select
              value={chapterId}
              onChange={(event) => setChapterId(event.target.value)}
              className="rounded-full bg-white/6 px-3 py-2 text-xs text-white ring-1 ring-white/12 outline-none focus:ring-neon/60 max-sm:min-h-11"
            >
              {chapters.map((entry) => (
                <option key={entry.id} value={entry.id} className="bg-abyss">
                  Chapter {entry.chapterNumber} — {entry.title}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </nav>

      {chapterQuery.status === "loading" ? (
        <Skeleton className="h-96 rounded-[var(--radius-card)]" />
      ) : chapterQuery.status === "error" || !chapter ? (
        <div className="glass rounded-[var(--radius-card)] p-6">
          <p className="text-sm text-white/60">{chapterQuery.error ?? "This chapter could not be read."}</p>
          <Button variant="secondary" size="sm" className="mt-3" onClick={chapterQuery.reload}>
            <RefreshCw aria-hidden />
            Try again
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <h3 className="font-display text-lg font-semibold tracking-tight text-white">
            Chapter {chapter.chapterNumber} — {chapter.title}
          </h3>
          <MangaReader
            title={project.title}
            chapterTitle={chapter.title}
            pages={chapterQuery.data?.pages ?? []}
            panels={chapterQuery.data?.panels ?? []}
            bubbles={chapterQuery.data?.bubbles ?? []}
            isWebtoon={project.isWebtoon}
          />
        </div>
      )}

      {!embedded ? (
        <section className="glass rounded-[var(--radius-card)] p-5">
          <CommentSection projectId={projectId} />
        </section>
      ) : null}
    </div>
  );
}
