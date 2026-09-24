"use client";

import { ContactShadows, OrbitControls, useGLTF } from "@react-three/drei";
import * as React from "react";
import * as THREE from "three";

import { applyMaterialFix } from "@/components/3d/apply-model-materials";
import { CanvasShell } from "@/components/3d/CanvasShell";
import { anchorOffset, cloneModel, posedBounds } from "@/components/3d/clone-model";
import { StudioEnvironment } from "@/components/3d/StudioEnvironment";
import { useQuality } from "@/components/3d/useQuality";
import { useSettings } from "@/components/settings/SettingsProvider";
import { publicEnv } from "@/lib/env";
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
      camera={{ position: [2.1, 1.4, 2.7], fov: 40, near: 0.05, far: 200 }}
      label={label}
      dpr={[1, 1.5]}
      shadows={false}
    >
      {/* Metals show only what they reflect, so the studio matters more than the lamps. */}
      <StudioEnvironment keyColor="#eaf7ff" fillColor="#a97bff" />
      <ambientLight intensity={1.15} />
      <directionalLight position={[3, 4, 3]} intensity={2.6} color="#eaf7ff" />
      <pointLight position={[-2.5, -1, -2]} intensity={5} distance={9} color="#a97bff" />

      <React.Suspense fallback={null}>
        <FramedModel url={url} shadows={quality.contactShadows} onReady={onReady} />
      </React.Suspense>

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

  /** Centre on the origin, scale the longest side to a constant, sit the feet on the floor. */
  const framing = React.useMemo(() => {
    const box = posedBounds(model);
    const size = box.getSize(new THREE.Vector3());
    // 1.9 rather than a snug 1.55: the tile is 211x158 on a phone-sized grid, and a model
    // that fills it edge to edge reads as clipped rather than framed.
    const scale = box.isEmpty() ? 1 : 1.9 / (Math.max(size.x, size.y, size.z) || 1);
    // The same arithmetic the species page uses, scaled with the model: see clone-model.ts.
    const offset = anchorOffset(box).map((value) => value * scale) as [number, number, number];
    return { scale, offset };
  }, [model]);

  return (
    <group position={[0, -0.72, 0]}>
      <group scale={framing.scale} position={framing.offset}>
        <primitive object={model} />
      </group>
      {shadows ? (
        <ContactShadows position={[0, 0.01, 0]} opacity={0.35} scale={3.4} blur={2.4} far={2} color="#000000" />
      ) : null}
    </group>
  );
}
