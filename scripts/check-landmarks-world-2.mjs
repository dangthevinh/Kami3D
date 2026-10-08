/**
 * The second batch of the historic architecture catalogue, checked.
 *
 *   node --test scripts/check-landmarks-world-2.mjs
 *
 * data/landmarks/world-2.ts is sixteen more landmarks, each with a date, a height and a source
 * behind it, and each about to be handed to the model pipeline. The rule the project runs on is
 * không bịa số liệu — no invented numbers — and a data file cannot enforce that on itself, so what
 * is pinned here is everything a reader could catch us on: the slugs (a landmark may not be dropped
 * or renamed by accident), the years, the heights, the accents, and the shape of the prose.
 *
 * Three of these tests are about honesty rather than format. `height_m` is null for Petra, the moai
 * and Uluru because none of the three is one structure — a rock-cut city, a whole sculptural
 * tradition, a natural monolith — and the test asserts that **only** those three are null: a fourth
 * null would be a height somebody could not be bothered to find, and a number on any of those three
 * would be a number that is false somewhere on the site. Every entry carries a `model_url`, because
 * this batch went through the pipeline whole, and each one has to point at a file that is really in
 * the repository: a URL typed in by hand would be a model nobody licensed, credited or counted. And every entry must carry at least one fact
 * containing a digit: "it is one of the most visited monuments in the world" is atmosphere, and
 * atmosphere is what this file exists to keep out.
 *
 * data/landmarks/world-2.ts records where each number came from and which ones are contested — the
 * Petronas Towers at 1996 against their 1999 opening, Marina Bay Sands at 207 m per tower against
 * the SkyPark's 200 m, the Sydney Harbour Bridge's 503 m against 504 m. Read its header before
 * changing one.
 */

import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import { BATCH } from "../data/landmarks/world-2.ts";

/**
 * The sixteen, in the order the file declares them.
 *
 * Pinned rather than derived: a landmark that disappears in a refactor has to be a decision someone
 * wrote down here, not a merge that quietly dropped a row. This list pins the sixteen in this
 * file only: the earlier batch in data/landmarks.ts is pinned by its own list in
 * scripts/check-landmarks.mjs.
 */
const SHIPPED_SLUGS = [
  "petronas-towers",
  "marina-bay-sands",
  "burj-khalifa",
  "petra",
  "boudhanath",
  "hassan-ii-mosque",
  "djenne-mosque",
  "empire-state-building",
  "golden-gate-bridge",
  "mount-rushmore",
  "cn-tower",
  "chateau-frontenac",
  "christ-the-redeemer",
  "moai",
  "uluru",
  "sydney-harbour-bridge",
];

/** The only three entries allowed to have no height, and why. */
const NOT_ONE_STRUCTURE = ["petra", "moai", "uluru"];

/**
 * The two slugs that are a short form of the name rather than its kebab-case.
 *
 * The pipeline files a model as <slug>.glb and these two names were fixed there first, so the
 * display name gives way rather than the file name. Listed explicitly, with the name each stands
 * for, so the exception cannot quietly cover a third landmark: the test below fails if the set of
 * mismatches and this map stop agreeing.
 */
const SHORT_SLUGS = new Map([
  ["boudhanath", "Boudhanath Stupa"],
  ["djenne-mosque", "Great Mosque of Djenné"],
]);

const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const HEX = /^#[0-9a-f]{6}$/;
const KINDS = ["tower", "temple", "castle", "monument", "ruin", "bridge"];

/** The smallest gap two accent colours may have and still read as a gradient. */
const MIN_ACCENT_DISTANCE = 120;

/** kebab-case of a display name: accents folded, punctuation to hyphens, nothing left over. */
const kebab = (name) =>
  name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

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

test("the sixteen are the sixteen, in the order the file declares them", () => {
  assert.deepEqual(
    BATCH.map((landmark) => landmark.slug),
    SHIPPED_SLUGS,
    "a landmark was added, dropped or reordered without this list being updated",
  );
  assert.equal(BATCH.length, 16);
});

