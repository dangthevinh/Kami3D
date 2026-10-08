/**
 * Every shipped model must be able to say what colour it is.
 *
 *   node --test scripts/check-model-materials.mjs
 *
 * ## The bug this exists for
 *
 * Nine species rendered pure white for months, and nothing caught it because every other test asked
 * a question the files could answer. The models were fine; the textures were embedded; the geometry
 * was right. The colour was written in `KHR_materials_pbrSpecularGlossiness` - an extension Khronos
 * deprecated and three.js **removed** - so three built a default `MeshStandardMaterial` and painted
 * the animal white.
 *
 * Measured by rendering, before and after `scripts/fix-model-materials.mjs`: mean colour saturation
 * was **exactly 0** for hippopotamus, capybara, komodo-dragon, gila-monster, california-condor,
 * american-alligator, blue-ringed-octopus and monarch-butterfly, and 0.03 for axolotl, against 0.54
 * for the lion and 0.22 for the polar bear. Nothing in the repository said so, because "the material
 * describes a colour nobody reads" is invisible to a check that only looks at file sizes and names.
 *
 * ## The two rules
 *
 *   1. **No shipped model may use an extension the loader does not implement.** The list of what the
 *      loader implements is read from three's own `GLTFLoader.js` rather than typed here, so the rule
 *      follows the library instead of a memory of it;
 *   2. **Every material must carry a base colour** - a texture or a factor. A material with neither
 *      has no colour to show, which in practice means white.
 *
 * Both failures have one fix: run `node scripts/fix-model-materials.mjs --apply`, which converts the
 * deprecated extension into the core one. If a model fails rule 2 instead, the model is the problem,
 * not the material - see `scripts/wire-local-models.mjs` and the meerkat, which turned out to be a
 * skull.
 */

import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { modelCanShowColour } from "../lib/model-quality.ts";
import { join } from "node:path";
import { test } from "node:test";

const root = process.cwd();
/**
 * Both catalogues. The rules below are not about animals or buildings - they are about what three.js
 * can read - so a fifth species model and a fifteenth landmark model are held to the same two
 * questions here rather than in two suites that would drift apart.
 */
const MODEL_DIRS = [join(root, "public", "models"), join(root, "public", "models", "landmarks")];
const files = MODEL_DIRS.flatMap((dir) =>
  readdirSync(dir)
    .filter((name) => name.endsWith(".glb"))
    .map((name) => join(dir, name)),
);

/** Every extension name three's own loader mentions. */
const supported = new Set(
  [...readFileSync(join(root, "node_modules", "three", "examples", "jsm", "loaders", "GLTFLoader.js"), "utf8")
    .matchAll(/(?:KHR|EXT)_[a-z_]+/g)].map((match) => match[0]),
);

/** The JSON chunk of a .glb, which is where materials and their extensions live. */
function gltfJson(file) {
  const buffer = readFileSync(file);
  assert.equal(buffer.readUInt32LE(0), 0x46546c67, file + " is not a .glb");
  return JSON.parse(buffer.slice(20, 20 + buffer.readUInt32LE(12)).toString("utf8"));
}

/** "landmarks/taj-mahal.glb", so a failure names the folder as well as the file. */
const label = (file) => file.slice(join(root, "public", "models").length + 1);

test("the check reads three's own list, and that list is the one we think it is", () => {
  // If this fails the rule below has stopped testing anything: an empty or wrong list would let every
  // extension through, which is exactly how the white models survived.
  assert.ok(supported.has("KHR_draco_mesh_compression"), "the catalogue ships DRACO-compressed models");
  assert.ok(supported.has("EXT_texture_webp"), "and WebP textures");
  assert.ok(
    !supported.has("KHR_materials_pbrSpecularGlossiness"),
    "if three ever implements this again, the conversion script and this rule should be revisited",
  );
});

test("no shipped model uses an extension the loader cannot read", () => {
  const broken = [];
  for (const file of files) {
    const json = gltfJson(file);
    for (const extension of [...(json.extensionsUsed ?? []), ...(json.extensionsRequired ?? [])]) {
      if (!supported.has(extension)) broken.push(label(file) + " uses " + extension);
    }
  }
  assert.deepEqual(
    broken,
    [],
    "these would render with whatever the loader falls back to, not with what the file says:\n  " +
      broken.join("\n  ") +
      "\n  fix: node scripts/fix-model-materials.mjs --apply",
  );
});

test("a model that can show no colour at all is not a model of an animal", () => {
  // Not "every material must have a colour": twelve materials in the catalogue have none and are
  // fine - `serval / hair`, `greater-flamingo / edge_color000255`, `green-sea-turtle / eyes`. A fur
  // or an outline material is white because the author meant it to be, and a rule that forced a
  // colour into those would be inventing data to satisfy a test.
  //
  // The rule is about the **model**: if nothing in it can show a colour, it is not a picture of an
  // animal, and the one that failed was a skull (`meerkat`, nodes `Skull_2`, no textures at all).
  const colourless = [];
  for (const file of files) {
    // The same function the landmark pipeline refuses candidates with, so the rule that decides what
    // ships and the rule that fails CI cannot disagree.
    if (!modelCanShowColour(gltfJson(file))) colourless.push(label(file));
  }
  assert.deepEqual(
    colourless,
    [],
    "these models have no texture and no colour factor anywhere, so they can only render grey:\n  " +
      colourless.join("\n  "),
  );
});

test("the conversion is not a one-way door", () => {
  // The script rewrites the shipped files, so it has to be re-runnable and must not invent a colour
  // it was not given. Both are asserted from its source, which is the only thing that can be checked
  // without running it against a model that no longer needs it.
  const script = readFileSync(join(root, "scripts", "fix-model-materials.mjs"), "utf8");
  assert.ok(script.includes("KHR_materials_pbrSpecularGlossiness"), "it must name what it converts");
  assert.ok(script.includes("baseColorTexture = specGloss.diffuseTexture"), "the diffuse map becomes the base colour map");
  assert.ok(script.includes("metallicFactor = 0"), "specular-glossiness has no metalness: a dielectric");
  assert.ok(script.includes("MIN_ROUGHNESS"), "and the one judgement it makes must stay named");
});

test("every model on disk is one of the two catalogues actually uses", () => {
  // The other half of the meerkat: a file that nothing points at is a file nobody will ever see a bug
  // in. Each folder is checked against **its own** manifest, because a landmark credit landing in the
  // species manifest is exactly the kind of mix-up that would leave one catalogue crediting the
  // other's author.
  for (const [folder, manifestName, kind] of [
    ["", "model-attribution.json", "species"],
    ["landmarks", "landmark-attribution.json", "landmark"],
  ]) {
    const dir = folder ? join(root, "public", "models", folder) : join(root, "public", "models");
    const manifest = JSON.parse(readFileSync(join(root, "data", manifestName), "utf8"));
    const inFolder = readdirSync(dir).filter((name) => name.endsWith(".glb"));

    assert.equal(inFolder.length, Object.keys(manifest).length, kind + ": the folder and its credit manifest disagree");
    for (const name of inFolder) {
      assert.ok(manifest[name.replace(/\.glb$/, "")], name + " has no credit, so nothing is using it");
    }
  }
});
