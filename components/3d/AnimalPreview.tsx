"use client";

import { ContactShadows, OrbitControls } from "@react-three/drei";
import * as React from "react";

import { CanvasShell } from "@/components/3d/CanvasShell";
import { ProceduralAnimal } from "@/components/3d/ProceduralAnimal";
import type { SilhouetteKind } from "@/types/animal";

/**
 * Lightweight per-card 3D preview.
 *
 * Mounted lazily (only while a card is hovered/focused) and always procedural,
 * so a grid of 24 species never spins up 24 GLB downloads. Real `.glb` models are
 * reserved for the full ModelViewer on the detail page.
 */
export function AnimalPreview({
  kind,
  accent,
  className,
}: {
  kind: SilhouetteKind;
  accent: [string, string];
  className?: string;
}) {
  return (
    <CanvasShell
      className={className}
      camera={{ position: [2.1, 1.5, 2.6], fov: 38 }}
      label="Rotating 3D preview of this species"
      dpr={[1, 1.5]}
      shadows={false}
    >
      <ambientLight intensity={1.25} />
      <directionalLight position={[3, 4, 3]} intensity={2.4} color="#eaf7ff" />
      <pointLight position={[-2.5, -1, -2]} intensity={5} distance={9} color="#a97bff" />

      <group position={[0, -0.75, 0]}>
        <ProceduralAnimal kind={kind} accent={accent} scale={1.05} />
        <ContactShadows position={[0, 0.01, 0]} opacity={0.35} scale={4} blur={2.4} far={2} color="#000000" />
      </group>

      <OrbitControls
        autoRotate
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
