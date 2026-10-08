"use client";

import { BookOpen, FileText, ImagePlus, LayoutGrid, RefreshCw, Rows3, Save } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { AIGenerator } from "@/components/manga-studio/AIGenerator";
import { PageComposer } from "@/components/manga-studio/PageComposer";
import { PanelUploader } from "@/components/manga-studio/PanelUploader";
import { WebtoonEditor } from "@/components/manga-studio/WebtoonEditor";
import { errorText, mangaRequest } from "@/components/manga-studio/api";
import { useMangaQuery } from "@/components/manga-studio/hooks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { MangaBubble, MangaChapter, MangaPage, MangaPanel } from "@/lib/manga/types";
import { cn } from "@/lib/utils";

/**
 * The chapter workspace: script, panels, pages.
 *
 * One fetch of `GET /api/manga/chapters/[chapterId]` gives the chapter, its panels, its pages and its
 * bubbles, and every write in this tree finishes by re-reading that one resource (`reload()`). It is
 * one request more than a surgical local patch would be, and it is the reason the strip, the composer
 * and the vertical editor can never show three different ideas of what the chapter contains.
 *
 * Uploads and generations are appended optimistically *and* by id-deduplicated merge, so a panel
 * appears the instant it lands without ever appearing twice when the reload arrives.
 */

interface ChapterPayload {
  chapter: MangaChapter;
  panels: MangaPanel[];
  pages: MangaPage[];
  bubbles: MangaBubble[];
}

type Tab = "panels" | "compose" | "webtoon";

