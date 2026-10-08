import type { Metadata } from "next";

import { ReaderWorkspace } from "@/components/manga-studio/ReaderWorkspace";
import { UnlockGate } from "@/components/unlock/UnlockGate";
import { contentIdFor } from "@/lib/unlock";

/**
 * `/manga-studio/reader/[projectId]?chapter=` — the public reader.
 *
 * The title here is generic on purpose: the project's own title lives behind the API, and inventing one
 * from an id in metadata would publish a wrong name to search engines. The page's heading, once the
 * data arrives, is the real title, and `alternates.canonical` keeps the chapter-less URL as the
 * canonical form of a chapter link.
 */

export async function generateMetadata({ params }: { params: Promise<{ projectId: string }> }): Promise<Metadata> {
  const { projectId } = await params;
  return {
    title: "Read — manga and webtoon reader",
    description:
      "A phone-first reader for Manga Studio: page-by-page for manga, one continuous vertical scroll for a webtoon.",
    alternates: { canonical: "/manga-studio/reader/" + projectId },
    openGraph: {
      type: "article",
      title: "Read on Kami3D",
      description: "Page-by-page manga and vertical webtoons, published in Kami3D's Manga Studio.",
    },
  };
}

export default async function MangaReaderPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ chapter?: string | string[] }>;
}) {
  const { projectId } = await params;
  const query = await searchParams;
  const chapter = Array.isArray(query.chapter) ? query.chapter[0] : query.chapter;

  // Phase 33: an admin can lock one chapter. The key names the chapter the URL asks for, so a locked
  // chapter is gated when it is opened by link; the chapter picker inside the workspace is the studio's
  // own surface (a module that is built but not launched), and locking from inside it is a later change
  // rather than something this page can decide.
  const contentId = contentIdFor("chapter", chapter ?? projectId);

  return (
    <div className="section-shell py-6 sm:py-8">
      <UnlockGate contentId={contentId}>
        <ReaderWorkspace projectId={projectId} initialChapterId={chapter ?? null} />
      </UnlockGate>
    </div>
  );
}
