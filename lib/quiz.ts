import { REGIONS, TAXONOMIC_CLASSES, type Animal } from "../types/animal.ts";
import { clamp, shuffle } from "./utils.ts";

/**
 * The anatomy of a quiz round.
 *
 * This module is pure and seeded on purpose. A quiz that builds its questions
 * inside a component cannot be tested, and "it looked fine when I played it" is
 * exactly how a round ends up with two identical questions, a question whose
 * answer is missing from its own options, or a "which is longer?" question whose
 * answer contradicts the dataset.
 *
 * Four kinds of question are built from the same subject, so the silhouette on
 * screen always *is* the thing being asked about:
 *
 *   species        which animal is this shadow?
 *   region         which part of the world does it live in?
 *   class          what kind of animal is it?
 *   relative-size  is it longer than <something familiar>?
 *   call           which animal makes this call? (the sound round: the subject has
 *                  a recording, and the UI plays it instead of showing a silhouette)
 *
 * The subject is drawn from the pool, the kind from a rotation, and both are
 * decided by the seed: the same seed rebuilds the same round, which is what makes
 * a resumed round (and a replayed one) honest.
 */

export type QuestionKind = "species" | "region" | "class" | "relative-size" | "call";

export interface QuizOption {
  /** Stable id: an animal id, a region name, a class name, or yes/no. */
  id: string;
  label: string;
  /** Second line under the label, when the option has one. */
  hint?: string;
}

export interface QuizQuestion {
  /** Stable across rebuilds: kind plus subject. */
  id: string;
  kind: QuestionKind;
  subject: Animal;
  prompt: string;
  options: QuizOption[];
  answerId: string;
  /** One line of truth shown once the answer is in. */
  reveal: string;
}

export interface RoundOptions {
  count?: number;
  /** Anything stable: a timestamp for a real round, a string in the tests. */
  seed?: string | number;
  /** Overrides the rotation, for tests and for a future single-kind mode. */
  kinds?: QuestionKind[];
}

export const QUESTIONS_PER_ROUND = 10;

/**
 * Six silhouette questions carry the round — that is the game — and the other
 * four make the visitor look at something other than the outline.
 */
/** The sound round's rotation: every question is a call. */
export const CALL_ROUND_KINDS: QuestionKind[] = Array.from({ length: QUESTIONS_PER_ROUND }, () => "call" as QuestionKind);

export const DEFAULT_ROUND_KINDS: QuestionKind[] = [
  "species",
  "species",
  "species",
  "species",
  "species",
  "species",
  "region",
  "region",
  "class",
  "relative-size",
];

/**
 * Familiar sizes, so "is it longer than…?" can be answered by picturing something
 * rather than by recalling a number. Ordered smallest first.
 */
export const SIZE_LADDER = [
  { id: "cat", label: "a house cat", metres: 0.75 },
  { id: "person", label: "a person", metres: 1.75 },
  { id: "car", label: "a car", metres: 4.5 },
  { id: "bus", label: "a bus", metres: 12 },
  { id: "whale", label: "a blue whale", metres: 27 },
] as const;

/** Everything the round needs from a species, so the tests can pass fixtures. */
type Subject = Pick<
  Animal,
  "id" | "slug" | "name" | "latin_name" | "category" | "region" | "habitat" | "diet" | "conservation_status" | "length_m" | "height_m" | "scale_ratio"
>;

const metresOf = (animal: Subject) => (animal.length_m > 0 ? animal.length_m : animal.scale_ratio);

/** Distinct by id, first occurrence wins. */
function unique<T extends { id: string }>(items: T[]): T[] {
  return items.filter((item, index, list) => list.findIndex((candidate) => candidate.id === item.id) === index);
}

function speciesQuestion(subject: Subject, pool: Subject[], seed: string): QuizQuestion {
  // Distractors prefer the same class or region: a round of "lion vs tiger vs
  // house cat vs bald eagle" teaches more than four unrelated names.
  const similar = shuffle(
    pool.filter(
      (candidate) => candidate.id !== subject.id && (candidate.category === subject.category || candidate.region === subject.region),
    ),
    `${seed}-similar`,
  );
  const others = shuffle(
    pool.filter((candidate) => candidate.id !== subject.id),
    `${seed}-others`,
  );

  const options = unique([...similar, ...others]).slice(0, 3);

  return {
    id: `species-${subject.slug}`,
    kind: "species",
    subject: subject as Animal,
    prompt: "Which species is this shadow?",
    options: shuffle(
      [
        { id: subject.id, label: subject.name, hint: `${subject.category} · ${subject.region}` },
        ...options.map((option) => ({ id: option.id, label: option.name, hint: `${option.category} · ${option.region}` })),
      ],
      `${seed}-options`,
    ),
    answerId: subject.id,
    reveal: `${subject.latin_name} · ${subject.conservation_status}`,
  };
}

