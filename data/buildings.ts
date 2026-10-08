/**
 * Modern buildings: the third subject taken from the landmark catalogue, and the rule that decides
 * which monuments belong in it.
 *
 * The catalogue has two ways to be organised and they do not ask the same question. **Architecture**
 * asks *when and where* and holds all 47 entries. **Modern Buildings** asks *how it was built*, and
 * holds the ones that stand on the engineering of the last 130 years.
 *
 * ## The rule
 *
 * An entry belongs here when **all three** of these are true:
 *
 *   1. **Completed in 1889 or later.** That is the year steel frames, reinforced concrete and
 *      suspension systems stopped being experiments - the Eiffel Tower opened in 1889, and the first
 *      steel-framed skyscraper was finished in 1885. A masonry building finished in 1965 (Milan
 *      Cathedral) or 2026 (the Sagrada Família) is *late*, not modern: its structure is the structure
 *      of a Gothic cathedral.
 *   2. **It is entered or crossed.** A skyscraper, a tower, an opera house, a mosque, a bridge.
 *   3. **It is not a sculpture and not a rock.** Christ the Redeemer (1931) and Mount Rushmore (1941)
 *      are the right era and the wrong kind of thing: nothing is entered, nothing is carried. Uluru is
 *      neither, because nobody built it.
 *
 * Every entry is a decision written down here, and `scripts/check-catalog.mjs` checks it against the
 * catalogue rather than trusting it: each slug must exist, must be dated 1889 or later, must be a
 * structure of the kinds the rule names, and must not be a ruin.
 *
 * The list is deliberately **not** `completed >= 1889` computed at read time. That filter would
 * silently absorb the next monument someone adds - a 1990 statue, a 2020 rock - and a section that
 * grows by accident is a section whose description stops being true.
 */

export const MODERN_BUILDINGS: readonly string[] = [
  "eiffel-tower", // 1889, wrought iron, 330 m - the structure that opened the era
  "tower-bridge", // 1894, steel, 65 m
  "empire-state-building", // 1931, steel frame, 381 m
  "sydney-harbour-bridge", // 1932, steel arch, 134 m
  "golden-gate-bridge", // 1937, suspension, 227 m
  "sydney-opera-house", // 1973, reinforced-concrete shells, 65 m
  "cn-tower", // 1976, reinforced concrete, 553.3 m
  "hassan-ii-mosque", // 1993, reinforced concrete, 210 m minaret
  "petronas-towers", // 1996, 451.9 m
  "burj-khalifa", // 2009, 828 m - the tallest structure anyone has built
  "marina-bay-sands", // 2010, 207 m per tower
];

/** True when a landmark belongs in the modern-buildings subject. */
export function isModernBuilding(slug: string): boolean {
  return MODERN_BUILDINGS.includes(slug);
}

/**
 * The entries the rule **rejects** and why, so the next person to look at this file does not have to
 * re-derive it. Kept as prose rather than as data: these are reasons, not slugs the code can use.
 *
 *   - `christ-the-redeemer` (1931) and `mount-rushmore` (1941): statues, and nothing is entered.
 *   - `uluru`: a rock, and nothing was built.
 *   - `milan-cathedral` (1965) and `sagrada-familia` (2026): recent masonry, not modern structure.
 *   - `boudhanath` (2016) and `djenne-mosque` (1907): a stupa and a mud-brick mosque, rebuilt by hand.
 *   - `cologne-cathedral` (1880), `big-ben` (1859), `statue-of-liberty` (1886): before the era.
 *   - `chateau-frontenac` (1893): in the era, but load-bearing masonry in a revival style - a modern
 *     building in date and a historicist one in structure, which is exactly the case the first clause
 *     of the rule cannot decide on its own.
 *   - `prague-castle` (1929 is St Vitus finishing, not the castle), `himeji-castle`,
 *     `edinburgh-castle`, `alhambra`, `forbidden-city`: compounds, mostly older than their last works.
 */
