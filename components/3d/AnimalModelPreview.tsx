"use client";

import { Bounds, ContactShadows, OrbitControls, useGLTF } from "@react-three/drei";
import * as React from "react";
import * as THREE from "three";

import { applyMaterialFix } from "@/components/3d/apply-model-materials";
import { CanvasShell } from "@/components/3d/CanvasShell";
import { cloneModel, posedBounds } from "@/components/3d/clone-model";
import { StudioEnvironment } from "@/components/3d/StudioEnvironment";
import { useQuality } from "@/components/3d/useQuality";
import { useSettings } from "@/components/settings/SettingsProvider";
import { publicEnv } from "@/lib/env";
import { CAMERA_PRESETS } from "@/lib/camera-presets";
import { floorOffset } from "@/lib/model-floor";
import { disposeClone } from "@/lib/three-dispose";

/**
 * The real .glb, in a species card.
 *
 * The card used to show a procedural stand-in and the real model was reserved for the
 * species page. That was the right trade when models were megabytes; it stopped being one
 * once every model was DRACO-compressed - the catalogue now runs from 5 kB to 2.8 MB, and
 * `isPreviewableModel` admits everything inside the project's own shipping budget.
 *
 * Same contract as the silhouette it replaces: mounted only while a card is hovered or
 * focused, in the card's one canvas, torn down with the tile. What changes is what the
 * visitor sees - the lion they will meet on the species page, not an approximation of it.
 *
 * Three details are copied deliberately from the full viewer rather than invented here:
 *
 *   the clone     `useGLTF` caches its scene for the life of the page, so every viewer
 *                 draws `scene.clone(true)` and hands it back with `disposeClone` on
 *                 unmount - otherwise hovering twenty cards keeps twenty sets of GPU
 *                 buffers alive (docs/REVIEW.md, R6);
 *   the framing   the assets come from different authors with different units and origins,
 *                 so the model is centred and scaled to a fixed size instead of being
 *                 trusted to arrive at one;
 *   the decoder   the DRACO path is `publicEnv.dracoDecoderPath`, the same one the species
 *                 page uses, so a visitor who opened one has already paid for it.
 */
/** The heading every card looks from: the same 3/4 preset the full viewer opens on. */
const THREE_QUARTER =
  CAMERA_PRESETS.find((preset) => preset.id === "threeQuarter")?.direction ?? { x: 0.62, y: 0.42, z: 0.66 };

/** Only the starting distance; `<Bounds fit>` moves the camera to the distance the model needs. */
const START_DISTANCE = 4;

export function AnimalModelPreview({
  url,
  className,
  label,
  onReady,
}: {
  /** `animal.model_url` - the same file the species page loads. */
  url: string;
  className?: string;
  /** Screen-reader description of the canvas. */
  label: string;
  /** Fired once the model is in the scene, so the card can drop its placeholder. */
  onReady?: () => void;
}) {
  const quality = useQuality();
  const { settings } = useSettings();

  return (
    <CanvasShell
      className={className}
      // The 3/4 heading, taken from the presets the full viewer offers so the card and the model page
      // look at a monument from the same side. `<Bounds>` keeps this heading and fits the distance.
      camera={{ position: [THREE_QUARTER.x * START_DISTANCE, THREE_QUARTER.y * START_DISTANCE, THREE_QUARTER.z * START_DISTANCE], fov: 40, near: 0.05, far: 200 }}
      label={label}
      dpr={[1, 1.5]}
      shadows={false}
    >
      {/* Metals show only what they reflect, so the studio matters more than the lamps. */}
      <StudioEnvironment keyColor="#eaf7ff" fillColor="#a97bff" />
      <ambientLight intensity={1.15} />
      <directionalLight position={[3, 4, 3]} intensity={2.6} color="#eaf7ff" />
      <pointLight position={[-2.5, -1, -2]} intensity={5} distance={9} color="#a97bff" />

      {/*
        `fit` centres the camera on the model's bounding box and `observe` refits it when the tile
        changes size - a card is 211x158 on a phone grid and wider on a desktop one, and the framing
        has to be right in both. `clip` keeps the near and far planes tight around it.

        `margin` is 1.7 rather than the 1.25 the full viewer uses, and it is a measurement rather than a
        taste: `<Bounds fit>` sizes the camera from the box's **longest side**, so a model whose corners
        stick out past that sphere is still clipped. Projected for all 47 shipped models, a margin of
        1.25 leaves **19 of them with a corner outside the tile** - worst case the Petronas Towers at
        1.443 of the half-frame, i.e. 44% of the model past the edge. The sweep:

        | margin | models with a corner outside | worst overflow |
        | --- | --- | --- |
        | 1.25 | 19 | 1.443 |
        | 1.50 | 7 | 1.145 |
        | 1.60 | 4 | 1.057 |
        | 1.70 | **0** | 0.982 |

        A hover preview that shows most of a monument is worth more than one that fills the tile and
        loses the roof, so 1.7 it is: the whole model, centred, from the 3/4 heading.
      */}
      <Bounds fit clip observe margin={1.7}>
        <React.Suspense fallback={null}>
          <FramedModel url={url} shadows={quality.contactShadows} onReady={onReady} />
        </React.Suspense>
      </Bounds>

      {/*
        Outside `<Bounds>` on purpose, exactly as the full viewer places it: the shadow is a 3.4-unit plane
        at the model's feet, and `<Bounds fit>` measures **everything it contains**. Left inside, the fit
        would frame the shadow plane rather than the monument and every card would draw its model small
        and low. The measurement in the note above is the model's own box, which is what this ordering
        makes true.
      */}
      {quality.contactShadows ? (
        <ContactShadows position={[0, 0.01, 0]} opacity={0.35} scale={3.4} blur={2.4} far={2} color="#000000" />
      ) : null}

      <OrbitControls
        autoRotate={!settings.reduceMotion}
        autoRotateSpeed={1.4}
        enablePan={false}
        enableZoom={false}
        enableDamping
        dampingFactor={0.1}
        minPolarAngle={0.7}
        maxPolarAngle={Math.PI / 1.9}
        makeDefault
      />
    </CanvasShell>
  );
}

