/**
 * Assertions for the model a species card is allowed to draw.
 *
 * The card used to show a procedural silhouette and the real model was reserved for the
 * species page. That trade was about weight, and it stopped being right once every model in
 * the catalogue was DRACO-compressed — the smallest is 5 kB and the lion, which prompted
 * this, is 341 kB. So the card now loads the species' own .glb on hover.
 *
 * A hover is still not a request to download anything: the gate is the repository's own
 * shipping budget, and this suite pins it, including the part that would quietly undo it —
 * a rule that admits everything is the same as no rule at all, and one that refuses a
 * missing triangle count turns "not recorded" into "not allowed".
 *
 * Run with: npm run check:preview
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import { PREVIEW_BUDGET, withinPreviewBudget } from "../lib/model-preview.ts";

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), "utf8");

const manifest = JSON.parse(read("data/model-attribution.json"));
const catalog = read("data/animals.ts");
const component = read("components/3d/AnimalModelPreview.tsx");
const card = read("components/animal/AnimalCard.tsx");
const assets = read("public/models/README.md");

const admitted = Object.entries(manifest).filter(([, record]) => withinPreviewBudget(record));

test("the budget is the one the repository already ships by", () => {
  assert.equal(PREVIEW_BUDGET.bytes, 1_500_000);
  assert.equal(PREVIEW_BUDGET.faces, 75_000);

  // The asset policy states the same two numbers; a card budget that drifts from the
  // documented one is a card that will one day fetch something the project refuses to ship.
  assert.match(assets, /1\.5 MB/, "public/models/README.md must still state the size budget");
  assert.match(assets, /75k triangles/, "and the triangle budget");
});

test("the gate is a gate: it admits most of the catalogue and refuses the rest", () => {
  const slugs = Object.keys(manifest);
  assert.ok(slugs.length >= 20, "the manifest should describe the whole catalogue");

  assert.ok(admitted.length >= 20, "at least 20 species should be previewable, saw " + admitted.length);
  assert.ok(admitted.length < slugs.length, "if every model passes, the budget is not gating anything");

  // The two ends of the catalogue, named, because they are what the rule is for.
  assert.equal(withinPreviewBudget(manifest.lion), true, "the lion (341 kB) must be previewable");
  assert.equal(
    withinPreviewBudget(manifest["african-bush-elephant"]),
    false,
    "the elephant (2.8 MB) must not be fetched on a hover",
  );
});

test("the triangle budget refuses what the size budget would let through", () => {
  assert.equal(withinPreviewBudget({ bytes: 100_000, faceCount: 74_999 }), true);
  assert.equal(withinPreviewBudget({ bytes: 100_000, faceCount: 75_000 }), true);
  assert.equal(withinPreviewBudget({ bytes: 100_000, faceCount: 75_001 }), false);
  assert.equal(
    withinPreviewBudget({ bytes: 1_400_000, faceCount: 400_000 }),
    false,
    "a small file with an absurd triangle count is still a hover nobody asked for",
  );
});

test("a missing triangle count is unknown, not disqualified", () => {
  assert.equal(withinPreviewBudget({ bytes: 100_000 }), true);
  assert.equal(withinPreviewBudget({ bytes: 100_000, faceCount: null }), true);
});

test("junk is refused rather than drawn", () => {
  assert.equal(withinPreviewBudget({ bytes: 0 }), false, "a zero-byte model is a broken download");
  assert.equal(withinPreviewBudget({ bytes: -1 }), false);
  assert.equal(withinPreviewBudget({ bytes: Number.NaN }), false);
});

test("every model a card may draw is actually in the repository", () => {
  for (const [slug, record] of admitted) {
    const path = record.file?.replace(/^\//, "");
    assert.ok(path, slug + " has no file recorded");
    assert.ok(existsSync(join(root, "public", path)), slug + " points at " + record.file + ", which is not in public/");
  }
});

test("every species the manifest admits is still in the catalogue", () => {
  for (const slug of Object.keys(manifest)) {
    assert.ok(catalog.includes('slug: "' + slug + '"'), slug + " has a model but is not a species in data/animals.ts");
  }
});

test("the preview draws the real file, and hands its GPU memory back", () => {
  assert.ok(component.includes("useGLTF(url, publicEnv.dracoDecoderPath)"), "it loads through the shared DRACO path");
  // `cloneModel`, not `clone(true)`: a plain clone shares the original skeleton, so a rigged asset
  // (the blue whale has 49 joints) is drawn with stale bone matrices. See check:materials.
  // The old call is still named in the comment that explains it; only the code has to be clean.
  const code = component.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  assert.ok(code.includes("cloneModel(gltf.scene)"), "via the shared skinned-safe clone");
  assert.ok(!code.includes("clone(true)"), "never a plain clone of a model that may have bones");
  assert.ok(component.includes("disposeClone(model)"), "and releases its buffers on unmount (docs/REVIEW.md R6)");
  assert.ok(component.includes("React.Suspense"), "so a slow model does not block the tile from rendering");

  // One canvas per tile: the preview is an alternative to the silhouette, never a sibling.
  assert.equal((component.match(/<CanvasShell/g) ?? []).length, 1, "exactly one canvas belongs in this component");
  assert.ok(component.includes("posedBounds("), "and it frames the asset by the box it is drawn with");
  assert.ok(component.includes("anchorOffset"), "placed by the shared, tested arithmetic");
});

test("the index the card reads cannot drift from the manifest", () => {
  // data/model-preview.json is written by scripts/fetch-models.mjs from the same object it
  // writes the manifest from. Nothing else may edit it, and this is what says so.
  const index = JSON.parse(read("data/model-preview.json"));
  assert.ok(typeof index.note === "string" && index.note.includes("fetch-models"), "the index states where it comes from");

  const slugs = Object.keys(manifest).sort();
  assert.deepEqual(Object.keys(index.models).sort(), slugs, "the index must describe exactly the manifest's models");

  for (const slug of slugs) {
    const [bytes, faces] = index.models[slug];
    assert.equal(bytes, manifest[slug].bytes, slug + ": size differs from the manifest");
    assert.equal(faces ?? null, manifest[slug].faceCount ?? null, slug + ": triangle count differs from the manifest");
  }
});

test("the gate does not drag the credit manifest into the browser", () => {
  // Measured: importing lib/attribution.ts to answer this question put both credit files
  // into the client bundle of /quiz, /explore and / (+5.6 kB gzip) and broke the /quiz
  // budget. The lookup reads the kilobyte index instead; these three assertions are what
  // stop it from creeping back.
  const lookup = read("lib/model-preview-index.ts");
  assert.ok(lookup.includes('from "@/data/model-preview.json"'), "the lookup reads the compact index");
  assert.ok(!lookup.includes("model-attribution.json"), "and never the credit manifest");
  assert.ok(!card.includes("@/lib/attribution"), "the card must not import the credit manifest either");
  assert.ok(
    !read("lib/attribution.ts").includes("export function isPreviewableModel"),
    "the gate must not be re-exported from lib/attribution.ts",
  );
});

test("the card chooses exactly one preview", () => {
  assert.ok(card.includes("isPreviewableModel(animal.slug)"), "the card asks the index before fetching");
  assert.ok(card.includes("const realModel ="), "and states the decision once");
  assert.ok(card.includes("showModel ?") && card.includes("showSilhouette ?"), "then mounts one of the two");

  // The two previews must be mutually exclusive: two live contexts in one tile is the thing
  // every 3D surface in this project is arranged to avoid.
  const modelBlock = card.slice(card.indexOf("{showModel ?"), card.indexOf("{showSilhouette ?"));
  assert.ok(!modelBlock.includes("AnimalPreview"), "the model branch must not also mount the silhouette");
});
