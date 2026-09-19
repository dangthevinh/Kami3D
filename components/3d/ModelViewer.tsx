"use client";

import { Bounds, Center, ContactShadows, Grid, OrbitControls, useGLTF, useProgress } from "@react-three/drei";
import { Maximize2, RotateCcw, RotateCw, Sparkles, Sun, Waves } from "lucide-react";
import * as React from "react";
import * as THREE from "three";

import { CanvasFallback, CanvasShell } from "@/components/3d/CanvasShell";
import { ProceduralAnimal } from "@/components/3d/ProceduralAnimal";
import { Button } from "@/components/ui/button";
import { publicEnv } from "@/lib/env";
import { cn, seededRandom } from "@/lib/utils";
import type { Animal } from "@/types/animal";

/**
 * Full-size 3D model viewer for a species page.
 *
 * Loads a DRACO-compressed `.glb` from `animal.model_url` when one exists, and
 * otherwise renders the procedural rig — so the viewer, the controls, the
 * wireframe mode and the size comparison all work before any artist has
 * delivered an asset.
 *
 * Everything is lazy: this module and `three` are only pulled into the browser on
 * the species route, and the Draco decoder is fetched on first model load.
 */

export type LightPreset = "studio" | "sunset" | "noir";

const PRESETS: Record<
  LightPreset,
  { label: string; icon: typeof Sun; ambient: number; key: number; keyColor: string; fill: number; fillColor: string; rim: number; rimColor: string; grid: string; fog: string }
> = {
  studio: {
    label: "Studio",
    icon: Sparkles,
    ambient: 1.05,
    key: 3.1,
    keyColor: "#ffffff",
    fill: 1.15,
    fillColor: "#9fd8ff",
    rim: 2.2,
    rimColor: "#a97bff",
    grid: "#243356",
    fog: "#04060f",
  },
  sunset: {
    label: "Sunset",
    icon: Sun,
    ambient: 0.72,
    key: 3.4,
    keyColor: "#ffb738",
    fill: 0.95,
    fillColor: "#ff5d8f",
    rim: 1.5,
    rimColor: "#a97bff",
    grid: "#4a2c18",
    fog: "#120a14",
  },
  noir: {
    label: "Noir",
    icon: Waves,
    ambient: 0.32,
    key: 2.1,
    keyColor: "#e8f7ff",
    fill: 0.24,
    fillColor: "#4fd8ff",
    rim: 3.4,
    rimColor: "#35f0c0",
    grid: "#101a30",
    fog: "#020408",
  },
};

/* -------------------------------------------------------------------------- */
/* Model loading                                                              */
/* -------------------------------------------------------------------------- */

function GltfModel({ url, wireframe }: { url: string; wireframe: boolean }) {
  // The second argument is the DRACO decoder location; vendor it into /public/draco
  // and set NEXT_PUBLIC_DRACO_DECODER_PATH for a fully offline deployment.
  const { scene } = useGLTF(url, publicEnv.dracoDecoderPath);
  const model = React.useMemo(() => scene.clone(true), [scene]);

  React.useEffect(() => {
    model.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.castShadow = true;
      object.receiveShadow = true;

      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) {
        if (material instanceof THREE.MeshStandardMaterial || material instanceof THREE.MeshPhysicalMaterial) {
          material.wireframe = wireframe;
          material.envMapIntensity = 0.8;
        }
      }
    });
  }, [model, wireframe]);

  return <primitive object={model} />;
}

/** Progress bar driven by three's global loading manager. */
function LoadingOverlay() {
  const { active, progress } = useProgress();
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    if (active) {
      setVisible(true);
      return;
    }
    const timeout = window.setTimeout(() => setVisible(false), 450);
    return () => window.clearTimeout(timeout);
  }, [active]);

  if (!visible) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 px-4 pb-4">
      <div className="glass mx-auto flex max-w-sm items-center gap-3 rounded-full px-4 py-2.5">
        <span className="text-[11px] font-medium text-white/70">Loading 3D model</span>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/12">
          <div
            className="h-full rounded-full bg-gradient-to-r from-neon to-glow transition-[width] duration-200"
            style={{ width: `${Math.max(8, progress)}%` }}
          />
        </div>
        <span className="text-[11px] tabular-nums text-white/50">{Math.round(progress)}%</span>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Viewer                                                                     */
/* -------------------------------------------------------------------------- */

export interface ModelViewerProps {
  animal: Animal;
  className?: string;
  /** Silhouette mode: flat black shading, used by the quiz. */
  silhouette?: boolean;
}

