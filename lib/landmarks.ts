import "server-only";

import { LANDMARK_KINDS, type Landmark } from "@/data/landmarks";
import { ALL_LANDMARKS, ALL_LANDMARKS_BY_SLUG } from "@/data/landmarks/all";
import { getLandmarkAttribution } from "@/lib/landmark-attribution";
import { isPreviewableLandmark } from "@/lib/landmark-preview";
import { assetUrl } from "@/lib/r2";

/**
 * Single read path for the landmark catalogue.
 *
 * The animals read from Supabase when it is configured and fall back to the bundled dataset; the
 * landmarks have no table, so this is deliberately thinner - the bundled catalogue **is** the source
 * of truth, and there is nothing to fall back from. What it does keep from `lib/animals.ts` is the
 * shape: one place that answers "what is in the catalogue", so a page never reaches into the data
 * file itself and a later table would change one module instead of six.
 */

/** Every landmark, most popular first - the order the grid draws them in. */
export async function getAllLandmarks(): Promise<Landmark[]> {
  return [...ALL_LANDMARKS]
    .sort((a, b) => b.popularity - a.popularity || a.name.localeCompare(b.name))
    .map(withAssetHost);
}

export async function getLandmarkBySlug(slug: string): Promise<Landmark | null> {
  const landmark = ALL_LANDMARKS_BY_SLUG[slug];
  // Copied rather than rewritten in place: the record lives in a module-level map, and a mutation here
  // would outlive the request that caused it.
  return landmark ? withAssetHost(landmark) : null;
}

/** The landmark's model, pointed at whichever host is serving assets (lib/r2.ts). */
function withAssetHost(landmark: Landmark): Landmark {
  return { ...landmark, model_url: assetUrl(landmark.model_url) };
}

/**
 * Every landmark, unsorted - for `generateStaticParams`, which wants the list rather than an order.
 *
 * It is a function rather than a re-exported constant so a page imports the catalogue through this
 * module and never reaches into `data/` itself; the day the landmarks move into Supabase, one file
 * changes.
 */
export function landmarkSlugs(): string[] {
  return ALL_LANDMARKS.map((landmark) => landmark.slug);
}

export async function getLandmarksByKind(kind: Landmark["kind"] | "all"): Promise<Landmark[]> {
  const all = await getAllLandmarks();
  return kind === "all" ? all : all.filter((landmark) => landmark.kind === kind);
}

/**
 * What a page needs to draw one landmark: the record, its credit, and whether a card may fetch it.
 *
 * The three travel together because every surface that shows a landmark needs all three, and asking
 * for them separately is how a page ends up drawing a model with no credit line under it.
 */
export interface LandmarkView {
  landmark: Landmark;
  attribution: ReturnType<typeof getLandmarkAttribution>;
  /** True when a hover may fetch the file: inside the shipping budget (see lib/model-preview.ts). */
  previewable: boolean;
}

export async function getLandmarkView(slug: string): Promise<LandmarkView | null> {
  const landmark = await getLandmarkBySlug(slug);
  if (!landmark) return null;
  return {
    landmark,
    attribution: getLandmarkAttribution(slug),
    previewable: isPreviewableLandmark(slug),
  };
}

/**
 * What to call each kind on a chip.
 *
 * Here rather than in the page that first needed it, because two pages now draw the same cards: the
 * landmark catalogue and the catalogue's Architecture and Modern Buildings subjects. A second copy of
 * this map is a second place a kind can be called something else.
 */
export const LANDMARK_KIND_LABELS: Record<string, string> = {
  tower: "Towers",
  temple: "Temples",
  castle: "Castles",
  monument: "Monuments",
  ruin: "Ruins",
  bridge: "Bridges",
};

export { LANDMARK_KINDS };
export type { Landmark };
