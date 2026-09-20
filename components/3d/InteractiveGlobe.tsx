"use client";

import { Html, OrbitControls, Stars, useTexture } from "@react-three/drei";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Layers, MapPin, RotateCcw, Sparkles } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import * as THREE from "three";

import { CanvasShell, CanvasFallback } from "@/components/3d/CanvasShell";
import { useQuality } from "@/components/3d/useQuality";
import { Button } from "@/components/ui/button";
import { approach, dolly as dollyToward, hasArrived, orbitBy } from "@/lib/camera-presets";
import {
  createGlowCanvas,
  createGraticuleCanvas,
  cameraTargetFor,
  latLngToVector3,
  nearestRegion,
  regionFacingCamera,
  regionMarkers,
  vector3ToLatLng,
  type GlobePin,
} from "@/lib/globe";
import { createEarthCanvas } from "@/lib/earth-texture";
import type { LandData } from "@/lib/earth-map";
import { useExploreStore } from "@/lib/store";
import { cn, formatCount } from "@/lib/utils";
import { REGION_ANCHORS, type Region } from "@/types/animal";

const GLOBE_RADIUS = 1;
const HOTSPOT_RADIUS = 1.008;
/** Below this dot product the marker is on the far side of the globe. */
const FRONT_FACING_THRESHOLD = 0.18;

/** How far one arrow key turns the camera, and one zoom key closes in. */
const KEY_YAW = Math.PI / 24;
const KEY_PITCH = Math.PI / 48;
const KEY_ZOOM = 0.86;

/** The camera the globe opens with, and what "reset" returns to. */
const HOME_CAMERA: [number, number, number] = [0, 0.6, 3.1];

/* -------------------------------------------------------------------------- */
/* Textures                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * The world map, fetched once.
 *
 * Lifted into the DOM half so the detail control knows whether the map exists yet:
 * "show me the map" is a button that has to be able to say "not loaded", and a hook
 * buried inside the canvas cannot tell it.
 */
function useLandData() {
  const [land, setLand] = React.useState<LandData | null>(null);

  React.useEffect(() => {
    let active = true;

    fetch("/geo/land-110m.json")
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error(String(response.status)))))
      .then((data: LandData) => {
        if (active && Array.isArray(data?.polygons)) setLand(data);
      })
      .catch((error: unknown) => {
        console.warn("[kami3d] world map unavailable, keeping the graticule:", (error as Error).message);
      });

    return () => {
      active = false;
    };
  }, []);

  return land;
}

/**
 * The globe's surface, in two tiers.
 *
 * The grid is drawn first and always: it is a complete, honest globe, so a visitor
 * on a slow connection (or one whose 76 KB of coastlines failed to arrive) still
 * sees something worth looking at — never a spinner. The map replaces it when the
 * geometry is there, and the visitor can switch back.
 *
 * Cost scales with the device: a low tier draws a 1024px texture without the depth
 * and relief passes, which are the two expensive strokes in the renderer.
 */
