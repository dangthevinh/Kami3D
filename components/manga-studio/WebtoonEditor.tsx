"use client";

import { ArrowDown, ArrowUp, Loader2, Rows3, Trash2 } from "lucide-react";
import * as React from "react";

import { errorText, mangaRequest } from "@/components/manga-studio/api";
import { Button } from "@/components/ui/button";
import { panelRects, type MangaTemplate } from "@/lib/manga-layout";
import type { MangaBubble, MangaPage, MangaPanel, MangaSlot } from "@/lib/manga/types";
import { cn } from "@/lib/utils";

/**
 * The vertical editor.
 *
 * A webtoon is not a manga with taller pages: it is one continuous scroll, so **order is the layout**.
 * There is no "which panel is where" — there is only "what comes next", and the reader renders the
 * slots in the order this screen shows them.
 *
 * So this editor does three things and no others:
 *
 *   1. it lists the chapter's vertical pages top to bottom, in reading order;
 *   2. it moves a panel up or down **within its page**, by swapping the panel ids of two slots and
 *      sending the whole `layoutData` back - the same `{ template, slots }` body the composer posts,
 *      because the API has one shape for a page layout and this is not a second one;
 *   3. it moves a whole page earlier or later by renumbering the two pages that swap.
 *
 * The order the editor draws is the order the reader scrolls, and the numbers are the database's page
 * numbers rather than a local sort, so what is on screen is what was saved.
 */

export interface WebtoonEditorProps {
  chapterId: string;
  panels: MangaPanel[];
  pages: MangaPage[];
  bubbles: MangaBubble[];
  onChanged: () => void;
  className?: string;
}

