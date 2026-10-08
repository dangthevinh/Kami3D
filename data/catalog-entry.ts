/**
 * One entry in any catalogue that is not the animals or the historic landmarks.
 *
 * Space, plants and vehicles are three different subjects with one shape in common, and this is that
 * shape. It is deliberately small: what a card needs (a name, a line of context, a description, a few
 * sourced facts, a model and two accent colours) plus `metadata`, the field the schema added for
 * everything true of one subject and not of the others - a planet's mass, a plant's family, a car's
 * top speed.
 *
 * The alternative was a table that grows a column per phase, or three parallel types that drift. This
 * is the same choice `public.items.metadata` makes one layer down, restated where TypeScript can see
 * it.
 *
 * ## The rules that apply to every field
 *
 *   - **`model_url` is null in this file.** The pipeline writes it, exactly as it does for the
 *     landmarks: an entry is not shipped until a licence-clean model has been downloaded, measured and
 *     credited, and an entry the pipeline cannot source is **deleted**, not shown with a promise.
 *   - **every number is sourced.** A figure that could not be checked goes in `metadata` as null and is
 *     not stated in the prose, because a number nobody can trace is the one thing this project refuses
 *     to ship. `metadata.source` names where the figures came from.
 *   - **`facts` are checkable.** Two to four of them, each long enough to be a fact rather than a
 *     caption, at least one carrying a figure - the same rule the landmark batches are held to.
 */

export interface CatalogEntry {
  /** Kebab-case, unique inside its catalogue, and the name its model file is filed under. */
  slug: string;
  name: string;
  /** The one line under the name on a card: "Planet · Solar System", "Tree · Fagaceae". */
  subtitle: string;
  description: string;
  /** Two to four checkable facts. */
  facts: string[];
  /** Filled in by the model pipeline. Never typed by hand. */
  model_url: string | null;
  /** `[light, dark]`, far enough apart to read as a gradient. */
  accent: [string, string];
  /** 1-100, what the grid sorts by. */
  popularity: number;
  /** Everything true of this entry and not of the others. */
  metadata: Record<string, unknown>;
}
