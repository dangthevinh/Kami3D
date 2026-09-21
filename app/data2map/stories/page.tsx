import type { Metadata } from "next";

import { StoriesExperience } from "@/components/data2map/StoriesExperience";
import storiesFile from "@/data/data2map-stories.json";
import type { StoryFile } from "@/lib/data2map/stories";

/**
 * `/data2map/stories` — a timeline of places, each with a story and a credited photograph.
 *
 * The summaries are Kami3D's own text, each citing its source; the images come from Wikimedia
 * Commons through `scripts/fetch-stories.mjs`, which records the file page, the author and the
 * exact licence and refuses non-commercial and no-derivatives. Share-alike is a condition, so the
 * credit is rendered on the page and again in the lightbox.
 *
 * The timeline is Phase 16's, driven by story years instead of animal ranges. Story mode is its
 * play button, and it respects reduced motion.
 */

export const metadata: Metadata = {
  title: "Cultural & Story Maps — Data2Map",
  description:
    "Places in Vietnam with a story and a photograph: a timeline map from the Champa temples to the tunnels of Củ Chi, with every image credited.",
  alternates: { canonical: "/data2map/stories" },
};

export default function StoriesPage() {
  const file = storiesFile as unknown as StoryFile;

  return (
    <div className="section-shell py-8">
      <header className="max-w-3xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-iris">Data2Map · D5</p>
        <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          Cultural &amp; Story Maps
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-white/60">
          Eight places, a timeline, and the photograph that goes with each one. The stories are our
          own summaries of the linked sources; the images are from Wikimedia Commons, credited with
          their exact licence.
        </p>
      </header>

      <div className="mt-6">
        <StoriesExperience stories={file.stories} images={file.images} attribution={file.attribution} />
      </div>
    </div>
  );
}
