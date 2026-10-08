/**
 * The second batch of landmark entries, checked.
 *
 *   node --test scripts/check-landmarks-world-1.mjs
 *
 * data/landmarks/world-1.ts holds sixteen more monuments, written to be merged into
 * data/landmarks.ts beside the first fifteen. The rule the project runs on is không bịa số liệu — no
 * invented numbers — and a data file cannot enforce that on itself, so what is pinned here is
 * everything a reader could catch us on: the slugs (a monument may not be dropped or renamed by
 * accident), the years, the accents, and the shape of the prose.
 *
 * Three of these tests are about honesty rather than format.
 *
 *   - `model_url` is either null or a file that exists under public/models/landmarks/. This batch has
 *     been through the pipeline; a URL typed in here by hand would be a model nobody sourced, licensed
 *     or counted, and the pipeline would then skip a monument it believes is already done.
 *   - `height_m` may be null and that is a real answer, not a gap to be filled. Eight of these
 *     sixteen are null because the entry names an abbey on a rock, a castle, a palace complex or a
 *     temple compound rather than one structure, and any single number would be true of one keep or
 *     one hall and false of the rest. What is forbidden is zero or a negative: a height is either a
 *     measurement somebody published or it is null.
 *   - every entry must carry at least one fact containing a digit. "It is one of the most visited
 *     monuments in the world" is atmosphere, and atmosphere is what this file exists to keep out.
 *
 * The catalogue itself records where each number came from, and which ones are contested — the Arc
 * de Triomphe at 49.54 m against the round 50 m, Milan's Madonnina at 108.5 m against its own
 * infobox's 108 m, Cologne at 157.38 m against 157 m, Hagia Sophia's dome at 55 m against 55.6 m.
 * Read the header of data/landmarks/world-1.ts before changing one.
 */

import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import { BATCH } from "../data/landmarks/world-1.ts";

/**
 * The sixteen, in the order the file declares them.
 *
 * Pinned rather than derived: a monument that disappears in a merge has to be a decision someone
 * wrote down here, not a conflict resolved by quietly keeping one side.
 */
const SHIPPED_SLUGS = [
  "mont-saint-michel",
  "arc-de-triomphe",
  "milan-cathedral",
  "trevi-fountain",
  "tower-bridge",
  "edinburgh-castle",
  "alhambra",
  "cologne-cathedral",
  "prague-castle",
  "saint-basils-cathedral",
  "hagia-sophia",
  "st-peters-basilica",
  "temple-of-heaven",
  "himeji-castle",
  "borobudur",
  "prambanan",
];

const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const HEX = /^#[0-9a-f]{6}$/;

/** The smallest gap two accent colours may have and still read as a gradient. */
const MIN_ACCENT_DISTANCE = 120;

/** The floor a fun_fact has to clear before it says anything a reader can check. */
const MIN_FACT_LENGTH = 30;

/** The floor a description has to clear before it describes anything. */
const MIN_DESCRIPTION_LENGTH = 120;

const rgb = (hex) => [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16));

const distance = (a, b) => {
  const [r1, g1, b1] = rgb(a);
  const [r2, g2, b2] = rgb(b);
  return Math.hypot(r1 - r2, g1 - g2, b1 - b2);
};

const luminance = (hex) => {
  const [r, g, b] = rgb(hex);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/**
 * The kebab-case a name has to reduce to.
 *
 * Accents are folded first, because "Chichén Itzá" and "Sagrada Família" are ordinary names in a
 * catalogue of world monuments. Apostrophes and full stops are then deleted rather than turned into
 * separators, so that "Saint Basil's Cathedral" reduces to saint-basils-cathedral and
 * "St. Peter's Basilica" to st-peters-basilica, which is what the pipeline files those models under.
 * Every other run of punctuation and space becomes one hyphen.
 */
const kebab = (name) =>
  name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’.]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

test("the sixteen are the sixteen, in the order the file declares them", () => {
  assert.deepEqual(
    BATCH.map((landmark) => landmark.slug),
    SHIPPED_SLUGS,
    "a monument was added, dropped or reordered without this list being updated",
  );
  assert.equal(BATCH.length, 16);
});

test("every slug is unique within the batch, kebab-case, and the name its model file will carry", () => {
  const seen = new Set();

  for (const landmark of BATCH) {
    assert.match(landmark.slug, KEBAB, `${landmark.slug} is not kebab-case`);
    assert.equal(landmark.slug, landmark.slug.toLowerCase(), "a slug is never upper case");
    assert.ok(!seen.has(landmark.slug), `duplicate slug within the batch: ${landmark.slug}`);
    seen.add(landmark.slug);

    // The pipeline files a model as <slug>.glb, so the slug is the file name it will be written
    // under. It also has to be the kebab-case of the name, or the card and the file drift apart and
    // nobody can tell which model belongs to which entry.
    assert.equal(
      kebab(landmark.name),
      landmark.slug,
      `${landmark.slug}: "${landmark.name}" reduces to ${kebab(landmark.name)}, not to the slug`,
    );
  }

  assert.equal(seen.size, BATCH.length);
});

