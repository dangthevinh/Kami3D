import type { Metadata } from "next";

import { StudioDashboard } from "@/components/manga-studio/StudioDashboard";
import { StudioHeader } from "@/components/manga-studio/StudioHeader";

/**
 * `/manga-studio` — the dashboard.
 *
 * A server component that renders a header and one client component. It reads no session, imports no
 * auth SDK and touches no database, which is what keeps this route inside the same first-paint budget
 * as a content page: the projects arrive from `/api/manga/projects?scope=mine`, an API route that has
 * already resolved the session on the server.
 *
 * `robots: noindex` because a dashboard is one account's list of its own drafts: there is nothing here
 * for a crawler, and the two public surfaces (the gallery and the reader) are the ones that say
 * otherwise.
 */

export const metadata: Metadata = {
  title: "Manga Studio — write, compose and publish manga or a webtoon",
  description:
    "Create a manga or a vertical webtoon: chapters and a script, panels uploaded or generated, a page composer with tested templates and speech bubbles, then publish it to the public gallery.",
  alternates: { canonical: "/manga-studio" },
  robots: { index: false, follow: true },
};

export default function MangaStudioHome() {
  return (
    <>
      <StudioHeader
        current="studio"
        title="Your studio"
        subtitle="Projects, chapters, panels and pages. A project is a title and a format; everything else hangs off it. The composer is built for a desktop, the reader for a phone — both say so."
      />
      <div className="section-shell py-8">
        <StudioDashboard />
      </div>
    </>
  );
}
