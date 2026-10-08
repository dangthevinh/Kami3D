import type { Metadata } from "next";

import { ProjectWorkspace } from "@/components/manga-studio/ProjectWorkspace";
import { StudioHeader } from "@/components/manga-studio/StudioHeader";

/**
 * `/manga-studio/[projectId]` — one project: metadata, cover, publish state, chapters.
 *
 * The chapter list, the publish switch and the delete button all live in the client workspace, because
 * every one of them writes. The route itself is a shell with a title, so navigating between a project
 * and its chapters never waits on a database read.
 */

export async function generateMetadata({ params }: { params: Promise<{ projectId: string }> }): Promise<Metadata> {
  const { projectId } = await params;
  return {
    title: "Project — chapters, script and publish",
    description:
      "A Manga Studio project: its cover and metadata, its chapters and their scripts, and the switch that publishes it to the public gallery.",
    alternates: { canonical: "/manga-studio/" + projectId },
    robots: { index: false, follow: true },
  };
}

export default async function ProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;

  return (
    <>
      <StudioHeader
        current="studio"
        title="Project"
        subtitle="Publish when the chapters are ready. Until then this project is a draft that only this account can read."
      />
      <div className="section-shell py-8">
        <ProjectWorkspace projectId={projectId} />
      </div>
    </>
  );
}
