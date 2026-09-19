"use client";

import { useFrame } from "@react-three/fiber";
import * as React from "react";
import * as THREE from "three";

import { buildRig, type MaterialKey, type PartSpec, type RigKind } from "@/lib/rigs";

/**
 * Renders a parametric creature rig and drives its idle animation.
 *
 * The geometry lives in `lib/rigs.ts` so it stays pure and testable; this module
 * only turns a rig into shaded meshes.
 */

function Part({ spec, materials }: { spec: PartSpec; materials: Record<MaterialKey, THREE.Material> }) {
  const material = materials[spec.material];

  return (
    <mesh position={spec.position} rotation={spec.rotation} scale={spec.scale} material={material} castShadow receiveShadow>
      {spec.shape === "sphere" ? <sphereGeometry args={spec.args as [number, number, number]} /> : null}
      {spec.shape === "capsule" ? <capsuleGeometry args={spec.args as [number, number, number, number]} /> : null}
      {spec.shape === "cone" ? <coneGeometry args={spec.args as [number, number, number]} /> : null}
      {spec.shape === "cylinder" ? <cylinderGeometry args={spec.args as [number, number, number, number]} /> : null}
      {spec.shape === "box" ? <boxGeometry args={spec.args as [number, number, number]} /> : null}
    </mesh>
  );
}

export interface ProceduralAnimalProps {
  kind: RigKind;
  accent: [string, string];
  /** Flat dark shading used by the silhouette quiz. */
  silhouette?: boolean;
  /** Idle breathing/motion. Disabled for static thumbnails. */
  animated?: boolean;
  /** Seconds offset so a grid of animals does not move in lockstep. */
  phase?: number;
  scale?: number;
  wireframe?: boolean;
}

export function ProceduralAnimal({
  kind,
  accent,
  silhouette = false,
  animated = true,
  phase = 0,
  scale = 1,
  wireframe = false,
}: ProceduralAnimalProps) {
  const groupRef = React.useRef<THREE.Group>(null);
  const rig = React.useMemo(() => buildRig(kind), [kind]);

  const materials = React.useMemo(() => {
    if (silhouette) {
      const mat = new THREE.MeshStandardMaterial({
        color: "#0a1526",
        roughness: 0.95,
        metalness: 0.05,
        emissive: new THREE.Color("#0d2740"),
        emissiveIntensity: 0.35,
        flatShading: false,
      });
      const eye = new THREE.MeshStandardMaterial({ color: "#0a1526", roughness: 0.6 });
      return { body: mat, accent: mat, dark: mat, secondary: mat, eye } satisfies Record<MaterialKey, THREE.Material>;
    }

    const make = (color: string, roughness = 0.45, metalness = 0.18) =>
      new THREE.MeshStandardMaterial({ color, roughness, metalness, wireframe });

    return {
      body: make(accent[0]),
      accent: make(accent[1], 0.5, 0.12),
      dark: make("#161d33", 0.7, 0.1),
      secondary: new THREE.MeshStandardMaterial({
        color: accent[1],
        roughness: 0.25,
        metalness: 0.1,
        transparent: true,
        opacity: 0.42,
        side: THREE.DoubleSide,
        depthWrite: false,
        wireframe,
      }),
      eye: new THREE.MeshStandardMaterial({ color: "#f4fbff", roughness: 0.15, metalness: 0.1, emissive: "#8fe9ff", emissiveIntensity: 0.5 }),
    } satisfies Record<MaterialKey, THREE.Material>;
  }, [accent, silhouette, wireframe]);

  React.useEffect(() => {
    return () => {
      Object.values(materials).forEach((material) => material.dispose());
    };
  }, [materials]);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    if (!animated) {
      groupRef.current.position.y = 0;
      groupRef.current.rotation.z = 0;
      return;
    }

    const t = clock.elapsedTime + phase;
    // Breathing bob + a subtle "weight shift" that reads as alive.
    groupRef.current.position.y = Math.sin(t * 1.5) * 0.035;
    groupRef.current.rotation.z = Math.sin(t * 0.8) * 0.02;
  });

  return (
    <group ref={groupRef} scale={scale}>
      {rig.map((spec, index) => (
        <Part key={index} spec={spec} materials={materials} />
      ))}
    </group>
  );
}