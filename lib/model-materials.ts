/**
 * The two things a downloaded model's own materials get wrong.
 *
 * The lion rendered as a dark smear, and the cause was not the lighting rig: it is in the
 * GLB. `public/models/lion.glb` declares
 *
 *   alphaMode      "BLEND"                       -> three sets transparent, depthWrite: false
 *   metallicFactor 0.5219751671489173
 *   roughnessFactor 0
 *   baseColorFactor [0.388, 0.388, 0.388]
 *   KHR_materials_specular { specularFactor: 0 }
 *
 * Two separate problems, both fixable without touching the geometry:
 *
 *   1. **It is not actually transparent.** Blending an opaque statue means it never writes
 *      depth, so its own faces sort arbitrarily and it reads as a ghost. Sketchfab exports do
 *      this constantly. When nothing about the material can be transparent — no alpha map, an
 *      opacity of 1 and no alpha test — the blend mode is an artefact, and treating it as
 *      opaque is what the author saw in their own viewer.
 *
 *   2. **A metal with almost no environment is a black metal.** `metalness 0.52` moves more
 *      than half the response from diffuse to reflection, and a roughness of 0 makes that
 *      reflection a mirror: the model shows the room it stands in, not its own colour. That is
 *      why the lion has to be lit by a studio (see StudioEnvironment) — and why the studio is
 *      not enough on its own. A metal's albedo *is* its reflectance, and ours is a procedural
 *      cube rather than the HDRI a viewer like Sketchfab lights with, so metallic surfaces get
 *      a proportional boost. Dielectrics are left alone: they already get their colour from
 *      the lights.
 *
 * Pure and dependency-free so `scripts/check-materials.mjs` can pin both rules.
 */

/** Env-map strength for a surface that reflects nothing: the diffuse-only baseline. */
export const DIELECTRIC_ENV_INTENSITY = 1.15;
/** Added per unit of metalness, so a pure metal lands at 5. */
export const METAL_ENV_INTENSITY_PER_METALNESS = 3.85;

export interface MaterialFacts {
  metalness: number;
  transparent: boolean;
  opacity: number;
  alphaTest: number;
  /** True when the material has an alpha map, which is what blending may be for. */
  hasAlphaMap: boolean;
}

export interface MaterialFix {
  /** Force the material opaque (transparent false, depthWrite true). */
  opaque: boolean;
  envMapIntensity: number;
}

/** A metal reflects; everything else is lit. */
export function envIntensityFor(metalness: number): number {
  const m = Number.isFinite(metalness) ? Math.min(Math.max(metalness, 0), 1) : 0;
  return Number((DIELECTRIC_ENV_INTENSITY + METAL_ENV_INTENSITY_PER_METALNESS * m).toFixed(3));
}

/**
 * What to change on one material. Never throws: a missing field means a material that keeps
 * its own values, which is the safe direction.
 */
export function materialFix(facts: MaterialFacts): MaterialFix {
  const opaque = facts.transparent && !facts.hasAlphaMap && facts.opacity >= 1 && facts.alphaTest === 0;
  return { opaque, envMapIntensity: envIntensityFor(facts.metalness) };
}
