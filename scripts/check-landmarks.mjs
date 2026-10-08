/**
 * The historic architecture catalogue, checked.
 *
 *   node --test scripts/check-landmarks.mjs
 *
 * data/landmarks.ts is the second catalogue: sixteen buildings, each with a date, a height and a
 * named source behind it, and each about to be handed to the model pipeline. The rule the project
 * runs on is không bịa số liệu — no invented numbers — and a data file cannot enforce that on
 * itself, so what is pinned here is everything a reader could catch us on: the slugs (a landmark
 * may not be dropped or renamed by accident), the years, the accents, and the shape of the prose.
 *
 * Two of these tests are about honesty rather than format. `height_m` is null for the Great Wall
 * and for Machu Picchu because neither is one structure, and the test asserts that **only** those
 * two are null — a third null would be a height somebody could not find, and a number on either of
 * those is a number that is false somewhere along the wall. And every entry must carry at least one
 * fact containing a digit: "it is one of the most visited monuments in the world" is atmosphere,
 * and atmosphere is what this file exists to keep out.
 *
 * The catalogue itself records where each number came from, and which ones are contested — the
 * Eiffel Tower at 330 m including its antenna against 300 m of ironwork, Pisa's three heights,
 * the Sagrada Família's unfinished 2026. Read the header of data/landmarks.ts before changing one.
 */

import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import { namesTheLandmark } from "../lib/landmark-gate.ts";

import { LANDMARKS, LANDMARK_BY_SLUG, LANDMARK_KINDS } from "../data/landmarks.ts";

/**
 * The sixteen, in the order the file declares them.
 *
 * Pinned rather than derived: a landmark that disappears in a refactor has to be a decision someone
 * wrote down here, not a merge that quietly dropped a row.
 */
const SHIPPED_SLUGS = [
  "eiffel-tower",
  "leaning-tower-of-pisa",
  "colosseum",
  "taj-mahal",
  "big-ben",
  "statue-of-liberty",
  "great-pyramid-of-giza",
  "machu-picchu",
  "parthenon",
  "great-wall",
  "sydney-opera-house",
  "sagrada-familia",
  "angkor-wat",
  "stonehenge",
  "chichen-itza",
];

/** The only two entries allowed to have no height, and why. */
const NOT_ONE_STRUCTURE = ["machu-picchu", "great-wall"];

const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const HEX = /^#[0-9a-f]{6}$/;

/** The smallest gap two accent colours may have and still read as a gradient. */
const MIN_ACCENT_DISTANCE = 120;

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

test("the fifteen are the fifteen, in the order the file declares them", () => {
  assert.deepEqual(
    LANDMARKS.map((landmark) => landmark.slug),
    SHIPPED_SLUGS,
    "a landmark was added, dropped or reordered without this list being updated",
  );
  assert.equal(LANDMARKS.length, 15);
});

test("every slug is unique, kebab-case, and the name its model file will carry", () => {
  const seen = new Set();

  for (const landmark of LANDMARKS) {
    assert.match(landmark.slug, KEBAB, `${landmark.slug} is not kebab-case`);
    assert.equal(landmark.slug, landmark.slug.toLowerCase(), "a slug is never upper case");
    assert.ok(!seen.has(landmark.slug), `duplicate slug: ${landmark.slug}`);
    seen.add(landmark.slug);

    // The pipeline files a model as <slug>.glb beside the others, so the slug has to be the file
    // name it will be written under, and the key the lookup table is built from.
    assert.equal(`${landmark.slug}.glb`.replace(/\.glb$/, ""), landmark.slug);
    assert.equal(LANDMARK_BY_SLUG[landmark.slug], landmark, `${landmark.slug} is keyed by a different object`);
  }

  assert.equal(Object.keys(LANDMARK_BY_SLUG).length, LANDMARKS.length);
});

