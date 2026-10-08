import type { Metadata } from "next";

import { GalleryGrid } from "@/components/manga-studio/GalleryGrid";
import { StudioHeader } from "@/components/manga-studio/StudioHeader";

/**
 * `/manga-studio/gallery` — the public half.
 *
 * Published and public only: that decision belongs to the API (`?scope=public`) and to the database's
 * row level security, not to a filter in a component. This page is indexable, unlike the studio's own
 * screens, because it is the one list a stranger is meant to find.
 */

export const metadata: Metadata = {
  title: "Manga gallery — comics and webtoons published in Kami3D",
  description:
    "Read what people have published in Manga Studio: page-by-page manga and vertical webtoons, with likes, follows and comments.",
  alternates: { canonical: "/manga-studio/gallery" },
};

export default function MangaGalleryPage() {
  return (
    <>
      <StudioHeader
        current="gallery"
        title="Public gallery"
        subtitle="Everything here has been published by its author. Likes, follows and comments are one tap away, and reading needs no account."
      />
      <div className="section-shell py-8">
        <GalleryGrid />
      </div>
    </>
  );
}
