"use client";

import { OrbitControls } from "@react-three/drei";
import * as React from "react";

import { CanvasShell } from "@/components/3d/CanvasShell";
import { ProceduralAnimal } from "@/components/3d/ProceduralAnimal";
import { seededRandom } from "@/lib/utils";
import type { Animal } from "@/types/animal";

/**
 * The mystery silhouette: the species rendered flat-dark and slowly rotating.
 *
 * Rendered with the procedural rig rather than a `.glb` per species, so a round of
 * ten questions costs one small canvas instead of ten model downloads.
 */
export function SilhouetteStage({ animal, reveal }: { animal: Animal; reveal: boolean }) {
  const phase = React.useMemo(() => seededRandom(animal.slug + "quiz") * 6, [animal.slug]);

  return (
    <CanvasShell
      className="h-[240px] w-full rounded-[var(--radius-card)] bg-gradient-to-b from-[#0a1120] to-[#04060f] ring-1 ring-white/10 sm:h-[320px]"
      camera={{ position: [2.4, 1.6, 3.2], fov: 40 }}
      shadows={false}
      label="Rotating shadow silhouette of a mystery animal"
    >
      <ambientLight intensity={0.55} />
      <hemisphereLight args={["#8fd8ff", "#04060f", 0.5]} />
      <directionalLight position={[4, 5, 3]} intensity={2.1} color="#eaf7ff" />
      <pointLight position={[-3, -1, -2]} intensity={5} distance={12} color={reveal ? "#35f0c0" : "#a97bff"} />

      <group position={[0, -0.78, 0]}>
        <ProceduralAnimal
          key={animal.id}
          kind={animal.silhouette}
          accent={animal.accent}
          silhouette={!reveal}
          phase={phase}
          scale={1.02}
        />
      </group>

      <OrbitControls
        makeDefault
        autoRotate
        autoRotateSpeed={1.5}
        enableZoom={false}
        enablePan={false}
        enableDamping
        dampingFactor={0.12}
        minPolarAngle={0.6}
        maxPolarAngle={Math.PI / 1.85}
      />
    </CanvasShell>
  );
}
