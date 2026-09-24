/**
 * Assertions for the Sketchfab embeds.
 *
 * Embedding somebody's model is a smaller act than redistributing it, but it is not a free
 * one: the iframe puts their viewer, their cookies and their JavaScript on a page that also
 * carries advertising, and CC BY obliges us to name the author **wherever the work appears**.
 * Both of those are easy to lose in a later refactor, so they are pinned here rather than
 * trusted to review:
 *
 *   the allow-list   only CC0 / CC BY, read from the same list every download has to pass
 *   the credit       title, author and licence render in *both* states of the component —
 *                    before the model loads and after
 *   the deferral     the iframe exists nowhere in the component except inside the branch that
 *                    useState(false) opens, so a page load cannot fetch it by accident
 *   the URL          built from the uid alone, so a curated entry cannot point the frame at
 *                    some other origin
 *   the wiring       the species page and the card each render it behind an existence check,
 *                    so a species with no curated model gains no markup at all
 *
 * Run with: npm run check:embeds
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import { ANIMALS } from "../data/animals.ts";
import { FACE_BUDGET, MODEL_LICENSES } from "../lib/model-quality.ts";

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), "utf8");

const data = JSON.parse(read("data/sketchfab-embeds.json"));
const embeds = data.embeds;
const lib = read("lib/sketchfab.ts");
const component = read("components/animal/SketchfabEmbed.tsx");
const page = read("app/animal/[slug]/page.tsx");
const card = read("components/animal/AnimalCard.tsx");
const layout = read("app/layout.tsx");

const slugs = new Set(ANIMALS.map((animal) => animal.slug));
/** The branch that only runs once a visitor has asked for the model. */
const loadedBranch = () => component.slice(component.indexOf("{loaded ? ("), component.indexOf(") : ("));

