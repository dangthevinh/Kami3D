import embeds from "@/data/sketchfab-embeds.json";
import { MODEL_LICENSES, type ModelLicense } from "@/lib/model-quality";

/**
 * Community 3D models embedded from Sketchfab.
 *
 * **Embedding is not downloading.** The Sketchfab viewer draws the model inside an iframe served by
 * sketchfab.com; nothing is copied into this repository and nothing is redistributed, which is why the
 * usual `data/model-attribution.json` record is not the right place for it. What this file keeps is
 * what the page needs to obey the licence: the author, the licence label and the canonical model page.
 *
 * Two rules, both enforced by `npm run check:embeds`:
 *
 *   1. **the licence allow-list still applies.** Only CC0 and CC BY - the same pair every downloadable
 *      model must be in. A model that is CC BY-NC or "all rights reserved" cannot appear here, because
 *      the iframe puts it on a page that carries advertising;
 *   2. **the embed is loaded on request, never on arrival.** A Sketchfab viewer is several megabytes of
 *      somebody else's JavaScript and it sets their cookies; `components/animal/SketchfabEmbed.tsx`
 *      shows a poster until the visitor asks for it, and says where the model comes from before they do.
 */

/**
 * The same pair every downloadable model must be in — imported rather than re-typed, so a
 * change to the allow-list cannot leave the embed list behind.
 */
export const EMBED_LICENSES = MODEL_LICENSES;
export type EmbedLicense = ModelLicense;

export interface SketchfabEmbed {
  slug: string;
  /** The model's Sketchfab id — the only thing the iframe URL is built from. */
  uid: string;
  title: string;
  author: string;
  authorUrl: string;
  license: EmbedLicense;
  licenseLabel: string;
  sourceUrl: string;
  faceCount: number | null;
  note: string;
  /** When the licence was last read from the model page, so a stale credit is visible as one. */
  checkedAt: string;
}

interface RawEmbeds {
  embeds: SketchfabEmbed[];
}

const ALL: SketchfabEmbed[] = (embeds as unknown as RawEmbeds).embeds;

/** Every curated embed, for a page that wants to list them. */
export function allEmbeds(): SketchfabEmbed[] {
  return ALL;
}

/** The embed for one species, or null when that species has no community model. */
export function embedForSlug(slug: string): SketchfabEmbed | null {
  return ALL.find((entry) => entry.slug === slug) ?? null;
}

/** The iframe URL. Built from the uid alone, so an entry cannot point anywhere else. */
export function embedUrl(embed: SketchfabEmbed): string {
  return `https://sketchfab.com/models/${embed.uid}/embed`;
}

/**
 * The attributes Sketchfab asks for, verbatim.
 *
 * The odd ones (`mozallowfullscreen`, `execution-while-out-of-viewport`) are the vendor's own snippet:
 * React passes unknown lower-case attributes straight through, which is why this is a spread rather
 * than a set of invented props.
 */
export function embedFrameAttributes(embed: SketchfabEmbed) {
  return {
    src: embedUrl(embed),
    title: embed.title,
    loading: "lazy" as const,
    allowFullScreen: true,
    allow: "autoplay; fullscreen; xr-spatial-tracking",
    ...{
      mozallowfullscreen: "true",
      webkitallowfullscreen: "true",
      "xr-spatial-tracking": "true",
      "execution-while-out-of-viewport": "true",
      "execution-while-not-rendered": "true",
      "web-share": "true",
    },
  };
}
