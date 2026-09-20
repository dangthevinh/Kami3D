/**
 * Assertions for the device-quality decision.
 *
 * The tiers decide how many pixels, stars and shadow maps a visitor's device
 * renders, and they run on hardware nobody here owns — so the rules are pinned
 * rather than tuned by feel. Two properties matter most:
 *
 *   - a browser that exposes nothing (Firefox, Safari) must land in the middle,
 *     never on the cheap profile, or half the audience gets a worse product for
 *     a fact the browser simply did not share;
 *   - `saveData` outranks everything, because it is the visitor asking.
 *
 * Run with: npm run check:quality
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import {
  QUALITY_PROFILES,
  applyQualityOverrides,
  qualityFor,
  readDeviceFacts,
  tierFor,
  tierForPreset,
} from "../lib/quality.ts";

const facts = (overrides = {}) => ({
  deviceMemory: 8,
  hardwareConcurrency: 8,
  devicePixelRatio: 2,
  coarsePointer: false,
  saveData: false,
  ...overrides,
});

test("a big desktop gets the profile the product was designed on", () => {
  assert.equal(tierFor(facts()), "high");
  assert.deepEqual(qualityFor(facts()).dpr, [1, 1.8]);
});

test("small memory or few cores drops to the cheap profile", () => {
  assert.equal(tierFor(facts({ deviceMemory: 2 })), "low");
  assert.equal(tierFor(facts({ hardwareConcurrency: 2 })), "low");
  assert.equal(tierFor(facts({ deviceMemory: 1, hardwareConcurrency: 1 })), "low");
});

test("saveData wins over every other signal", () => {
  // Even a 32 GB workstation: the visitor asked us not to be expensive.
  assert.equal(tierFor(facts({ saveData: true, deviceMemory: 32, hardwareConcurrency: 32 })), "low");
});

test("a phone is balanced, never high and never punished for being a phone", () => {
  const phone = facts({ coarsePointer: true, devicePixelRatio: 3, deviceMemory: 6, hardwareConcurrency: 8 });
  assert.equal(tierFor(phone), "balanced");
  // A weak phone is still low, though.
  assert.equal(tierFor({ ...phone, deviceMemory: 2 }), "low");
});

test("a browser that shares nothing lands in the middle", () => {
  const unknown = { deviceMemory: null, hardwareConcurrency: null, devicePixelRatio: null, coarsePointer: false, saveData: false };
  assert.equal(tierFor(unknown), "balanced");
});

test("readDeviceFacts with no argument reads the live environment", () => {
  // `undefined` means "use globalThis" on purpose: that is the call the hook makes.
  const live = readDeviceFacts();
  assert.equal(typeof live.coarsePointer, "boolean");
  assert.equal(typeof live.saveData, "boolean");
  assert.ok(live.deviceMemory === null || live.deviceMemory > 0);
  assert.ok(live.hardwareConcurrency === null || live.hardwareConcurrency > 0);
});

test("readDeviceFacts never throws, whatever the browser exposes", () => {
  assert.deepEqual(readDeviceFacts({}), {
    deviceMemory: null,
    hardwareConcurrency: null,
    devicePixelRatio: null,
    coarsePointer: false,
    saveData: false,
  });

  // Nonsense values are treated as "not said" rather than trusted.
  const junk = readDeviceFacts({ navigator: { deviceMemory: Number.NaN, hardwareConcurrency: -4, devicePixelRatio: 0 } });
  assert.deepEqual(junk, {
    deviceMemory: null,
    hardwareConcurrency: null,
    devicePixelRatio: null,
    coarsePointer: false,
    saveData: false,
  });
});

test("readDeviceFacts reads what the browser does expose", () => {
  const source = {
    navigator: { deviceMemory: 4, hardwareConcurrency: 12, devicePixelRatio: 2, connection: { saveData: true } },
    matchMedia: (query) => ({ matches: query === "(pointer: coarse)" }),
  };
  assert.deepEqual(readDeviceFacts(source), {
    deviceMemory: 4,
    hardwareConcurrency: 12,
    devicePixelRatio: 2,
    coarsePointer: true,
    saveData: true,
  });
  // ...and a matchMedia that throws leaves the pointer as "fine".
  const hostile = { matchMedia: () => { throw new Error("nope"); } };
  assert.equal(readDeviceFacts(hostile).coarsePointer, false);
});

test("the profiles are ordered: cheap is never more expensive than rich", () => {
  const { low, balanced, high } = QUALITY_PROFILES;
  assert.ok(low.dpr[1] <= balanced.dpr[1] && balanced.dpr[1] <= high.dpr[1], "dpr must not fall as the tier rises");
  assert.ok(low.starCount < balanced.starCount && balanced.starCount <= high.starCount);
  assert.ok(low.globeSegments < balanced.globeSegments && balanced.globeSegments <= high.globeSegments);
  assert.ok(low.shadowMapSize <= balanced.shadowMapSize);
  // Only the cheap tier may turn things off, and it must do so both ways.
  assert.equal(low.shadows, false);
  assert.equal(low.contactShadows, false);
  assert.equal(high.shadows, true);
});

test("qualityFor returns the profile of the tier it chose", () => {
  for (const tier of ["low", "balanced", "high"]) {
    const profile = qualityFor({ ...facts({ deviceMemory: tier === "low" ? 1 : 8 }), saveData: tier === "low" });
    if (tier === "low") assert.equal(profile.tier, "low");
  }
  const profile = qualityFor(facts());
  assert.equal(profile.tier, "high");
  assert.deepEqual({ ...profile, tier: undefined }, { ...QUALITY_PROFILES.high, tier: undefined });
});

/* -------------------------------------------------------------------------- */
/* Phase 11 — the visitor's overrides                                         */
/* -------------------------------------------------------------------------- */

