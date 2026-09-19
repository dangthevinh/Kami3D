"use client";

import { Html, OrbitControls, Stars, useTexture } from "@react-three/drei";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { MapPin, RotateCcw, Sparkles } from "lucide-react";
import * as React from "react";
import * as THREE from "three";

import { CanvasShell, CanvasFallback } from "@/components/3d/CanvasShell";
import { Button } from "@/components/ui/button";
import {
  createGlowCanvas,
  createGraticuleCanvas,
  latLngToVector3,
  nearestRegion,
  regionMarkers,
  vector3ToLatLng,
} from "@/lib/globe";
import { useExploreStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { REGION_ANCHORS, type Region } from "@/types/animal";

const GLOBE_RADIUS = 1;
const HOTSPOT_RADIUS = 1.008;
/** Below this dot product the marker is on the far side of the globe. */
const FRONT_FACING_THRESHOLD = 0.18;

export interface InteractiveGlobeProps {
  /** Species per region, shown on the hotspot labels. */
  counts?: Record<string, number>;
  /** Optional equirectangular earth map (e.g. from Supabase Storage). */
  textureUrl?: string | null;
  /** Extra side effect on selection — the home page uses it to route to /explore. */
  onRegionSelect?: (region: Region) => void;
  className?: string;
}

/* -------------------------------------------------------------------------- */
/* Scene                                                                      */
/* -------------------------------------------------------------------------- */

function useProceduralTexture() {
  const texture = React.useMemo(() => {
    const canvas = createGraticuleCanvas(2048);
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 8;
    map.needsUpdate = true;
    return map;
  }, []);

  React.useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

function useGlowTexture() {
  const texture = React.useMemo(() => {
    const canvas = createGlowCanvas(256, "53, 240, 192");
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    return map;
  }, []);

  React.useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

interface HotspotProps {
  region: Region;
  count: number;
  active: boolean;
  glow: THREE.Texture;
  onSelect: (region: Region) => void;
}

function RegionHotspot({ region, count, active, glow, onSelect }: HotspotProps) {
  const anchor = REGION_ANCHORS[region];
  const groupRef = React.useRef<THREE.Group>(null);
  const labelRef = React.useRef<HTMLDivElement>(null);
  const haloRef = React.useRef<THREE.Sprite>(null);
  const [hovered, setHovered] = React.useState(false);

  const position = React.useMemo(() => {
    const { x, y, z } = latLngToVector3(anchor.lat, anchor.lng, HOTSPOT_RADIUS);
    return new THREE.Vector3(x, y, z);
  }, [anchor.lat, anchor.lng]);

  // Face the marker away from the globe centre so the disc sits flush on the surface.
  React.useEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    group.lookAt(position.clone().multiplyScalar(3));
  }, [position]);

  const worldPosition = React.useMemo(() => new THREE.Vector3(), []);
  const camDirection = React.useMemo(() => new THREE.Vector3(), []);

  useFrame(({ camera, clock }) => {
    const group = groupRef.current;
    if (!group) return;

    group.getWorldPosition(worldPosition);
    camDirection.copy(camera.position).normalize();
    const facing = worldPosition.clone().normalize().dot(camDirection);

    // Cheap "occlusion": fade markers that rotated round the back.
    const visibility = THREE.MathUtils.smoothstep(facing, FRONT_FACING_THRESHOLD - 0.25, FRONT_FACING_THRESHOLD + 0.1);
    if (labelRef.current) {
      labelRef.current.style.opacity = `${visibility}`;
      labelRef.current.style.pointerEvents = visibility > 0.5 ? "auto" : "none";
    }

    if (haloRef.current) {
      const pulse = 0.5 + 0.5 * Math.sin(clock.elapsedTime * 2.1 + anchor.lng * 0.05);
      const scale = active ? 0.34 + pulse * 0.1 : 0.2 + pulse * 0.06;
      haloRef.current.scale.setScalar(scale);
      const material = haloRef.current.material as THREE.SpriteMaterial;
      material.opacity = visibility * (active ? 0.85 : hovered ? 0.7 : 0.4);
    }
  });

  const accent = active ? "#35f0c0" : hovered ? "#38e0ff" : "#8fb7d9";

  return (
    <group ref={groupRef} position={position}>
      {/* Invisible-but-hittable disc */}
      <mesh
        onPointerOver={(event) => {
          event.stopPropagation();
          setHovered(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = "";
        }}
        onClick={(event) => {
          event.stopPropagation();
          onSelect(region);
        }}
      >
        <circleGeometry args={[0.052, 24]} />
        <meshBasicMaterial color={accent} transparent opacity={active ? 0.95 : 0.6} />
      </mesh>

      {/* Marquee ring */}
      <mesh position={[0, 0, 0.002]}>
        <ringGeometry args={[0.056, 0.064, 32]} />
        <meshBasicMaterial color={accent} transparent opacity={active ? 0.9 : 0.45} side={THREE.DoubleSide} />
      </mesh>

      <sprite ref={haloRef} position={[0, 0, 0.004]}>
        <spriteMaterial
          map={glow}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          opacity={0.4}
        />
      </sprite>

      <Html center distanceFactor={2.4} zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
        <div ref={labelRef} className="transition-opacity duration-200" style={{ opacity: 0 }}>
          <button
            type="button"
            onClick={() => onSelect(region)}
            className={cn(
              "flex -translate-y-8 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium backdrop-blur",
              "ring-1 transition-colors",
              active
                ? "bg-neon/20 text-neon ring-neon/45"
                : "bg-void/70 text-white/75 ring-white/15 hover:text-white",
            )}
          >
            <MapPin className="size-3" />
            {anchor.label}
            <span className={cn("tabular-nums", active ? "text-neon/80" : "text-white/45")}>{count}</span>
          </button>
        </div>
      </Html>
    </group>
  );
}

interface GlobeSceneProps {
  counts: Record<string, number>;
  textureUrl?: string | null;
  onSelect: (region: Region) => void;
}

function GlobeMaterial({ map }: { map: THREE.Texture }) {
  return <meshStandardMaterial map={map} roughness={0.82} metalness={0.22} emissive="#0b2f45" emissiveIntensity={0.55} />;
}

function TexturedGlobeSurface({ url }: { url: string }) {
  const map = useTexture(url);
  return <GlobeMaterial map={map} />;
}

function GlobeScene({ counts, textureUrl, onSelect }: GlobeSceneProps) {
  const region = useExploreStore((state) => state.region);
  const procedural = useProceduralTexture();
  const glow = useGlowTexture();

  const groupRef = React.useRef<THREE.Group>(null);
  const interacting = React.useRef(false);
  const idleSince = React.useRef(0);
  const pointerDownAt = React.useRef<{ x: number; y: number } | null>(null);

  const markers = React.useMemo(() => regionMarkers(HOTSPOT_RADIUS), []);

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;

    if (interacting.current) {
      idleSince.current = 0;
      return;
    }

    idleSince.current += delta;
    // Idle spin: the globe only drifts once the visitor stops touching it.
    if (idleSince.current > 2.4) {
      group.rotation.y += delta * 0.055;
    }
  });

  /** Snap a globe click to the closest region; ignore true mid-ocean hits. */
  const handleGlobeClick = (event: ThreeEvent<MouseEvent>) => {
    const start = pointerDownAt.current;
    pointerDownAt.current = null;
    if (start) {
      const moved = Math.hypot(event.nativeEvent.clientX - start.x, event.nativeEvent.clientY - start.y);
      // A click that was actually an orbit drag must not change the filter.
      if (moved > 6) return;
    }

    const group = groupRef.current;
    if (!group) return;

    const local = group.worldToLocal(event.point.clone()).normalize();
    const hit = nearestRegion(vector3ToLatLng({ x: local.x, y: local.y, z: local.z }));
    if (hit) onSelect(hit);
  };

  return (
    <>
      <ambientLight intensity={1.15} />
      <hemisphereLight args={["#bfe9ff", "#0a1024", 0.7]} />
      <directionalLight position={[4.5, 3, 4]} intensity={2.6} color="#e8f7ff" castShadow={false} />
      <directionalLight position={[-5, -2, -3.5]} intensity={0.9} color="#a97bff" />
      <pointLight position={[0, 0, 3.2]} intensity={6} distance={12} color="#35f0c0" />

      <Stars radius={70} depth={45} count={1500} factor={3.4} saturation={0} fade speed={0.35} />

      <group ref={groupRef}>
        <mesh
          onPointerDown={(event) => {
            pointerDownAt.current = { x: event.nativeEvent.clientX, y: event.nativeEvent.clientY };
          }}
          onClick={handleGlobeClick}
        >
          <sphereGeometry args={[GLOBE_RADIUS, 96, 96]} />
          {textureUrl ? <TexturedGlobeSurface url={textureUrl} /> : <GlobeMaterial map={procedural} />}
        </mesh>

        {/* Atmosphere rim */}
        <mesh scale={1.045}>
          <sphereGeometry args={[GLOBE_RADIUS, 64, 64]} />
          <meshBasicMaterial
            color="#38e0ff"
            transparent
            opacity={0.07}
            side={THREE.BackSide}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>

        {markers.map((marker) => (
          <RegionHotspot
            key={marker.region}
            region={marker.region}
            count={counts[marker.region] ?? 0}
            active={region === marker.region}
            glow={glow}
            onSelect={onSelect}
          />
        ))}
      </group>

      <OrbitControls
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.55}
        zoomSpeed={0.7}
        minDistance={1.55}
        maxDistance={4.4}
        minPolarAngle={0.25}
        maxPolarAngle={Math.PI - 0.25}
        onStart={() => {
          interacting.current = true;
        }}
        onEnd={() => {
          interacting.current = false;
        }}
        target={[0, 0, 0]}
        makeDefault
      />
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Public component                                                           */
/* -------------------------------------------------------------------------- */

export function InteractiveGlobe({ counts = {}, textureUrl = null, onRegionSelect, className }: InteractiveGlobeProps) {
  const region = useExploreStore((state) => state.region);
  const setRegion = useExploreStore((state) => state.setRegion);
  const reset = useExploreStore((state) => state.reset);
  const total = Object.values(counts).reduce((sum, value) => sum + value, 0);

  const active = region === "All" ? null : REGION_ANCHORS[region];

  const handleSelect = React.useCallback(
    (next: Region) => {
      setRegion(next);
      onRegionSelect?.(next);
    },
    [setRegion, onRegionSelect],
  );

  return (
    <div className={cn("relative", className)}>
      <CanvasShell
        className="h-[340px] sm:h-[440px] lg:h-[560px]"
        camera={{ position: [0, 0.6, 3.1], fov: 42, near: 0.1, far: 200 }}
        label="Interactive 3D globe. Click a highlighted region to filter the species list."
        fallback={<CanvasFallback message="Your device could not start WebGL — use the region list instead." />}
      >
        <GlobeScene counts={counts} textureUrl={textureUrl} onSelect={handleSelect} />
      </CanvasShell>

      {/* HUD: keyboard/touch friendly alternative to clicking the globe */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-3 p-3 sm:p-4">
        <div className="pointer-events-auto flex flex-wrap items-center gap-2">
          <span className="glass inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] text-white/70">
            <Sparkles className="size-3 text-neon" />
            {total} species across {Object.keys(counts).length} regions
          </span>
          {active ? (
            <span className="neon-ring inline-flex items-center gap-1.5 rounded-full bg-neon/15 px-3 py-1.5 text-[11px] font-medium text-neon">
              <MapPin className="size-3" />
              {active.label}
              <button
                type="button"
                onClick={reset}
                className="ml-0.5 rounded-full px-1.5 text-neon/70 transition-colors hover:bg-neon/20 hover:text-neon"
                aria-label="Clear region filter"
              >
                ×
              </button>
            </span>
          ) : (
            <span className="glass inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] text-white/55">
              Drag to spin · scroll to zoom · click a pin to filter
            </span>
          )}
        </div>

        <div className="pointer-events-auto flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <FilterChip label="All regions" active={region === "All"} onClick={() => setRegion("All")} />
          {markersToChips(counts).map(({ region: chipRegion, label, count }) => (
            <FilterChip
              key={chipRegion}
              label={`${label} · ${count}`}
              active={region === chipRegion}
              onClick={() => setRegion(chipRegion)}
            />
          ))}
        </div>
      </div>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={reset}
        className="glass absolute right-3 top-3"
        aria-label="Reset globe filters"
      >
        <RotateCcw />
        Reset
      </Button>
    </div>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "shrink-0 rounded-full px-3 py-1.5 text-[11px] font-medium ring-1 backdrop-blur transition-colors",
        active
          ? "bg-neon/20 text-neon ring-neon/40"
          : "bg-void/60 text-white/65 ring-white/12 hover:bg-white/10 hover:text-white",
      )}
    >
      {label}
    </button>
  );
}

/** Regions that actually have species, in a stable order. */
function markersToChips(counts: Record<string, number>) {
  return regionMarkers()
    .map(({ region, anchor }) => ({ region, label: anchor.label, count: counts[region] ?? 0 }))
    .filter((entry) => entry.count > 0);
}
