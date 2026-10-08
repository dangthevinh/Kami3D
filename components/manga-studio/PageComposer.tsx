"use client";

import { ArrowRight, Loader2, MousePointerClick, Plus, Save, Trash2 } from "lucide-react";
import * as React from "react";

import { errorText, mangaRequest } from "@/components/manga-studio/api";
import { BUBBLE_LABELS, BubbleFace, BubbleShape } from "@/components/manga-studio/BubbleShape";
import { bubbleRectAt, normalisePoint, panelIndexForDrop, rectStyle } from "@/components/manga-studio/drop";
import { Button } from "@/components/ui/button";
import {
  BUBBLE_TYPES,
  MANGA_TEMPLATES,
  panelAt,
  panelRects,
  type BubbleType,
  type MangaTemplate,
  type PanelRect,
} from "@/lib/manga-layout";
import type { MangaBubble, MangaPage, MangaPanel, MangaSlot } from "@/lib/manga/types";
import { cn } from "@/lib/utils";

/**
 * The page composer.
 *
 * ## What it does
 *
 * Pick one of the tested templates from `lib/manga-layout.ts`, drop panels from the chapter's strip
 * into its slots, and drop speech / thought / narration / scream bubbles onto a panel. Nothing in this
 * file computes a rectangle: the template's slots come from `panelRects`, the hit test from
 * `panelAt`, the clamp from `clampBubble` (through `drop.ts`), and `npm run check:manga` is what
 * proves those two do not overlap or escape. A second geometry routine here would be a second answer
 * to the same question.
 *
 * ## A bubble dropped in a gutter
 *
 * `panelAt` returns nothing for a point between panels, and that is the common case when a drag ends
 * slightly off. Rather than refusing the drop, `panelIndexForDrop` widens a probe until it touches a
 * panel and the bubble is clamped into it - and the composer **says so**, because silently moving
 * someone's bubble is how a layout gets blamed for a bug that is not there.
 *
 * ## Desktop-first, and it says so
 *
 * Dragging is a pointer gesture. On a phone the same two steps are available as taps (tap a panel,
 * then tap a slot) and the toolbar says that in as many words, instead of leaving a visitor to guess
 * why nothing can be dragged.
 *
 * ## What is not here
 *
 * Bubbles have no tails, and slots cannot be resized: the layout maths describes panels and clamped
 * bubbles, not free-form shapes. Panels are placed by dropping them; a panel that does not fit the
 * chosen template is simply not placed, rather than cropped by a rule nobody can see.
 */

interface DraftBubble {
  /** Client-only key: a draft has no id until the page is saved. */
  key: string;
  panelIndex: number;
  bubbleType: BubbleType;
  content: string;
  rect: PanelRect;
}

export interface PageComposerProps {
  chapterId: string;
  panels: MangaPanel[];
  pages: MangaPage[];
  bubbles: MangaBubble[];
  /** Ask the workspace to re-read the chapter after a write. */
  onChanged: () => void;
  className?: string;
}

const field =
  "w-full rounded-xl bg-white/6 px-3 py-2 text-xs text-white placeholder:text-white/40 ring-1 ring-white/12 outline-none transition focus:bg-white/10 focus:ring-2 focus:ring-neon/60";

