import type { MetadataRoute } from "next";

import { getAllAnimals } from "@/lib/animals";
import { data2mapIsPublic } from "@/lib/data2map-access";
import { DATA2MAP_BASE, liveProducts } from "@/lib/data2map-products";
import { siteUrl } from "@/lib/env.server";

/**
 * Static sitemap: the landing surfaces plus one entry per species.
 *
 * Every species URL is pre-rendered at build time, so this is generated once and
 * served from cache rather than computed per request.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const animals = await getAllAnimals();
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/explore`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${siteUrl}/quiz`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${siteUrl}/leaderboard`, lastModified: now, changeFrequency: "daily", priority: 0.6 },
    { url: `${siteUrl}/map`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${siteUrl}/about`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];

  // Data2Map is a second surface on the same site, and it is **built but not launched**: the
  // middleware answers 404 to everyone outside the allow-list, so advertising these URLs would only
  // send crawlers to a 404. `NEXT_PUBLIC_DATA2MAP_PUBLIC=1` lists them again - launch day.
  //
  // Only routes that exist are listed: the five product pages are added by the phases that build
  // them, `npm run check:data2map` fails if a product calls itself live without a page, and the twin
  // is listed by hand because it is a page of the module rather than one of its products.
  const data2mapRoutes: MetadataRoute.Sitemap = data2mapIsPublic()
    ? [
        { url: `${siteUrl}${DATA2MAP_BASE}`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
        ...liveProducts().map((product) => ({
          url: `${siteUrl}${product.href}`,
          lastModified: now,
          changeFrequency: "monthly" as const,
          priority: 0.5,
        })),
        { url: `${siteUrl}${DATA2MAP_BASE}/twin`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
      ]
    : [];

  const speciesRoutes: MetadataRoute.Sitemap = animals.map((animal) => ({
    url: `${siteUrl}/animal/${animal.slug}`,
    lastModified: animal.created_at ? new Date(animal.created_at) : now,
    changeFrequency: "monthly",
    priority: animal.premium ? 0.6 : 0.8,
  }));

  return [...staticRoutes, ...data2mapRoutes, ...speciesRoutes];
}
