"use client";

import { ChevronLeft, ChevronRight, Info, X } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { RangeTimeline } from "@/components/map/TimelinePanel";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/components/settings/SettingsProvider";
import {
  hasModel,
  imageCredit,
  nearestStories,
  storyForYear,
  storyGapMessage,
  storyToTimelineEvent,
  storyYears,
  type Story,
  type StoryImage,
} from "@/lib/data2map/stories";
import { cn } from "@/lib/utils";

/**
 * The story map.
 *
 * The timeline is Phase 16's, not a second one: `RangeTimeline` takes years, a year and the events
 * near it, and a story maps onto that shape exactly (`storyToTimelineEvent`). What is new is the
 * panel: an image with its credit, the story text, and the links out.
 *
 * **Story mode** is that same play button. It steps through the years that have a story, and it is
 * disabled - with a tooltip saying why - when the visitor has asked for reduced motion, either
 * through the operating system or through `/settings`. Continuous self-running motion is exactly
 * what that preference is for.
 *
 * **No second WebGL context.** A story with a 3D model would mount the existing viewer on demand;
 * no heritage model exists in this project, so the panel says that rather than showing a button
 * that opens nothing - and the constraint that matters (one canvas at a time) is met by not
 * needing one.
 */

export interface StoriesExperienceProps {
  stories: Story[];
  images: Record<string, StoryImage>;
  attribution: string;
}

