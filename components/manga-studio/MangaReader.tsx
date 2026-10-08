"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import * as React from "react";

import { useSettings } from "@/components/settings/SettingsProvider";
import { BubbleShape } from "@/components/manga-studio/BubbleShape";
import { rectStyle } from "@/components/manga-studio/drop";
import { Button } from "@/components/ui/button";
import { MANGA_TEMPLATES, panelRects } from "@/lib/manga-layout";
import type { MangaBubble, MangaPage, MangaPanel } from "@/lib/manga/types";
import { cn } from "@/lib/utils";

/**
 * The reader.
 *
 * **Mobile first**, because this is the half of the studio a phone is actually for: one page at a
 * time with two large buttons, arrow keys, a swipe, and a page jump; a webtoon is a continuous
 * vertical column with no page turning at all. The composer is desktop-first and says so; this is the
 * screen that has to work on a 360 px screen held in one hand.
 *
 * **`reduceMotion` is honoured twice over.** The preference from `/settings` (or the operating
 * system) reaches every descendant as `html[data-motion="reduced"]`, which already zeroes transitions;
 * on top of that this component simply does not add a transition class when the preference is set, so
 * nothing depends on a cascade the reader cannot see.
 *
 * **It is the thing the print stylesheet turns into a PDF.** Pages are all in the DOM: the current one
 * is on screen and the rest are `hidden print:block`, so "Print → Save as PDF" emits the whole
 * chapter, one page per sheet (`break-after: page`), with the toolbar and the app chrome hidden. The
 * scoped block below is the only way to reach the app shell from here - the root navbar and the
 * background layer live outside this component, and the studio is not allowed to restyle the product
 * to make its own export work.
 *
 * Coordinates stay normalised: a page is rendered in a box of the template's own aspect ratio and every
 * panel and bubble is a percentage of it, so the same layout is the same drawing on a phone and on
 * paper.
 */

const PRINT_STYLES = [
  "@media print {",
  "  body > header, body > footer, body > div[aria-hidden='true'] { display: none !important; }",
  "  .manga-print-root { padding-left: 0 !important; padding-right: 0 !important; }",
  "  .manga-sheet { break-after: page; page-break-after: always; box-shadow: none !important; }",
  "  .manga-sheet:last-child { break-after: auto; page-break-after: auto; }",
  "  .manga-webtoon-sheet { break-inside: avoid; }",
  "  .manga-print-root { print-color-adjust: exact; -webkit-print-color-adjust: exact; }",
  "}",
].join("\n");

export interface MangaReaderProps {
  title: string;
  chapterTitle: string;
  pages: MangaPage[];
  panels: MangaPanel[];
  bubbles: MangaBubble[];
  isWebtoon: boolean;
}

