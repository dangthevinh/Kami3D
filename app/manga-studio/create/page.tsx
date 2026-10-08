import type { Metadata } from "next";

import { ProjectForm } from "@/components/manga-studio/ProjectForm";
import { StudioHeader } from "@/components/manga-studio/StudioHeader";

/**
 * `/manga-studio/create`.
 *
 * The form is a client component; this route is a header and a heading. The four fields it posts are
 * the four the API accepts for a new project — the cover is written afterwards on the project page,
 * and the form says so rather than showing a field that would be ignored.
 */

export const metadata: Metadata = {
  title: "New manga or webtoon project",
  description:
    "Start a Manga Studio project: a title, a description, genres, an age rating, and whether it is a manga read page by page or a vertical webtoon.",
  alternates: { canonical: "/manga-studio/create" },
  robots: { index: false, follow: true },
};

export default function CreateProjectPage() {
  return (
    <>
      <StudioHeader
        current="create"
        title="New project"
        subtitle="Pick the format now: a webtoon is read as one continuous vertical scroll and a manga is read page by page. The format decides which editor a chapter opens with."
      />
      <div className="section-shell py-8">
        <div className="max-w-3xl">
          <ProjectForm />
        </div>
      </div>
    </>
  );
}
