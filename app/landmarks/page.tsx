import type { Metadata } from "next";

import { CategoryNav } from "@/components/catalog/CategoryNav";
import { LandmarkGrid } from "@/components/landmark/LandmarkGrid";
import { LandmarkCard } from "@/components/landmark/LandmarkCard";
import { getCategorySummaries } from "@/lib/catalog";
import { getAllLandmarks, LANDMARK_KIND_LABELS, LANDMARK_KINDS } from "@/lib/landmarks";
import { isPreviewableLandmark } from "@/lib/landmark-preview";

/**
 * `/landmarks` — the second catalogue, and the second use of the same rules.
 *
 * A landmark is not a species, and the differences are worth naming: there is no conservation status,
 * no range map and no quiz. What is **not** different is the part that matters - every entry has a
 * real model whose licence is on the allow-list, with its author and its source recorded; a model
 * that is missing or outside the hover budget means a plate rather than a stand-in; and the model
 * itself is drawn by the same viewer, which means the same floor anchor and the same credit line.
 *
 * The header says out loud how many have a model, because a grid that quietly shows three files and
 * thirteen gradients is the kind of thing a visitor should not have to work out.
 */

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Historic Landmarks in 3D — Kami3D",
  description:
    "Monuments you can turn over in your hands: the Eiffel Tower, the Colosseum, Angkor Wat, Machu Picchu and more, each with its real height, its year and a credited 3D model.",
  alternates: { canonical: "/landmarks" },
};

export default async function LandmarksPage() {
  const [landmarks, categories] = await Promise.all([getAllLandmarks(), getCategorySummaries()]);
  const previewable = Object.fromEntries(landmarks.map((landmark) => [landmark.slug, isPreviewableLandmark(landmark.slug)]));
  const withModel = landmarks.filter((landmark) => landmark.model_url).length;

  return (
    <div className="section-shell py-8">
      {/*
        The rail, with Architecture active.

        The landmark catalogue and the catalogue's Architecture subject are **two doors into one
        catalogue**: `/categories/architecture` draws the same 47 monuments with the same cards, and
        this page is the wider view of the same set - it is the one with the kind filter and the one
        the sitemap lists under its own URL. The rail is here so a reader who arrived at either door can
        see where they are and what the other subjects are, instead of a page that looks like a
        separate product.
      */}
      <CategoryNav categories={categories} active="architecture" className="mb-6" />

      <header className="max-w-3xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-coral">Catalogue</p>
        <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          Historic Landmarks
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-white/60">
          {withModel} of {landmarks.length} monuments have a real 3D model you can orbit, measure against
          your own height, and read the credit for. The rest say so rather than pretending: for a
          building, as for an animal, this project shows the file or shows nothing.
        </p>
      </header>

      <div className="mt-6">
        <LandmarkGrid
          landmarks={landmarks satisfies React.ComponentProps<typeof LandmarkCard>["landmark"][]}
          previewable={previewable}
          kinds={LANDMARK_KINDS}
          kindLabels={LANDMARK_KIND_LABELS}
        />
      </div>
    </div>
  );
}