function useEarthTexture(land: LandData | null, detail: "grid" | "map", width: number) {
  const coarse = width <= 1024;

  const texture = React.useMemo(() => {
    const canvas =
      detail === "map" && land
        ? createEarthCanvas(land, { width, depth: !coarse, relief: !coarse })
        : createGraticuleCanvas(width);

    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = coarse ? 4 : 8;
    map.needsUpdate = true;
    return map;
  }, [coarse, detail, land, width]);

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

/* -------------------------------------------------------------------------- */
/* Markers                                                                    */
/* -------------------------------------------------------------------------- */

interface HotspotProps {
  region: Region;
  count: number;
  species: GlobePin[];
  active: boolean;
  glow: THREE.Texture;
  onSelect: (region: Region) => void;
}

function RegionHotspot({ region, count, species, active, glow, onSelect }: HotspotProps) {
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
        <spriteMaterial map={glow} transparent depthWrite={false} blending={THREE.AdditiveBlending} opacity={0.4} />
      </sprite>

      <Html center distanceFactor={2.4} zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
        <div ref={labelRef} className="transition-opacity duration-200" style={{ opacity: 0 }}>
          <button
            type="button"
            onClick={() => onSelect(region)}
            className={cn(
              "flex -translate-y-8 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium backdrop-blur",
              "ring-1 transition-colors",
              active ? "bg-neon/20 text-neon ring-neon/45" : "bg-void/70 text-white/75 ring-white/15 hover:text-white",
            )}
          >
            <MapPin className="size-3" />
            {anchor.label}
            <span className={cn("tabular-nums", active ? "text-neon/80" : "text-white/45")}>{count}</span>
          </button>

          {/* The three most-opened species here, straight into their pages: the
              globe stops being a filter and becomes a way in. */}
          {species.length > 0 ? (
            <ul className="mt-1 w-max space-y-0.5 rounded-xl bg-void/80 p-1.5 ring-1 ring-white/12 backdrop-blur">
              {species.map((pin) => (
                <li key={pin.slug}>
                  <Link
                    href={`/animal/${pin.slug}`}
                    className="flex items-center justify-between gap-3 rounded-lg px-2 py-1 text-[11px] text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    <span className="truncate">{pin.name}</span>
                    <span className="tabular-nums text-white/35">{formatCount(pin.views)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </Html>
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/* Camera                                                                     */
/* -------------------------------------------------------------------------- */

/** What the DOM half can ask the globe's camera to do. */
export interface GlobeApi {
  flyTo(region: Region): void;
  orbit(yaw: number, pitch: number): void;
  zoom(factor: number): void;
  /** The region currently facing the camera, for the Enter key. */
  facingRegion(): Region | null;
  goHome(): void;
}

function GlobeRig({
  apiRef,
  onFlightChange,
}: {
  apiRef: React.RefObject<GlobeApi | null>;
  onFlightChange?: (flying: boolean) => void;
}) {
  const camera = useThree((state) => state.camera);
  const controls = useThree((state) => state.controls) as { update: () => void } | null;
  const region = useExploreStore((state) => state.region);

  const flight = React.useRef<THREE.Vector3 | null>(null);
  const firstRun = React.useRef(true);
  const focused = React.useRef<Region | null>(null);

  const send = React.useCallback(
    (target: { x: number; y: number; z: number }) => {
      flight.current = new THREE.Vector3(target.x, target.y, target.z);
      onFlightChange?.(true);
    },
    [onFlightChange],
  );

  const flyTo = React.useCallback(
    (next: Region) => {
      // Keep the visitor's zoom: a fly-to is a turn, not a jump cut.
      send(cameraTargetFor(next, camera.position.length(), 0.35));
    },
    [camera, send],
  );

  /** Selecting a region turns the globe to face it, however it was selected. */
  React.useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    if (region === "All") {
      send({ x: HOME_CAMERA[0], y: HOME_CAMERA[1], z: HOME_CAMERA[2] });
      return;
    }
    flyTo(region);
  }, [flyTo, region, send]);

  React.useEffect(() => {
    apiRef.current = {
      flyTo,
      orbit(yaw, pitch) {
        const next = orbitBy({ x: 0, y: 0, z: 0 }, camera.position, yaw, pitch);
        send({ ...next, y: Math.max(-camera.position.length() * 0.98, Math.min(camera.position.length() * 0.98, next.y)) });
      },
      zoom(factor) {
        const next = dollyToward({ x: 0, y: 0, z: 0 }, camera.position, factor, 1.55, 4.4);
        send(next);
      },
      facingRegion() {
        return regionFacingCamera(camera.position);
      },
      goHome() {
        send({ x: HOME_CAMERA[0], y: HOME_CAMERA[1], z: HOME_CAMERA[2] });
      },
    };

    return () => {
      apiRef.current = null;
    };
  }, [apiRef, camera, flyTo, send]);

  useFrame((_, delta) => {
    const target = flight.current;
    if (!target) return;

    const stepped = approach(camera.position, target, delta, 4.5);
    camera.position.set(stepped.x, stepped.y, stepped.z);
    camera.lookAt(0, 0, 0);
    controls?.update();

    if (hasArrived(camera.position, target, 0.004)) {
      flight.current = null;
      focused.current = null;
      onFlightChange?.(false);
    }
  });

  return null;
}

/* -------------------------------------------------------------------------- */
/* Scene                                                                      */
/* -------------------------------------------------------------------------- */

interface GlobeSceneProps {
  counts: Record<string, number>;
  species: Record<string, GlobePin[]>;
  textureUrl?: string | null;
  land: LandData | null;
  detail: "grid" | "map";
  onSelect: (region: Region) => void;
  apiRef: React.RefObject<GlobeApi | null>;
}

function GlobeMaterial({ map }: { map: THREE.Texture }) {
  return <meshStandardMaterial map={map} roughness={0.82} metalness={0.22} emissive="#0b2f45" emissiveIntensity={0.55} />;
}

function TexturedGlobeSurface({ url }: { url: string }) {
  const map = useTexture(url);
  return <GlobeMaterial map={map} />;
}

function GlobeScene({ counts, species, textureUrl, land, detail, onSelect, apiRef }: GlobeSceneProps) {
  const region = useExploreStore((state) => state.region);
  const quality = useQuality();
  const textureWidth = quality.tier === "low" ? 1024 : 2048;
  const procedural = useEarthTexture(land, detail, textureWidth);
  const glow = useGlowTexture();

  const groupRef = React.useRef<THREE.Group>(null);
  const interacting = React.useRef(false);
  const flying = React.useRef(false);
  const idleSince = React.useRef(0);
  const pointerDownAt = React.useRef<{ x: number; y: number } | null>(null);

  const markers = React.useMemo(() => regionMarkers(HOTSPOT_RADIUS), []);

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;

    if (interacting.current || flying.current) {
      idleSince.current = 0;
      return;
    }

    idleSince.current += delta;
    // Idle spin: the globe only drifts once the visitor stops touching it — and
    // not while the camera is flying somewhere, which would read as drift.
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

      <Stars radius={70} depth={45} count={quality.starCount} factor={3.4} saturation={0} fade speed={0.35} />

      <group ref={groupRef}>
        <mesh
          onPointerDown={(event) => {
            pointerDownAt.current = { x: event.nativeEvent.clientX, y: event.nativeEvent.clientY };
          }}
          onClick={handleGlobeClick}
        >
          <sphereGeometry args={[GLOBE_RADIUS, quality.globeSegments, quality.globeSegments]} />
          {textureUrl ? <TexturedGlobeSurface url={textureUrl} /> : <GlobeMaterial map={procedural} />}
        </mesh>

        {/* Atmosphere rim */}
        <mesh scale={1.045}>
          <sphereGeometry
            args={[GLOBE_RADIUS, Math.round(quality.globeSegments / 1.5), Math.round(quality.globeSegments / 1.5)]}
          />
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
            species={species[marker.region] ?? []}
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

      <GlobeRig apiRef={apiRef} onFlightChange={(value) => { flying.current = value; }} />
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Public component                                                           */
/* -------------------------------------------------------------------------- */

export interface InteractiveGlobeProps {
  counts?: Record<string, number>;
  /** The most-viewed species per region, shown on the pins. */
  species?: Record<string, GlobePin[]>;
  /** Optional equirectangular earth map (e.g. from Supabase Storage). */
  textureUrl?: string | null;
  /** Extra side effect on selection — the home page uses it to route to /explore. */
  onRegionSelect?: (region: Region) => void;
  className?: string;
}

export function InteractiveGlobe({
  counts = {},
  species = {},
  textureUrl = null,
  onRegionSelect,
  className,
}: InteractiveGlobeProps) {
  const region = useExploreStore((state) => state.region);
  const setRegion = useExploreStore((state) => state.setRegion);
  const reset = useExploreStore((state) => state.reset);

  const [detail, setDetail] = React.useState<"grid" | "map">("map");
  const [hidden, setHidden] = React.useState(false);
  const [flying, setFlying] = React.useState(false);
  const land = useLandData();

  const apiRef = React.useRef<GlobeApi | null>(null);
  const container = React.useRef<HTMLDivElement>(null);

  const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
  const showingAll = region === ("All" as typeof region);
  const active = showingAll ? null : REGION_ANCHORS[region as Region];

  // A hidden tab does not need 60 frames a second of globe.
  React.useEffect(() => {
    const onVisibility = () => setHidden(document.visibilityState === "hidden");
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const handleSelect = React.useCallback(
    (next: Region) => {
      setRegion(next);
      onRegionSelect?.(next);

      // The address bar is someone else's job: `ExploreUrlFilters` mirrors the store,
      // and having two writers here raced over the same history entry.
    },
    [onRegionSelect, setRegion],
  );

  const goHome = React.useCallback(() => {
    reset();
    apiRef.current?.goHome();
  }, [reset]);

  /** Arrows turn the globe, + and - zoom, Enter takes whatever is facing you. */
  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement | null;
    if (target && target !== event.currentTarget && target.closest("button, a, input, select, textarea")) return;

    const api = apiRef.current;
    if (!api) return;

    switch (event.key) {
      case "ArrowLeft":
        api.orbit(KEY_YAW, 0);
        break;
      case "ArrowRight":
        api.orbit(-KEY_YAW, 0);
        break;
      case "ArrowUp":
        api.orbit(0, KEY_PITCH);
        break;
      case "ArrowDown":
        api.orbit(0, -KEY_PITCH);
        break;
      case "+":
      case "=":
        api.zoom(KEY_ZOOM);
        break;
      case "-":
      case "_":
        api.zoom(1 / KEY_ZOOM);
        break;
      case "Enter":
      case " ": {
        const facing = api.facingRegion();
        if (facing) handleSelect(facing);
        else api.goHome();
        break;
      }
      case "r":
      case "R":
        goHome();
        break;
      default:
        return;
    }

    event.preventDefault();
  }

  return (
    <div
      ref={container}
      className={cn("relative outline-none focus-visible:ring-2 focus-visible:ring-neon/60", className)}
      tabIndex={0}
      onKeyDown={onKeyDown}
      aria-busy={flying}
      aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown + - Enter R"
      aria-label="Interactive 3D globe. Use the arrow keys to turn it and Enter to pick the region in view."
    >
      <CanvasShell
        // `never` while the tab is hidden: nothing changes on screen, so nothing
        // needs drawing. OrbitControls still works the moment the tab returns.
        frameloop={hidden ? "never" : "always"}
        className="h-[340px] sm:h-[440px] lg:h-[560px]"
        camera={{ position: HOME_CAMERA, fov: 42, near: 0.1, far: 200 }}
        label="Interactive 3D globe. Click a highlighted region to filter the species list."
        fallback={<CanvasFallback message="Your device could not start WebGL — use the region list instead." />}
      >
        <GlobeScene
          counts={counts}
          species={species}
          textureUrl={textureUrl}
          land={land}
          detail={land ? detail : "grid"}
          onSelect={handleSelect}
          apiRef={apiRef}
        />
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
                onClick={goHome}
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
          <FilterChip label="All regions" active={showingAll} onClick={goHome} />
          {markersToChips(counts).map(({ region: chipRegion, label, count }) => (
            <FilterChip
              key={chipRegion}
              label={`${label} · ${count}`}
              active={region === chipRegion}
              onClick={() => handleSelect(chipRegion)}
            />
          ))}
        </div>
      </div>

      <div className="absolute right-3 top-3 flex items-center gap-2">
        {/* Two tiers of globe, and the visitor gets to choose: the grid draws
            instantly and is cheaper; the map is the drawn world. */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="glass"
          onClick={() => setDetail((value) => (value === "map" ? "grid" : "map"))}
          aria-pressed={detail === "map"}
          title={land ? "Switch between the drawn map and the grid" : "The world map is still loading"}
          disabled={!land && detail === "map"}
        >
          <Layers />
          {detail === "map" ? "Map" : "Grid"}
        </Button>

        <Button type="button" variant="ghost" size="sm" onClick={goHome} className="glass" aria-label="Reset globe filters">
          <RotateCcw />
          Reset
        </Button>
      </div>
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
        active ? "bg-neon/20 text-neon ring-neon/40" : "bg-void/60 text-white/65 ring-white/12 hover:bg-white/10 hover:text-white",
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
