/**
 * Assertions for the globe's spherical maths.
 *
 * These are the functions that decide where a country ends up on screen and where
 * the camera flies to when a visitor picks a region: a sign error here puts Africa
 * in the Pacific and nobody notices until a human looks at it. The projection was
 * already covered indirectly (`check-geo`); the camera and the ranking are new, so
 * they are pinned here.
 *
 * Run with: npm run check:globe
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import {
  MAX_CAMERA_ELEVATION,
  angularDistance,
  cameraTargetFor,
  latLngToVector3,
  nearestRegion,
  regionFacingCamera,
  topSpeciesByRegion,
  vector3ToLatLng,
} from "../lib/globe.ts";
import { REGIONS, REGION_ANCHORS } from "../types/animal.ts";

const length = (v) => Math.hypot(v.x, v.y, v.z);
const angleBetween = (a, b) => {
  const cos = (a.x * b.x + a.y * b.y + a.z * b.z) / (length(a) * length(b));
  return (Math.acos(Math.min(1, Math.max(-1, cos))) * 180) / Math.PI;
};

test("geographic coordinates survive the round trip through the sphere", () => {
  const points = [
    { lat: 0, lng: 0 },
    { lat: 51.5, lng: -0.12 },
    { lat: -33.9, lng: 151.2 },
    { lat: 64.1, lng: -21.9 },
    { lat: -77.8, lng: 166.7 },
  ];

  for (const point of points) {
    const back = vector3ToLatLng(latLngToVector3(point.lat, point.lng, 2));
    assert.ok(Math.abs(back.lat - point.lat) < 1e-6, `latitude drift at ${point.lat},${point.lng}`);
    // Longitude is meaningless exactly at a pole, so skip the comparison there.
    if (Math.abs(point.lat) < 89) {
      assert.ok(Math.abs(back.lng - point.lng) < 1e-6, `longitude drift at ${point.lat},${point.lng}`);
    }
  }
});

test("the camera flies to the region it was asked for, at the distance it was given", () => {
  for (const region of REGIONS) {
    const anchor = REGION_ANCHORS[region];
    const target = cameraTargetFor(region, 3.1, 0.35);

    assert.ok(Math.abs(length(target) - 3.1) < 1e-9, `${region}: camera distance drifted`);

    // The camera is looking at the anchor: the angle between them is the elevation
    // we deliberately added, not a sign error.
    const anchorDirection = latLngToVector3(anchor.lat, anchor.lng, 1);
    const separation = angleBetween(target, anchorDirection);
    assert.ok(separation < 30, `${region}: camera points ${separation.toFixed(1)}° away from the anchor`);
  }
});

test("the camera never tips over the pole", () => {
  for (const region of REGIONS) {
    for (const elevation of [0, 0.35, 2]) {
      const target = cameraTargetFor(region, 3, elevation);
      const normalised = { x: target.x / 3, y: target.y / 3, z: target.z / 3 };
      assert.ok(Math.abs(normalised.y) <= MAX_CAMERA_ELEVATION + 1e-9, `${region} at elevation ${elevation} went vertical`);
      assert.ok(Math.abs(length(normalised) - 1) < 1e-9, "the direction must stay unit length");
    }
  }
});

test("look at a region and the globe agrees which region that is", () => {
  // This is what the keyboard's Enter key does: pick whatever is facing the camera.
  for (const region of REGIONS) {
    const target = cameraTargetFor(region, 3.1, 0.35);
    assert.equal(regionFacingCamera(target), region, `facing ${region} resolved to something else`);
  }
});

test("a camera parked over the open ocean picks no region", () => {
  // The South Atlantic: more than 30° from every anchor (the nearest is
  // Antarctica at ~41°), so a click there is not a region click.
  const point = latLngToVector3(-45, -25, 3);
  assert.equal(regionFacingCamera(point, 30), null);
  assert.equal(nearestRegion({ lat: -45, lng: -25 }, 30), null);

  // ...while the same point with a generous radius still resolves.
  assert.equal(regionFacingCamera(point, 90), "Antarctica");

  // The "Oceans" region is anchored mid-Pacific, which is a reminder that an
  // ocean click is a legitimate region click — see REGION_ANCHORS.
  assert.equal(regionFacingCamera(latLngToVector3(-10, -140, 3), 30), "Oceans");
});

test("the top species per region are ranked, capped and complete", () => {
  const animals = [
    { region: "Africa", slug: "lion", name: "Lion", view_count: 5, popularity: 9 },
    { region: "Africa", slug: "elephant", name: "Elephant", view_count: 50, popularity: 8 },
    { region: "Africa", slug: "gorilla", name: "Gorilla", view_count: null, popularity: 10 },
    { region: "Africa", slug: "giraffe", name: "Giraffe", view_count: 0, popularity: 7 },
    { region: "Oceans", slug: "whale", name: "Blue whale", view_count: 1, popularity: 10 },
  ];

  const top = topSpeciesByRegion(animals, 3);
  assert.deepEqual(top.Africa, [
    { slug: "elephant", name: "Elephant", views: 50 },
    { slug: "lion", name: "Lion", views: 5 },
    { slug: "gorilla", name: "Gorilla", views: 0 },
  ]);
  assert.deepEqual(top.Oceans, [{ slug: "whale", name: "Blue whale", views: 1 }]);

  // Ties fall back to the catalogue's own popularity, so the order is stable
  // rather than depending on the input order.
  const tied = topSpeciesByRegion(
    [
      { region: "Asia", slug: "panda", name: "Giant panda", view_count: 0, popularity: 8 },
      { region: "Asia", slug: "tiger", name: "Bengal tiger", view_count: 0, popularity: 9 },
    ],
    3,
  );
  assert.deepEqual(tied.Asia, [
    { slug: "tiger", name: "Bengal tiger", views: 0 },
    { slug: "panda", name: "Giant panda", views: 0 },
  ]);
});

test("regions with no species simply do not appear", () => {
  const top = topSpeciesByRegion([{ region: "Africa", slug: "lion", view_count: 1, popularity: 1 }], 3);
  assert.deepEqual(Object.keys(top), ["Africa"]);
  assert.equal(top.Antarctica, undefined);
});

test("angular distance is symmetric and zero on itself", () => {
  const a = { lat: 10, lng: 20 };
  const b = { lat: -30, lng: 120 };
  assert.ok(Math.abs(angularDistance(a, a)) < 1e-9);
  assert.ok(Math.abs(angularDistance(a, b) - angularDistance(b, a)) < 1e-9);
  assert.ok(angularDistance(a, b) > 0);
});
