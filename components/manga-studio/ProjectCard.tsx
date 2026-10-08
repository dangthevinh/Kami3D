import { BookOpen, Eye, Heart, Layers, ScrollText } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { MangaProject } from "@/lib/manga/types";
import { cn, formatCount } from "@/lib/utils";

/**
 * One project, as a card.
 *
 * It is a **server component**: a card is a title, a cover and four numbers, and none of that needs
 * JavaScript. The interactive things a gallery needs - a like button, a comment box - are passed in
 * as children, so the card itself stays free of state and can be rendered inside the reader, the
 * dashboard and the public gallery without dragging a client bundle into any of them.
 *
 * The cover is an <img>, not next/image: a panel or cover URL can be a Supabase Storage object or an
 * AI provider's temporary link, and `next/image` would need a `remotePatterns` entry for every host
 * that has ever generated one.
 */

export const AGE_RATING_LABEL: Record<MangaProject["ageRating"], string> = {
  all: "All ages",
  teen: "Teen",
  mature: "Mature",
};

export const STATUS_VARIANT: Record<MangaProject["status"], "neon" | "solar" | "outline"> = {
  published: "neon",
  draft: "solar",
  archived: "outline",
};

export function ProjectCard({
  project,
  href,
  footer,
  children,
  className,
}: {
  project: MangaProject;
  /** Where the cover and title lead. Omit for a card that is not a link. */
  href?: string;
  footer?: ReactNode;
  /** Interactive slot, e.g. a LikeButton. */
  children?: ReactNode;
  className?: string;
}) {
  const title = (
    <span className="font-display text-base font-semibold tracking-tight text-white">{project.title}</span>
  );

  return (
    <Card className={cn("flex h-full flex-col overflow-hidden", className)}>
      <div className="relative aspect-[4/3] w-full bg-gradient-to-br from-surface to-abyss">
        {project.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- covers live on Supabase Storage or an AI provider's CDN.
          <img
            src={project.coverUrl}
            alt={"Cover of " + project.title}
            loading="lazy"
            className="size-full object-cover"
          />
        ) : (
          <div className="grid size-full place-items-center text-center text-xs text-white/35">
            <span>
              <BookOpen className="mx-auto mb-2 size-6 text-white/25" aria-hidden />
              No cover yet
            </span>
          </div>
        )}

        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          <Badge variant={STATUS_VARIANT[project.status]}>{project.status}</Badge>
          <Badge variant="default">{project.isWebtoon ? "Webtoon" : "Manga"}</Badge>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          {href ? (
            <Link href={href} className="min-w-0 hover:underline">
              {title}
            </Link>
          ) : (
            title
          )}
          {project.isPublic ? <Badge variant="iris">Public</Badge> : null}
        </div>

        <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-white/55">
          {project.description ?? "No description yet."}
        </p>

        {project.genres.length > 0 ? (
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {project.genres.slice(0, 4).map((genre) => (
              <li key={genre}>
                <Badge variant="outline">{genre}</Badge>
              </li>
            ))}
          </ul>
        ) : null}

        <dl className="mt-4 grid grid-cols-2 gap-2 text-[11px] text-white/50">
          <div className="flex items-center gap-1.5">
            <Layers className="size-3.5 text-white/35" aria-hidden />
            <dt className="sr-only">Chapters</dt>
            <dd>{project.chapterCount} chapters</dd>
          </div>
          <div className="flex items-center gap-1.5">
            <ScrollText className="size-3.5 text-white/35" aria-hidden />
            <dt className="sr-only">Pages</dt>
            <dd>{project.pageCount} pages</dd>
          </div>
          <div className="flex items-center gap-1.5">
            <Eye className="size-3.5 text-white/35" aria-hidden />
            <dt className="sr-only">Views</dt>
            <dd>{formatCount(project.viewCount)} views</dd>
          </div>
          <div className="flex items-center gap-1.5">
            <Heart className="size-3.5 text-white/35" aria-hidden />
            <dt className="sr-only">Likes</dt>
            <dd>{formatCount(project.likeCount)} likes</dd>
          </div>
        </dl>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Badge variant="outline">{AGE_RATING_LABEL[project.ageRating]}</Badge>
          <span className="text-[11px] text-white/35">
            updated {new Date(project.updatedAt).toLocaleDateString()}
          </span>
        </div>

        {children ? <div className="mt-4">{children}</div> : null}
        {footer ? <div className="mt-auto pt-4">{footer}</div> : null}
      </div>
    </Card>
  );
}
