"use client";

import { BookOpen, RefreshCw, Upload } from "lucide-react";
import Link from "next/link";

import { ProjectCard } from "@/components/manga-studio/ProjectCard";
import { useMangaQuery } from "@/components/manga-studio/hooks";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { MangaProject } from "@/lib/manga/types";

/**
 * The dashboard: this account's own projects.
 *
 * It is a client component that asks `/api/manga/projects?scope=mine`, which is the deliberate
 * shape of the whole studio: the server renders a shell with no session, no Supabase client and no
 * Clerk runtime, and the rows arrive from an API route that already resolved the session. That is
 * what keeps a new route inside the same first-paint budget as a content page.
 *
 * Three states, all of them visible: loading, empty, and **failed** - with the API's own sentence, a
 * retry, and a note that the studio is expected to work in Demo Mode, so an empty list is not an
 * error and a 404 is a deployment fact rather than the visitor's fault.
 */

export function StudioDashboard() {
  const query = useMangaQuery<{ projects: MangaProject[] }>("/api/manga/projects?scope=mine");
  const projects = query.data?.projects ?? [];

  if (query.status === "loading") {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-busy="true">
        <span className="sr-only">Loading your projects</span>
        {[0, 1, 2].map((index) => (
          <Skeleton key={index} className="h-80 rounded-[var(--radius-card)]" />
        ))}
      </div>
    );
  }

  if (query.status === "error") {
    return (
      <div className="glass rounded-[var(--radius-card)] p-6">
        <h2 className="font-display text-lg font-semibold text-white">The project list could not be read</h2>
        <p className="mt-2 text-sm leading-relaxed text-white/60">{query.error}</p>
        <p className="mt-2 text-xs leading-relaxed text-white/45">
          Manga Studio works without Clerk and without Supabase - with neither configured the API answers from
          its demo store - so this is usually the API route rather than the account.
        </p>
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
        <BookOpen className="mx-auto size-8 text-white/30" aria-hidden />
        <h2 className="mt-3 font-display text-lg font-semibold text-white">No projects yet</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-white/55">
          A project is a title and a format (manga pages or a vertical webtoon). Chapters, panels and pages hang
          off it, and publishing it puts it in the public gallery.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link href="/manga-studio/create">Create a project</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/manga-studio/gallery">Browse the gallery</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {projects.map((project) => (
        <li key={project.id}>
          <ProjectCard
            project={project}
            href={"/manga-studio/" + encodeURIComponent(project.id)}
            footer={
              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm" variant="secondary">
                  <Link href={"/manga-studio/" + encodeURIComponent(project.id)}>
                    <Upload aria-hidden />
                    Chapters
                  </Link>
                </Button>
                <Button asChild size="sm" variant="ghost">
                  <Link href={"/manga-studio/reader/" + encodeURIComponent(project.id)}>Preview</Link>
                </Button>
              </div>
            }
          />
        </li>
      ))}
    </ul>
  );
}
