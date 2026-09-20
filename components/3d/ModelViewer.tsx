"use client";

import { useGLTF, useProgress } from "@react-three/drei";
import { Camera, Download, Maximize2, Pause, Play, RotateCcw, RotateCw, Ruler, Sparkles, Sun, Waves } from "lucide-react";
import * as React from "react";

import { CanvasFallback, CanvasShell } from "@/components/3d/CanvasShell";
import { ModelScene, type ModelViewerApi } from "@/components/3d/ModelScene";
import { useQuality } from "@/components/3d/useQuality";
import { useSettings } from "@/components/settings/SettingsProvider";
import { Button } from "@/components/ui/button";
import { CAMERA_PRESETS, type CameraPresetId } from "@/lib/camera-presets";
import { publicEnv } from "@/lib/env";
import { cn, seededRandom } from "@/lib/utils";
import type { Animal } from "@/types/animal";

/**
 * Full-size 3D model viewer for a species page.
 *
 * Loads a DRACO-compressed `.glb` from `animal.model_url` when one exists, and
 * otherwise renders the procedural rig — so the viewer, the controls, the
 * wireframe mode and the size comparison all work before any artist has delivered
 * an asset.
 *
 * Everything is lazy: this module, `ModelScene` and `three` are only pulled into
 * the browser on the species route, and the canvas itself waits for
 * `MountWhenVisible`. What this file owns is the DOM half of the viewer — the
 * toolbar, the keyboard, the loading and failure states — and it drives the scene
 * through `ModelViewerApi` rather than reaching into the canvas.
 *
 * The Draco decoder is fetched on first model load.
 */

export type LightPreset = "studio" | "sunset" | "noir";

const PRESETS: Record<
  LightPreset,
  {
    label: string;
    icon: typeof Sun;
    ambient: number;
    key: number;
    keyColor: string;
    fill: number;
    fillColor: string;
    rim: number;
    rimColor: string;
    grid: string;
    fog: string;
  }
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
    grid: "#2c2438",
    fog: "#0b0713",
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

/** How far one key press moves the camera. */
const KEY_YAW = Math.PI / 18;
const KEY_PITCH = Math.PI / 36;
const KEY_ZOOM = 0.88;

/**
 * How long a `.glb` may take before the viewer stops waiting quietly. The models
 * in this project are 100–600 kB, so a quarter of a minute in is a problem, not a
 * slow connection — and the visitor can still explore the procedural rig.
 */
const MODEL_WATCHDOG_MS = 15_000;

/* -------------------------------------------------------------------------- */
/* Loading and failure                                                        */
/* -------------------------------------------------------------------------- */

/** Determinate progress, driven by three's global loading manager. */
function LoadingOverlay() {
  const { active, progress, item } = useProgress();
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

  const phase = /\.wasm$/i.test(item) ? "Decoding DRACO" : /\.(glb|gltf)$/i.test(item) ? "Downloading model" : "Preparing scene";

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 px-4 pb-4">
      <div
        role="progressbar"
        aria-label={phase}
        aria-valuenow={Math.round(progress)}
        aria-valuemin={0}
        aria-valuemax={100}
        className="glass mx-auto flex max-w-sm items-center gap-3 rounded-full px-4 py-2.5"
      >
        <span className="text-[11px] font-medium text-white/70">{phase}</span>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/12">
          <div
            className="h-full rounded-full bg-gradient-to-r from-neon to-glow transition-[width] duration-200"
            style={{ width: `${Math.max(4, progress)}%` }}
          />
        </div>
        <span className="text-[11px] tabular-nums text-white/50">{Math.round(progress)}%</span>
      </div>
    </div>
  );
}

export interface ModelViewerProps {
  animal: Animal;
  className?: string;
  /** Silhouette mode: flat black shading, used by the quiz. */
  silhouette?: boolean;
}

