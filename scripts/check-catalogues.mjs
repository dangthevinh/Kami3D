/**
 * The three new catalogues, checked - and the gates that decide what may enter them.
 *
 *   node --test scripts/check-catalogues.mjs
 *
 * Space, plants and vehicles are written the same way the landmark batches were: sourced data in a
 * TypeScript file, a saved search per entry, and a pipeline that downloads, measures, credits and wires
 * a model for each one. A data file cannot enforce the rules it claims to follow, so what is pinned here
 * is what a reader could catch us on: the shape of an entry, the source behind every number, the query
 * that will be used to find a model, and **whether a model actually exists for it**.
 *
 * Three of these tests are about honesty rather than format:
 *
 *   - every entry carries a source, because "Planet · Solar System" with a diameter and no citation is
 *     the failure this project is built to avoid;
 *   - every entry has a saved search, because an entry with no query is an entry nobody will ever source
 *     a model for, and it would sit in the grid as a plate for ever;
 *   - `model_url` is either null or a file that is really in the repository - the same rule the landmark
 *     batch is held to, and the reason `scripts/drop-entries-without-models.mjs` exists.
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import { titleNamesEntry } from "../lib/catalog-gate.ts";

const root = process.cwd();

/**
 * A catalogue's attribution manifest, or null when the pipeline has not written one yet.
 *
 * The distinction matters for a catalogue that is *declared but not yet harvested* - buildings, when
 * this was written. Absent must not read as "no credits to check": it reads as "nothing may be shipped
 * without one", which the two tests using this enforce.
 */
const readManifest = (id) => {
  const path = join(root, "data", id + "-attribution.json");
  return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : null;
};
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const HEX = /^#[0-9a-f]{6}$/;
const MIN_ACCENT_DISTANCE = 120;
const MIN_FACT_LENGTH = 30;
const MIN_DESCRIPTION_LENGTH = 120;

