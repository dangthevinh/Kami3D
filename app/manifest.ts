import type { MetadataRoute } from "next";

import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/seo";

/**
 * The web app manifest.
 *
 * Nothing here changes how a crawler indexes the site; it is what a phone reads
 * when a visitor adds Kami3D to their home screen, and it is the one place the
 * theme colour and icon are declared for that context.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kami3D — 3D World Wildlife Encyclopedia",
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#04060f",
    theme_color: "#04060f",
    lang: "en",
    categories: ["education", "reference", "books"],
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
