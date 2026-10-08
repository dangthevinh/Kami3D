// Relative with the extension, like every other `lib` module a check suite or a script imports
// directly: `@/` means nothing to plain Node, and this rule has to be importable by the pipeline.
import { OBJECT_WORDS, PLACEHOLDER_WORDS } from "./model-quality.ts";

/**
 * Does a candidate's title name this catalogue entry?
 *
 * The hard gate for space, plants and vehicles, and deliberately **not** the landmark gate
 * (`lib/landmark-gate.ts`) with a different argument. The landmark version carries rules about parts of
 * buildings - "Shachihoko of Himeji Castle" names an ornament, "Great Wall of China" is refused because
 * it contains "wall" unless the landmark is itself a wall - and those words mean nothing for a planet or
 * a sunflower. Reusing it would refuse "Oak tree" for containing "tree" if "tree" were a part word, and
 * would accept a title the landmark rules never contemplated.
 *
 * What the three new catalogues need is the smallest rule that is actually true of them:
 *
 *   1. **the title must contain the entry's name** as a word, accents folded, so "Sagrada Família" and
 *      "Sagrada Familia" are the same title. In multi-word names **every word** must appear, in any
 *      order: "International Space Station" is named by "ISS - International Space Station (A)", and
 *      "Boeing 747-8i" is named by "Boeing 747-8i";
 *   2. **no placeholder word**, from the same list the animal and landmark pipelines use - "low poly",
 *      "lego", "pixel", "model kit" and the rest. That list lives in `lib/model-quality.ts` so three
 *      pipelines cannot drift apart about what a stand-in is called;
 *   3. **the scientific name counts too**, because a plant's model is often filed under its Latin name.
 *
 * A word-boundary match is what stops "Sun" matching "Sunset" and "Earth" matching "Earthquake
 * simulator" - both of which were real results in the probe for this phase.
 */

/**
 * Words that name **a piece of** the subject.
 *
 * The third list, and the third distinct mistake. A placeholder is a stand-in wearing the name; an
 * object word is a souvenir of it; a part word is a piece of it. "Giant Sequoia Cone - Retopologized"
 * names a seed cone, and the entry is the tree - the same failure the landmark gate catches with "a
 * piece of it, not the landmark".
 *
 * The rule that keeps it honest is the one the landmark gate learned the hard way: **a part word is only
 * evidence when the entry is not itself called that.** "Mercedes Atego Fire Engine" is the fire engine;
 * refusing it because it says "engine" would be the gate breaking a real model, and the fire engine is
 * called an engine.
 */
const PART_WORDS = [
  "cone",
  "seed",
  "seedling",
  "sapling",
  "leaf",
  "leaves",
  "fruit",
  "engine",
  "wheel",
  "tyre",
  "tire",
  "cockpit",
] as const;

export interface TitleVerdict {
  ok: boolean;
  reason: string | null;
}

export interface EntryNames {
  name: string;
  /** A plant's binomial, an aircraft's model number: a second name the model may be filed under. */
  scientific_name?: string | null;
  /** Any further names the entry is known by, all of them checked the same way. */
  aliases?: readonly string[] | null;
}

/** Lower-case, accents stripped, separators collapsed - the form both sides are compared in. */
export function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function titleNamesEntry(candidate: { title?: string | null }, entry: EntryNames): TitleVerdict {
  const title = fold(candidate.title ?? "");
  if (!title) return { ok: false, reason: "no title" };

  const placeholder = PLACEHOLDER_WORDS.find((word) => new RegExp("\\b" + fold(word).replace(/ /g, "\\s+") + "\\b").test(title));
  if (placeholder) return { ok: false, reason: 'the title says "' + placeholder + '": a stand-in, not the thing' };

  // The second list: a souvenir of the thing is not the thing. See OBJECT_WORDS for the measurement
  // that put it there.
  const object = OBJECT_WORDS.find((word) => new RegExp("\\b" + fold(word).replace(/ /g, "\\s+") + "\\b").test(title));
  if (object) return { ok: false, reason: 'the title says "' + object + '": an object of it, not it' };

  const nameText = [entry.name, entry.scientific_name, ...(entry.aliases ?? [])]
    .filter((value): value is string => typeof value === "string")
    .map(fold)
    .join(" ");

  const part = PART_WORDS.find(
    (word) => !nameText.includes(word) && new RegExp("\\b" + word + "(?:s|es)?\\b").test(title),
  );
  if (part) return { ok: false, reason: 'the title says "' + part + '": a piece of it, not it' };

  const names = [entry.name, entry.scientific_name, ...(entry.aliases ?? [])]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .map(fold);

  for (const name of names) {
    const words = name.split(" ").filter(Boolean);
    if (words.length === 0) continue;
    // Every word of the name, in any order and with anything between them: a title that carries all of
    // "international", "space" and "station" is a title about the International Space Station, whatever
    // order it puts them in and whatever acronym it leads with.
    if (words.every((word) => new RegExp("\\b" + word + "\\b").test(title))) return { ok: true, reason: null };
  }

  return {
    ok: false,
    reason: 'the title "' + (candidate.title ?? "") + '" does not name it',
  };
}
