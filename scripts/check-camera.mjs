/**
 * Assertions for the viewer's camera arithmetic.
 *
 * Flights and orbit steps are the kind of code that "looks fine" while the camera
 * slowly drifts into the floor, or into the model, or stops responding because the
 * up-vector degenerated. The properties below are the ones that matter:
 * a preset never changes the distance, a damped step always converges, rotation
 * keeps the radius, and nothing ever lands exactly on the north pole.
 *
 * Run with: npm run check:camera
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import {
  CAMERA_PRESETS,
  MAX_ELEVATION,
  approach,
  dolly,
  hasArrived,
  normalizeDirection,
  orbitBy,
  orbitFromFocus,
} from "../lib/camera-presets.ts";

const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

test("every preset is a usable heading", () => {
  assert.equal(CAMERA_PRESETS.length, 4);
  for (const preset of CAMERA_PRESETS) {
    const unit = normalizeDirection(preset.direction);
    assert.ok(Math.abs(Math.hypot(unit.x, unit.y, unit.z) - 1) < 1e-9, `${preset.id} is not a unit vector`);
    assert.ok(Math.abs(unit.y) <= MAX_ELEVATION + 1e-9, `${preset.id} is too close to vertical`);
  }
});

test("normalizeDirection survives nonsense", () => {
  assert.deepEqual(normalizeDirection({ x: 0, y: 0, z: 0 }), { x: 0, y: 0, z: 1 });
  assert.deepEqual(normalizeDirection({ x: Number.NaN, y: 1, z: 0 }), { x: 0, y: 0, z: 1 });
  const straightUp = normalizeDirection({ x: 0, y: 1, z: 0 });
  assert.equal(straightUp.y, MAX_ELEVATION);
  assert.ok(Math.abs(straightUp.x) + Math.abs(straightUp.z) > 0, "the heading must stay defined");
});

test("a preset changes the angle, never the distance", () => {
  const focus = { x: 0, y: 1, z: 0 };
  for (const preset of CAMERA_PRESETS) {
    for (const radius of [0.7, 4, 20]) {
      const current = { x: radius, y: focus.y, z: 0 };
      const next = orbitFromFocus(focus, current, preset.direction);
      assert.ok(Math.abs(distance(next, focus) - radius) < 1e-9, `${preset.id} changed the distance`);
    }
  }
});

test("a degenerate camera position still produces a flight", () => {
  const next = orbitFromFocus({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, CAMERA_PRESETS[1].direction);
  assert.ok(distance(next, { x: 0, y: 0, z: 0 }) > 0);
});

test("the damped step converges and never overshoots", () => {
  const target = { x: 3, y: 2, z: -1 };
  let current = { x: 0, y: 0, z: 0 };
  let previous = distance(current, target);

  for (let frame = 0; frame < 120; frame += 1) {
    current = approach(current, target, 1 / 60);
    const now = distance(current, target);
    assert.ok(now <= previous + 1e-9, "the flight must be monotonic");
    previous = now;
  }

  assert.ok(previous < 0.001, `the flight stalled at ${previous}`);
  assert.ok(hasArrived(current, target));
});

test("a long frame does not overshoot where a short one would not", () => {
  const target = { x: 10, y: -4, z: 2 };
  const step = approach({ x: 0, y: 0, z: 0 }, target, 5);
  assert.ok(step.x < target.x && step.y > target.y && step.z < target.z, "an exponential step cannot pass the target");
  assert.ok(distance(step, target) < distance({ x: 0, y: 0, z: 0 }, target));
});

test("hasArrived is a threshold, not an identity", () => {
  assert.equal(hasArrived({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }), true);
  assert.equal(hasArrived({ x: 0, y: 0, z: 0 }, { x: 0.005, y: 0, z: 0 }), true);
  assert.equal(hasArrived({ x: 0, y: 0, z: 0 }, { x: 0.5, y: 0, z: 0 }), false);
});

test("orbiting keeps the radius and never reaches the poles", () => {
  const focus = { x: 0, y: 1, z: 0 };
  const start = { x: 4, y: 1.5, z: 0 };
  const radius = distance(start, focus);

  let position = start;
  for (let step = 0; step < 40; step += 1) {
    // Four full turns of yaw and a hard upward push.
    position = orbitBy(focus, position, Math.PI / 5, 0.25);
    assert.ok(Math.abs(distance(position, focus) - radius) < 1e-9, "orbit must be a rotation");
    const elevation = (position.y - focus.y) / radius;
    assert.ok(elevation < 0.999, `the camera climbed to the pole: ${elevation}`);
    assert.ok(elevation > -0.999);
  }
});

test("orbiting by nothing changes nothing", () => {
  const focus = { x: 0, y: 0, z: 0 };
  const position = { x: 1, y: 2, z: 3 };
  const same = orbitBy(focus, position, 0, 0);
  assert.ok(distance(same, position) < 1e-9);
});

test("dolly clamps to the viewer's own limits", () => {
  const focus = { x: 0, y: 0, z: 0 };
  const position = { x: 0, y: 0, z: 10 };

  const closer = dolly(focus, position, 0.5, 0.6, 26);
  assert.ok(Math.abs(distance(closer, focus) - 5) < 1e-9);

  const tooFar = dolly(focus, position, 100, 0.6, 26);
  assert.ok(Math.abs(distance(tooFar, focus) - 26) < 1e-9);

  const tooClose = dolly(focus, position, 0.0001, 0.6, 26);
  assert.ok(Math.abs(distance(tooClose, focus) - 0.6) < 1e-9);
});