function regionQuestion(subject: Subject, seed: string): QuizQuestion {
  const alternatives = shuffle(
    REGIONS.filter((region) => region !== subject.region).map((region) => ({ id: region, label: region })),
    `${seed}-regions`,
  ).slice(0, 3);

  return {
    id: `region-${subject.slug}`,
    kind: "region",
    subject: subject as Animal,
    prompt: `Where does the ${subject.name} live?`,
    options: shuffle([{ id: subject.region, label: subject.region }, ...alternatives], `${seed}-region-options`),
    answerId: subject.region,
    reveal: `${subject.region} · ${subject.habitat}`,
  };
}

function classQuestion(subject: Subject, seed: string): QuizQuestion {
  const alternatives = shuffle(
    TAXONOMIC_CLASSES.filter((entry) => entry !== subject.category).map((entry) => ({ id: entry, label: entry })),
    `${seed}-classes`,
  ).slice(0, 3);

  return {
    id: `class-${subject.slug}`,
    kind: "class",
    subject: subject as Animal,
    prompt: `What kind of animal is the ${subject.name}?`,
    options: shuffle([{ id: subject.category, label: subject.category }, ...alternatives], `${seed}-class-options`),
    answerId: subject.category,
    reveal: `${subject.category} · ${subject.diet}`,
  };
}

/**
 * "Longer than a bus?" — the reference is chosen as the rung *closest* to the
 * animal, which is what makes it a real question: comparing a mouse to a whale is
 * not a test of anything.
 */
function sizeQuestion(subject: Subject, seed: string): QuizQuestion {
  const metres = metresOf(subject);
  const reference = [...SIZE_LADDER].sort(
    (a, b) => Math.abs(a.metres - metres) - Math.abs(b.metres - metres),
  )[0];

  const longer = metres > reference.metres;
  const rung = shuffle([...SIZE_LADDER], `${seed}-rungs`).find((entry) => entry.id !== reference.id) ?? SIZE_LADDER[0];

  return {
    id: `relative-size-${subject.slug}`,
    kind: "relative-size",
    subject: subject as Animal,
    prompt: `Is the ${subject.name} longer than ${reference.label}?`,
    options: [
      { id: "longer", label: `Longer than ${reference.label}` },
      { id: "shorter", label: `Not that long` },
    ],
    answerId: longer ? "longer" : "shorter",
    reveal: `${subject.name} is ${metres} m long — ${reference.label} is ${reference.metres} m. ${rung.label} would be ${rung.metres} m.`,
  };
}

/**
 * The sound round: the same four-species choice, asked with the ears.
 *
 * Only species with a recording can be a subject, which the caller enforces by
 * passing a pool of them — the builder would happily ask about a silent animal
 * otherwise, and the visitor would hear nothing and be asked to name it.
 */
function callQuestion(subject: Subject, pool: Subject[], seed: string): QuizQuestion {
  const base = speciesQuestion(subject, pool, seed);

  return {
    ...base,
    id: `call-${subject.slug}`,
    kind: "call",
    prompt: "Which animal makes this call?",
    reveal: `${subject.latin_name} · ${subject.region}`,
  };
}

function buildQuestion(kind: QuestionKind, subject: Subject, pool: Subject[], seed: string): QuizQuestion {
  switch (kind) {
    case "call":
      return callQuestion(subject, pool, seed);
    case "region":
      return regionQuestion(subject, seed);
    case "class":
      return classQuestion(subject, seed);
    case "relative-size":
      return sizeQuestion(subject, seed);
    default:
      return speciesQuestion(subject, pool, seed);
  }
}

/**
 * Builds one round: `count` questions, no repeated subject, deterministic in the
 * seed.
 */
export function buildRound(animals: Animal[], options: RoundOptions = {}): QuizQuestion[] {
  const count = Math.max(1, Math.min(options.count ?? QUESTIONS_PER_ROUND, animals.length));
  const seed = String(options.seed ?? Date.now());
  const kinds = options.kinds ?? DEFAULT_ROUND_KINDS;

  const subjects = shuffle(animals, `${seed}-subjects`).slice(0, count);

  return subjects.map((subject, index) => {
    const kind = kinds[index % kinds.length];
    return buildQuestion(kind, subject, animals, `${seed}-${index}-${subject.slug}`);
  });
}

/** True when a chosen option id answers the question. */
export function isCorrect(question: QuizQuestion, optionId: string | null): boolean {
  return optionId !== null && optionId === question.answerId;
}

/** Clamp helper re-exported so the quiz UI and its tests share one range. */
export const ANSWER_SECONDS = { min: 5, max: 15, default: 15 } as const;

export function secondsForRound(count: number): number {
  return clamp(count, ANSWER_SECONDS.min, ANSWER_SECONDS.default);
}
