import type { GeodataCredits } from "@/types/geodata";

/**
 * Turning a source id into the credit line the visitor reads.
 *
 * Deliberately **not** in `lib/geodata.ts`: that module is `server-only` because it
 * queries PostGIS, while this is a pure string function the map panel (a client
 * component) also needs. Keeping them together meant a client component importing the
 * loader, which the build refuses - correctly.
 */
export function creditFor(credits: GeodataCredits, source: string): string {
  const credit = credits[source];
  if (!credit) return "Source unknown";
  return `${credit.attribution} (${credit.license})`;
}
