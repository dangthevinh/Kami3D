import type { Metadata } from "next";

import { ChapterWorkspace } from "@/components/manga-studio/ChapterWorkspace";
import { StudioHeader } from "@/components/manga-studio/StudioHeader";

/**
 * `/manga-studio/[projectId]/chapters/[chapterId]` — the chapter editor.
 *
 * Script, panels (uploaded or generated), the page composer and the vertical webtoon editor, in one
 * client workspace that reads the chapter once and re-reads it after every write. Both ids come from
 * the URL, so the route stays a static shell and the data arrives from the API.
 */

export async function generateMetadata({ params }: { params: Promise<{ chapterId: string }> }): Promise<Metadata> {
  const { chapterId } = await params;
  return {
    title: "Chapter editor — panels, pages and bubbles",
    description:
      "Write the script, upload or generate panels, compose the pages from tested templates, place speech, thought, narration and scream bubbles, and order a vertical webtoon.",
    alternates: { canonical: "/manga-studio/chapters/" + chapterId },
    robots: { index: false, follow: true },
  };
}

export default async function ChapterPage({ params }: { params: Promise<{ projectId: string; chapterId: string }> }) {
  const { projectId, chapterId } = await params;

  return (
    <>
      <StudioHeader
        current="studio"
        title="Chapter editor"
        subtitle="The composer is desktop-first — it is drag and drop, and it says so on a phone. The reader it produces is built for a phone."
      />
      <div className="section-shell py-8">
        <ChapterWorkspace chapterId={chapterId} projectId={projectId} />
      </div>
    </>
  );
}
