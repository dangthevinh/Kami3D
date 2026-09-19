import type { MetadataRoute } from "next";

import { getAllAnimals } from "@/lib/animals";
import { publicEnv } from "@/lib/env";

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
    { url: `${publicEnv.siteUrl}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${publicEnv.siteUrl}/explore`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${publicEnv.siteUrl}/quiz`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${publicEnv.siteUrl}/about`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];

  const speciesRoutes: MetadataRoute.Sitemap = animals.map((animal) => ({
    url: `${publicEnv.siteUrl}/animal/${animal.slug}`,
    lastModified: animal.created_at ? new Date(animal.created_at) : now,
    changeFrequency: "monthly",
    priority: animal.premium ? 0.6 : 0.8,
  }));

  return [...staticRoutes, ...speciesRoutes];
}