function FramedModel({
  url,
  shadows,
  onReady,
}: {
  url: string;
  shadows: boolean;
  onReady?: () => void;
}) {
  const gltf = useGLTF(url, publicEnv.dracoDecoderPath);
  const model = React.useMemo(() => cloneModel(gltf.scene), [gltf.scene]);

  React.useEffect(() => () => void disposeClone(model), [model]);

  React.useEffect(() => {
    onReady?.();
  }, [onReady]);

  React.useEffect(() => {
    model.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.castShadow = shadows;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) {
        if (!(material instanceof THREE.MeshStandardMaterial)) continue;
        applyMaterialFix(material);
      }
    });
  }, [model, shadows]);

  /**
   * Scale the longest side to a constant and sit the feet on the floor.
   *
   * The tile normalises **size** here - the assets arrive in wildly different units, from the 0.55-unit
   * Cologne Cathedral to the 82,800-unit Burj Khalifa - but it no longer decides where the camera
   * looks. That is `<Bounds>`'s job, and the difference is a bug this measurement caught:
   *
   * Measured on all 48 landmark models, framing by `1.9 / longest side` and then **centring the box on
   * the origin** put the model wherever its proportions happened to fall. A wide, low model - the
   * Forbidden City at 59.6 x 11.2 x 94.2 units, Sydney Harbour Bridge, Edinburgh Castle, the Trevi
   * Fountain - is scaled down by its 94-unit footprint, so its 11-unit height lands in the bottom
   * fifth of the tile. Counted from the camera's own projection: **21 of the 48 models put their
   * centre below the middle of the frame**, seven of them (Forbidden City, Sydney Harbour Bridge,
   * Edinburgh Castle, Uluru, the Trevi Fountain) had a corner **cut off by the bottom edge**, and
   * those are exactly the tiles where a visitor sees a sliver of roof and nothing else.
   *
   * So the model is placed once, correctly - feet on the floor, centred left to right - and the camera
   * is fitted to it by `<Bounds fit>`, which centres the view on the model's own bounding box whatever
   * its shape, along the 3/4 heading the Canvas starts from. One rule, and it cannot be wrong for a
   * model whose proportions nobody predicted.
   */
  const framing = React.useMemo(() => {
    const box = posedBounds(model);
    const size = box.getSize(new THREE.Vector3());
    // 1.9 rather than a snug 1.55: the tile is 211x158 on a phone-sized grid, and a model
    // that fills it edge to edge reads as clipped rather than framed.
    const scale = box.isEmpty() ? 1 : 1.9 / (Math.max(size.x, size.y, size.z) || 1);
    // The same arithmetic the species page uses, scaled with the model: see lib/model-floor.ts.
    const offset = floorOffset(box).map((value) => value * scale) as [number, number, number];
    return { scale, offset };
  }, [model]);

  return (
    <group>
      <group scale={framing.scale} position={framing.offset}>
        <primitive object={model} />
      </group>
    </group>
  );
}