test("the uniqueness rule bites, so it cannot pass for the wrong reason", () => {
  // A set that is never actually asked about duplicates proves nothing, so feed it one.
  const seen = new Set();
  const slugs = ["hagia-sophia", "hagia-sophia"];
  let duplicates = 0;
  for (const slug of slugs) {
    if (seen.has(slug)) duplicates += 1;
    seen.add(slug);
  }
  assert.equal(duplicates, 1, "a repeated slug must be counted as a duplicate");
  assert.equal(kebab("Hagia Sophia"), "hagia-sophia");
});

test("the name rule rejects a name that is not the slug, and folds the punctuation it claims to", () => {
  assert.notEqual(kebab("Cologne Cathedral"), "prague-castle", "a wrong pairing must not slip through");
  assert.equal(kebab("Saint Basil's Cathedral"), "saint-basils-cathedral");
  assert.equal(kebab("St. Peter's Basilica"), "st-peters-basilica");
  assert.equal(kebab("Milan Cathedral"), "milan-cathedral");
});

test("completed is a whole year that has already happened", () => {
  const thisYear = new Date().getFullYear();

  for (const landmark of BATCH) {
    const { slug, completed } = landmark;
    assert.ok(Number.isInteger(completed), `${slug}: ${completed} is not an integer year`);
    assert.ok(completed !== 0, `${slug}: there is no year zero`);
    assert.ok(completed <= thisYear, `${slug}: ${completed} is in the future`);
    // A typo that drops a digit reads as a plausible number, so the floor is well below the oldest
    // structure in the first catalogue (the Great Pyramid, 2560 BC) without being open-ended.
    assert.ok(completed >= -10000, `${slug}: ${completed} is older than any structure on Earth`);
  }
});

test("height_m is null or positive, and never zero", () => {
  // Null is the honest answer for the eight sites here that are not one structure — the abbey on
  // its rock, the two castles, the Alhambra, the Forbidden City, the Temple of Heaven, and the
  // Himeji and Prambanan compounds — and the test allows it without allowing a stand-in number. A
  // zero or a negative, though, is a measurement that came from somewhere other than a source.
  for (const landmark of BATCH) {
    if (landmark.height_m === null) continue;
    assert.equal(
      typeof landmark.height_m,
      "number",
      `${landmark.slug}: height_m is neither a number nor null`,
    );
    assert.ok(Number.isFinite(landmark.height_m), `${landmark.slug}: height_m is not finite`);
    assert.ok(
      landmark.height_m > 0,
      `${landmark.slug}: height_m is ${landmark.height_m}; zero is not a height`,
    );
    // Nothing in the catalogue is a kilometre high, and 1000 would swallow a metre/foot mix-up.
    assert.ok(landmark.height_m < 1000, `${landmark.slug}: ${landmark.height_m} m is not a building`);
  }

  assert.ok(
    BATCH.some((landmark) => landmark.height_m === null),
    "this batch should carry the sites that have no single height",
  );
  assert.ok(
    BATCH.some((landmark) => landmark.height_m !== null),
    "and it should carry the ones that do",
  );
});

test("the accent is two hex colours far enough apart to read as a gradient", () => {
  for (const landmark of BATCH) {
    const { slug, accent } = landmark;
    assert.equal(accent.length, 2, `${slug}: an accent is [light, dark]`);
    const [light, dark] = accent;

    assert.match(light, HEX, `${slug}: ${light} is not a six-digit hex colour`);
    assert.match(dark, HEX, `${slug}: ${dark} is not a six-digit hex colour`);
    assert.ok(
      distance(light, dark) >= MIN_ACCENT_DISTANCE,
      `${slug}: ${light} and ${dark} are ${Math.round(distance(light, dark))} apart, too close to read as a gradient`,
    );
    assert.ok(
      luminance(light) > luminance(dark),
      `${slug}: the accent is [light, dark] and ${light} is not the lighter one`,
    );
  }
});

test("the gradient rule rejects a pair that is one colour twice", () => {
  // The rule has to bite, or the test above passes for the wrong reason: two near-identical greys
  // look like a flat card, not a gradient, and a shipped pair like that must fail.
  const flat = distance("#dfe1e4", "#dfe2e5");
  assert.ok(flat < MIN_ACCENT_DISTANCE, "two shades of one grey must be rejected");
  assert.ok(distance("#dfe1e4", "#33383d") > MIN_ACCENT_DISTANCE, "and a real light/dark pair must pass");
});

