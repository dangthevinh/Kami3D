/**
 * How much 3D this device can afford.
 *
 * Every canvas used to run the same settings: `dpr={[1, 1.8]}`, a 1024² shadow
 * map, contact shadows and a 1500-star sky. On a phone that is the difference
 * between a globe that spins and a globe that stutters — and the visitor never
 * asked for the extra quality, while the desktop that *could* show it gets
 * nothing extra either.
 *
 * The decision is a pure function of a few device facts, so it is testable and
 * reviewable rather than guessed at inside a component. It is deliberately
 * coarse: three tiers, no benchmarking, no timers, nothing that adapts while the
 * visitor is scrolling (a changing canvas is worse than a slightly cheaper one).
 *
 * `readDeviceFacts` takes its source as an argument so the checks can drive it
 * with fake hardware, including the browser that exposes nothing at all — Firefox
 * and Safari do not implement `navigator.deviceMemory`, and the honest answer there
 * is "assume mid-range", not "assume weak".
 */

export type QualityTier = "low" | "balanced" | "high";

export interface DeviceFacts {
  /** `navigator.deviceMemory` in GB. Null when the browser does not say. */
  deviceMemory: number | null;
  /** `navigator.hardwareConcurrency` (logical cores). Null when unstated. */
  hardwareConcurrency: number | null;
  devicePixelRatio: number | null;
  /** True for a touch-first device (`(pointer: coarse)`). */
  coarsePointer: boolean;
  /** `navigator.connection.saveData` — the visitor asked us to be frugal. */
  saveData: boolean;
}

export interface QualityProfile {
  tier: QualityTier;
  /** Passed straight to the R3F `Canvas`: `dpr={[min, max]}`. */
  dpr: [number, number];
  /** Shadow maps at all. */
  shadows: boolean;
  /** The blurred contact shadow under a model. */
  contactShadows: boolean;
  /** Stars in the globe's sky. */
  starCount: number;
  /** Sphere segments for the globe (and its atmosphere shell). */
  globeSegments: number;
  /** Cap on the shadow map, in pixels. */
  shadowMapSize: number;
}

/**
 * The three profiles.
 *
 * `high` is what the product was designed on, so a desktop keeps the look it has
 * today; the other two take things away in the order a visitor would notice least
 * — stars, then contact shadows, then resolution and shadow-map size.
 */
export const QUALITY_PROFILES: Record<QualityTier, Omit<QualityProfile, "tier">> = {
  low: { dpr: [1, 1.25], shadows: false, contactShadows: false, starCount: 400, globeSegments: 48, shadowMapSize: 512 },
  balanced: { dpr: [1, 1.6], shadows: true, contactShadows: true, starCount: 900, globeSegments: 72, shadowMapSize: 1024 },
  high: { dpr: [1, 1.8], shadows: true, contactShadows: true, starCount: 1500, globeSegments: 96, shadowMapSize: 1024 },
};

/** The tier a set of facts adds up to. */
export function tierFor(facts: DeviceFacts): QualityTier {
  const memory = facts.deviceMemory;
  const cores = facts.hardwareConcurrency;

  // Anything known to be small, or a visitor on a metered connection, gets the
  // cheap profile. `saveData` outranks every other signal: it is a request.
  if (facts.saveData) return "low";
  if (memory !== null && memory <= 2) return "low";
  if (cores !== null && cores <= 2) return "low";

  // Unknown memory counts as mid-range, which is why it cannot reach "high":
  // guessing high on a device that never told us is how a stutter ships.
  const assumedMemory = memory ?? 4;
  const assumedCores = cores ?? 4;
  if (!facts.coarsePointer && assumedMemory >= 8 && assumedCores >= 8) return "high";

  return "balanced";
}

export function qualityFor(facts: DeviceFacts): QualityProfile {
  const tier = tierFor(facts);
  return { tier, ...QUALITY_PROFILES[tier] };
}

/** The slice of the browser this module reads; injectable for the checks. */
export interface DeviceSource {
  navigator?: {
    deviceMemory?: number;
    hardwareConcurrency?: number;
    devicePixelRatio?: number;
    connection?: { saveData?: boolean };
  };
  matchMedia?: ((query: string) => { matches: boolean }) | undefined;
}

/**
 * Reads the facts, defensively: every field is optional in every browser, and a
 * missing API must never throw — the canvas has to come up either way.
 */
export function readDeviceFacts(source: DeviceSource | undefined = globalThis as DeviceSource): DeviceFacts {
  const navigatorLike = source?.navigator;
  const number = (value: unknown) => (typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null);

  let coarsePointer = false;
  try {
    coarsePointer = source?.matchMedia?.("(pointer: coarse)")?.matches === true;
  } catch {
    coarsePointer = false;
  }

  return {
    deviceMemory: number(navigatorLike?.deviceMemory),
    hardwareConcurrency: number(navigatorLike?.hardwareConcurrency),
    devicePixelRatio: number(navigatorLike?.devicePixelRatio),
    coarsePointer,
    saveData: navigatorLike?.connection?.saveData === true,
  };
}