test("every slug is unique within the batch, kebab-case, and the file name the pipeline will write", () => {
  const seen = new Set();

  for (const landmark of BATCH) {
    assert.match(landmark.slug, KEBAB, `${landmark.slug} is not kebab-case`);
    assert.equal(landmark.slug, landmark.slug.toLowerCase(), "a slug is never upper case");
    assert.ok(!seen.has(landmark.slug), `duplicate slug within this batch: ${landmark.slug}`);
    seen.add(landmark.slug);

    // The pipeline files a model as <slug>.glb beside the others, so the slug has to be the file
    // name it will be written under. A slug with a space, a capital or an accent in it is a model
    // that lands in the repository under a name nothing else can look up.
    assert.equal(`${landmark.slug}.glb`.replace(/\.glb$/, ""), landmark.slug);
  }

  assert.equal(seen.size, BATCH.length, "two entries share a slug");
});

test("every slug is the kebab-case of its name, or one of the two short forms this file names", () => {
  // The slug is what a reader sees in the URL and what the pipeline writes to disk, so it should be
  // derivable from the name. The two exceptions are the pipeline's file names, not typos, and they
  // are pinned: this test also fails if a rename makes a third one necessary.
  const excused = [];

  for (const landmark of BATCH) {
    const expected = kebab(landmark.name);
    if (expected === landmark.slug) continue;

    excused.push(landmark.slug);
    assert.ok(
      SHORT_SLUGS.has(landmark.slug),
      `${landmark.slug} is not the kebab-case of "${landmark.name}" (expected ${expected}) and is not a listed exception`,
    );
    assert.equal(
      SHORT_SLUGS.get(landmark.slug),
      landmark.name,
      `${landmark.slug} is excused for a different name`,
    );
  }

  assert.deepEqual(
    excused.slice().sort(),
    [...SHORT_SLUGS.keys()].sort(),
    "the set of names whose slug is a short form changed: either a rename slipped through or an exception is now unused",
  );
});

test("the kebab rule really does derive a slug from a name", () => {
  // The test above passes for the wrong reason if kebab() is too lenient: a function that returned
  // the name unchanged would excuse everything. These three prove it folds accents, drops stop
  // words' punctuation and lowercases, and that the two listed exceptions really are exceptions.
  assert.equal(kebab("Marina Bay Sands"), "marina-bay-sands");
  assert.equal(kebab("Château Frontenac"), "chateau-frontenac");
  assert.equal(kebab("Great Mosque of Djenné"), "great-mosque-of-djenne");
  assert.notEqual(kebab("Boudhanath Stupa"), "boudhanath");
});

test("completed is a whole year that has already happened", () => {
  const thisYear = new Date().getFullYear();

  for (const landmark of BATCH) {
    const { slug, completed } = landmark;
    assert.ok(Number.isInteger(completed), `${slug}: ${completed} is not an integer year`);
    assert.ok(completed !== 0, `${slug}: there is no year zero`);
    assert.ok(completed <= thisYear, `${slug}: ${completed} is in the future`);
    // A typo that drops a digit reads as a plausible number, so the floor is well below the oldest
    // thing anyone has built without being open-ended. Nothing in this batch is older than -10000,
    // and the year a natural formation was laid down belongs in the description, not here.
    assert.ok(completed >= -10000, `${slug}: ${completed} is older than any structure on Earth`);
  }
});

