"use client";

import {
  Bounds,
  Center,
  ContactShadows,
  Grid,
  Html,
  Line,
  MeshReflectorMaterial,
  OrbitControls,
  useAnimations,
  useGLTF,
} from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import * as React from "react";
import * as THREE from "three";

import { ProceduralAnimal } from "@/components/3d/ProceduralAnimal";
import type { QualityProfile } from "@/lib/quality";
import {
  approach,
  dolly,
  hasArrived,
  orbitBy,
  orbitFromFocus,
  CAMERA_PRESETS,
  type CameraPresetId,
} from "@/lib/camera-presets";
import { publicEnv } from "@/lib/env";
import { disposeClone } from "@/lib/three-dispose";
import { dataUrlToBytes, formatHeight, formatLength, isPngBytes, pngFileName } from "@/lib/utils";
import type { Animal } from "@/types/animal";

/**
 * Everything that lives **inside** the canvas: lights, the model (real or
 * procedural), the measurement rulers, and the camera rig.
 *
 * It is a separate file from `ModelViewer.tsx` because the two halves have
 * genuinely different jobs. The viewer owns the DOM — toolbar, keyboard, progress,
 * retry, fullscreen — and this owns the scene, its imperative API and the arithmetic
 * that moves a camera. Both are only ever loaded behind `next/dynamic`, so the split
 * costs nothing in bundle size.
 */

/** What the DOM half can ask the scene half to do. */
export interface ModelViewerApi {
  /** Swing the camera to a preset heading, keeping the current distance. */
  flyTo(preset: CameraPresetId): void;
  /** Rotate around the model (radians). Used by the arrow keys. */
  orbit(yaw: number, pitch: number): void;
  /** Zoom by a factor below 1 to move closer. */
  dolly(factor: number): void;
  /** Render one frame and download it as a PNG. */
  capture(): void;
}

export interface LightPresetConfig {
  grid: string;
  fog: string;
  ambient: number;
  key: number;
  keyColor: string;
  fill: number;
  fillColor: string;
  rim: number;
  rimColor: string;
}

/* -------------------------------------------------------------------------- */
/* The model                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Isolates the real model so a broken asset degrades into the procedural rig
 * instead of taking the whole viewer down — and reports it, so the viewer can
 * offer a retry rather than leaving the visitor with a silent downgrade.
 */
class ModelBoundary extends React.Component<
  {
    fallback: React.ReactNode;
    onFail?: (reason: string) => void;
    children: React.ReactNode;
    /** What failed, for the log line — "model" unless a decorative layer uses it. */
    label?: string;
  },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    console.warn(
      `[kami3d] ${this.props.label ?? "model"} failed to load, using the fallback: ${error.message}`,
    );
    this.props.onFail?.(error.message);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export interface GltfModelProps {
  url: string;
  wireframe: boolean;
  /** Clip name to play, when the asset ships animations. */
  clip?: string | null;
  playing?: boolean;
  onClips?: (names: string[]) => void;
  /** Fired once the model is actually in the scene, so the viewer can stop its watchdog. */
  onReady?: () => void;
}

function GltfModel({ url, wireframe, clip = null, playing = false, onClips, onReady }: GltfModelProps) {
  // The second argument is the DRACO decoder location; vendor it into /public/draco
  // and set NEXT_PUBLIC_DRACO_DECODER_PATH for a fully offline deployment.
  const gltf = useGLTF(url, publicEnv.dracoDecoderPath);
  const model = React.useMemo(() => gltf.scene.clone(true), [gltf.scene]);
  const { actions, names } = useAnimations(gltf.animations, model);

  /**
   * Give the clone's GPU memory back when the model changes or the viewer closes.
   *
   * `clone(true)` shares geometry and materials with the loaded scene, so the clone is not
   * the only reference - but a viewer that swaps species repeatedly used to keep every
   * geometry, texture and program it had ever shown, because nothing released them.
   * `renderer.info.memory` was the measurement that showed it (docs/REVIEW.md R6): the
   * count only went up.
   *
   * Only this component's own clone is touched; the cached `gltf` stays usable, which is
   * what keeps a second visit to the same species instant.
   */
  React.useEffect(() => () => void disposeClone(model), [model]);

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

  // Only reported when there is something to report: the viewer shows clip controls
  // for assets that animate and stays quiet for the many that do not.
  React.useEffect(() => {
    onClips?.(names ?? []);
  }, [names, onClips]);

  React.useEffect(() => {
    onReady?.();
  }, [onReady]);

  React.useEffect(() => {
    if (!clip) return;
    const action = actions[clip];
    if (!action) return;

    if (!playing) {
      action.stop();
      return;
    }

    action.reset().fadeIn(0.25).play();
    return () => {
      action.fadeOut(0.2);
    };
  }, [actions, clip, playing]);

  return <primitive object={model} />;
}