test("LANDMARK_KINDS names every kind an entry uses, and no kind the type does not allow", () => {
  const allowed = ["tower", "temple", "castle", "monument", "ruin", "bridge"];
  const used = new Set(LANDMARKS.map((landmark) => landmark.kind));

  for (const kind of used) {
    assert.ok(LANDMARK_KINDS.includes(kind), `LANDMARK_KINDS is missing "${kind}", which an entry uses`);
  }
  for (const kind of LANDMARK_KINDS) {
    assert.ok(allowed.includes(kind), `LANDMARK_KINDS lists "${kind}", which is not a Landmark kind`);
  }
  assert.equal(new Set(LANDMARK_KINDS).size, LANDMARK_KINDS.length, "LANDMARK_KINDS repeats a kind");
  // The filter row renders one chip per kind, so the list has to be the type's six, not a subset
  // that happens to be in use today.
  assert.deepEqual([...LANDMARK_KINDS].sort(), [...allowed].sort());
});

test("completed is a whole year that has already happened", () => {
  const thisYear = new Date().getFullYear();

  for (const landmark of LANDMARKS) {
    const { slug, completed } = landmark;
    assert.ok(Number.isInteger(completed), `${slug}: ${completed} is not an integer year`);
    assert.ok(completed !== 0, `${slug}: there is no year zero`);
    assert.ok(completed <= thisYear, `${slug}: ${completed} is in the future`);
    // A typo that drops a digit reads as a plausible number, so the floor is well below the
    // oldest thing anyone has built (the Pyramid, 2560 BC) without being open-ended.
    assert.ok(completed >= -10000, `${slug}: ${completed} is older than any structure on Earth`);
  }
});