test("the licence allow-list is the one the download pipeline uses", () => {
  assert.deepEqual([...MODEL_LICENSES], ["CC0", "CC-BY"]);

  // The module is read as text rather than imported: it pulls the curated list in through the
  // `@/` alias, which node --test cannot resolve. Everything that matters here is visible in
  // the source anyway, and "does it still share the allow-list" is exactly a source question.
  assert.ok(
    lib.includes(`import { MODEL_LICENSES, type ModelLicense } from "@/lib/model-quality";`),
    "lib/sketchfab.ts must import the allow-list, not restate it",
  );
  assert.ok(lib.includes("export const EMBED_LICENSES = MODEL_LICENSES;"), "and must alias it");
  assert.ok(!/\["CC0"/.test(lib), "a second copy of the licence list would drift from the first");
});

test("the curated list is unique and names real species", () => {
  assert.ok(Array.isArray(embeds) && embeds.length > 0, "a list with no entries is a list nobody checked");

  const seenSlugs = new Set();
  const seenUids = new Set();
  for (const embed of embeds) {
    assert.match(embed.uid, /^[0-9a-f]{32}$/, embed.slug + ": a Sketchfab uid is 32 hex characters");
    assert.equal(seenUids.has(embed.uid), false, embed.slug + ": uid " + embed.uid + " appears twice");
    assert.equal(seenSlugs.has(embed.slug), false, embed.slug + ": slug appears twice");
    seenSlugs.add(embed.slug);
    seenUids.add(embed.uid);
    assert.ok(slugs.has(embed.slug), embed.slug + " is not a species in the catalogue");
  }
});

test("every embed carries the credit its licence requires", () => {
  for (const embed of embeds) {
    for (const field of ["title", "author", "licenseLabel", "note"]) {
      assert.equal(typeof embed[field], "string", embed.slug + "." + field + " must be a string");
      assert.ok(embed[field].trim().length > 0, embed.slug + "." + field + " is empty");
    }

    assert.ok(
      MODEL_LICENSES.includes(embed.license),
      embed.slug + " is " + embed.license + "; only " + MODEL_LICENSES.join(" / ") + " may be embedded",
    );

    // The licence has to be re-readable: a credit nobody can trace is a claim, not a credit.
    assert.match(embed.checkedAt, /^\d{4}-\d{2}-\d{2}$/, embed.slug + ".checkedAt");
    assert.ok(
      embed.sourceUrl.startsWith("https://sketchfab.com/3d-models/"),
      embed.slug + ".sourceUrl must be the canonical model page",
    );
    assert.ok(
      embed.sourceUrl.endsWith(embed.uid),
      embed.slug + ".sourceUrl must end in its own uid",
    );
    assert.ok(
      embed.authorUrl.startsWith("https://sketchfab.com/"),
      embed.slug + ".authorUrl must point at the author on Sketchfab",
    );
  }
});

test("a model too heavy for us to host is too heavy to embed", () => {
  for (const embed of embeds) {
    if (embed.faceCount === null) continue;
    assert.ok(Number.isInteger(embed.faceCount) && embed.faceCount > 0, embed.slug + ".faceCount");
    assert.ok(
      embed.faceCount <= FACE_BUDGET.max,
      embed.slug + " is " + embed.faceCount + " faces, over the " + FACE_BUDGET.max + " ceiling",
    );
  }
});

test("the frame URL is built from the uid and nothing else", () => {
  assert.ok(
    lib.includes("https://sketchfab.com/models/" + "${embed.uid}" + "/embed"),
    "the embed URL must be assembled from the uid",
  );

  const origins = lib.match(/https:\/\/[a-z0-9.-]+/gi) ?? [];
  for (const origin of origins) {
    assert.equal(origin, "https://sketchfab.com", "lib/sketchfab.ts points at " + origin);
  }

  // The vendor's own parameters, minus anything that would let the frame wander.
  assert.ok(lib.includes('loading: "lazy"'), "the frame must stay lazy");
  assert.ok(lib.includes("allowFullScreen"), "fullscreen is part of the embed contract");
  assert.ok(!/\bsandbox\b|allow-same-origin/.test(lib), "we do not hand the frame same-origin");
});

test("nothing loads until the visitor asks for it", () => {
  assert.ok(
    component.includes("React.useState(false)"),
    "the embed must start unloaded - useState(true) would fetch it on arrival",
  );

  const frames = component.match(/<iframe/g) ?? [];
  assert.equal(frames.length, 1, "exactly one iframe belongs in this component");
  assert.ok(loadedBranch().includes("<iframe"), "the iframe must live inside the loaded branch");
  assert.ok(loadedBranch().includes("{...frame}"), "the frame attributes come from lib/sketchfab.ts");

  // No poster hotlinked from their CDN: that would be a third-party request on page load,
  // which is the thing the deferral exists to prevent.
  assert.ok(!/media\.sketchfab\.com|thumbnail_url/.test(component), "the poster must not hotlink a thumbnail");
  assert.ok(!/\bfetch\(|XMLHttpRequest/.test(component), "this component makes no requests of its own");
});

test("the credit renders whether or not the model is loaded", () => {
  // Everything except the loaded branch, so the credit is printed in both states.
  const outside = component.replace(loadedBranch(), "");
  for (const token of ["embed.sourceUrl", "embed.authorUrl", "embed.licenseLabel", "{embed.author}", "{embed.title}"]) {
    assert.ok(outside.includes(token), "the credit line must render " + token + " outside the loaded branch");
  }
});

test("the species page renders the embed only for a species that has one", () => {
  assert.ok(page.includes("embedForSlug(animal.slug)"), "the species page looks the record up by slug");
  assert.ok(page.includes("{sketchfab ? ("), "and renders nothing when there is none");
  assert.ok(page.includes("<SketchfabEmbed"), "the species page renders the embed");
  assert.ok(page.includes('id="sketchfab"'), "under an anchor it can be linked to");

  // The card is deliberately not on this list any more. It draws the species' own .glb on
  // hover now - the same asset, served from this repository (see check:preview) - so a
  // second, third-party viewer in the same tile would be a context nobody asked for.
  assert.ok(!card.includes("SketchfabEmbed"), "the card must not mount the iframe");
});

test("the embed stays off the path a visitor pays for", () => {
  // Nothing from sketchfab.com may be referenced by the layout, the navbar or the card:
  // the only place that knows the host is the component behind the click.
  for (const [name, source] of [["the card", card], ["the layout", layout]]) {
    assert.ok(!source.includes("sketchfab.com"), name + " must not reference the host directly");
  }
});

test("the data file explains why it is not model-attribution.json", () => {
  assert.ok(typeof data.note === "string" && data.note.length > 80, "the list needs its reason written down");
});