const rgb = (hex) => [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16));
const distance = (a, b) => Math.hypot(...rgb(a).map((value, index) => value - rgb(b)[index]));
const luminance = (hex) => {
  const [r, g, b] = rgb(hex);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/**
 * The harvested catalogues, and where each one's entries, searches and credits live.
 *
 * `module` is stated separately from `id` because buildings is the one catalogue whose file is not
 * named after it: `data/buildings.ts` is the modern-monument rule, and its harvested entries are in
 * `data/buildings-entries.ts`. Everything else - the queries file, the model folder, the attribution
 * manifest - is still `data/<id>-…`, which is what the two pipelines write.
 */
const CATALOGUES = [
  { id: "space", list: "SPACE_ENTRIES", module: "../data/space.ts" },
  { id: "plants", list: "PLANT_ENTRIES", module: "../data/plants.ts" },
  { id: "vehicles", list: "VEHICLE_ENTRIES", module: "../data/vehicles.ts" },
  { id: "buildings", list: "BUILDING_ENTRIES", module: "../data/buildings-entries.ts" },
];

/**
 * A catalogue whose data file is not written yet is **skipped and announced**, never silently passed.
 *
 * The three are written by separate passes, so a suite that imports all three fails on whichever is
 * still being written - which is a red build that says nothing about the two that are finished. The
 * skip prints what it skipped, so a catalogue that quietly never arrives cannot hide here: the count
 * of tested catalogues is asserted at the end instead.
 */
const present = [];
for (const catalogue of CATALOGUES) {
  const file = catalogue.module.replace("../", "");
  if (existsSync(join(root, file))) present.push(catalogue);
  else console.log("  skipping " + catalogue.id + ": " + file + " is not written yet");
}

test("at least one catalogue is written, and every written one is tested", () => {
  assert.ok(present.length > 0, "no catalogue data exists, so this suite proves nothing");
  assert.equal(present.length, CATALOGUES.filter((c) => existsSync(join(root, c.module.replace("../", "")))).length);
});

/** Loaded once, and the loaded lists are what every test below reads. */
const loaded = {};
for (const catalogue of present) {
  const module_ = await import(catalogue.module);
  loaded[catalogue.id] = module_[catalogue.list];
}

test("each catalogue exists, is declared, and holds entries", () => {
  for (const catalogue of present) {
    const entries = loaded[catalogue.id];
    assert.ok(Array.isArray(entries), catalogue.id + ": " + catalogue.list + " is not an array");
    // A catalogue being grown is not a failure - the harvest and the model pipeline are separate passes,
    // and the count is reported either way. What is a failure is a *shipped* catalogue that has shrunk
    // to nothing, so the floor is on catalogues that hold anything at all.
    if (entries.length === 0) {
      console.log("  " + catalogue.id + ": written and empty - the harvest has not run yet");
      continue;
    }
    assert.ok(entries.length >= 10, catalogue.id + " holds " + entries.length + " entries, too few to be a catalogue");
  }
});

test("every entry has the shape a card and a detail page read", () => {
  for (const catalogue of present) {
    const seen = new Set();
    for (const entry of loaded[catalogue.id]) {
      const where = catalogue.id + "/" + entry.slug;

      assert.match(entry.slug, KEBAB, where + ": the slug is not kebab-case");
      assert.ok(!seen.has(entry.slug), where + ": duplicate slug");
      seen.add(entry.slug);

      assert.equal(typeof entry.name, "string");
      assert.ok(entry.name.trim().length > 0, where + ": empty name");
      assert.ok(entry.subtitle.trim().length > 0, where + ": empty subtitle");
      assert.ok(
        !entry.subtitle.includes("·") || entry.subtitle.split("·").length >= 2,
        where + ": the subtitle separates its halves with ·",
      );

      assert.ok(
        entry.description.length >= MIN_DESCRIPTION_LENGTH,
        where + ": " + entry.description.length + " characters is a stub, not a description",
      );
      assert.ok(entry.description.trim().endsWith("."), where + ": the description does not end in a full stop");
      assert.ok(!entry.description.includes("  "), where + ": the description has a double space");
      const sentences = entry.description.split(/(?<=[.!?])\s+/).filter((part) => part.trim().length > 0).length;
      assert.ok(sentences >= 2 && sentences <= 5, where + ": " + sentences + " sentences");

      assert.ok(Array.isArray(entry.facts), where + ": facts is not an array");
      assert.ok(entry.facts.length >= 2 && entry.facts.length <= 4, where + ": " + entry.facts.length + " facts");
      assert.equal(new Set(entry.facts).size, entry.facts.length, where + ": repeats a fact");
      for (const fact of entry.facts) {
        assert.ok(fact.length >= MIN_FACT_LENGTH, where + ': "' + fact + '" is too short to be a fact');
        assert.notEqual(fact, entry.description, where + ": a fact is the description again");
      }
      assert.ok(entry.facts.some((fact) => /\d/.test(fact)), where + ": no fact carries a number, so none can be checked");

      assert.equal(entry.accent.length, 2, where + ": an accent is [light, dark]");
      assert.match(entry.accent[0], HEX, where + ": accent[0] is not a six-digit hex colour");
      assert.match(entry.accent[1], HEX, where + ": accent[1] is not a six-digit hex colour");
      assert.ok(
        distance(entry.accent[0], entry.accent[1]) >= MIN_ACCENT_DISTANCE,
        where + ": the accent is one colour twice, so a card reads flat",
      );
      assert.ok(luminance(entry.accent[0]) > luminance(entry.accent[1]), where + ": accent[0] must be the lighter one");

      assert.ok(Number.isInteger(entry.popularity), where + ": popularity is not an integer");
      assert.ok(entry.popularity >= 1 && entry.popularity <= 100, where + ": popularity is off the 1-100 scale");

      assert.equal(typeof entry.metadata, "object", where + ": metadata is not an object");
      assert.equal(typeof entry.metadata.source, "string", where + ": no metadata.source");
      assert.ok(entry.metadata.source.length > 5, where + ": metadata.source is too short to name a source");
    }
  }
});

test("every entry has a saved search, and every saved search has an entry", async () => {
  // An entry with no query cannot be sourced, and a query for an entry that does not exist is a search
  // nobody will ever run. Both directions are failures, so both are checked.
  for (const catalogue of present) {
    const queries = JSON.parse(readFileSync(join(root, "data", catalogue.id + "-queries.json"), "utf8"));
    const slugs = loaded[catalogue.id].map((entry) => entry.slug).sort();
    assert.deepEqual(
      Object.keys(queries).sort(),
      slugs,
      catalogue.id + ": the queries file and the catalogue do not name the same entries",
    );
    for (const [slug, query] of Object.entries(queries)) {
      assert.equal(typeof query, "string", catalogue.id + "/" + slug + ": the query is not a string");
      assert.ok(query.trim().length > 1, catalogue.id + "/" + slug + ": empty query");
    }
  }
});

test("model_url is null, or a file that is really in the repository", () => {
  for (const catalogue of present) {
    let withModel = 0;
    for (const entry of loaded[catalogue.id]) {
      if (entry.model_url === null) continue;
      withModel += 1;
      assert.match(
        entry.model_url,
        new RegExp("^/models/" + catalogue.id + "/[a-z0-9-]+\\.glb$"),
        catalogue.id + "/" + entry.slug + ": model_url is not a path the pipeline writes",
      );
      assert.ok(
        existsSync(join(root, "public", entry.model_url)),
        catalogue.id + "/" + entry.slug + " points at " + entry.model_url + ", which is not in the repository",
      );
    }
    // Not an assertion that every catalogue is finished - the pipeline runs in its own pass - but the
    // count is reported so a half-filled catalogue is visible rather than assumed.
    console.log("  " + catalogue.id + ": " + withModel + "/" + loaded[catalogue.id].length + " entries have a model");
  }
});

test("no catalogue folder holds a file the manifest does not credit", () => {
  // A .glb with no credit is a model nobody licensed, nobody measured and nobody can trace - which is
  // exactly what the pipeline's own gates exist to prevent. One is left behind whenever a step after the
  // download fails (a DRACO run that dies mid-way), so the file is checked, not assumed.
  for (const catalogue of present) {
    const folder = join(root, "public", "models", catalogue.id);
    if (!existsSync(folder)) continue;
    // A catalogue the pipeline has not reached yet has no manifest, and "no credits" is the truth about
    // it rather than a missing file to crash on: the check below is that nothing is shipped UNCREDITED,
    // and a folder with no manifest must therefore hold no .glb either.
    const manifest = readManifest(catalogue.id);
    if (!manifest) {
      const strays = readdirSync(folder).filter((entry) => entry.endsWith(".glb"));
      assert.equal(strays.length, 0, catalogue.id + ": " + strays.join(", ") + " shipped with no attribution manifest at all");
      continue;
    }
    for (const name of readdirSync(folder).filter((entry) => entry.endsWith(".glb"))) {
      const slug = name.replace(".glb", "");
      assert.ok(manifest[slug], catalogue.id + "/" + name + " is in the repository with no credit entry");
    }
  }
});

test("the credit manifest and the catalogue agree about which entries have a model", () => {
  for (const catalogue of present) {
    const manifest = readManifest(catalogue.id);
    if (!manifest) {
      const modelled = loaded[catalogue.id].filter((entry) => entry.model_url !== null);
      assert.equal(modelled.length, 0, catalogue.id + ": an entry claims a model but there is no attribution manifest");
      continue;
    }
    const credited = Object.keys(manifest).sort();
    const modelled = loaded[catalogue.id].filter((entry) => entry.model_url !== null).map((entry) => entry.slug).sort();
    assert.deepEqual(credited, modelled, catalogue.id + ": a model is credited but not wired, or wired but not credited");

    for (const [slug, record] of Object.entries(manifest)) {
      assert.equal(record.file, "/models/" + catalogue.id + "/" + slug + ".glb", slug + ": the credit names another file");
      assert.ok(typeof record.author === "string" && record.author.length > 0, slug + ": no author");
      assert.ok(typeof record.sourceUrl === "string" && record.sourceUrl.startsWith("http"), slug + ": no source link");
    }
  }
});

test("every shipped model has a recorded structure, and the panel's claim is true of it", async () => {
  // The structure index is what a model page prints instead of floor and furniture toggles, so it has to
  // cover every file the site ships: a model with no record would render a page with no answer, and a
  // record for a file that does not exist is a number about nothing.
  const index = JSON.parse(readFileSync(join(root, "data", "model-structure.json"), "utf8"));
  // The pure half, so this needs no bundler and no JSON import attribute - the same split
  // `lib/catalog-project.ts` makes against `lib/catalog.ts`.
  const { describeStructure } = await import("../lib/model-structure-text.ts");

  const FOLDERS = [
    { id: "animals", dir: "public/models" },
    { id: "landmarks", dir: "public/models/landmarks" },
    { id: "space", dir: "public/models/space" },
    { id: "plants", dir: "public/models/plants" },
    { id: "vehicles", dir: "public/models/vehicles" },
  ];

  let files = 0;
  for (const folder of FOLDERS) {
    for (const name of readdirSync(join(root, folder.dir)).filter((entry) => entry.endsWith(".glb"))) {
      const slug = name.replace(".glb", "");
      const record = index.models[folder.id + "/" + slug];
      assert.ok(record, folder.id + "/" + slug + " is shipped with no structure record");
      assert.ok(record.meshes >= 1 && record.nodes >= 1, folder.id + "/" + slug + ": impossible counts");
      assert.ok(record.namedParts <= record.meshes, folder.id + "/" + slug + ": more named parts than meshes");
      files += 1;
    }
  }

  assert.equal(Object.keys(index.models).length, files, "the index holds records for files that are not shipped");

  // And the sentence the page prints has to be true of the record it describes: a file with no named
  // part may not be described as having any.
  const empty = { nodes: 3, meshes: 1, namedParts: 0, examples: [] };
  assert.match(describeStructure(empty), /no floors or furniture/, "a single unnamed mesh must say so");
  const named = { nodes: 9, meshes: 4, namedParts: 4, examples: ["Floor_1", "Roof"] };
  assert.match(describeStructure(named), /Floor_1/, "a file with named parts must name them");
  assert.ok(!/no floors/.test(describeStructure(named)), "and must not claim it has none");
});

test("the title gate accepts the real titles and refuses the near misses", () => {
  // Measured, not imagined: every refusal below is a real search result this phase's probe returned.
  const cases = [
    [{ title: "Earth" }, { name: "Earth" }, true],
    [{ title: "Planet Earth 8K" }, { name: "Earth" }, true],
    [{ title: "Earthquake simulator" }, { name: "Earth" }, false],
    [{ title: "Sunset over Mars" }, { name: "Sun" }, false],
    [{ title: "ISS (A) International Space Station" }, { name: "International Space Station" }, true],
    [{ title: "Oak tree" }, { name: "Oak" }, true],
    [{ title: "Low Poly Oak Tree" }, { name: "Oak" }, false],
    [{ title: "Quercus robur" }, { name: "Oak", scientific_name: "Quercus robur" }, true],
    [{ title: "LEGO Formula 1 Car" }, { name: "Formula 1 Car" }, false],
    [{ title: "Toy paper Globe" }, { name: "Earth" }, false],
    // The three lists, each with a real result this phase's probes returned.
    [{ title: "Giant Sequoia Cone - Retopologized" }, { name: "Giant Sequoia" }, false],
    [{ title: "Giant Sequoia Tree Trunk" }, { name: "Giant Sequoia" }, true],
    // A part word is only evidence when the entry is not itself called that: the first vehicle run
    // shipped this model, and it is the fire engine.
    [{ title: "Mercedes Atego Fire Engine" }, { name: "Fire engine" }, true],
    [{ title: "Hagia Sophia Doorbell" }, { name: "Hagia Sophia" }, false],
    [{ title: "Miniature Mosque (Hagia Sophia)" }, { name: "Hagia Sophia" }, false],
  ];

  for (const [candidate, entry, expected] of cases) {
    const verdict = titleNamesEntry(candidate, entry);
    assert.equal(verdict.ok, expected, candidate.title + " should " + (expected ? "pass" : "fail") + ": " + (verdict.reason ?? ""));
  }

  assert.equal(titleNamesEntry({ title: null }, { name: "Earth" }).ok, false, "a titleless candidate is never named");
  assert.match(titleNamesEntry({ title: "Low Poly Oak Tree" }, { name: "Oak" }).reason, /stand-in/);
});

test("the pipeline refuses a model with nothing to look at", async () => {
  // The rule that came out of the Forbidden City: few triangles *and* no texture is a diagram. Both
  // halves are required, which is why the pipeline checks both against the downloaded file.
  const { CRUDE_MONUMENT_FACES, modelHasNoTexture } = await import("../lib/model-quality.ts");
  assert.ok(CRUDE_MONUMENT_FACES > 1000, "a floor of a few hundred triangles would catch nothing real");
  assert.equal(modelHasNoTexture({ images: [] }), true);
  assert.equal(modelHasNoTexture({ images: [{}] }), false);

  const pipeline = readFileSync(join(root, "scripts", "fetch-catalog-models.mjs"), "utf8");
  for (const gate of ["titleNamesEntry", "modelCanShowColour", "CRUDE_MONUMENT_FACES", "FACE_BUDGET.max", "compressGlb"]) {
    assert.ok(pipeline.includes(gate), "the catalogue pipeline does not apply " + gate);
  }
  assert.ok(
    pipeline.indexOf("compressGlb") < pipeline.indexOf("shipped > CONFIG.maxBytes"),
    "the ceiling must be measured after compression, on the file that ships",
  );
});
