"use client";

import { Environment, Lightformer } from "@react-three/drei";

/**
 * The studio a metal model needs in order to be visible at all.
 *
 * This is the fix for "the model is dark and I cannot see anything", and the cause was not
 * taste. The lion's own material is `metallicFactor 0.52, roughness 0` — a mirror — and
 * Sketchfab exports routinely are. A metallic surface shows **only what it reflects**, and
 * this scene had punctual lights and no environment to reflect, so the `envMapIntensity` the
 * viewer has always set was a number applied to nothing. Measured on the species page before
 * this change: the canvas' median pixel sat at luminance 9/255 and its 95th percentile at
 * 36/255. Sketchfab's viewer looks the way it does because it lights every model with a
 * studio HDRI; this is that idea, in code.
 *
 * **Nothing is downloaded.** The environment is drawn into a cube render target from
 * `Lightformer` panels — an emissive box above, two soft panels at the sides, a dim bounce
 * below — and takes its colours from the light preset in use, so "sunset" is not lit by a
 * white studio. A drei preset would fetch an HDRI from a CDN, which this project does not do
 * for anything on the critical path (docs/PERFORMANCE.md), and a shipped .hdr would be a
 * megabyte of asset for a rig that is a few hundred bytes of code.
 *
 * `frames={1}` bakes it once: the rig never moves, so re-rendering it every frame would be
 * pure waste.
 *
 * The cube is deliberately **bright to the point of being blown out**. The lion's own numbers
 * explain why: its base colour factor is 0.388 grey and it is 52% metallic, so the surface
 * reflects about 6% of whatever surrounds it — a mid-grey studio gave a model whose 95th
 * percentile pixel sat at luminance 23/255, which is what "I cannot see anything" looks like
 * as a number. Reflectance that low needs a bright room to be visible at all, and the page
 * background is unaffected either way: this is the room, not the page.
 */
export function StudioEnvironment({
  intensity = 1,
  keyColor = "#ffffff",
  fillColor = "#9fd8ff",
  resolution = 128,
}: {
  /** Overall strength; the presets tune their own balance with this. */
  intensity?: number;
  /** The colour of the big panel above — the preset's own key light. */
  keyColor?: string;
  /** The colour of the side panels — the preset's own fill. */
  fillColor?: string;
  /** Cube resolution. 128 is plenty for soft reflections and costs one small render. */
  resolution?: number;
}) {
  return (
    <Environment resolution={resolution} frames={1} background={false}>
      {/* The cube's own base colour, and it is **light**. This is the number that decides
          whether a metallic model is visible: a mirror shows what surrounds it, so a dark
          base made the lion reflect a dark room and the canvas stayed at luminance 9/255
          even with the panels in place. Sketchfab's studio is bright for the same reason.
          The page background stays dark — this is the room the model stands in, not the
          page. */}
      <color attach="background" args={["#e8eefb"]} />

      {/* Key: a broad panel above and slightly in front, which is what gives a model its
          shape from the top down. Lightformers face the origin by default. */}
      <Lightformer intensity={6 * intensity} color={keyColor} position={[0, 3.2, 2]} scale={[10, 5, 1]} />
      {/* Two side panels, deliberately unequal — a symmetric rig flattens the form. */}
      <Lightformer intensity={3.4 * intensity} color={fillColor} position={[-4, 1.4, 0.6]} scale={[7, 4, 1]} />
      <Lightformer intensity={2.2 * intensity} color={keyColor} position={[4.2, 1.1, -0.4]} scale={[7, 4, 1]} />
      {/* A bounce from below, so the underside is shaded rather than absent. */}
      <Lightformer form="circle" intensity={1.8 * intensity} color={fillColor} position={[0, -3, 0.5]} scale={6} />
    </Environment>
  );
}
