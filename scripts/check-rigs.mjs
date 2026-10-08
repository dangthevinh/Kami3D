/**
 * Geometry sanity checks for the parametric creature rigs.
 *
 * These run in Node (type-stripping, no bundler) and guard the two things that
 * are easy to get silently wrong:
 *   1. a rig must be built standing on the ground plane, so `height` is a real
 *      height and not a diameter;
 *   2. each rig's aspect ratio must be close enough to the real animal's for
 *      SizeComparison to scale it into believable metres.
 *
 * Run with: npm run check:rigs
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import { rigExtents } from "../lib/rigs.ts";

const ROOT = process.cwd();
const read = (path) => readFileSync(join(ROOT, path), "utf8");

const SPECIES_KINDS = ["quadruped", "biped", "bird", "marine", "whale", "serpent", "insect"];
const KINDS = [...SPECIES_KINDS, "human"];

/** Mirrors the scaling rule used by SizeComparison. */
function figureScale(rig, lengthM, heightM) {
  const rigLength = Math.max(rig.width, rig.depth);
  const rigHeight = rig.height;
  const dominant = lengthM >= heightM ? "length" : "height";
  const uniform = dominant === "length" ? lengthM / rigLength : heightM / rigHeight;

  const otherReal = dominant === "length" ? heightM : lengthM;
  const otherRig = dominant === "length" ? rigHeight : rigLength;
  const correction = Math.min(1.4, Math.max(0.6, otherReal / (otherRig * uniform)));

  return {
    renderedDominant: dominant === "length" ? rigLength * uniform : rigHeight * uniform,
    renderedOther: dominant === "length" ? rigHeight * uniform * correction : rigLength * uniform * correction,
    wantDominant: dominant === "length" ? lengthM : heightM,
    wantOther: otherReal,
  };
}

test("every rig produces finite, positive extents", () => {
  for (const kind of KINDS) {
    const rig = rigExtents(kind);
    for (const axis of ["width", "height", "depth"]) {
      assert.ok(Number.isFinite(rig[axis]), `${kind}.${axis} is not finite`);
      assert.ok(rig[axis] > 0.1, `${kind}.${axis} is degenerate (${rig[axis]})`);
    }
  }
});

test("rigs stand on the ground plane (bounding box starts at the floor)", () => {
  for (const kind of KINDS) {
    const { box } = rigExtents(kind);
    assert.ok(box.min.y > -0.25, `${kind} sinks below the floor: min.y=${box.min.y}`);
    assert.ok(box.min.y < 0.45, `${kind} floats above the floor: min.y=${box.min.y}`);
  }
});

test("human reference rig is tall and narrow", () => {
  const rig = rigExtents("human");
  assert.ok(rig.height > rig.width && rig.height > rig.depth, "human must be tallest");
  assert.ok(
    rig.height / Math.max(rig.width, rig.depth) > 2.2,
    `human is too squat: ratio=${(rig.height / Math.max(rig.width, rig.depth)).toFixed(2)}`,
  );
  // A 1.75 m human scaled from this rig must be near 1.75 m on screen.
  const scale = 1.75 / rig.height;
  assert.ok(Math.abs(rig.height * scale - 1.75) < 0.001);
});

test("biped species rig (kangaroo) is taller than it is deep", () => {
  const rig = rigExtents("biped");
  assert.ok(rig.height > rig.width, "biped must be taller than it is wide");
  assert.ok(rig.height > rig.depth, "biped must be taller than it is deep");
});

test("whale rig is far longer than it is tall", () => {
  const rig = rigExtents("whale");
  const aspect = rig.height / rig.depth;
  assert.ok(aspect < 0.3, `whale is too chunky: height/depth=${aspect.toFixed(3)}`);
  assert.ok(aspect > 0.08, `whale is too flat: height/depth=${aspect.toFixed(3)}`);
});

test("quadruped rig is longer along X than it is tall", () => {
  const rig = rigExtents("quadruped");
  assert.ok(rig.width > rig.height, "quadruped should be wider than tall");
});

test("a blue whale renders within 25% of its real length and height", () => {
  // Real figures from the bundled dataset: 27 m long, ~4.5 m deep.
  const rig = rigExtents("whale");
  const result = figureScale(rig, 27, 4.5);

  assert.ok(
    Math.abs(result.renderedDominant - result.wantDominant) < 0.01,
    "dominant axis must be scaled exactly",
  );
  const error = Math.abs(result.renderedOther - result.wantOther) / result.wantOther;
  assert.ok(error < 0.25, `whale secondary axis off by ${(error * 100).toFixed(1)}%`);
});

test("a lion renders within 40% on both axes", () => {
  const rig = rigExtents("quadruped");
  const result = figureScale(rig, 2.5, 1.2);
  const error = Math.abs(result.renderedOther - result.wantOther) / result.wantOther;
  assert.ok(error < 0.4, `lion secondary axis off by ${(error * 100).toFixed(1)}%`);
});

/* ------------------------------------------------------------------ where a rig may be drawn */

/**
 * A rig is a shape, and a shape is honest in a chart and dishonest under a species' name.
 *
 * The species page used to fall back to one whenever a species had no `.glb`: a body assembled from
 * spheres, capsules, cones and boxes, on the same stage, under the same heading, with the same camera
 * controls as a real asset. A visitor read it as a model of the animal - reasonably, because that is
 * what the page said it was. Two surfaces are allowed to keep it, and both are places where the shape
 * is described as a shape: the silhouette quiz, where guessing the shape **is** the game, and the size
 * chart, which draws every figure the same way so the comparison is like for like.
 */
test("no surface draws a rig as if it were the animal's model", () => {
  const stage = read("components/3d/ModelScene.tsx");
  // The name may appear in a comment explaining why it is not used; an import is the thing to refuse.
  assert.ok(!/from\s+"@\/components\/3d\/ProceduralAnimal"/.test(stage), "the species stage must not import the rig");
  assert.ok(!/<ProceduralAnimal/.test(stage), "and must not render one");
  assert.ok(!/fallback=\{procedural\}/.test(stage), "and must not fall back to one when a file fails");
  assert.ok(!/const procedural\s*=/.test(stage), "and must not build one at all");
  assert.ok(
    /animal\.model_url \? \(/.test(stage) && /: null\}/.test(stage.replace(/\s+/g, " ")),
    "a species with no file renders nothing rather than a stand-in",
  );

  const viewer = read("components/3d/ModelViewer.tsx");
  assert.ok(viewer.includes("No 3D model for this species yet"), "the viewer says so in words");
  assert.ok(!viewer.includes("showing the procedural rig"), "and no longer promises a rig instead");

  const card = read("components/animal/AnimalCard.tsx");
  assert.ok(!card.includes("AnimalPreview"), "the card must not draw one on hover either");

  // The two honest uses stay, or this rule has quietly become "delete the rig".
  assert.ok(read("components/quiz/SilhouetteStage.tsx").includes("ProceduralAnimal"), "the quiz still needs a shape");
  assert.ok(read("components/3d/SizeComparison.tsx").includes("ProceduralAnimal"), "and so does the size chart");
  assert.ok(existsSync(join(ROOT, "components", "3d", "ProceduralAnimal.tsx")), "the renderer itself stays");
});
