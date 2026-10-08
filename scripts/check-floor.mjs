/**
 * The floor rule: no model may be drawn below y = 0.
 *
 *   node --test scripts/check-floor.mjs
 *
 * The bug this file exists for was invisible in every screenshot until two boxes were compared, and
 * then it was measured over the whole catalogue: **19 of 74** models went under the studio floor once
 * their first animation started, because the anchor was measured in the pose the model mounted in and
 * never re-checked. `peregrine-falcon` reached y -942 — 18% of its own height — and the floor grid
 * sliced across the bird.
 *
 * The arithmetic is pure, so it is pinned here: the sample times, the offset, the union, and the
 * ratchet that stops the guard from making an animal bob. The last test replays the bug itself —
 * a still-pose anchor against a clip that dips — and fails if the rule ever goes back to measuring a
 * single pose.
 */

import assert from "node:assert/strict";
import { test } from "node:test";
import * as THREE from "three";

import {
  FLOOR_EPSILON,
  FLOOR_SAMPLES,
  belowFloor,
  floorOffset,
  ratchet,
  sampleTimes,
  unionBoxes,
} from "../lib/model-floor.ts";

const box = (minY, maxY) => new THREE.Box3(new THREE.Vector3(-1, minY, -1), new THREE.Vector3(1, maxY, 1));

test("a box is put on the floor and centred over the origin", () => {
  const offset = floorOffset(box(-7, 3));
  assert.equal(offset[1], 7, "the lowest point lands on y = 0");
  // `===`, not `assert.equal`: negating a zero centre gives -0, which is the same number to every
  // renderer and a different value to a strict assertion.
  assert.ok(offset[0] === 0, "x is centred");
  assert.ok(offset[2] === 0, "z is centred");
});

test("an empty box is left alone rather than sent to infinity", () => {
  assert.deepEqual(floorOffset(new THREE.Box3()), [0, 0, 0]);
});

test("a box is below the floor only when it really is", () => {
  assert.equal(belowFloor(box(-1, 1)), true);
  assert.equal(belowFloor(box(0, 1)), false);
  assert.equal(belowFloor(box(-FLOOR_EPSILON / 2, 1)), false, "a hair under is standing on it");
  assert.equal(belowFloor(new THREE.Box3()), false, "nothing is not below anything");
});

test("a clip is sampled from its start, evenly, and always at t = 0", () => {
  const times = sampleTimes(2, 8);
  assert.equal(times[0], 0, "the mounted pose is always included");
  assert.equal(times.length, 9);
  assert.equal(times[times.length - 1], 2, "the clip is sampled to its end");
  assert.deepEqual(sampleTimes(1, 4), [0, 0.25, 0.5, 0.75, 1]);
});

test("a clip of unknown length puts the rule back where it was", () => {
  for (const duration of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.deepEqual(sampleTimes(duration), [0], "no times are invented for a length nobody knows");
  }
});

test("the union is the space the model occupies over the whole clip", () => {
  const union = unionBoxes([box(-5, 2), box(-1, 9)]);
  assert.equal(union.min.y, -5);
  assert.equal(union.max.y, 9);
  assert.equal(unionBoxes([]).isEmpty(), true);
  assert.equal(unionBoxes([new THREE.Box3(), box(-2, 0)]).min.y, -2, "empty boxes contribute nothing");
});

test("the guard may raise the anchor and may never lower it", () => {
  assert.equal(ratchet(0, 3), 3, "a dip raises it");
  assert.equal(ratchet(3, 1), 3, "coming back up does not lower it, so the animal does not bob");
  assert.equal(ratchet(3, -2), 3, "and a pose above the floor changes nothing");
  assert.equal(ratchet(4, Number.NaN), 4, "a measurement that failed is not a reason to move");
});

/**
 * The bug, replayed.
 *
 * A model whose mounted pose sits at -10, and a clip that dips to -40 part way through. The old
 * anchor - one measurement, one offset - clears the floor in the pose it measured and puts the model
 * 30 units under it for the rest of the clip. The union anchor is the only one that holds.
 */
test("a clip that dips takes the model under the floor if the anchor only measured one pose", () => {
  const mounted = box(-10, 50);
  const poses = [box(-10, 50), box(-25, 40), box(-40, 30), box(-12, 48)];

  const stillPoseOffset = floorOffset(mounted)[1];
  const worstWithStillPose = Math.min(...poses.map((pose) => pose.min.y + stillPoseOffset));
  assert.ok(
    worstWithStillPose < 0,
    "the still-pose anchor must be shown to fail, or this test proves nothing: " + worstWithStillPose,
  );
  assert.equal(worstWithStillPose, -30, "and it fails by exactly how far the clip dips below the mount");

  const unionOffset = floorOffset(unionBoxes([mounted, ...poses]))[1];
  const worstWithUnion = Math.min(...poses.map((pose) => pose.min.y + unionOffset));
  assert.equal(worstWithUnion, 0, "the union anchor puts the lowest pose on the floor");
  assert.ok(!belowFloor(box(worstWithUnion, 0)), "and nothing is left under it");
});

test("the shipped sample count is the one that was measured", () => {
  // Eight samples left four models under the floor; thirty-two leaves one, and the guard catches it.
  // Changing this number without re-running the measurement is how the bug comes back quietly.
  assert.equal(FLOOR_SAMPLES, 32);
});