test("every entry carries at least two checkable facts, and none of them is a fragment", () => {
  for (const landmark of BATCH) {
    const { slug, fun_facts: facts } = landmark;
    assert.ok(Array.isArray(facts), `${slug}: fun_facts is not an array`);
    assert.ok(facts.length >= 2, `${slug}: has ${facts.length} fun_facts, and two is the floor`);
    assert.ok(facts.length <= 4, `${slug}: has ${facts.length} fun_facts; four is what the card holds`);

    for (const fact of facts) {
      assert.equal(typeof fact, "string", `${slug}: a fun_fact is not a string`);
      assert.ok(
        fact.length >= MIN_FACT_LENGTH,
        `${slug}: "${fact}" is ${fact.length} characters, too short to be a fact`,
      );
    }
    assert.equal(new Set(facts).size, facts.length, `${slug}: repeats a fun_fact`);
  }
});

test("at least one fact per entry carries a number", () => {
  // A checkable fact about a building almost always has a figure in it, and this is the test that
  // says so: a date, a height, a count or a named person, never just atmosphere.
  for (const landmark of BATCH) {
    assert.ok(
      landmark.fun_facts.some((fact) => /\d/.test(fact)),
      `${landmark.slug}: no fun_fact contains a number, so none of them can be checked`,
    );
    assert.ok(
      landmark.description.length > 0 && !landmark.fun_facts.some((fact) => fact === landmark.description),
      `${landmark.slug}: a fun_fact is the description again`,
    );
  }
});

test("a description is a description, not a stub", () => {
  for (const landmark of BATCH) {
    const { slug, description } = landmark;
    assert.ok(
      description.length >= MIN_DESCRIPTION_LENGTH,
      `${slug}: ${description.length} characters is a stub, not a description`,
    );
    assert.ok(description.trim().endsWith("."), `${slug}: the description does not end in a full stop`);
    assert.ok(description.includes(" "), `${slug}: the description is one word`);
    assert.ok(!description.includes("  "), `${slug}: the description has a double space`);

    // Two to four sentences, the way the first catalogue writes them: a card has room for a short
    // paragraph and no more, and a one-sentence entry is a caption.
    const sentences = description.split(/(?<=[.!?])\s+/).filter((part) => part.trim().length > 0).length;
    assert.ok(
      sentences >= 2 && sentences <= 4,
      `${slug}: ${sentences} sentences, and the house style is two to four`,
    );
  }
});

test("no entry is missing the fields the card and the page read", () => {
  for (const landmark of BATCH) {
    for (const field of ["name", "city", "country", "style", "purpose"]) {
      assert.equal(typeof landmark[field], "string", `${landmark.slug}: ${field} is not a string`);
      assert.ok(landmark[field].trim().length > 0, `${landmark.slug}: ${field} is empty`);
    }
    assert.ok(
      landmark.architect === null || landmark.architect.trim().length > 0,
      `${landmark.slug}: architect is an empty string rather than null`,
    );
    assert.ok(
      ["tower", "temple", "castle", "monument", "ruin", "bridge"].includes(landmark.kind),
      `${landmark.slug}: "${landmark.kind}" is not a Landmark kind`,
    );
  }

  const names = BATCH.map((landmark) => landmark.name);
  assert.equal(new Set(names).size, names.length, "two entries share a name");
});

test("popularity is a whole number on the 1-100 scale the grid sorts on", () => {
  for (const landmark of BATCH) {
    assert.ok(Number.isInteger(landmark.popularity), `${landmark.slug}: popularity is not an integer`);
    assert.ok(
      landmark.popularity >= 1 && landmark.popularity <= 100,
      `${landmark.slug}: popularity ${landmark.popularity} is off the 1-100 scale`,
    );
  }
});

test("every model_url was written by the pipeline, and points at a file that exists", () => {
  // This batch has now been through the pipeline, so "model_url is null" is no longer the invariant
  // and asserting it would only be asserting that the pipeline never ran. What it is instead:
  // model_url is either null - four entries here still have no sourced model, and saying so is the
  // honest answer - or a real file under public/models/landmarks/. A URL typed in by hand would be a
  // model nobody licensed, credited or counted, and the pipeline would then skip a monument it
  // believes is already done.
  for (const landmark of BATCH) {
    if (landmark.model_url === null) continue;
    assert.match(
      landmark.model_url,
      /^\/models\/landmarks\/[a-z0-9-]+\.glb$/,
      `${landmark.slug}: model_url is ${landmark.model_url}, which is not a path the pipeline writes`,
    );
    assert.ok(
      existsSync(join(process.cwd(), "public", landmark.model_url)),
      `${landmark.slug} points at ${landmark.model_url}, which is not in the repository`,
    );
  }

  assert.ok(
    BATCH.some((landmark) => landmark.model_url !== null),
    "the pipeline has run on this batch: at least one entry must have a model",
  );
});