export function ChapterWorkspace({ chapterId, projectId }: { chapterId: string; projectId: string }) {
  const query = useMangaQuery<ChapterPayload>("/api/manga/chapters/" + encodeURIComponent(chapterId));
  const [tab, setTab] = React.useState<Tab>("compose");
  /** Once the author picks a tab, the default below stops moving it. */
  const choseTab = React.useRef(false);
  const [extra, setExtra] = React.useState<MangaPanel[]>([]);
  const [script, setScript] = React.useState("");
  const [scriptState, setScriptState] = React.useState<{ busy: boolean; saved: boolean; error: string | null }>({
    busy: false,
    saved: false,
    error: null,
  });

  const chapter = query.data?.chapter ?? null;

  React.useEffect(() => {
    if (!chapter) return;
    setScript(chapter.script ?? "");
  }, [chapter]);

  // A chapter that already has vertical pages is a webtoon chapter: open on the editor that owns its
  // order rather than on the page composer, whose templates are all horizontal.
  React.useEffect(() => {
    if (choseTab.current || !query.data) return;
    if (query.data.pages.some((page) => page.layoutData.template === "webtoon")) setTab("webtoon");
  }, [query.data]);

  const panels = React.useMemo(() => {
    const base = query.data?.panels ?? [];
    const ids = new Set(base.map((panel) => panel.id));
    return [...base, ...extra.filter((panel) => !ids.has(panel.id))];
  }, [query.data, extra]);

  function accept(panel: MangaPanel) {
    setExtra((current) => (current.some((entry) => entry.id === panel.id) ? current : [...current, panel]));
    // The server's copy is the truth: this only makes the strip instant.
    query.reload();
  }

  async function saveScript() {
    setScriptState({ busy: true, saved: false, error: null });
    try {
      await mangaRequest<{ chapter: MangaChapter }>("/api/manga/chapters/" + encodeURIComponent(chapterId), {
        method: "PATCH",
        body: { script },
      });
      setScriptState({ busy: false, saved: true, error: null });
      query.reload();
    } catch (caught) {
      setScriptState({ busy: false, saved: false, error: errorText(caught) });
    }
  }

  if (query.status === "loading") {
    return (
      <div className="space-y-4" aria-busy="true">
        <span className="sr-only">Loading this chapter</span>
        <Skeleton className="h-24 rounded-[var(--radius-card)]" />
        <Skeleton className="h-96 rounded-[var(--radius-card)]" />
      </div>
    );
  }

  if (query.status === "error" || !chapter) {
    return (
      <div className="glass rounded-[var(--radius-card)] p-6">
        <h2 className="font-display text-lg font-semibold text-white">This chapter could not be read</h2>
        <p className="mt-2 text-sm leading-relaxed text-white/60">{query.error}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button variant="secondary" size="sm" onClick={query.reload}>
            <RefreshCw aria-hidden />
            Try again
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href={"/manga-studio/" + encodeURIComponent(projectId)}>Back to the project</Link>
          </Button>
        </div>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: typeof BookOpen; hint: string }[] = [
    { id: "panels", label: "Panels", icon: ImagePlus, hint: "Upload images or generate them" },
    { id: "compose", label: "Compose a page", icon: LayoutGrid, hint: "Templates, slots and bubbles" },
    { id: "webtoon", label: "Vertical", icon: Rows3, hint: "The webtoon order" },
  ];

  return (
    <div className="space-y-5">
      <div className="glass rounded-[var(--radius-card)] p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="default">Chapter {chapter.chapterNumber}</Badge>
          <Badge variant={chapter.status === "published" ? "neon" : "solar"}>{chapter.status}</Badge>
          <Badge variant="outline">{chapter.panelCount} panels</Badge>
          <Badge variant="outline">{chapter.pageCount} pages</Badge>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button asChild variant="secondary" size="sm">
              <Link href={"/manga-studio/reader/" + encodeURIComponent(projectId) + "?chapter=" + encodeURIComponent(chapterId)}>
                Preview in the reader
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href={"/manga-studio/" + encodeURIComponent(projectId)}>Project</Link>
            </Button>
          </div>
        </div>
        <h2 className="mt-3 font-display text-xl font-semibold tracking-tight text-white">{chapter.title}</h2>
      </div>

      <section className="glass rounded-[var(--radius-card)] p-5" aria-labelledby="chapter-script">
        <h2 id="chapter-script" className="flex items-center gap-2 text-sm font-semibold text-white/85">
          <FileText className="size-4 text-neon" aria-hidden />
          Script
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-white/50">
          The script is the chapter's text - beats, dialogue, notes. It is stored with the chapter and shown to nobody
          but the author.
        </p>
        <label className="mt-3 block">
          <span className="sr-only">Chapter script</span>
          <textarea
            value={script}
            onChange={(event) => {
              setScript(event.target.value);
              setScriptState((state) => ({ ...state, saved: false }));
            }}
            rows={6}
            maxLength={20000}
            placeholder="Scene 1 — rooftop, rain. She has not slept."
            className="w-full rounded-xl bg-white/6 px-3.5 py-2.5 text-sm leading-relaxed text-white placeholder:text-white/40 ring-1 ring-white/12 outline-none transition focus:bg-white/10 focus:ring-2 focus:ring-neon/60"
          />
        </label>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button type="button" size="sm" disabled={scriptState.busy} onClick={() => void saveScript()}>
            <Save aria-hidden />
            {scriptState.busy ? "Saving…" : "Save script"}
          </Button>
          {scriptState.saved ? <span className="text-xs text-neon">Saved.</span> : null}
        </div>
        {scriptState.error ? (
          <p role="alert" className="mt-3 rounded-xl bg-coral/10 px-3 py-2 text-xs text-coral ring-1 ring-coral/25">
            {scriptState.error}
          </p>
        ) : null}
      </section>

      <div role="tablist" aria-label="Chapter tools" className="flex flex-wrap gap-2">
        {tabs.map((entry) => (
          <button
            key={entry.id}
            type="button"
            role="tab"
            aria-selected={tab === entry.id}
            aria-controls={"chapter-tab-" + entry.id}
            onClick={() => {
              choseTab.current = true;
              setTab(entry.id);
            }}
            className={cn(
              "tap-target flex items-center gap-2 rounded-full px-4 py-2 text-xs transition-colors",
              tab === entry.id ? "bg-neon/12 text-neon ring-1 ring-neon/30" : "text-white/60 ring-1 ring-white/10 hover:bg-white/8 hover:text-white",
            )}
          >
            <entry.icon className="size-3.5" aria-hidden />
            {entry.label}
          </button>
        ))}
      </div>

      <div id={"chapter-tab-" + tab} role="tabpanel">
        {tab === "panels" ? (
          <div className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <PanelUploader chapterId={chapterId} onUploaded={accept} />
              <AIGenerator chapterId={chapterId} onGenerated={accept} />
            </div>

            <section className="glass rounded-[var(--radius-card)] p-5" aria-labelledby="chapter-panels">
              <h2 id="chapter-panels" className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">
                Panels ({panels.length})
              </h2>
              {panels.length === 0 ? (
                <p className="mt-3 text-xs text-white/45">Nothing here yet. Upload a file, or configure an AI provider and generate one.</p>
              ) : (
                <ul className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                  {panels.map((panel) => (
                    <li key={panel.id} className="overflow-hidden rounded-xl bg-white/5 ring-1 ring-white/10">
                      {/* eslint-disable-next-line @next/next/no-img-element -- a stored upload or an AI-generated file. */}
                      <img src={panel.imageUrl} alt={"Panel " + (panel.orderIndex + 1)} loading="lazy" className="aspect-square w-full object-cover" />
                      <p className="px-2 py-1.5 text-[10px] text-white/40">
                        #{panel.orderIndex + 1}
                        {panel.aiProvider ? " · " + panel.aiProvider : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        ) : null}

        {tab === "compose" ? (
          <PageComposer
            chapterId={chapterId}
            panels={panels}
            pages={query.data?.pages ?? []}
            bubbles={query.data?.bubbles ?? []}
            onChanged={query.reload}
          />
        ) : null}

        {tab === "webtoon" ? (
          <WebtoonEditor
            chapterId={chapterId}
            panels={panels}
            pages={query.data?.pages ?? []}
            bubbles={query.data?.bubbles ?? []}
            onChanged={query.reload}
          />
        ) : null}
      </div>
    </div>
  );
}
