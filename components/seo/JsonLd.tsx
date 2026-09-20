import { serializeJsonLd } from "@/lib/seo";

/**
 * Renders JSON-LD.
 *
 * The escaping itself lives in `lib/seo.ts` so it is covered by
 * `npm run check:seo` — a component is not a testable unit in this project.
 */
export function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />;
}