export function MangaReader({ title, chapterTitle, pages, panels, bubbles, isWebtoon }: MangaReaderProps) {
  const reduceMotion = useSettings().settings.reduceMotion;
  const ordered = React.useMemo(
    () => pages.slice().sort((a, b) => a.pageNumber - b.pageNumber),
    [pages],
  );
  const [index, setIndex] = React.useState(0);
  const touch = React.useRef<number | null>(null);

  const panelById = React.useMemo(() => new Map(panels.map((panel) => [panel.id, panel])), [panels]);
  const bubblesByPage = React.useMemo(() => {
    const map = new Map<string, MangaBubble[]>();
    for (const bubble of bubbles) {
      const list = map.get(bubble.pageId);
      if (list) list.push(bubble);
      else map.set(bubble.pageId, [bubble]);
    }
    return map;
  }, [bubbles]);

  const count = ordered.length;
  const safeIndex = count === 0 ? 0 : Math.min(Math.max(index, 0), count - 1);
  const current = count > 0 ? ordered[safeIndex] : null;

  const step = React.useCallback(
    (delta: number) => {
      setIndex((value) => Math.min(Math.max(value + delta, 0), Math.max(0, count - 1)));
    },
    [count],
  );

  // Arrow keys, but only in the paged mode: a webtoon scroll does not have "next page".
  React.useEffect(() => {
    if (isWebtoon) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") step(1);
      if (event.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isWebtoon, step]);

  if (count === 0) {
    return (
      <div className="glass rounded-[var(--radius-card)] p-8 text-center">
        <p className="text-sm text-white/60">
          This chapter has no pages yet. Compose one in the studio — panels, a template, and it appears here.
        </p>
      </div>
    );
  }

  const sheet = (page: MangaPage, visible: boolean) => {
    const spec = MANGA_TEMPLATES.find((entry) => entry.id === page.layoutData.template) ?? MANGA_TEMPLATES[0];
    const rects = panelRects(page.layoutData.template);
    const pageBubbles = bubblesByPage.get(page.id) ?? [];

    return (
      <figure
        key={page.id}
        data-page={page.pageNumber}
        className={cn(
          "manga-sheet mx-auto w-full max-w-3xl overflow-hidden rounded-xl bg-abyss ring-1 ring-white/12",
          isWebtoon ? "manga-webtoon-sheet" : "",
          visible ? "block" : "hidden print:block",
        )}
      >
        <div className="@container relative w-full bg-white/6" style={{ aspectRatio: String(spec.aspect) }}>
          {page.layoutData.slots.map((slot, slotIndex) => {
            const rect = rects[slotIndex] ?? slot.rect;
            const panel = slot.panelId ? panelById.get(slot.panelId) : undefined;
            return (
              <div key={slotIndex} style={rectStyle(rect)} className="absolute overflow-hidden bg-white/5">
                {panel ? (
                  // eslint-disable-next-line @next/next/no-img-element -- panels live on Supabase Storage or an AI provider's CDN.
                  <img
                    src={panel.imageUrl}
                    alt=""
                    loading="lazy"
                    className="size-full object-cover"
                  />
                ) : (
                  <div className="grid size-full place-items-center text-[11px] text-white/25">empty panel</div>
                )}
              </div>
            );
          })}

          {pageBubbles.map((bubble) => (
            <div key={bubble.id} style={rectStyle(bubble.position)} className="absolute">
              <BubbleShape
                bubbleType={bubble.bubbleType}
                className="text-[clamp(12px,2.2cqw,18px)]"
              >
                {bubble.content}
              </BubbleShape>
            </div>
          ))}
        </div>
        <figcaption className="flex items-center justify-between gap-3 px-3 py-2 text-[11px] text-white/40 print:hidden">
          <span className="truncate">
            {title} · {chapterTitle}
          </span>
          <span className="tabular-nums">Page {page.pageNumber}</span>
        </figcaption>
      </figure>
    );
  };

  return (
    <div className="manga-print-root space-y-4">
      {/* Print rules that have to reach outside this component: the app's own navbar, footer and
          background layer. All of them are inside @media print, so nothing here changes what is on
          screen - and `href` + `precedence` is what lets React hoist and de-duplicate this block
          into the head, which is the shape React 19 requires of a <style> rendered by a component. */}
      <style href="manga-reader-print" precedence="default">
        {PRINT_STYLES}
      </style>

      {isWebtoon ? (
        <div className="space-y-3">
          <p className="text-center text-[11px] text-white/40 print:hidden">
            Vertical scroll · {count} page(s) · no page turning
          </p>
          {ordered.map((page) => sheet(page, true))}
        </div>
      ) : (
        <div className="space-y-3">
          <div
            className="relative"
            onTouchStart={(event) => {
              touch.current = event.touches[0]?.clientX ?? null;
            }}
            onTouchEnd={(event) => {
              const start = touch.current;
              touch.current = null;
              if (start === null) return;
              const end = event.changedTouches[0]?.clientX ?? start;
              const delta = end - start;
              if (Math.abs(delta) < 40) return;
              step(delta < 0 ? 1 : -1);
            }}
          >
            {ordered.map((page, pageIndex) => sheet(page, pageIndex === safeIndex))}
          </div>

          {/* Controls are hidden in print, and they are the only thing the print output loses. */}
          <div className="flex flex-wrap items-center justify-center gap-3 print:hidden">
            <Button
              type="button"
              variant="secondary"
              size="lg"
              disabled={safeIndex === 0}
              aria-label="Previous page"
              onClick={() => step(-1)}
            >
              <ChevronLeft aria-hidden />
              Previous
            </Button>

            <label className="flex items-center gap-2 text-xs text-white/60">
              <span className="sr-only">Jump to a page</span>
              <select
                value={safeIndex}
                onChange={(event) => setIndex(Number(event.target.value))}
                className="rounded-full bg-white/6 px-3 py-2 text-xs text-white ring-1 ring-white/12 outline-none focus:ring-neon/60 max-sm:min-h-11"
              >
                {ordered.map((page, pageIndex) => (
                  <option key={page.id} value={pageIndex} className="bg-abyss">
                    Page {page.pageNumber}
                  </option>
                ))}
              </select>
              <span className="tabular-nums text-white/45">of {count}</span>
            </label>

            <Button
              type="button"
              variant="secondary"
              size="lg"
              disabled={safeIndex >= count - 1}
              aria-label="Next page"
              onClick={() => step(1)}
            >
              Next
              <ChevronRight aria-hidden />
            </Button>
          </div>

          <p className="text-center text-[11px] text-white/30 print:hidden">
            {reduceMotion
              ? "Reduced motion is on: pages change instantly, with no animation."
              : "Swipe, use the arrow keys, or press the buttons."}
          </p>
        </div>
      )}
    </div>
  );
}