export function WebtoonEditor({ chapterId, panels, pages, bubbles, onChanged, className }: WebtoonEditorProps) {
  const [busy, setBusy] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [note, setNote] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState<string | null>(null);

  const panelById = React.useMemo(() => new Map(panels.map((panel) => [panel.id, panel])), [panels]);
  const ordered = React.useMemo(
    () =>
      pages
        .filter((page) => page.layoutData.template === "webtoon")
        .slice()
        .sort((a, b) => a.pageNumber - b.pageNumber),
    [pages],
  );
  const bubbleCount = (pageId: string) => bubbles.filter((bubble) => bubble.pageId === pageId).length;

  async function writeSlots(page: MangaPage, slots: MangaSlot[], key: string, message: string) {
    setBusy(key);
    setError(null);
    setNote(null);
    try {
      await mangaRequest<{ page: MangaPage }>("/api/manga/pages/" + encodeURIComponent(page.id), {
        method: "PATCH",
        body: { template: "webtoon" as MangaTemplate, slots },
      });
      setNote(message);
      onChanged();
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusy(null);
    }
  }

  function movePanel(page: MangaPage, index: number, delta: number) {
    const target = index + delta;
    const slots = page.layoutData.slots;
    if (target < 0 || target >= slots.length) return;

    const next = slots.map((slot, position) => {
      if (position === index) return { ...slot, panelId: slots[target].panelId };
      if (position === target) return { ...slot, panelId: slots[index].panelId };
      return slot;
    });

    void writeSlots(page, next, page.id + ":" + index, "Moved a panel " + (delta < 0 ? "up" : "down") + " in page " + page.pageNumber + ".");
  }

  function fillSlot(page: MangaPage, index: number, panelId: string | null) {
    const next = page.layoutData.slots.map((slot, position) => (position === index ? { ...slot, panelId } : slot));
    void writeSlots(page, next, page.id + ":" + index, panelId ? "Placed a panel in page " + page.pageNumber + "." : "Slot cleared.");
  }

  async function movePage(page: MangaPage, delta: number) {
    const index = ordered.findIndex((entry) => entry.id === page.id);
    const neighbour = ordered[index + delta];
    if (!neighbour) return;

    setBusy("page:" + page.id);
    setError(null);
    setNote(null);
    try {
      await mangaRequest<{ page: MangaPage }>("/api/manga/pages/" + encodeURIComponent(page.id), {
        method: "PATCH",
        body: { pageNumber: neighbour.pageNumber },
      });
      await mangaRequest<{ page: MangaPage }>("/api/manga/pages/" + encodeURIComponent(neighbour.id), {
        method: "PATCH",
        body: { pageNumber: page.pageNumber },
      });
      setNote("Swapped the reading order of two pages.");
      onChanged();
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusy(null);
    }
  }

  async function addVerticalPage() {
    setBusy("new");
    setError(null);
    setNote(null);
    try {
      const slots: MangaSlot[] = panelRects("webtoon").map((rect) => ({ rect, panelId: null }));
      const data = await mangaRequest<{ page: MangaPage }>(
        "/api/manga/chapters/" + encodeURIComponent(chapterId) + "/pages",
        { method: "POST", body: { template: "webtoon" as MangaTemplate, slots } },
      );
      setNote("Added vertical page " + data.page.pageNumber + ".");
      onChanged();
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusy(null);
    }
  }

  async function deletePage(page: MangaPage) {
    setBusy("delete:" + page.id);
    setError(null);
    try {
      await mangaRequest<{ ok: true }>("/api/manga/pages/" + encodeURIComponent(page.id), { method: "DELETE" });
      onChanged();
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="glass rounded-[var(--radius-card)] p-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-white/85">
          <Rows3 className="size-4 text-neon" aria-hidden />
          Vertical mode
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-white/55">
          Panels stack and the reader scrolls: there are no pages to turn, so the order below <em>is</em> the layout.
          A vertical page holds {panelRects("webtoon").length} slots and its panels are listed top to bottom, in the
          order the reader will meet them.
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" disabled={busy !== null} onClick={() => void addVerticalPage()}>
            {busy === "new" ? <Loader2 className="animate-spin" aria-hidden /> : null}
            Add a vertical page
          </Button>
          {selected ? (
            <span className="text-[11px] text-neon">Panel selected — press a slot below to place it.</span>
          ) : (
            <span className="text-[11px] text-white/40">Tap a panel in the strip to place it into an empty slot.</span>
          )}
        </div>
      </div>

      <section className="glass rounded-[var(--radius-card)] p-4" aria-labelledby="webtoon-strip">
        <h2 id="webtoon-strip" className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">
          Panels ({panels.length})
        </h2>
        <ul className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-8">
          {panels.map((panel) => (
            <li key={panel.id}>
              <button
                type="button"
                onClick={() => setSelected((current) => (current === panel.id ? null : panel.id))}
                aria-pressed={selected === panel.id}
                aria-label={"Panel " + (panel.orderIndex + 1)}
                className={cn(
                  "block w-full overflow-hidden rounded-lg ring-1 transition-all",
                  selected === panel.id ? "ring-2 ring-neon" : "ring-white/12 hover:ring-white/30",
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- a stored upload or an AI-generated file. */}
                <img src={panel.imageUrl} alt="" loading="lazy" className="aspect-[3/4] w-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      </section>

      {error ? (
        <p role="alert" className="rounded-xl bg-coral/10 px-3 py-2 text-xs leading-relaxed text-coral ring-1 ring-coral/25">
          {error}
        </p>
      ) : null}
      {note ? (
        <p role="status" className="rounded-xl bg-white/6 px-3 py-2 text-xs leading-relaxed text-white/70 ring-1 ring-white/10">
          {note}
        </p>
      ) : null}

      {ordered.length === 0 ? (
        <div className="glass rounded-[var(--radius-card)] p-6 text-center">
          <p className="text-sm text-white/60">
            This chapter has no vertical pages yet. Add one above, or create one in the composer by choosing
            &ldquo;Webtoon (vertical scroll)&rdquo; as the template.
          </p>
        </div>
      ) : (
        <ol className="space-y-4">
          {ordered.map((page, pageIndex) => (
            <li key={page.id} className="glass rounded-[var(--radius-card)] p-4">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold text-white/85">Scroll {pageIndex + 1}</h3>
                <span className="text-[11px] text-white/35">
                  page {page.pageNumber} · {bubbleCount(page.id)} bubble(s)
                </span>
                <div className="ml-auto flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Move this scroll earlier"
                    disabled={busy !== null || pageIndex === 0}
                    onClick={() => void movePage(page, -1)}
                  >
                    <ArrowUp aria-hidden />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Move this scroll later"
                    disabled={busy !== null || pageIndex === ordered.length - 1}
                    onClick={() => void movePage(page, 1)}
                  >
                    <ArrowDown aria-hidden />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Delete this scroll"
                    disabled={busy !== null}
                    onClick={() => void deletePage(page)}
                  >
                    <Trash2 aria-hidden />
                  </Button>
                </div>
              </div>

              <ol className="mt-3 space-y-2">
                {page.layoutData.slots.map((slot, index) => {
                  const panel = slot.panelId ? panelById.get(slot.panelId) : undefined;
                  const key = page.id + ":" + index;
                  return (
                    <li key={key} className="flex items-center gap-3 rounded-xl bg-white/5 p-2 ring-1 ring-white/10">
                      <span className="w-5 text-center text-[11px] tabular-nums text-white/35">{index + 1}</span>

                      <button
                        type="button"
                        onClick={() => fillSlot(page, index, selected)}
                        disabled={!selected}
                        aria-label={"Place the selected panel in slot " + (index + 1)}
                        className={cn(
                          "h-16 w-24 shrink-0 overflow-hidden rounded-lg ring-1 transition-colors",
                          panel ? "ring-white/15" : "border border-dashed border-white/25 bg-white/5",
                          selected ? "cursor-copy hover:ring-neon" : "opacity-90",
                        )}
                      >
                        {panel ? (
                          // eslint-disable-next-line @next/next/no-img-element -- a stored upload or an AI-generated file.
                          <img src={panel.imageUrl} alt="" loading="lazy" className="size-full object-cover" />
                        ) : (
                          <span className="grid size-full place-items-center text-[10px] text-white/35">empty</span>
                        )}
                      </button>

                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] text-white/45">
                          {panel ? "panel " + (panel.orderIndex + 1) : "No panel"}
                        </p>
                        {panel?.aiPrompt ? (
                          <p className="mt-0.5 line-clamp-2 text-[10px] text-white/30">{panel.aiPrompt}</p>
                        ) : null}
                      </div>

                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Move this panel up"
                          disabled={busy !== null || index === 0}
                          onClick={() => movePanel(page, index, -1)}
                        >
                          <ArrowUp aria-hidden />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Move this panel down"
                          disabled={busy !== null || index === page.layoutData.slots.length - 1}
                          onClick={() => movePanel(page, index, 1)}
                        >
                          <ArrowDown aria-hidden />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Clear this slot"
                          disabled={busy !== null || !panel}
                          onClick={() => fillSlot(page, index, null)}
                        >
                          <Trash2 aria-hidden />
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