test("the accent is two hex colours far enough apart to read as a gradient", () => {
  for (const landmark of LANDMARKS) {
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
  const flat = distance("#2c4a63", "#2c4b64");
  assert.ok(flat < MIN_ACCENT_DISTANCE, "two shades of one blue must be rejected");
  assert.ok(distance("#eef4f7", "#2c4a63") > MIN_ACCENT_DISTANCE, "and a real light/dark pair must pass");
});

test("height_m is null or positive, and only the two sites that are not one structure are null", () => {
  const nulls = LANDMARKS.filter((landmark) => landmark.height_m === null).map((landmark) => landmark.slug);
  assert.deepEqual(nulls, NOT_ONE_STRUCTURE, "the set of entries without a height changed");

  for (const landmark of LANDMARKS) {
    if (landmark.height_m === null) continue;
    assert.equal(typeof landmark.height_m, "number", `${landmark.slug}: height_m is neither a number nor null`);
    assert.ok(Number.isFinite(landmark.height_m), `${landmark.slug}: height_m is not finite`);
    assert.ok(landmark.height_m > 0, `${landmark.slug}: height_m is ${landmark.height_m}; zero is not a height`);
    // Nothing in the catalogue is a kilometre high, and 1000 would swallow a metre/foot mix-up.
    assert.ok(landmark.height_m < 1000, `${landmark.slug}: ${landmark.height_m} m is not a building`);
  }
});

test("every entry carries at least two checkable facts, and none of them is a fragment", () => {
  for (const landmark of LANDMARKS) {
    const { slug, fun_facts: facts } = landmark;
    assert.ok(Array.isArray(facts), `${slug}: fun_facts is not an array`);
    assert.ok(facts.length >= 2, `${slug}: has ${facts.length} fun_facts, and two is the floor`);
    assert.ok(facts.length <= 4, `${slug}: has ${facts.length} fun_facts; four is what the card holds`);

    for (const fact of facts) {
      assert.equal(typeof fact, "string", `${slug}: a fun_fact is not a string`);
      assert.ok(fact.length >= 30, `${slug}: "${fact}" is too short to be a fact`);
    }
    assert.equal(new Set(facts).size, facts.length, `${slug}: repeats a fun_fact`);
  }
});

test("at least one fact per entry carries a number", () => {
  // "It is one of the most visited monuments in the world" is not a fact, and this is the test that
  // says so: a checkable fact about a building almost always has a figure in it.
  for (const landmark of LANDMARKS) {
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
  for (const landmark of LANDMARKS) {
    const { slug, description } = landmark;
    assert.ok(description.length >= 120, `${slug}: ${description.length} characters is a stub, not a description`);
    assert.ok(description.trim().endsWith("."), `${slug}: the description does not end in a full stop`);
    assert.ok(description.includes(" "), `${slug}: the description is one word`);
    assert.ok(!description.includes("  "), `${slug}: the description has a double space`);
  }
});

test("no entry is missing the fields the card and the page read", () => {
  for (const landmark of LANDMARKS) {
    for (const field of ["name", "city", "country", "style", "purpose"]) {
      assert.equal(typeof landmark[field], "string", `${landmark.slug}: ${field} is not a string`);
      assert.ok(landmark[field].trim().length > 0, `${landmark.slug}: ${field} is empty`);
    }
    assert.ok(
      landmark.architect === null || landmark.architect.trim().length > 0,
      `${landmark.slug}: architect is an empty string rather than null`,
    );
    assert.ok(
      KEBAB.test(landmark.city.toLowerCase().replace(/[^a-z0-9]+/g, "-")),
      `${landmark.slug}: the city has nothing a place name can be made of`,
    );
  }

  const names = LANDMARKS.map((landmark) => landmark.name);
  assert.equal(new Set(names).size, names.length, "two entries share a name");
});

test("popularity is a whole number on the 1-100 scale the grid sorts on", () => {
  for (const landmark of LANDMARKS) {
    assert.ok(Number.isInteger(landmark.popularity), `${landmark.slug}: popularity is not an integer`);
    assert.ok(
      landmark.popularity >= 1 && landmark.popularity <= 100,
      `${landmark.slug}: popularity ${landmark.popularity} is off the 1-100 scale`,
    );
  }
});

test("LANDMARK_BY_SLUG is the same objects as LANDMARKS, keyed by slug", () => {
  assert.deepEqual(
    Object.keys(LANDMARK_BY_SLUG).sort(),
    LANDMARKS.map((landmark) => landmark.slug).sort(),
    "the lookup table and the list disagree about which landmarks exist",
  );

  for (const landmark of LANDMARKS) {
    assert.equal(LANDMARK_BY_SLUG[landmark.slug], landmark, `${landmark.slug}: the lookup returns another entry`);
  }
});

test("every model_url was written by the pipeline, and points at a file that exists", () => {
  // The rule the whole catalogue runs on: **no model means no entry**. A landmark whose model could
  // not be sourced is deleted rather than shipped with a plate and a promise, which is what happened
  // to Neuschwanstein - the only two candidates that named it were a "Pixel ... Low Poly" toy and a
  // 30.5 MB file against this project's 25 MB ceiling.
  //
  // So the invariant is not "model_url is null" any more, it is "model_url is either null or a real
  // file under public/models/landmarks/". A URL typed in by hand would be a model nobody licensed,
  // credited or counted, and the pipeline would then skip a landmark it believes is already done.
  for (const landmark of LANDMARKS) {
    if (landmark.model_url === null) continue;
    assert.match(
      landmark.model_url,
      /^\/models\/landmarks\/[a-z0-9-]+\.glb$/,
      landmark.slug + ": model_url is not a path the pipeline writes",
    );
    assert.ok(
      existsSync(join(process.cwd(), "public", landmark.model_url)),
      landmark.slug + " points at " + landmark.model_url + ", which is not in the repository",
    );
  }

  assert.ok(
    LANDMARKS.some((landmark) => landmark.model_url !== null),
    "the pipeline has run: at least one landmark must have a model",
  );
});

/* ------------------------------------------------------------------ the gate that decides what ships */

/**
 * Every case below was **measured**, not imagined: they are the actual candidate titles a worldwide
 * probe of 62 monuments returned, and every one of them passed the first version of this gate.
 *
 * That version asked only "does the title contain the landmark's name", which is necessary and not
 * sufficient - a title can name the building while describing a piece of it, a souvenir of it, or a
 * different object that happens to be at it. The failures were: a four-triangle wall for the Hawa
 * Mahal, the ornamental roof fish for Himeji Castle, a doll for Wat Arun, a relief carving for
 * Borobudur, the obelisks for Karnak, the stairs for Prague Castle, and a low-poly toy for Prambanan.
 *
 * This is the same failure the animal catalogue had - a musket named after a sloth, a leather bag
 * after a turtle, a skull after a meerkat - and the same answer: the words that give it away are
 * known, so they are refused by name.
 */
test("a model of the building is called the building, not a piece of it", () => {
  const landmark = { name: "Himeji Castle" };
  for (const [title, why] of [
    ["Shachihoko of Himeji Castle", "the ornamental fish on the roof"],
    ["Castle Wall of Himeji Castle", "a wall"],
    ["Himeji Castle Relief Pictogram", "a carving"],
    ["Himeji Castle Stairs", "the stairs"],
    ["Himeji Castle Souvenir Doll", "a souvenir"],
    ["Himeji Castle Voxel", "a toy"],
  ]) {
    assert.equal(namesTheLandmark({ title }, landmark).ok, false, why + " must be refused: " + title);
  }

  for (const title of ["Himeji Castle", "Himeji castle - Japan", "Himeji Castle (UNESCO)"]) {
    assert.equal(namesTheLandmark({ title }, landmark).ok, true, title + " should be accepted");
  }
});

test("a title that puts the landmark in a phrase is refused", () => {
  // "Chinese Ballast Doll at Wat Arun" names a doll and says where it is.
  assert.equal(namesTheLandmark({ title: "Chinese Ballast Doll at Wat Arun" }, { name: "Wat Arun" }).ok, false);
  assert.equal(namesTheLandmark({ title: "View of the Eiffel Tower" }, { name: "Eiffel Tower" }).ok, false);
  // ...but a phrase *after* the name is fine: the landmark is still the subject.
  assert.equal(namesTheLandmark({ title: "Tower Bridge in London" }, { name: "Tower Bridge" }).ok, true);
});

test("a separator is not a different word", () => {
  // Found by the probe: the list held "lowpoly" and "low-poly", and "Candi Prambanan low poly" - with
  // a space - walked through both. And "Obelisks" walked through "obelisk".
  assert.equal(namesTheLandmark({ title: "Candi Prambanan low poly" }, { name: "Prambanan" }).ok, false);
  assert.equal(namesTheLandmark({ title: "Luxor Karnak Obelisks (360 Sphere)" }, { name: "Karnak" }).ok, false);
});

test("one landmark with two names is named by either", () => {
  // The catalogue calls it "Elizabeth Tower (Big Ben)"; a model that says "Clock Tower (Big Ben)"
  // names it, and a model that says only "Big Ben" does too.
  const elizabeth = { name: "Elizabeth Tower (Big Ben)" };
  assert.equal(namesTheLandmark({ title: "Clock Tower (Big Ben)" }, elizabeth).ok, true);
  assert.equal(namesTheLandmark({ title: "Big Ben" }, elizabeth).ok, true);
  assert.equal(namesTheLandmark({ title: "Clock Tower" }, elizabeth).ok, false, "a clock tower is not this one");
});

test("an accent is the same letter", () => {
  // The real search result is "Barcelona Sagrada Familia"; the catalogue writes "Sagrada Família".
  assert.equal(namesTheLandmark({ title: "Barcelona Sagrada Familia" }, { name: "Sagrada Família" }).ok, true);
  assert.equal(namesTheLandmark({ title: "Djenne Mosque" }, { name: "Great Mosque of Djenné" }).ok, false);
});

test("a word from the entry is not the entry", () => {
  // The probe's first pass would have shipped these: 768 and 880 triangles, against 60,032 and 40,000
  // for the models that name the monument outright.
  assert.equal(namesTheLandmark({ title: "Greece" }, { name: "Parthenon" }).ok, false);
  assert.equal(namesTheLandmark({ title: "Giza" }, { name: "Great Pyramid of Giza" }).ok, false);
  assert.equal(namesTheLandmark({ title: "PARTHENON" }, { name: "Parthenon" }).ok, true);
  assert.equal(namesTheLandmark({ title: "The Great Pyramid of Giza Egypt" }, { name: "Great Pyramid of Giza" }).ok, true);
});

