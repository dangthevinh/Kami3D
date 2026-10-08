"use client";

import { Images, RefreshCw } from "lucide-react";

import { CommentSection } from "@/components/manga-studio/CommentSection";
import { FollowButton } from "@/components/manga-studio/FollowButton";
import { LikeButton } from "@/components/manga-studio/LikeButton";
import { ProjectCard } from "@/components/manga-studio/ProjectCard";
import { useMangaQuery } from "@/components/manga-studio/hooks";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { MangaProject } from "@/lib/manga/types";

/**
 * The public gallery.
 *
 * `scope=public` is the API's half of the rule - only published, only public projects - and this
 * component does not re-filter what it was given: a second copy of a visibility rule is a second
 * place for it to be wrong. What the card shows is what the server decided a stranger may see.
 *
 * Likes, follows and comments hang off the card rather than living on a detail page, because the
 * thing a reader wants to react to is the card they just read.
 */

export function GalleryGrid() {
  const query = useMangaQuery<{ projects: MangaProject[] }>("/api/manga/projects?scope=public");
  const projects = query.data?.projects ?? [];

  if (query.status === "loading") {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-busy="true">
        <span className="sr-only">Loading the gallery</span>
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <Skeleton key={index} className="h-96 rounded-[var(--radius-card)]" />
        ))}
      </div>
    );
  }

  if (query.status === "error") {
    return (
      <div className="glass rounded-[var(--radius-card)] p-6">
        <h2 className="font-display text-lg font-semibold text-white">The gallery could not be read</h2>
        <p className="mt-2 text-sm leading-relaxed text-white/60">{query.error}</p>
        <Button variant="secondary" size="sm" className="mt-4" onClick={query.reload}>
          <RefreshCw aria-hidden />
          Try again
        </Button>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="glass rounded-[var(--radius-card)] p-8 text-center">
        <Images className="mx-auto size-8 text-white/30" aria-hidden />
        <h2 className="mt-3 font-display text-lg font-semibold text-white">Nothing published yet</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-white/55">
          The gallery lists projects their authors have published and marked public. Publish one from its project
          page and it appears here.
        </p>
      </div>
    );
  }

  return (
    <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {projects.map((project) => (
        <li key={project.id}>
          <ProjectCard
            project={project}
            href={"/manga-studio/reader/" + encodeURIComponent(project.id)}
            footer={
              <details className="group">
                <summary className="tap-target cursor-pointer list-none text-xs text-white/55 transition-colors hover:text-white">
                  Comments
                </summary>
                <CommentSection projectId={project.id} className="mt-3" />
              </details>
            }
          >
            <div className="flex flex-wrap items-start gap-4">
              <LikeButton projectId={project.id} initialCount={project.likeCount} />
              <FollowButton userId={project.userId} />
            </div>
          </ProjectCard>
        </li>
      ))}
    </ul>
  );
}
