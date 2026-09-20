import type { Animal } from "@/types/animal";

/**
 * Structured data, built as plain objects so it can be unit-tested and reused.
 *
 * Everything here is emitted as JSON-LD in a `<script type="application/ld+json">`
 * tag (see `components/seo/JsonLd.tsx`). The rules followed throughout:
 *
 *   - One `@graph` per page, with `@id`s so nodes can reference each other
 *     instead of repeating themselves.
 *   - Only facts the page actually shows. `conservationStatus` comes from the
 *     species record, measurements come from the same fields `SizeComparison`
 *     renders, and nothing is invented to make a rich result look better.
 *   - URLs are absolute, because a crawler resolves them outside the page.
 */

export interface SiteUrlInput {
  /** `NEXT_PUBLIC_SITE_URL`, the documented setting. */
  explicit?: string | undefined;
  /** The host's own production URL (Vercel, Netlify), used when nothing is set. */
  platform?: string | undefined;
  /** Last resort — the local development origin. */
  fallback: string;
}

/**
 * The origin this deployment publishes.
 *
 * Everything a crawler resolves — canonical tags, `og:url`, the sitemap and every
 * `@id` in the structured-data graph — is built from this value, and getting it
 * wrong is one of the few SEO mistakes worse than having no tags at all: a
 * canonical pointing at another host tells Google not to index this one. So an
 * explicit setting wins, a platform-provided production URL is trusted next, and
 * the localhost default is only a development convenience (the build warns when
 * it is what production would publish).
 */
export function resolveSiteUrl({ explicit, platform, fallback }: SiteUrlInput): string {
  const trim = (value: string) => value.trim().replace(/\/+$/, "");

  if (explicit?.trim()) return trim(explicit);
  if (platform?.trim()) return `https://${trim(platform).replace(/^https?:\/\//, "")}`;

  return trim(fallback);
}

export interface SiteFacts {
  siteUrl: string;
  name: string;
  description: string;
  githubUrl: string;
}

export const SITE_NAME = "Kami3D";
export const SITE_DESCRIPTION =
  "A 3D encyclopedia of the animal kingdom: rotate real models, compare your size against a blue whale, and take the silhouette quiz.";
export const SITE_GITHUB = "https://github.com/dangthevinh/Kami3D";

const absolute = (siteUrl: string, path: string) => new URL(path, siteUrl).toString();

/** The site itself: one node the search engine can attach the rest of the graph to. */
export function websiteJsonLd(facts: SiteFacts) {
  const url = absolute(facts.siteUrl, "/");
  return {
    "@type": "WebSite",
    "@id": `${url}#website`,
    url,
    name: facts.name,
    description: facts.description,
    inLanguage: "en",
    publisher: { "@id": `${url}#organization` },
    // Sitelinks search box: the navbar's search form is the target, so the
    // declared query parameter is the one the app already understands.
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${absolute(facts.siteUrl, "/explore")}?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function organizationJsonLd(facts: SiteFacts) {
  const url = absolute(facts.siteUrl, "/");
  return {
    "@type": "Organization",
    "@id": `${url}#organization`,
    name: facts.name,
    url,
    description: facts.description,
    sameAs: [facts.githubUrl],
  };
}

export function breadcrumbJsonLd(siteUrl: string, trail: { name: string; path: string }[]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: trail.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absolute(siteUrl, item.path),
    })),
  };
}

/** A crawlable list of species — the shape Google reads for a carousel or a grid. */
export function speciesItemListJsonLd(siteUrl: string, name: string, animals: Animal[]) {
  return {
    "@type": "ItemList",
    name,
    numberOfItems: animals.length,
    itemListOrder: "https://schema.org/ItemListOrderDescending",
    itemListElement: animals.map((animal, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: absolute(siteUrl, `/animal/${animal.slug}`),
      name: animal.name,
    })),
  };
}

/**
 * One species.
 *
 * `Taxon` is the honest type for a species page; the measurements ride along as
 * `additionalProperty` rather than as free text so they stay machine-readable.
 */
export function speciesJsonLd(siteUrl: string, animal: Animal) {
  const url = absolute(siteUrl, `/animal/${animal.slug}`);
  const measurements = [
    { name: "Length", value: animal.length_m, unitCode: "MTR" },
    ...(animal.height_m > 0 ? [{ name: "Height", value: animal.height_m, unitCode: "MTR" }] : []),
    { name: "Mass", value: animal.weight_kg, unitCode: "KGM" },
  ];

  return {
    "@type": "Taxon",
    "@id": `${url}#species`,
    name: animal.name,
    alternateName: animal.latin_name,
    description: animal.description,
    url,
    image: absolute(siteUrl, `/animal/${animal.slug}/opengraph-image`),
    taxonRank: "species",
    conservationStatus: animal.conservation_status,
    isPartOf: { "@id": `${absolute(siteUrl, "/explore")}#collection` },
    additionalProperty: measurements.map((measurement) => ({
      "@type": "PropertyValue",
      name: measurement.name,
      value: measurement.value,
      unitCode: measurement.unitCode,
    })),
    subjectOf: {
      "@type": "WebPage",
      "@id": url,
      about: { "@id": `${url}#species` },
    },
  };
}

export function collectionPageJsonLd(siteUrl: string, name: string, description: string, count: number) {
  const url = absolute(siteUrl, "/explore");
  return {
    "@type": "CollectionPage",
    "@id": `${url}#collection`,
    url,
    name,
    description,
    isPartOf: { "@id": `${absolute(siteUrl, "/")}#website` },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: count,
    },
  };
}

/** Wraps any number of nodes into the single `@graph` a page should emit. */
export function graph(nodes: unknown[]) {
  return { "@context": "https://schema.org", "@graph": nodes.filter(Boolean) };
}

/**
 * Serialises a graph for a `<script type="application/ld+json">` tag.
 *
 * `JSON.stringify` output is safe inside a script element except for the
 * sequence `</script` (and `<!--`), which a species description could in
 * principle contain. Escaping `<` as its JSON escape keeps the payload valid —
 * JSON parsers decode it back — while making it impossible to close the tag from
 * the data. Lives here, rather than in the component, so it can be tested.
 */
export function serializeJsonLd(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
