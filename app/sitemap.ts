import type { MetadataRoute } from "next";

import { CATEGORIES } from "@/data/categories";
import { getAllAnimals } from "@/lib/animals";
import { getCategoryItems } from "@/lib/catalog";
import { categoryHref } from "@/lib/catalog-links";
import { getAllLandmarks } from "@/lib/landmarks";
import { data2mapIsPublic } from "@/lib/data2map-access";
import { mangaStudioIsPublic } from "@/lib/coming-soon";
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
    { url: `${siteUrl}/landmarks`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    // Phase 25's index over every subject. Only the categories that hold something are listed: a
    // category page that says "being built" is honest for a visitor who followed the navbar, and a
    // promise to a crawler, which is a different audience with a different patience.
    { url: `${siteUrl}/categories`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    // Phase 32: the pricing page is public and indexable - it is a page a person searches for, and it
    // is the only place the paid plans are described.
    { url: `${siteUrl}/pricing`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
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

  // The manga gallery is the one public surface of the studio, and it is a real page of published
  // work rather than a tool - but Manga Studio is **built and not launched** (`lib/coming-soon.ts`),
  // so its gallery answers 404 to everyone outside the allow-list. Listing a URL that 404s is how a
  // sitemap teaches a crawler to distrust the site, which is the same rule Data2Map follows above.
  // Everything else under /manga-studio is the author's own workspace and carries
  // `robots: { index: false }`; the reader is `/manga-studio/reader/[projectId]`, where the project id
  // only exists in the database, so it is deliberately not fabricated here either.
  const mangaRoutes: MetadataRoute.Sitemap = mangaStudioIsPublic()
    ? [{ url: `${siteUrl}/manga-studio/gallery`, lastModified: now, changeFrequency: "daily", priority: 0.6 }]
    : [];

  // Every landmark page is prerendered by `generateStaticParams`, so they are listed the same way
  // the species are: a crawler reaches content, not a client-side route it has to execute.
  const landmarkRoutes: MetadataRoute.Sitemap = (await getAllLandmarks()).map((landmark) => ({
    url: `${siteUrl}/landmarks/${landmark.slug}`,
    lastModified: now,
    changeFrequency: "yearly" as const,
    priority: 0.6,
  }));

  // The category pages that hold entries. They are prerendered by `generateStaticParams` from the
  // bundled list, so the URLs here are the ones the build actually produced.
  const categoryRoutes: MetadataRoute.Sitemap = (
    await Promise.all(
      CATEGORIES.filter((category) => category.is_public).map(async (category) => ({
        category,
        count: (await getCategoryItems(category.id)).length,
      })),
    )
  )
    .filter((entry) => entry.count > 0)
    .map(({ category }) => ({
      url: `${siteUrl}${categoryHref(category.id)}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    }));

  const speciesRoutes: MetadataRoute.Sitemap = animals.map((animal) => ({
    url: `${siteUrl}/animal/${animal.slug}`,
    lastModified: animal.created_at ? new Date(animal.created_at) : now,
    changeFrequency: "monthly",
    priority: animal.premium ? 0.6 : 0.8,
  }));

  return [
    ...staticRoutes,
    ...data2mapRoutes,
    ...mangaRoutes,
    ...categoryRoutes,
    ...landmarkRoutes,
    ...speciesRoutes,
  ];
}