test("height_m is null or positive, and only the three sites that are not one structure are null", () => {
  const nulls = BATCH.filter((landmark) => landmark.height_m === null).map((landmark) => landmark.slug);
  assert.deepEqual(nulls, NOT_ONE_STRUCTURE, "the set of entries without a height changed");

  for (const landmark of BATCH) {
    if (landmark.height_m === null) continue;
    assert.equal(typeof landmark.height_m, "number", `${landmark.slug}: height_m is neither a number nor null`);
    assert.ok(Number.isFinite(landmark.height_m), `${landmark.slug}: height_m is not finite`);
    // Zero and negatives are the shapes a "could not find it" or a sign error takes; both would
    // render as a height on a card, so neither is allowed to reach the data file.
    assert.ok(landmark.height_m > 0, `${landmark.slug}: height_m is ${landmark.height_m}; zero is not a height`);
    // Nothing in the catalogue is a kilometre high, and 1000 would swallow a metre/foot mix-up.
    assert.ok(landmark.height_m < 1000, `${landmark.slug}: ${landmark.height_m} m is not a building`);
  }
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
  // The rule has to bite, or the test above passes for the wrong reason: two near-identical dark
  // blues look like a flat card, not a gradient, and a shipped pair like that must fail.
  const flat = distance("#243a52", "#243b53");
  assert.ok(flat < MIN_ACCENT_DISTANCE, "two shades of one blue must be rejected");
  assert.ok(distance("#dfe6ee", "#243a52") > MIN_ACCENT_DISTANCE, "and a real light/dark pair must pass");
});

test("every entry carries at least two checkable facts, and none of them is a fragment", () => {
  for (const landmark of BATCH) {
    const { slug, fun_facts: facts } = landmark;
    assert.ok(Array.isArray(facts), `${slug}: fun_facts is not an array`);
    assert.ok(facts.length >= 2, `${slug}: has ${facts.length} fun_facts, and two is the floor`);
    assert.ok(facts.length <= 4, `${slug}: has ${facts.length} fun_facts; four is what the card holds`);

    for (const fact of facts) {
      assert.equal(typeof fact, "string", `${slug}: a fun_fact is not a string`);
      // Thirty characters is roughly a clause with a number in it; anything shorter is a label
      // pretending to be a fact.
      assert.ok(fact.length >= 30, `${slug}: "${fact}" is too short to be a fact`);
    }
    assert.equal(new Set(facts).size, facts.length, `${slug}: repeats a fun_fact`);
  }
});

test("at least one fact per entry carries a number", () => {
  // "It is one of the most visited monuments in the world" is not a fact, and this is the test that
  // says so: a checkable fact about a building almost always has a figure in it.
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
    assert.ok(description.length >= 120, `${slug}: ${description.length} characters is a stub, not a description`);
    assert.ok(description.trim().endsWith("."), `${slug}: the description does not end in a full stop`);
    assert.ok(description.includes(" "), `${slug}: the description is one word`);
    assert.ok(!description.includes("  "), `${slug}: the description has a double space`);
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
      KINDS.includes(landmark.kind),
      `${landmark.slug}: ${landmark.kind} is not one of the six kinds the filter row renders`,
    );
    assert.ok(
      KEBAB.test(kebab(landmark.city)) && kebab(landmark.city).length > 0,
      `${landmark.slug}: the city has nothing a place name can be made of`,
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

test("every entry has a model, and every model_url points at a file that exists", () => {
  // This batch has been through the pipeline and came out complete: all sixteen were sourced, so the
  // invariant here is stronger than in the earlier batches, where four entries still have no model.
  // Every URL must still be one the pipeline writes - a path typed in by hand would be a model nobody
  // licensed, credited or counted, and the pipeline would then skip a landmark it believes is done.
  for (const landmark of BATCH) {
    assert.match(
      landmark.model_url ?? "",
      /^\/models\/landmarks\/[a-z0-9-]+\.glb$/,
      `${landmark.slug}: model_url is ${JSON.stringify(landmark.model_url)}, not a path the pipeline writes`,
    );
    assert.ok(
      existsSync(join(process.cwd(), "public", landmark.model_url)),
      `${landmark.slug} points at ${landmark.model_url}, which is not in the repository`,
    );
  }
});
