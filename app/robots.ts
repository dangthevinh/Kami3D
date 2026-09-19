import type { MetadataRoute } from "next";

import { publicEnv } from "@/lib/env";

/**
 * Personal and machine surfaces stay out of the index: the collection page is
 * per-visitor, and the API routes have nothing to crawl.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/profile", "/sign-in", "/sign-up"],
      },
    ],
    sitemap: `${publicEnv.siteUrl}/sitemap.xml`,
    host: publicEnv.siteUrl,
  };
}
