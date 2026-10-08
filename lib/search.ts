import "server-only";

import { getCategories, getCategoryItems, type CatalogItem, type CatalogCategory } from "@/lib/catalog";
import { itemSubtitle } from "@/lib/catalog-links";

/**
 * Search across every catalogue, not just the animals.
 *
 * Until Phase 30 the only search this site had was `/explore?q=`, which is a filter over 73 species.
 * The catalogue now holds six subjects - species, monuments, modern buildings, planets, plants, vehicles
 * - and a search box that silently ignores five of them is worse than no search box, because a visitor
 * who typed "Saturn" and got no results concludes the site does not have Saturn.
 *
 * ## How a hit is scored
 *
 * The ranking is deliberately crude and explainable, because a search that cannot be explained cannot be
 * debugged:
 *
 *   name is the thing      100 for an exact name, 80 for a name that starts with the query, 60 for one
 *                          that contains it
 *   the second name        40 - a plant's binomial, a currency of the same name
 *   a fact                 25, and the matching fact is shown as the snippet
 *   the description        10, with the sentence around the match shown instead
 *
 * Accents are folded on both sides, so "sagrada familia" finds the Sagrada Família and "chichen itza"
 * finds Chichén Itzá. There is no fuzzy matching and no stemming: `tiger` does not find `Tigris`, and
 * that is the honest behaviour of a search with no index behind it.
 */

export interface SearchHit {
  item: CatalogItem;
  score: number;
  /** Which field matched, so the result can show the reader why it is here. */
  where: "name" | "subtitle" | "fact" | "description";
  snippet: string | null;
}

export interface SearchGroup {
  category: CatalogCategory;
  hits: SearchHit[];
}

/** Accents folded, lower-cased, punctuation collapsed - the form both sides are compared in. */
export function normalise(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** One sentence around the match, so a description hit still says why it matched. */
function sentenceAround(text: string, needle: string): string | null {
  const folded = normalise(text);
  const at = folded.indexOf(needle);
  if (at === -1) return null;
  const sentences = text.split(/(?<=[.!?])\s+/);
  let cursor = 0;
  for (const sentence of sentences) {
    const length = normalise(sentence).length;
    if (at <= cursor + length) return sentence.trim();
    cursor += length + 1;
  }
  return sentences[0]?.trim() ?? null;
}

/** The score of one entry against a folded query, or null when it does not match at all. */
export function scoreItem(item: CatalogItem, needle: string): SearchHit | null {
  const name = normalise(item.name);
  if (name === needle) return { item, score: 100, where: "name", snippet: null };
  if (name.startsWith(needle)) return { item, score: 80, where: "name", snippet: null };
  if (name.includes(needle)) return { item, score: 60, where: "name", snippet: null };

  const second = [item.latin_name, itemSubtitle(item)].filter(Boolean).join(" ");
  if (second && normalise(second).includes(needle)) return { item, score: 40, where: "subtitle", snippet: second };

  const facts = Array.isArray(item.metadata.facts) ? (item.metadata.facts as string[]) : [];
  const fact = facts.find((entry) => normalise(entry).includes(needle));
  if (fact) return { item, score: 25, where: "fact", snippet: fact };

  if (item.description && normalise(item.description).includes(needle)) {
    return { item, score: 10, where: "description", snippet: sentenceAround(item.description, needle) };
  }

  return null;
}

/**
 * Every category that has something to say about the query, in the order the site lists categories.
 *
 * A group with no hits is dropped rather than shown empty, and the caller says how many subjects were
 * searched - so a visitor can tell "nothing matched" from "this site has one catalogue".
 */
export async function searchCatalogue(query: string, perCategory = 8): Promise<SearchGroup[]> {
  const needle = normalise(query);
  if (needle.length < 2) return [];

  const categories = await getCategories();
  const groups: SearchGroup[] = [];

  for (const category of categories) {
    const items = await getCategoryItems(category.id);
    const hits = items
      .map((item) => scoreItem(item, needle))
      .filter((hit): hit is SearchHit => hit !== null)
      .sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name))
      .slice(0, perCategory);

    if (hits.length > 0) groups.push({ category, hits });
  }

  return groups;
}
