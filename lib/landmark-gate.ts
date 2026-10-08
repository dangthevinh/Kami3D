// Relative with the extension, like every other `lib` module a check suite or a script imports
// directly: `@/` means nothing to plain Node, and this rule has to be importable by the pipeline.
import { OBJECT_WORDS, PLACEHOLDER_WORDS } from "./model-quality.ts";

/**
 * Does a candidate's title name this landmark?
 *
 * The hard gate for the landmark catalogue, and deliberately not the same thing as the ranking score
 * in `lib/model-quality.ts`. The ranker gives a title 12 points out of 30 for sharing a single word,
 * which is right when you are **ordering** candidates and wrong when you are deciding whether to ship
 * one. Measured on the first dry run, without this gate: the Parthenon was "Greece" (768 triangles),
 * the Great Pyramid was "Giza" (880), and Big Ben was "Big Ben" - which does not name the Elizabeth
 * Tower, whose own title is "Elizabeth Tower (Big Ben)".
 *
 * It lives in `lib` rather than inside the fetch script because two things need it - the pipeline that
 * ships a model and the probe that asks what is available - and an imported rule is the only kind that
 * cannot drift from itself.
 */

/** Accents stripped and lowercased, so "Sagrada Família" matches a title that writes "Familia". */
export const fold = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

export interface LandmarkNames {
  name: string;
}

/**
 * The names a title may use for this landmark.
 *
 * "Elizabeth Tower (Big Ben)" is one landmark with two names, and a candidate that calls itself
 * "Big Ben" names it. "Great Pyramid of Giza" is not named by a candidate that calls itself "Giza":
 * that is a word from the entry, not the entry.
 */
export function namesFor(landmark: LandmarkNames): string[] {
  const full = landmark.name;
  const parenthetical = /\(([^)]+)\)/.exec(full)?.[1];
  const base = full.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
  return [...new Set([full, base, parenthetical].filter((value): value is string => Boolean(value)).map(fold))];
}

/**
 * Words that name a **piece** of a monument, or a souvenir of one.
 *
 * "The title contains the landmark's name" is necessary and not sufficient, and the worldwide probe is
 * what proved it. On the first pass these all passed the name test and none of them is the building:
 *
 *   The Hawa Mahal "WALL"                four triangles. A wall.
 *   Shachihoko of Himeji Castle          the ornamental fish on the roof
 *   Chinese Ballast Doll at Wat Arun     a doll
 *   Borobudur 3rd Floor Relief Pictogram a carving
 *   Luxor Karnak Obelisks                the obelisks, not the temple
 *   cyclop stairs Prague castle          the stairs
 *
 * This is the same failure the animal catalogue had - a musket for a sloth, a leather bag for a
 * leatherback turtle, a skull for a meerkat - and it has the same answer: the words that give it away
 * are known, so they are refused by name.
 */
export const PART_WORDS = [
  "wall",
  "relief",
  "pictogram",
  "obelisk",
  "stairs",
  "staircase",
  "stairway",
  "skull",
  "jaw",
  "mandible",
  "vertebra",
  "teeth",
  "tooth",
  "fragment",
  "fragmento",
  "replica",
  "souvenir",
  "figurine",
  "doll",
  "scale model",
  "model kit",
  "shachihoko",
  "ornament",
] as const;

/**
 * Prepositions that put the landmark in a phrase rather than in the title's driving seat.
 *
 * "Shachihoko **of** Himeji Castle" and "Chinese Ballast Doll **at** Wat Arun" name a different object
 * and mention the building as its location. A model **of** the building is called the building.
 */
const SUBORDINATING = ["of", "at", "in", "from", "near"];

/** "low-poly" and "lowpoly" are the same word with a separator in a different place. */
const collapsed_form = (word: string): string =>
  word.replace(/[-_]+/g, " ").replace(/\s+/g, " ").replace(/ /g, "\\s+");

export interface TitleVerdict {
  ok: boolean;
  reason: string | null;
}

export function namesTheLandmark(candidate: { title?: string | null }, landmark: LandmarkNames): TitleVerdict {
  const title = fold(candidate.title ?? "");
  if (!title) return { ok: false, reason: "no title" };

  /*
   * Words are matched on a **collapsed** title, because a space and a hyphen are the same word to a
   * reader and were two different words to this function. Found by the probe: the list holds "lowpoly"
   * and "low-poly", and a candidate titled "Candi Prambanan low poly" - with a space - walked straight
   * through both. "Obelisks" did the same to "obelisk", which needed a plural.
   */
  const collapsed = title.replace(/[-_]+/g, " ").replace(/\s+/g, " ");
  const like = (word: string) => new RegExp("\\b" + collapsed_form(word) + "\\b");

  const placeholder = PLACEHOLDER_WORDS.find((word) => like(word).test(collapsed));
  if (placeholder) return { ok: false, reason: 'the title says "' + placeholder + '": a stand-in, not the landmark' };

  /*
   * And the second list, which is a different mistake: a doorbell from the building is not the
   * building. "Hagia Sophia Doorbell" passed every other rule in this function - it names Hagia Sophia,
   * it is not low-poly, its licence is clean - and the pipeline shipped it until this line existed.
   */
  const object = OBJECT_WORDS.find((word) => like(word).test(collapsed));
  if (object) return { ok: false, reason: 'the title says "' + object + '": an object of the landmark, not the landmark' };

  /*
   * A part word is only evidence when the landmark is not itself called that.
   *
   * Found by running the fetcher over the finished catalogue: "Great Wall of China" was refused
   * because its title contains "wall" - and the Great Wall *is* a wall. The rule exists to catch a
   * fragment standing in for a whole ("The Hawa Mahal 'WALL'", four triangles), not to reject a
   * landmark whose own name uses the word.
   */
  const nameText = namesFor(landmark).join(" ");
  const part = PART_WORDS.find(
    (word) => !nameText.includes(word) && new RegExp("\\b" + word + "(?:s|es)?\\b").test(collapsed),
  );
  if (part) return { ok: false, reason: 'the title says "' + part + '": a piece of it, not the landmark' };

  const name = namesFor(landmark).find((entry) => title.includes(entry));
  if (!name) return { ok: false, reason: 'the title "' + candidate.title + '" does not name it' };

  // ...and the landmark has to be what the title is about, not where something else is.
  //
  // Articles are dropped first: in "View of the Eiffel Tower" the word before the name is "the", and a
  // check that stops there sees a harmless article instead of the "of" that gives the phrase away.
  // The test caught exactly this.
  const ARTICLE = new Set(["the", "a", "an", "le", "la", "les", "el", "il", "der", "die", "das"]);
  const before = title.slice(0, title.indexOf(name)).trim();
  const words = before.split(/[^a-z0-9']+/).filter(Boolean);
  while (words.length > 0 && ARTICLE.has(words[words.length - 1])) words.pop();
  const lastWord = words.pop();
  if (lastWord && SUBORDINATING.includes(lastWord)) {
    return { ok: false, reason: 'the title says "' + lastWord + ' ' + name + '": the landmark is a location, not the subject' };
  }

  return { ok: true, reason: null };
}