/* -------------------------------------------------------------------------- */
/* Measurements                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Rulers across the model's own bounding box, labelled with the species' recorded
 * measurements.
 *
 * The label is a real figure from the catalogue (`length_m`, `height_m`); the line
 * spans however large the model was framed. That is the honest reading — the asset
 * has no unit metadata, and the alternative (scaling a ruler to invented world
 * units) would put a wrong number next to a right one.
 */
function MeasurementOverlay({
  target,
  animal,
  visible,
}: {
  target: React.RefObject<THREE.Object3D | null>;
  animal: Animal;
  visible: boolean;
}) {
  const [box, setBox] = React.useState<{ size: THREE.Vector3; min: THREE.Vector3; max: THREE.Vector3 } | null>(null);
  const measured = React.useRef(false);

  useFrame(() => {
    if (measured.current || !visible) return;
    const group = target.current;
    if (!group) return;

    const bounds = new THREE.Box3().setFromObject(group);
    if (bounds.isEmpty()) return;

    const size = bounds.getSize(new THREE.Vector3());
    measured.current = true;
    setBox({ size, min: bounds.min.clone(), max: bounds.max.clone() });
  });

  if (!visible || !box) return null;

  const { size, min, max } = box;
  const pad = Math.max(size.x, size.y) * 0.08 + 0.02;
  const midX = (min.x + max.x) / 2;
  const midZ = (min.z + max.z) / 2;
  const midY = (min.y + max.y) / 2;

  const lengthLabel = formatLength(animal.length_m);
  const heightLabel = animal.height_m > 0 ? formatHeight(animal.height_m) : null;

  return (
    <group>
      {/* Length: across the model's X extent, in front of it. */}
      <Line
        points={[
          [min.x, min.y - pad, midZ],
          [max.x, min.y - pad, midZ],
        ]}
        color="#0f7d61"
        lineWidth={1.5}
      />
      <Html position={[midX, min.y - pad * 1.6, midZ]} center distanceFactor={9} zIndexRange={[20, 0]}>
        <span className="whitespace-nowrap rounded-full bg-void/80 px-2 py-0.5 text-[10px] font-medium text-neon ring-1 ring-neon/40">
          {lengthLabel} long
        </span>
      </Html>

      {/* Height: up the side, only for species that have one. */}
      {heightLabel ? (
        <>
          <Line
            points={[
              [max.x + pad, min.y, midZ],
              [max.x + pad, max.y, midZ],
            ]}
            color="#0b7291"
            lineWidth={1.5}
          />
          <Html position={[max.x + pad * 1.8, midY, midZ]} center distanceFactor={9} zIndexRange={[20, 0]}>
            <span className="whitespace-nowrap rounded-full bg-void/80 px-2 py-0.5 text-[10px] font-medium text-glow ring-1 ring-glow/40">
              {heightLabel} tall
            </span>
          </Html>
        </>
      ) : null}
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/* Camera rig                                                                 */
/* -------------------------------------------------------------------------- */

interface FlightState {
  target: THREE.Vector3;
}

/**
 * The imperative half of the viewer: applies camera requests and renders the
 * capture frame. It owns no state of its own beyond the flight in progress, so the
 * toolbar can drive a canvas it does not live inside.
 */
function SceneRig({
  apiRef,
  cameraRequest,
  autoRotate,
  onFlightStart,
  onFlightEnd,
  onApiReady,
  background,
  slug,
}: {
  apiRef: React.RefObject<ModelViewerApi | null>;
  cameraRequest: { preset: CameraPresetId; nonce: number } | null;
  autoRotate: boolean;
  onFlightStart?: () => void;
  onFlightEnd?: () => void;
  onApiReady?: (ready: boolean) => void;
  background: string;
  slug: string;
}) {
  const camera = useThree((state) => state.camera);
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const controls = useThree((state) => state.controls) as { target: THREE.Vector3; update: () => void; autoRotate: boolean } | null;

  const flight = React.useRef<FlightState | null>(null);
  const nonce = React.useRef(0);

  const focus = React.useCallback(() => controls?.target ?? new THREE.Vector3(0, 0, 0), [controls]);

  const send = React.useCallback((target: THREE.Vector3) => {
    flight.current = { target };
  }, []);

  /** The one place a preset becomes a camera position. */
  const flyTo = React.useCallback(
    (presetId: CameraPresetId) => {
      const preset = CAMERA_PRESETS.find((item) => item.id === presetId);
      if (!preset) return;
      const next = orbitFromFocus(focus(), camera.position, preset.direction);
      send(new THREE.Vector3(next.x, next.y, next.z));
      onFlightStart?.();
    },
    [camera.position, focus, onFlightStart, send],
  );

  /** Arrow keys: a small rotation, expressed as a flight so it eases. */
  const orbit = React.useCallback(
    (yaw: number, pitch: number) => {
      const next = orbitBy(focus(), camera.position, yaw, pitch);
      send(new THREE.Vector3(next.x, next.y, next.z));
      onFlightStart?.();
    },
    [camera.position, focus, onFlightStart, send],
  );

  const zoom = React.useCallback(
    (factor: number) => {
      const next = dolly(focus(), camera.position, factor);
      send(new THREE.Vector3(next.x, next.y, next.z));
      onFlightStart?.();
    },
    [camera.position, focus, onFlightStart, send],
  );

  // Toolbar and keyboard both land here.
  React.useEffect(() => {
    apiRef.current = {
      flyTo,
      orbit,
      dolly: zoom,
      capture() {
        // Rendering this frame and reading it back in the same task is what makes
        // a PNG possible without `preserveDrawingBuffer`, which costs on every frame.
        const previousClear = new THREE.Color();
        gl.getClearColor(previousClear);
        const previousAlpha = gl.getClearAlpha();

        gl.setClearColor(new THREE.Color(background), 1);
        gl.render(scene, camera);

        const dataUrl = gl.domElement.toDataURL("image/png");
        gl.setClearColor(previousClear, previousAlpha);

        // A `data:` URL cannot be downloaded — Chrome treats it as an insecure
        // download and blocks it silently. Turning it into a blob URL first is
        // what makes the button actually produce a file (see lib/utils.ts).
        const bytes = dataUrlToBytes(dataUrl);
        if (!isPngBytes(bytes)) {
          console.warn("[kami3d] the captured frame was not a PNG; nothing saved");
          return;
        }

        const blobUrl = URL.createObjectURL(new Blob([bytes], { type: "image/png" }));

        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = pngFileName(slug);
        link.rel = "noopener";
        document.body.append(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(blobUrl), 10_000);
      },
    };

    onApiReady?.(true);
    return () => {
      apiRef.current = null;
      onApiReady?.(false);
    };
  }, [apiRef, background, camera, flyTo, gl, onApiReady, orbit, scene, slug, zoom]);

  // A request from the toolbar: a new preset, or the same one pressed again.
  React.useEffect(() => {
    if (!cameraRequest) return;
    nonce.current += 1;
    flyTo(cameraRequest.preset);
  }, [cameraRequest, flyTo]);

  useFrame((_, delta) => {
    const current = flight.current;

    // Auto-spin pauses while the camera is being flown somewhere: two things
    // moving the camera at once reads as a bug, not as polish.
    if (controls) controls.autoRotate = autoRotate && !current;

    if (!current) return;

    const stepped = approach(camera.position, current.target, delta);
    camera.position.set(stepped.x, stepped.y, stepped.z);
    camera.lookAt(focus());
    controls?.update();

    if (hasArrived(camera.position, current.target, 0.005)) {
      flight.current = null;
      onFlightEnd?.();
    }
  });

  return null;
}

/* -------------------------------------------------------------------------- */
/* Scene                                                                      */
/* -------------------------------------------------------------------------- */

export interface ModelSceneProps {
  animal: Animal;
  quality: QualityProfile;
  light: LightPresetConfig;
  wireframe: boolean;
  silhouette: boolean;
  autoRotate: boolean;
  showMeasurements: boolean;
  resetKey: number;
  /** Incremented by the viewer's retry button to remount a failed load. */
  attempt: number;
  cameraRequest: { preset: CameraPresetId; nonce: number } | null;
  apiRef: React.RefObject<ModelViewerApi | null>;
  onModelFailed?: (reason: string) => void;
  /** The uploaded model reached the scene. */
  onModelReady?: () => void;
  /** The scene's imperative API is mounted and can be driven from the DOM. */
  onApiReady?: (ready: boolean) => void;
  /** True while the camera is easing towards a requested angle. */
  onFlightChange?: (flying: boolean) => void;
  onClips?: (names: string[]) => void;
  clip?: string | null;
  playing?: boolean;
  slug: string;
  phase: number;
}

export function ModelScene({
  animal,
  quality,
  light,
  wireframe,
  silhouette,
  autoRotate,
  showMeasurements,
  resetKey,
  attempt,
  cameraRequest,
  apiRef,
  onModelFailed,
  onModelReady,
  onApiReady,
  onFlightChange,
  onClips,
  clip = null,
  playing = false,
  slug,
  phase,
}: ModelSceneProps) {
  const modelRef = React.useRef<THREE.Object3D>(null);
  const [flying, setFlying] = React.useState(false);

  // Stable identities: an inline arrow here would recreate the rig's whole
  // imperative API on every parent render, and a click landing in that window
  // would find `apiRef.current` cleared.
  const handleFlightStart = React.useCallback(() => {
    setFlying(true);
    onFlightChange?.(true);
  }, [onFlightChange]);

  const handleFlightEnd = React.useCallback(() => {
    setFlying(false);
    onFlightChange?.(false);
  }, [onFlightChange]);

  const procedural = (
    <ProceduralAnimal kind={animal.silhouette} accent={animal.accent} wireframe={wireframe} silhouette={silhouette} phase={phase} />
  );

  return (
    <>
      <color attach="background" args={[light.fog]} />
      <fog attach="fog" args={[light.fog, 9, 34]} />

      <ambientLight intensity={light.ambient} />
      <hemisphereLight args={[light.keyColor, light.fog, 0.55]} />
      <directionalLight
        position={[4, 6, 4]}
        intensity={light.key}
        color={light.keyColor}
        castShadow
        shadow-mapSize={[quality.shadowMapSize, quality.shadowMapSize]}
      />
      <directionalLight position={[-5, 1.5, -4]} intensity={light.fill} color={light.fillColor} />
      <spotLight position={[0, 4.5, -6]} intensity={light.rim} color={light.rimColor} angle={0.9} penumbra={1} />

      <Bounds key={`${resetKey}-${attempt}`} fit clip observe margin={1.25}>
        <group ref={modelRef}>
          {animal.model_url ? (
            <ModelBoundary key={attempt} fallback={procedural} onFail={onModelFailed}>
              <Center bottom>
                <GltfModel
                  url={animal.model_url}
                  wireframe={wireframe}
                  clip={clip}
                  playing={playing}
                  onClips={onClips}
                  onReady={onModelReady}
                />
              </Center>
            </ModelBoundary>
          ) : (
            procedural
          )}
        </group>
      </Bounds>

      <MeasurementOverlay target={modelRef} animal={animal} visible={showMeasurements} />

      {quality.contactShadows ? (
        <ContactShadows position={[0, -0.01, 0]} opacity={0.42} scale={16} blur={2.6} far={5} color="#000000" />
      ) : null}

      <Grid
        position={[0, -0.02, 0]}
        args={[24, 24]}
        cellSize={0.5}
        cellThickness={0.5}
        cellColor={light.grid}
        sectionSize={2.5}
        sectionThickness={1}
        sectionColor={light.rimColor}
        fadeDistance={26}
        fadeStrength={1.4}
        infiniteGrid
      />

      {/* The mirror floor (Phase 11). It is inside its own boundary with a null
          fallback on purpose: a decorative reflection must never be able to take the
          viewer down, and a GPU that refuses the extra render target just gets the
          plain studio floor it had before. */}
      {quality.reflections ? (
        <ModelBoundary label="floor reflection" fallback={null}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]}>
            <planeGeometry args={[48, 48]} />
            <MeshReflectorMaterial
              resolution={quality.reflectorResolution}
              mirror={0.35}
              mixBlur={1.4}
              mixStrength={0.6}
              blur={[300, 100]}
              depthScale={1.1}
              minDepthThreshold={0.4}
              maxDepthThreshold={1.35}
              color={light.fog}
              metalness={0.4}
              roughness={0.9}
            />
          </mesh>
        </ModelBoundary>
      ) : null}

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

      <SceneRig
        apiRef={apiRef}
        cameraRequest={cameraRequest}
        autoRotate={autoRotate}
        onFlightStart={handleFlightStart}
        onFlightEnd={handleFlightEnd}
        onApiReady={onApiReady}
        background={light.fog}
        slug={slug}
      />
    </>
  );
}