const overrides = (patch = {}) => ({
  preset: "auto",
  shadows: true,
  reflections: true,
  maxDpr: 2,
  ...patch,
});

test("automatic keeps the measured tier, and a preset overrules it", () => {
  assert.equal(tierForPreset("auto", "low"), "low");
  assert.equal(tierForPreset("auto", "high"), "high");
  assert.equal(tierForPreset("ultra", "low"), "ultra");
  assert.equal(tierForPreset("low", "high"), "low");
});

test("ultra is a decision, never a measurement", () => {
  // No device is ever *measured* as ultra — only asked to be.
  const measured = [
    facts(),
    facts({ deviceMemory: 64, hardwareConcurrency: 64, saveData: false }),
    facts({ deviceMemory: 2 }),
  ].map((entry) => tierFor(entry));

  assert.ok(!measured.includes("ultra"), `device detection returned ultra: ${measured.join(", ")}`);
  assert.ok(QUALITY_PROFILES.ultra.dpr[1] > QUALITY_PROFILES.high.dpr[1]);
  assert.ok(QUALITY_PROFILES.ultra.reflectorResolution > QUALITY_PROFILES.high.reflectorResolution);
});

test("a setting can only take quality away from the tier it is given", () => {
  const low = qualityFor(facts({ deviceMemory: 2 }));
  const high = qualityFor(facts());

  // Off is off, whatever the tier wanted.
  assert.equal(applyQualityOverrides(high, overrides({ shadows: false })).shadows, false);
  assert.equal(applyQualityOverrides(high, overrides({ shadows: false })).contactShadows, false);
  assert.equal(applyQualityOverrides(high, overrides({ reflections: false })).reflections, false);

  // On is on only where the tier can afford it.
  assert.equal(applyQualityOverrides(low, overrides({ shadows: true })).shadows, false);
  assert.equal(applyQualityOverrides(low, overrides({ reflections: true })).reflections, false);
});

test("the pixel-ratio ceiling caps dpr without ever inverting the range", () => {
  const high = qualityFor(facts());
  assert.deepEqual(applyQualityOverrides(high, overrides({ maxDpr: 1 })).dpr, [1, 1]);
  assert.deepEqual(applyQualityOverrides(high, overrides({ maxDpr: 1.5 })).dpr, [1, 1.5]);
  assert.deepEqual(applyQualityOverrides(high, overrides({ maxDpr: 2 })).dpr, [1, 1.8]);

  for (const tier of Object.keys(QUALITY_PROFILES)) {
    const profile = applyQualityOverrides(qualityFor(facts()), overrides({ preset: tier, maxDpr: 1 }));
    assert.ok(profile.dpr[0] <= profile.dpr[1], `${tier}: dpr range inverted`);
    assert.ok(profile.dpr[0] >= 1, `${tier}: dpr below 1`);
  }
});

test("a preset reaches every field a canvas reads", () => {
  const base = qualityFor(facts({ deviceMemory: 2 }));
  const ultra = applyQualityOverrides(base, overrides({ preset: "ultra" }));

  assert.equal(ultra.tier, "ultra");
  assert.ok(ultra.starCount > base.starCount);
  assert.ok(ultra.globeSegments > base.globeSegments);
  assert.ok(ultra.shadowMapSize > base.shadowMapSize);
  assert.equal(ultra.shadows, true);
  assert.equal(ultra.reflections, true);
  assert.ok(ultra.reflectorResolution > 0);
});

test("every profile declares the reflection layer the scene renders", () => {
  for (const [tier, profile] of Object.entries(QUALITY_PROFILES)) {
    assert.equal(typeof profile.reflections, "boolean", `${tier}: reflections must be a boolean`);
    assert.ok(Number.isInteger(profile.reflectorResolution), `${tier}: reflectorResolution must be an integer`);
    assert.ok(profile.reflectorResolution >= 64, `${tier}: a reflector below 64px is not worth rendering`);
  }

  // The cheapest tier does not pay for a second render pass.
  assert.equal(QUALITY_PROFILES.low.reflections, false);
});