export function ModelViewer({ animal, className, silhouette = false }: ModelViewerProps) {
  const [preset, setPreset] = React.useState<LightPreset>("studio");
  const [wireframe, setWireframe] = React.useState(false);
  const [autoRotate, setAutoRotate] = React.useState(true);
  const [resetKey, setResetKey] = React.useState(0);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const config = PRESETS[preset];
  const phase = React.useMemo(() => seededRandom(animal.slug) * 6, [animal.slug]);

  // Warm the cache so returning to this species is instant.
  React.useEffect(() => {
    if (animal.model_url) {
      try {
        useGLTF.preload(animal.model_url, publicEnv.dracoDecoderPath);
      } catch {
        // Preload is best-effort only.
      }
    }
  }, [animal.model_url]);

  function toggleFullscreen() {
    const element = containerRef.current;
    if (!element) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void element.requestFullscreen?.().catch(() => undefined);
    }
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <CanvasShell
        className="h-[380px] w-full rounded-[var(--radius-card)] ring-1 ring-white/10 sm:h-[500px] lg:h-[620px]"
        camera={{ position: [3.2, 2.2, 3.6], fov: 40, near: 0.05, far: 400 }}
        shadows
        label={`Interactive 3D model of ${animal.name}`}
        fallback={<CanvasFallback message="WebGL is unavailable, so the 3D model cannot be shown." />}
      >
        <color attach="background" args={[config.fog]} />
        <fog attach="fog" args={[config.fog, 9, 34]} />

        <ambientLight intensity={config.ambient} />
        <hemisphereLight args={[config.keyColor, config.fog, 0.55]} />
        <directionalLight
          position={[4, 6, 4]}
          intensity={config.key}
          color={config.keyColor}
          castShadow
          shadow-mapSize={[1024, 1024]}
        />
        <directionalLight position={[-5, 1.5, -4]} intensity={config.fill} color={config.fillColor} />
        <spotLight position={[0, 4.5, -6]} intensity={config.rim} color={config.rimColor} angle={0.9} penumbra={1} />

        <Bounds key={resetKey} fit clip observe margin={1.25}>
          {animal.model_url ? (
            <Center bottom>
              <GltfModel url={animal.model_url} wireframe={wireframe} />
            </Center>
          ) : (
            <ProceduralAnimal
              kind={animal.silhouette}
              accent={animal.accent}
              wireframe={wireframe}
              silhouette={silhouette}
              phase={phase}
            />
          )}
        </Bounds>

        <ContactShadows position={[0, -0.01, 0]} opacity={0.42} scale={16} blur={2.6} far={5} color="#000000" />
        <Grid
          position={[0, -0.02, 0]}
          args={[24, 24]}
          cellSize={0.5}
          cellThickness={0.5}
          cellColor={config.grid}
          sectionSize={2.5}
          sectionThickness={1}
          sectionColor={config.rimColor}
          fadeDistance={26}
          fadeStrength={1.4}
          infiniteGrid
        />

        <OrbitControls
          makeDefault
          enablePan
          enableDamping
          dampingFactor={0.07}
          rotateSpeed={0.85}
          zoomSpeed={0.8}
          panSpeed={0.7}
          autoRotate={autoRotate}
          autoRotateSpeed={0.9}
          minDistance={0.6}
          maxDistance={26}
        />
      </CanvasShell>

      <LoadingOverlay />

      {/* Toolbar — kept in the DOM, never overlapping the canvas controls */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-wrap items-start justify-between gap-2 p-3">
        <div className="glass pointer-events-auto flex items-center gap-1 rounded-full p-1">
          {(Object.keys(PRESETS) as LightPreset[]).map((key) => {
            const item = PRESETS[key];
            const active = preset === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setPreset(key)}
                aria-pressed={active}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors",
                  active ? "bg-neon/20 text-neon" : "text-white/60 hover:bg-white/8 hover:text-white",
                )}
              >
                <item.icon className="size-3" />
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="glass pointer-events-auto flex items-center gap-1 rounded-full p-1">
          <ToolbarToggle
            label="Wireframe"
            active={wireframe}
            onClick={() => setWireframe((value) => !value)}
          />
          <ToolbarToggle label="Auto-spin" active={autoRotate} onClick={() => setAutoRotate((value) => !value)} />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={() => setResetKey((key) => key + 1)}
            aria-label="Reset camera"
          >
            <RotateCcw />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={toggleFullscreen}
            aria-label="Toggle fullscreen"
          >
            <Maximize2 />
          </Button>
        </div>
      </div>

      {/* Interaction hint */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center p-3">
        <span className="glass inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] text-white/60">
          <RotateCw className="size-3 text-neon" />
          Drag to rotate · pinch or scroll to zoom · two-finger drag to pan
        </span>
      </div>

      {!animal.model_url ? (
        <span className="glass pointer-events-none absolute bottom-3 right-3 hidden rounded-full px-3 py-1.5 text-[10px] uppercase tracking-wide text-white/45 lg:block">
          Procedural preview
        </span>
      ) : null}
    </div>
  );
}

function ToolbarToggle({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors",
        active ? "bg-neon/20 text-neon" : "text-white/60 hover:bg-white/8 hover:text-white",
      )}
    >
      {label}
    </button>
  );
}
