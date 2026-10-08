"use client";

import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { errorText, mangaRequest } from "@/components/manga-studio/api";
import type { MangaAgeRating, MangaProject } from "@/lib/manga/types";

/**
 * Create or edit a project's metadata.
 *
 * One form for both, because the fields are the same and the difference is two lines: create posts to
 * the collection and navigates to the new project, edit patches the row it was handed and hands the
 * updated project back.
 *
 * The cover is deliberately **not** on the create form. `POST /api/manga/projects` takes title,
 * description, genres, rating and format - the cover is written afterwards on the project page, and
 * saying so here is better than a field that silently does nothing.
 */

const GENRE_LIMIT = 8;
const GENRE_MAX_LENGTH = 24;

/** Comma-separated input to a clean list: trimmed, de-duplicated, capped, and never longer than the column. */
export function parseGenres(input: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of input.split(",")) {
    const genre = part.trim().replace(/\s+/g, " ").slice(0, GENRE_MAX_LENGTH);
    if (genre.length === 0) continue;
    const key = genre.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(genre);
    if (out.length >= GENRE_LIMIT) break;
  }
  return out;
}

const field =
  "mt-1 w-full rounded-xl bg-white/6 px-3.5 py-2.5 text-sm text-white placeholder:text-white/40 ring-1 ring-white/12 outline-none transition focus:bg-white/10 focus:ring-2 focus:ring-neon/60";
const label = "block text-[11px] font-medium uppercase tracking-wide text-white/45";

export function ProjectForm({
  project,
  onSaved,
}: {
  /** Absent means "create". */
  project?: MangaProject;
  onSaved?: (project: MangaProject) => void;
}) {
  const router = useRouter();
  const editing = Boolean(project);

  const [title, setTitle] = React.useState(project?.title ?? "");
  const [description, setDescription] = React.useState(project?.description ?? "");
  const [genres, setGenres] = React.useState((project?.genres ?? []).join(", "));
  const [ageRating, setAgeRating] = React.useState<MangaAgeRating>(project?.ageRating ?? "all");
  const [isWebtoon, setIsWebtoon] = React.useState(project?.isWebtoon ?? false);
  const [coverUrl, setCoverUrl] = React.useState(project?.coverUrl ?? "");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const clean = title.trim();
    if (clean.length === 0 || busy) return;

    setBusy(true);
    setError(null);
    setSaved(null);

    const body: Record<string, unknown> = {
      title: clean,
      description: description.trim().length > 0 ? description.trim() : null,
      genres: parseGenres(genres),
      ageRating,
      isWebtoon,
    };
    if (editing) body.coverUrl = coverUrl.trim().length > 0 ? coverUrl.trim() : null;

    try {
      const data = await mangaRequest<{ project: MangaProject }>(
        editing && project ? "/api/manga/projects/" + encodeURIComponent(project.id) : "/api/manga/projects",
        { method: editing ? "PATCH" : "POST", body },
      );

      if (editing) {
        setSaved("Saved.");
        onSaved?.(data.project);
      } else {
        router.push("/manga-studio/" + encodeURIComponent(data.project.id));
      }
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="glass space-y-4 rounded-[var(--radius-card)] p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className={label}>Title</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
            maxLength={120}
            placeholder="The Lantern Keeper"
            className={field}
          />
        </label>

        <label className="block sm:col-span-2">
          <span className={label}>Description</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={4}
            maxLength={2000}
            placeholder="One paragraph: who it follows, and where it starts."
            className={field}
          />
        </label>

        <label className="block sm:col-span-2">
          <span className={label}>Genres</span>
          <input
            value={genres}
            onChange={(event) => setGenres(event.target.value)}
            placeholder="slice of life, mystery, sports"
            className={field}
          />
          <span className="mt-1 block text-[11px] text-white/35">
            Comma separated · up to {GENRE_LIMIT} · longest {GENRE_MAX_LENGTH} characters each
          </span>
        </label>

        <label className="block">
          <span className={label}>Age rating</span>
          <select
            value={ageRating}
            onChange={(event) => setAgeRating(event.target.value as MangaAgeRating)}
            className={field}
          >
            <option value="all" className="bg-abyss">
              All ages
            </option>
            <option value="teen" className="bg-abyss">
              Teen
            </option>
            <option value="mature" className="bg-abyss">
              Mature
            </option>
          </select>
        </label>

        <div className="block">
          <span className={label}>Format</span>
          <div className="mt-2 flex items-center gap-2">
            <Button
              type="button"
              variant={isWebtoon ? "secondary" : "default"}
              size="sm"
              aria-pressed={!isWebtoon}
              onClick={() => setIsWebtoon(false)}
            >
              Manga pages
            </Button>
            <Button
              type="button"
              variant={isWebtoon ? "default" : "secondary"}
              size="sm"
              aria-pressed={isWebtoon}
              onClick={() => setIsWebtoon(true)}
            >
              Webtoon
            </Button>
          </div>
          <span className="mt-2 block text-[11px] leading-relaxed text-white/35">
            {isWebtoon
              ? "Panels stack and the reader scrolls: order matters, there are no pages to turn."
              : "Panels are laid out on pages and the reader turns them."}
          </span>
        </div>

        {editing ? (
          <label className="block sm:col-span-2">
            <span className={label}>Cover image URL</span>
            <input
              value={coverUrl}
              onChange={(event) => setCoverUrl(event.target.value)}
              placeholder="https://…"
              className={field}
            />
            <span className="mt-1 block text-[11px] text-white/35">
              A URL, because panels are uploaded per chapter and a cover is usually one of them.
            </span>
          </label>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={busy || title.trim().length === 0}>
          <Save aria-hidden />
          {busy ? "Saving…" : editing ? "Save changes" : "Create project"}
        </Button>
        {saved ? <span className="text-xs text-neon">{saved}</span> : null}
      </div>

      {error ? (
        <p role="alert" className="rounded-xl bg-coral/10 px-3 py-2 text-xs leading-relaxed text-coral ring-1 ring-coral/25">
          {error}
        </p>
      ) : null}
    </form>
  );
}