export function PageComposer({ chapterId, panels, pages, bubbles, onChanged, className }: PageComposerProps) {
  const [template, setTemplate] = React.useState<MangaTemplate>(pages[0]?.layoutData.template ?? "classic-4");
  const [slots, setSlots] = React.useState<(string | null)[]>(() => panelRects(pages[0]?.layoutData.template ?? "classic-4").map(() => null));
  const [editingPageId, setEditingPageId] = React.useState<string | null>(null);
  const [drafts, setDrafts] = React.useState<DraftBubble[]>([]);
  const [selectedPanel, setSelectedPanel] = React.useState<string | null>(null);
  const [dragging, setDragging] = React.useState<string | null>(null);
  const [note, setNote] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const pageRef = React.useRef<HTMLDivElement>(null);

  const rects = React.useMemo(() => panelRects(template), [template]);
  const spec = MANGA_TEMPLATES.find((entry) => entry.id === template) ?? MANGA_TEMPLATES[0];
  const panelById = React.useMemo(() => new Map(panels.map((panel) => [panel.id, panel])), [panels]);
  const pageBubbles = React.useMemo(
    () => (editingPageId ? bubbles.filter((bubble) => bubble.pageId === editingPageId) : []),
    [bubbles, editingPageId],
  );

  /** Keep the assignments that still have a slot when the template changes. */
  function chooseTemplate(next: MangaTemplate) {
    const nextRects = panelRects(next);
    setTemplate(next);
    setSlots((current) => nextRects.map((_, index) => current[index] ?? null));
    setEditingPageId(null);
    setDrafts([]);
    setNote(null);
    setError(null);
  }

  function startNewPage() {
    setSlots(rects.map(() => null));
    setEditingPageId(null);
    setDrafts([]);
    setNote("New page. Drop panels into the slots, then save.");
    setError(null);
  }

  function loadPage(page: MangaPage) {
    const pageTemplate = page.layoutData.template;
    const pageRects = panelRects(pageTemplate);
    setTemplate(pageTemplate);
    setSlots(pageRects.map((_, index) => page.layoutData.slots[index]?.panelId ?? null));
    setEditingPageId(page.id);
    setDrafts([]);
    setNote("Editing page " + page.pageNumber + ".");
    setError(null);
  }

  function placePanel(panelId: string, slotIndex: number) {
    setSlots((current) => current.map((value, index) => (index === slotIndex ? panelId : value)));
    setNote(null);
  }

  function addDraft(panelIndex: number, bubbleType: BubbleType, rect: PanelRect, content = "") {
    setDrafts((current) => [
      ...current,
      { key: "draft-" + Date.now() + "-" + current.length, panelIndex, bubbleType, content, rect },
    ]);
  }

  /** A drop anywhere on the page: which panel, and where inside it. */
  function dropOnPage(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(null);

    const kind = event.dataTransfer.getData("text/manga-bubble");
    if (!kind) return;

    const bubbleType = (BUBBLE_TYPES as string[]).includes(kind) ? (kind as BubbleType) : "speech";
    const element = pageRef.current;
    if (!element) return;

    const point = normalisePoint(element, event.clientX, event.clientY);
    const index = panelIndexForDrop(rects, point.x, point.y);
    if (index === null) {
      setNote("That drop missed every panel on this template — drop it on a panel.");
      return;
    }

    const inside = panelAt(rects, point.x, point.y);
    addDraft(index, bubbleType, bubbleRectAt(rects[index], point.x, point.y));
    setNote(
      inside === null
        ? "Dropped in the gutter: the bubble was pulled back inside panel " + (index + 1) + " so it cannot cross the art."
        : null,
    );
  }

  /** A drop on a slot: panels are placed, bubbles land at the top of that panel. */
  function dropOnSlot(event: React.DragEvent<HTMLDivElement>, slotIndex: number) {
    event.preventDefault();
    event.stopPropagation();
    setDragging(null);

    const panelId = event.dataTransfer.getData("text/manga-panel");
    if (panelId) {
      placePanel(panelId, slotIndex);
      return;
    }

    const kind = event.dataTransfer.getData("text/manga-bubble");
    if (!kind) return;
    const bubbleType = (BUBBLE_TYPES as string[]).includes(kind) ? (kind as BubbleType) : "speech";
    const rect = rects[slotIndex];
    const target: PanelRect = { x: rect.x + rect.w / 2, y: rect.y + rect.h * 0.22, w: 0, h: 0 };
    addDraft(slotIndex, bubbleType, bubbleRectAt(rects[slotIndex], target.x, target.y));
    setNote(null);
  }

  async function save() {
    if (busy) return;
    setBusy(true);
    setError(null);
    setNote(null);

    const payload: MangaSlot[] = rects.map((rect, index) => ({ rect, panelId: slots[index] ?? null }));

    try {
      const saved = editingPageId
        ? await mangaRequest<{ page: MangaPage }>("/api/manga/pages/" + encodeURIComponent(editingPageId), {
            method: "PATCH",
            body: { template, slots: payload },
          })
        : await mangaRequest<{ page: MangaPage }>("/api/manga/chapters/" + encodeURIComponent(chapterId) + "/pages", {
            method: "POST",
            body: { template, slots: payload },
          });

      const pageId = saved.page.id;
      let placed = 0;
      for (const draft of drafts) {
        await mangaRequest<{ bubble: MangaBubble }>("/api/manga/pages/" + encodeURIComponent(pageId) + "/bubbles", {
          method: "POST",
          body: {
            panelId: slots[draft.panelIndex] ?? null,
            content: draft.content,
            bubbleType: draft.bubbleType,
            position: draft.rect,
          },
        });
        placed += 1;
      }

      const filled = payload.filter((slot) => slot.panelId).length;
      setEditingPageId(pageId);
      setDrafts([]);
      setNote("Saved page " + saved.page.pageNumber + ": " + filled + " panel(s), " + placed + " new bubble(s).");
      onChanged();
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusy(false);
    }
  }

  async function editBubble(bubble: MangaBubble, patch: { content?: string; bubbleType?: BubbleType }) {
    setError(null);
    try {
      await mangaRequest<{ bubble: MangaBubble }>("/api/manga/bubbles/" + encodeURIComponent(bubble.id), {
        method: "PATCH",
        body: patch,
      });
      onChanged();
    } catch (caught) {
      setError(errorText(caught));
    }
  }

  async function deleteBubble(bubble: MangaBubble) {
    setError(null);
    try {
      await mangaRequest<{ ok: true }>("/api/manga/bubbles/" + encodeURIComponent(bubble.id), { method: "DELETE" });
      onChanged();
    } catch (caught) {
      setError(errorText(caught));
    }
  }

  async function deletePage(page: MangaPage) {
    setError(null);
    try {
      await mangaRequest<{ ok: true }>("/api/manga/pages/" + encodeURIComponent(page.id), { method: "DELETE" });
      if (editingPageId === page.id) startNewPage();
      onChanged();
    } catch (caught) {
      setError(errorText(caught));
    }
  }

  async function deletePanel(panel: MangaPanel) {
    setError(null);
    try {
      await mangaRequest<{ ok: true }>("/api/manga/panels/" + encodeURIComponent(panel.id), { method: "DELETE" });
      onChanged();
    } catch (caught) {
      setError(errorText(caught));
    }
  }

  return (
    <div className={cn("space-y-4", className)}>
      <p className="glass rounded-2xl px-4 py-3 text-xs leading-relaxed text-white/55 lg:hidden">
        <MousePointerClick className="mr-1.5 inline size-3.5 text-neon" aria-hidden />
        The composer is built for a wide screen and a pointer: dragging needs a mouse. On a phone the same two steps
        work as taps — tap a panel in the strip, then tap a slot — and the buttons below do everything dragging does.
      </p>

      <div className="grid gap-4 lg:grid-cols-[21rem_minmax(0,1fr)]">
        <div className="space-y-4">
          <section className="glass rounded-[var(--radius-card)] p-4" aria-labelledby="composer-template">
            <h2 id="composer-template" className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">
              Template
            </h2>
            <ul className="mt-3 space-y-1.5">
              {MANGA_TEMPLATES.map((entry) => (
                <li key={entry.id}>
                  <button
                    type="button"
                    onClick={() => chooseTemplate(entry.id)}
                    aria-pressed={entry.id === template}
                    className={cn(
                      "tap-target flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-xs transition-colors",
                      entry.id === template ? "bg-neon/12 text-neon ring-1 ring-neon/30" : "text-white/65 hover:bg-white/8 hover:text-white",
                    )}
                  >
                    <span>{entry.label}</span>
                    <span className="shrink-0 text-[10px] tabular-nums text-white/35">{entry.panels.length}p</span>
                  </button>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[11px] leading-relaxed text-white/35">
              Slots are read right to left, top to bottom — the order a Japanese page is read in. The template's
              geometry comes from the tested layout module, so switching one cannot produce an overlapping page.
            </p>
          </section>

          <section className="glass rounded-[var(--radius-card)] p-4" aria-labelledby="composer-panels">
            <h2 id="composer-panels" className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">
              Panel strip
            </h2>
            <p className="mt-1 text-[11px] text-white/35">
              {panels.length === 0
                ? "No panels yet — upload or generate one first."
                : "Drag one into a slot, or tap to select and then tap a slot."}
            </p>

            <ul className="mt-3 grid grid-cols-4 gap-2 lg:grid-cols-3">
              {panels.map((panel) => (
                <li key={panel.id} className="relative">
                  <button
                    type="button"
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData("text/manga-panel", panel.id);
                      event.dataTransfer.effectAllowed = "copy";
                      setDragging(panel.id);
                    }}
                    onDragEnd={() => setDragging(null)}
                    onClick={() => setSelectedPanel((current) => (current === panel.id ? null : panel.id))}
                    aria-pressed={selectedPanel === panel.id}
                    aria-label={"Panel " + (panel.orderIndex + 1)}
                    className={cn(
                      "block w-full overflow-hidden rounded-lg ring-1 transition-all",
                      selectedPanel === panel.id ? "ring-2 ring-neon" : "ring-white/12 hover:ring-white/30",
                      dragging === panel.id ? "opacity-50" : "",
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- a stored upload or an AI-generated file. */}
                    <img src={panel.imageUrl} alt="" loading="lazy" className="aspect-square w-full object-cover" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void deletePanel(panel)}
                    aria-label="Delete this panel"
                    className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-void/80 text-white/60 ring-1 ring-white/15 transition-colors hover:text-coral max-sm:size-11"
                  >
                    <Trash2 className="size-3" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className="glass rounded-[var(--radius-card)] p-4" aria-labelledby="composer-bubbles">
            <h2 id="composer-bubbles" className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">
              Bubbles
            </h2>
            <p className="mt-1 text-[11px] text-white/35">Drag one onto a panel, or tap a slot to place it there.</p>
            <ul className="mt-3 grid grid-cols-2 gap-2">
              {BUBBLE_TYPES.map((type) => (
                <li key={type}>
                  <button
                    type="button"
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData("text/manga-bubble", type);
                      event.dataTransfer.effectAllowed = "copy";
                      setDragging(type);
                    }}
                    onDragEnd={() => setDragging(null)}
                    onClick={() => {
                      // The first slot that already holds a panel: a bubble belongs on art, not on an empty
                      // rectangle, and the first slot is the honest default when nothing is placed yet.
                      const firstFilled = rects.findIndex((_, index) => slots[index] !== null);
                      const target = firstFilled >= 0 ? firstFilled : 0;
                      addDraft(target, type, bubbleRectAt(rects[target], rects[target].x + rects[target].w / 2, rects[target].y + rects[target].h * 0.22));
                      setNote(null);
                    }}
                    className="tap-target flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs text-white/70 ring-1 ring-white/10 transition-colors hover:bg-white/8 hover:text-white"
                  >
                    <BubbleFace bubbleType={type} className="size-4 shrink-0" />
                    {BUBBLE_LABELS[type]}
                  </button>
                </li>
              ))}
            </ul>
          </section>

          {pages.length > 0 ? (
            <section className="glass rounded-[var(--radius-card)] p-4" aria-labelledby="composer-pages">
              <h2 id="composer-pages" className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">
                Pages in this chapter
              </h2>
              <ul className="mt-3 space-y-2">
                {pages.map((page) => (
                  <li key={page.id} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => loadPage(page)}
                      aria-pressed={editingPageId === page.id}
                      className={cn(
                        "tap-target flex-1 rounded-lg px-3 py-2 text-left text-xs transition-colors",
                        editingPageId === page.id ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/8 hover:text-white",
                      )}
                    >
                      Page {page.pageNumber}
                      <span className="ml-2 text-[10px] text-white/35">
                        {page.layoutData.template} · {page.layoutData.slots.filter((slot) => slot.panelId).length} panel(s)
                      </span>
                    </button>
                    <Button type="button" variant="ghost" size="icon" aria-label={"Delete page " + page.pageNumber} onClick={() => void deletePage(page)}>
                      <Trash2 aria-hidden />
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" size="sm" onClick={() => void save()} disabled={busy}>
              {busy ? <Loader2 className="animate-spin" aria-hidden /> : <Save aria-hidden />}
              {busy ? "Saving…" : editingPageId ? "Save page" : "Create page"}
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={startNewPage}>
              <Plus aria-hidden />
              New page
            </Button>
            {selectedPanel ? (
              <span className="text-[11px] text-neon">
                Panel selected — tap a slot to place it, or tap the panel again to cancel.
              </span>
            ) : null}
          </div>

          <div className="glass rounded-[var(--radius-card)] p-3">
            <div
              ref={pageRef}
              onDragOver={(event) => event.preventDefault()}
              onDrop={dropOnPage}
              className="@container relative w-full overflow-hidden rounded-lg bg-white/8 ring-1 ring-white/12"
              style={{ aspectRatio: String(spec.aspect) }}
            >
              {rects.map((rect, index) => {
                const panelId = slots[index];
                const panel = panelId ? panelById.get(panelId) : undefined;
                return (
                  <div
                    key={index}
                    role="button"
                    tabIndex={0}
                    aria-label={"Slot " + (index + 1) + (panel ? ", filled" : ", empty")}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => dropOnSlot(event, index)}
                    onClick={() => {
                      if (selectedPanel) {
                        placePanel(selectedPanel, index);
                        setSelectedPanel(null);
                      }
                    }}
                    onKeyDown={(event) => {
                      if ((event.key === "Enter" || event.key === " ") && selectedPanel) {
                        event.preventDefault();
                        placePanel(selectedPanel, index);
                        setSelectedPanel(null);
                      }
                    }}
                    style={rectStyle(rect)}
                    className={cn(
                      "absolute overflow-hidden rounded-md ring-1 transition-colors",
                      panel ? "bg-void/40 ring-white/15" : "border border-dashed border-white/25 bg-white/5 ring-0",
                      selectedPanel ? "cursor-copy" : "",
                    )}
                  >
                    {panel ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element -- a stored upload or an AI-generated file. */}
                        <img src={panel.imageUrl} alt="" className="size-full object-cover" loading="lazy" />
                        <span className="absolute left-1 top-1 rounded bg-void/70 px-1.5 text-[10px] text-white/70">
                          {index + 1}
                        </span>
                      </>
                    ) : (
                      <span className="grid size-full place-items-center text-[11px] text-white/40">
                        {index + 1}
                      </span>
                    )}
                  </div>
                );
              })}

              {pageBubbles.map((bubble) => (
                <div key={bubble.id} style={rectStyle(bubble.position)} className="absolute">
                  <BubbleShape bubbleType={bubble.bubbleType} className="text-[clamp(9px,1.6cqw,14px)]">
                    {bubble.content}
                  </BubbleShape>
                </div>
              ))}

              {drafts.map((draft) => (
                <div key={draft.key} style={rectStyle(draft.rect)} className="absolute ring-2 ring-solar/70">
                  <BubbleShape bubbleType={draft.bubbleType} className="text-[clamp(9px,1.6cqw,14px)]">
                    {draft.content}
                  </BubbleShape>
                </div>
              ))}
            </div>

            <p className="mt-2 text-[11px] leading-relaxed text-white/35">
              {spec.label} · {spec.panels.length} slot(s) · ratios are fractions of the page, so the same layout renders
              at any width.
            </p>
          </div>

          {note ? (
            <p role="status" className="rounded-xl bg-white/6 px-3 py-2 text-xs leading-relaxed text-white/70 ring-1 ring-white/10">
              {note}
            </p>
          ) : null}

          {error ? (
            <p role="alert" className="rounded-xl bg-coral/10 px-3 py-2 text-xs leading-relaxed text-coral ring-1 ring-coral/25">
              {error}
            </p>
          ) : null}

          {drafts.length > 0 ? (
            <section className="glass rounded-[var(--radius-card)] p-4" aria-labelledby="composer-drafts">
              <h2 id="composer-drafts" className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">
                Bubbles waiting to be saved ({drafts.length})
              </h2>
              <ul className="mt-3 space-y-3">
                {drafts.map((draft) => (
                  <li key={draft.key} className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-white/50">
                      <span>Panel {draft.panelIndex + 1}</span>
                      <span className="text-white/25">·</span>
                      <span>{BUBBLE_LABELS[draft.bubbleType]}</span>
                      <button
                        type="button"
                        onClick={() => setDrafts((current) => current.filter((entry) => entry.key !== draft.key))}
                        className="ml-auto text-white/45 transition-colors hover:text-coral"
                      >
                        Remove
                      </button>
                    </div>
                    <label className="mt-2 block">
                      <span className="sr-only">Bubble text</span>
                      <textarea
                        value={draft.content}
                        onChange={(event) =>
                          setDrafts((current) =>
                            current.map((entry) => (entry.key === draft.key ? { ...entry, content: event.target.value } : entry)),
                          )
                        }
                        rows={2}
                        maxLength={280}
                        placeholder="What it says…"
                        className={field}
                      />
                    </label>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {BUBBLE_TYPES.map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() =>
                            setDrafts((current) =>
                              current.map((entry) => (entry.key === draft.key ? { ...entry, bubbleType: type } : entry)),
                            )
                          }
                          aria-pressed={draft.bubbleType === type}
                          className={cn(
                            "rounded-full px-2.5 py-1 text-[11px] ring-1 transition-colors",
                            draft.bubbleType === type ? "bg-neon/12 text-neon ring-neon/30" : "text-white/60 ring-white/12 hover:text-white",
                          )}
                        >
                          {BUBBLE_LABELS[type]}
                        </button>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-3 flex items-center gap-1.5 text-[11px] text-white/40">
                <ArrowRight className="size-3" aria-hidden />
                Bubbles are written when you save the page.
              </p>
            </section>
          ) : null}

          {editingPageId && pageBubbles.length > 0 ? (
            <section className="glass rounded-[var(--radius-card)] p-4" aria-labelledby="composer-saved-bubbles">
              <h2 id="composer-saved-bubbles" className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">
                Bubbles on this page ({pageBubbles.length})
              </h2>
              <ul className="mt-3 space-y-3">
                {pageBubbles.map((bubble) => (
                  <li key={bubble.id} className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
                    <div className="flex items-center gap-2 text-[11px] text-white/45">
                      <span>{BUBBLE_LABELS[bubble.bubbleType]}</span>
                      <span className="text-white/25">·</span>
                      <span>panel {bubble.panelId ? (slots.indexOf(bubble.panelId) + 1 || "—") : "unassigned"}</span>
                      <button
                        type="button"
                        onClick={() => void deleteBubble(bubble)}
                        className="ml-auto text-white/45 transition-colors hover:text-coral"
                      >
                        Delete
                      </button>
                    </div>
                    <label className="mt-2 block">
                      <span className="sr-only">Bubble text</span>
                      <textarea
                        defaultValue={bubble.content}
                        rows={2}
                        maxLength={280}
                        onBlur={(event) => {
                          const content = event.target.value;
                          if (content !== bubble.content) void editBubble(bubble, { content });
                        }}
                        className={field}
                      />
                    </label>
                    <p className="mt-1 text-[10px] text-white/30">Saved when the field loses focus.</p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
