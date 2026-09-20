"use client";

import { Bounds, Center, OrbitControls, useGLTF } from "@react-three/drei";
import * as React from "react";

import { CanvasShell } from "@/components/3d/CanvasShell";
import { ProceduralAnimal } from "@/components/3d/ProceduralAnimal";
import { publicEnv } from "@/lib/env";
import { seededRandom } from "@/lib/utils";
import type { Animal } from "@/types/animal";

/**
 * The mystery silhouette: the species rendered flat-dark and slowly rotating.
 *
 * While the question is open it is the *procedural* rig, never the `.glb`: a round
 * of ten questions would otherwise pull ten models before a single answer, on the
 * quiz page of all places. Answering is what swaps in the real asset — the
 * reviewer's reward, and a deliberate one-way door (a revealed model stays
 * revealed for that question).
 */

/** The real `.glb`, framed by `Bounds` so a 27 m whale and an axolotl both fit. */
function RevealedModel({ url }: { url: string }) {
  const { scene } = useGLTF(url, publicEnv.dracoDecoderPath);
  const model = React.useMemo(() => scene.clone(true), [scene]);

  return (
    <Bounds fit clip observe margin={1.3}>
      <Center bottom>
        <primitive object={model} />
      </Center>
    </Bounds>
  );
}

export function SilhouetteStage({ animal, reveal }: { animal: Animal; reveal: boolean }) {
  const phase = React.useMemo(() => seededRandom(animal.slug + "quiz") * 6, [animal.slug]);
  const rig = (
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
  );

  return (
    <CanvasShell
      className="h-[240px] w-full rounded-[var(--radius-card)] bg-gradient-to-b from-[#0a1120] to-[#04060f] ring-1 ring-white/10 sm:h-[320px]"
      camera={{ position: [2.4, 1.6, 3.2], fov: 40 }}
      shadows={false}
      label={
        reveal
          ? `${animal.name} revealed in 3D`
          : "Rotating shadow silhouette of a mystery animal"
      }
    >
      <ambientLight intensity={0.55} />
      <hemisphereLight args={["#8fd8ff", "#04060f", 0.5]} />
      <directionalLight position={[4, 5, 3]} intensity={2.1} color="#eaf7ff" />
      <pointLight position={[-3, -1, -2]} intensity={5} distance={12} color={reveal ? "#35f0c0" : "#a97bff"} />

      {reveal && animal.model_url ? (
        <React.Suspense fallback={rig}>
          <RevealedModel url={animal.model_url} />
        </React.Suspense>
      ) : (
        rig
      )}

      <OrbitControls
        makeDefault
        autoRotate
        autoRotateSpeed={reveal ? 0.9 : 1.5}
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