export function StoriesExperience({ stories, images, attribution }: StoriesExperienceProps) {
  const reduceMotion = useSettings().settings.reduceMotion;
  const years = React.useMemo(() => storyYears(stories), [stories]);
  const [year, setYear] = React.useState<number>(() => years[years.length - 1] ?? new Date().getFullYear());
  const [zoomed, setZoomed] = React.useState(false);
  const [shown, setShown] = React.useState<number | null>(null);

  const story = storyForYear(stories, year) ?? nearestStories(stories, year, 1)[0] ?? null;
  const index = story ? stories.findIndex((entry) => entry.slug === story.slug) : -1;
  const image = story ? images[story.slug] : undefined;

  const step = React.useCallback(
    (delta: number) => {
      if (index < 0) return;
      const next = stories[(index + delta + stories.length) % stories.length];
      setYear(next.year);
    },
    [index, stories],
  );

  return (
    <div className="grid gap-4 lg:grid-cols-[22rem_minmax(0,1fr)]">
      <aside className="space-y-4">
        <RangeTimeline
          years={years}
          year={year}
          onYear={setYear}
          events={story ? [storyToTimelineEvent(story, attribution)] : []}
          gapMessage={storyGapMessage(stories, year)}
          reduceMotion={reduceMotion}
        />

        <div className="glass rounded-[var(--radius-card)] p-4 text-[10px] leading-relaxed text-white/45">
          <p className="flex items-center gap-2 text-[11px] font-medium text-white/70">
            <Info className="size-3.5 text-solar" aria-hidden />
            Story mode
          </p>
          <p className="mt-1">
            The play button steps through the years that have a story. It is off when you have asked
            for reduced motion — either in your operating system or in
            <Link href="/settings" className="ml-1 text-neon hover:text-white">Settings</Link>.
          </p>
        </div>
      </aside>

      <div className="space-y-4">
        {story ? (
          <article className="glass overflow-hidden rounded-[var(--radius-card)]">
            <div className="relative">
              {image ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element -- the file lives on Wikimedia Commons; next/image would need a remotePatterns entry for every uploader. */}
                  <img
                    src={image.url}
                    alt={story.name}
                    loading="lazy"
                    onClick={() => setZoomed(true)}
                    className="h-56 w-full cursor-zoom-in object-cover sm:h-80"
                  />
                  <button
                    type="button"
                    onClick={() => setZoomed(true)}
                    className="absolute bottom-3 right-3 rounded-full bg-void/70 px-3 py-1.5 text-[10px] text-white/70 backdrop-blur transition-colors hover:text-white"
                  >
                    View full size
                  </button>
                </>
              ) : (
                <div className="grid h-56 place-items-center bg-gradient-to-br from-surface to-abyss text-xs text-white/40 sm:h-80">
                  No image has been cleared for this place yet.
                </div>
              )}
            </div>

            <div className="p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-display text-xl font-semibold tracking-tight text-white">{story.name}</h2>
                <span className="text-xs tabular-nums text-white/45">{story.year}</span>
              </div>
              <p className="mt-1 text-sm font-medium text-neon">{story.title}</p>
              <p className="mt-3 text-sm leading-relaxed text-white/65">{story.summary}</p>

              <dl className="mt-4 grid gap-1 text-[11px] text-white/45">
                <div className="flex gap-2">
                  <dt className="text-white/35">Where</dt>
                  <dd className="tabular-nums">
                    {story.lat.toFixed(4)}, {story.lng.toFixed(4)}
                  </dd>
                </div>
                {image ? (
                  <div className="flex flex-wrap gap-2">
                    <dt className="text-white/35">Image</dt>
                    <dd>
                      <a href={image.pageUrl} target="_blank" rel="noreferrer noopener" className="hover:text-white">
                        {imageCredit(image)}
                      </a>
                    </dd>
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <dt className="text-white/35">Story</dt>
                  <dd>
                    <a href={story.sourceUrl} target="_blank" rel="noreferrer noopener" className="hover:text-white">
                      {story.source}
                    </a>
                    {" · "}
                    {attribution}
                  </dd>
                </div>
              </dl>

              <p className="mt-4 rounded-xl bg-white/5 px-3 py-2 text-[10px] leading-relaxed text-white/45 ring-1 ring-white/10">
                {hasModel(story)
                  ? "A 3D model is available for this place."
                  : "3D model: none for this place yet. This project has models of animals and none of heritage sites, and putting one here would be worse than an empty slot — upload one through /admin/geodata and the viewer appears."}
              </p>

              <div className="mt-4 flex items-center gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={() => step(-1)}>
                  <ChevronLeft className="size-3.5" /> Previous
                </Button>
                <Button type="button" variant="secondary" size="sm" onClick={() => step(1)}>
                  Next <ChevronRight className="size-3.5" />
                </Button>
                <span className="ml-auto text-[10px] text-white/35">
                  {index + 1} of {stories.length}
                </span>
              </div>
            </div>
          </article>
        ) : (
          <p className="glass rounded-[var(--radius-card)] p-5 text-sm text-white/55">
            No stories are available in this deployment.
          </p>
        )}

        <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {stories.map((entry) => (
            <li key={entry.slug}>
              <button
                type="button"
                onClick={() => setYear(entry.year)}
                aria-pressed={entry.slug === story?.slug}
                className={cn(
                  "glass w-full rounded-2xl p-3 text-left text-xs transition-colors",
                  entry.slug === story?.slug ? "ring-1 ring-neon/40" : "hover:bg-white/6",
                )}
              >
                <span className="flex items-baseline justify-between gap-2">
                  <span className="truncate font-medium text-white/85">{entry.name}</span>
                  <span className="shrink-0 tabular-nums text-[10px] text-white/40">{entry.year}</span>
                </span>
                <span className="mt-0.5 block truncate text-[10px] text-white/45">{entry.title}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {zoomed && image ? (
        <div
          role="dialog"
          aria-label={story?.name ?? "Image"}
          className="fixed inset-0 z-50 grid place-items-center bg-void/90 p-4 backdrop-blur"
          onClick={() => setZoomed(false)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- remote Commons file. */}
          <img src={image.url} alt={story?.name ?? ""} className="max-h-full max-w-full rounded-xl object-contain" />
          <button
            type="button"
            onClick={() => setZoomed(false)}
            aria-label="Close"
            className="absolute right-4 top-4 grid size-9 place-items-center rounded-full bg-white/10 text-white/80 hover:bg-white/20"
          >
            <X className="size-4" />
          </button>
          <p className="absolute bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-white/60">{imageCredit(image)}</p>
        </div>
      ) : null}
    </div>
  );
}