export function ModelViewer({ animal, className, silhouette = false }: ModelViewerProps) {
  const [preset, setPreset] = React.useState<LightPreset>("studio");
  const [wireframe, setWireframe] = React.useState(false);
  /**
   * Auto-rotation has two authors: the setting (what the visitor asked for) and the
   * toolbar (what they want right now, in this view). `spinOverride` is null until
   * the toolbar is used, so the setting applies until it is overridden — and
   * reduce-motion wins over both, because a model that keeps turning is exactly
   * the motion that setting exists to stop.
   */
  const [spinOverride, setSpinOverride] = React.useState<boolean | null>(null);
  const [showMeasurements, setShowMeasurements] = React.useState(false);
  const [resetKey, setResetKey] = React.useState(0);
  const [attempt, setAttempt] = React.useState(0);
  /**
   * `loading` → `ready`, or → `failed` when the loader throws or the watchdog
   * gives up. The watchdog exists because a blocked or hanging `.glb` request does
   * not always surface as an error: the suspense boundary simply never resolves,
   * and without a deadline the visitor would stare at a rig with no explanation.
   */
  const [modelState, setModelState] = React.useState<"idle" | "loading" | "ready" | "failed" | "slow">("idle");
  const [clips, setClips] = React.useState<string[]>([]);
  const [clip, setClip] = React.useState<string | null>(null);
  const [playing, setPlaying] = React.useState(false);
  const [cameraPreset, setCameraPreset] = React.useState<CameraPresetId>("threeQuarter");
  const [cameraRequest, setCameraRequest] = React.useState<{ preset: CameraPresetId; nonce: number } | null>(null);
  const [flying, setFlying] = React.useState(false);
  const [apiReady, setApiReady] = React.useState(false);

  const containerRef = React.useRef<HTMLDivElement>(null);
  const apiRef = React.useRef<ModelViewerApi | null>(null);

  const quality = useQuality();
  const { settings } = useSettings();
  const autoRotate = (spinOverride ?? settings.autoRotate) && !settings.reduceMotion;
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

  const requestCamera = React.useCallback((next: CameraPresetId) => {
    setCameraPreset(next);
    setCameraRequest((current) => ({ preset: next, nonce: (current?.nonce ?? 0) + 1 }));
  }, []);

  const onClips = React.useCallback((names: string[]) => {
    setClips((current) => (current.length === names.length && current.every((name, index) => name === names[index]) ? current : names));
    setClip((current) => current ?? names[0] ?? null);
  }, []);

  function toggleFullscreen() {
    const element = containerRef.current;
    if (!element) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void element.requestFullscreen?.().catch(() => undefined);
    }
  }

  // Watchdog: armed whenever a model URL exists, cleared as soon as it lands.
  React.useEffect(() => {
    if (!animal.model_url) {
      setModelState("idle");
      return;
    }
    setModelState("loading");
    const timer = window.setTimeout(() => {
      setModelState((current) => (current === "ready" ? current : "slow"));
    }, MODEL_WATCHDOG_MS);
    return () => window.clearTimeout(timer);
  }, [animal.model_url, attempt]);

  const markReady = React.useCallback(() => setModelState("ready"), []);
  const markFailed = React.useCallback(() => setModelState("failed"), []);

  function retry() {
    setModelState("loading");
    setAttempt((value) => value + 1);
  }

  /**
   * Keyboard control, attached where the focus is.
   *
   * Keys are ignored when the event comes from a control inside the viewer, so
   * typing in (or activating) the toolbar never also spins the camera.
   */
  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement | null;
    if (target && target !== event.currentTarget && target.closest("button, a, input, select, textarea")) return;

    const api = apiRef.current;
    const key = event.key;

    switch (key) {
      case "ArrowLeft":
        api?.orbit(KEY_YAW, 0);
        break;
      case "ArrowRight":
        api?.orbit(-KEY_YAW, 0);
        break;
      case "ArrowUp":
        api?.orbit(0, KEY_PITCH);
        break;
      case "ArrowDown":
        api?.orbit(0, -KEY_PITCH);
        break;
      case "+":
      case "=":
        api?.dolly(KEY_ZOOM);
        break;
      case "-":
      case "_":
        api?.dolly(1 / KEY_ZOOM);
        break;
      case "r":
      case "R":
        setResetKey((value) => value + 1);
        break;
      case "f":
      case "F":
        toggleFullscreen();
        break;
      case "w":
      case "W":
        setWireframe((value) => !value);
        break;
      case "m":
      case "M":
        setShowMeasurements((value) => !value);
        break;
      case "1":
      case "2":
      case "3":
      case "4":
        requestCamera(CAMERA_PRESETS[Number(key) - 1].id);
        break;
      default:
        return;
    }

    event.preventDefault();
  }

  return (
    <div
      ref={containerRef}
      className={cn("relative rounded-[var(--radius-card)] outline-none focus-visible:ring-2 focus-visible:ring-neon/60", className)}
      tabIndex={0}
      onKeyDown={onKeyDown}
      // Announced while the camera is easing, so a screen-reader user is not left
      // wondering whether their key press did anything.
      aria-busy={flying}
      aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown + - R F W M"
      aria-label={`3D viewer controls for ${animal.name}`}
    >
      <CanvasShell
        className="h-[380px] w-full rounded-[var(--radius-card)] ring-1 ring-white/10 sm:h-[500px] lg:h-[620px]"
        camera={{ position: [3.2, 2.2, 3.6], fov: 40, near: 0.05, far: 400 }}
        shadows
        label={`Interactive 3D model of ${animal.name}. Use the arrow keys to rotate and +/- to zoom.`}
        fallback={<CanvasFallback message="WebGL is unavailable, so the 3D model cannot be shown." />}
      >
        <ModelScene
          animal={animal}
          quality={quality}
          light={config}
          wireframe={wireframe}
          silhouette={silhouette}
          autoRotate={autoRotate}
          showMeasurements={showMeasurements}
          resetKey={resetKey}
          attempt={attempt}
          cameraRequest={cameraRequest}
          apiRef={apiRef}
          onModelFailed={markFailed}
          onModelReady={markReady}
          onApiReady={setApiReady}
          onFlightChange={setFlying}
          onClips={onClips}
          clip={clip}
          playing={playing}
          slug={animal.slug}
          phase={phase}
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
          <ToolbarToggle label="Wireframe" active={wireframe} onClick={() => setWireframe((value) => !value)} />
          <ToolbarToggle label="Auto-spin" active={autoRotate} onClick={() => setSpinOverride((value) => !(value ?? settings.autoRotate))} />
          <ToolbarToggle
            label="Dimensions"
            active={showMeasurements}
            onClick={() => setShowMeasurements((value) => !value)}
            icon={<Ruler className="size-3.5" />}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={() => apiRef.current?.capture()}
            disabled={!apiReady}
            title={apiReady ? "Save a picture of this model" : "The scene is still starting up"}
            aria-label="Save a picture of this model"
          >
            <Download />
          </Button>
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

      {/* Camera presets: the same headings the number keys select */}
      <div className="pointer-events-none absolute inset-x-0 top-14 flex justify-center p-2 sm:top-16">
        <div className="glass pointer-events-auto flex items-center gap-1 rounded-full p-1" role="group" aria-label="Camera angle">
          <Camera className="ml-2 size-3.5 text-white/40" aria-hidden />
          {CAMERA_PRESETS.map((item) => {
            const active = cameraPreset === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => requestCamera(item.id)}
                aria-pressed={active}
                className={cn(
                  "rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors",
                  active ? "bg-neon/20 text-neon" : "text-white/60 hover:bg-white/8 hover:text-white",
                )}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Animations, only for assets that ship them */}
      {clips.length > 0 ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-14 flex justify-center p-2">
          <div className="glass pointer-events-auto flex items-center gap-2 rounded-full p-1 pl-3">
            <span className="text-[11px] text-white/55">Animation</span>
            <select
              value={clip ?? ""}
              onChange={(event) => {
                setClip(event.target.value);
                setPlaying(true);
              }}
              className="h-8 rounded-full bg-white/6 px-2 text-[11px] text-white/85 ring-1 ring-white/10 [&>option]:bg-abyss"
              aria-label="Animation clip"
            >
              {clips.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => setPlaying((value) => !value)}
              aria-label={playing ? "Pause animation" : "Play animation"}
            >
              {playing ? <Pause /> : <Play />}
            </Button>
          </div>
        </div>
      ) : null}

      {/* Trouble with the uploaded model is reported where the visitor can act on it */}
      {modelState === "failed" || modelState === "slow" ? (
        <div role="status" className="absolute inset-x-0 bottom-3 flex justify-center px-3">
          <div className="glass flex flex-wrap items-center justify-center gap-2 rounded-full px-4 py-2 text-[11px] text-white/70">
            <span>
              {modelState === "failed"
                ? "The uploaded model could not be loaded — showing the procedural rig instead."
                : "This model is taking longer than expected — the procedural rig is ready to explore meanwhile."}
            </span>
            <button
              type="button"
              onClick={retry}
              className="rounded-full bg-white/12 px-2.5 py-1 font-medium text-white transition-colors hover:bg-white/20"
            >
              Try again
            </button>
          </div>
        </div>
      ) : null}

      {/* Interaction hint */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center p-3">
        <span className="glass inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] text-white/55">
          <RotateCw className="size-3 text-neon/80" />
          Drag to orbit · scroll to zoom · arrow keys to turn
        </span>
      </div>
    </div>
  );
}

function ToolbarToggle({
  label,
  active,
  onClick,
  icon,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={label}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors",
        active ? "bg-white/14 text-white" : "text-white/60 hover:bg-white/8 hover:text-white",
      )}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
