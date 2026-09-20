import type { MetadataRoute } from "next";

import { siteUrl } from "@/lib/env.server";

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
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
