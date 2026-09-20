"use client";

import { Bounds, ContactShadows, Grid, Html, OrbitControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { Ruler, RulerDimensionLine } from "lucide-react";
import * as React from "react";
import * as THREE from "three";

import { CanvasFallback, CanvasShell } from "@/components/3d/CanvasShell";
import { ProceduralAnimal } from "@/components/3d/ProceduralAnimal";
import { useQuality } from "@/components/3d/useQuality";
import {
  REFERENCE_FIGURES,
  VIEWER_HEIGHT_CM,
  compareToViewer,
  describeComparison,
  figureFromAnimal,
  layoutFigures,
  viewerFigure,
  type FigureSpec,
} from "@/lib/size-comparison";
import { cn, formatBodyHeight, formatHeight, formatLength, type MeasurementUnit } from "@/lib/utils";
import type { Animal } from "@/types/animal";

/**
 * "How big is it really?" — the species rendered at true scale beside a human, a
 * blue whale, a T. rex and three more yardsticks.
 *
 * The layout maths live in `lib/size-comparison.ts` and are unit-tested
 * (`npm run check:size`): the dominant dimension is exact, figures never overlap,
 * and the row is centred. Models are procedural rigs, so this works before any
 * asset pipeline exists; each rig is scaled per-axis within a +/-40% band so the
 * rendered creature matches recorded measurements rather than the rig's stylised
 * proportions.
 *
 * The visitor's own height is a control rather than a constant: the human in the
 * row is *them*, and the sentence under the chart compares the species against
 * that number. Both are remembered per browser.
 */

const HEIGHT_STORAGE_KEY = "kami-height";
const UNIT_STORAGE_KEY = "kami-unit";

/** The fixed 1.75 m human is replaced: the row shows the visitor instead. */
const REFERENCE_FIGURES_WITHOUT_HUMAN = REFERENCE_FIGURES.filter((figure) => figure.id !== "human");

type PlacedFigure = ReturnType<typeof layoutFigures>["figures"][number];

/** Feet stay whole: no unit anywhere else in the UI implies millimetre precision. */
function labelFor(figure: PlacedFigure, viewerHeightCm: number, unit: MeasurementUnit) {
  if (figure.id === "human") return `${formatBodyHeight(viewerHeightCm, unit)} tall`;
  if (figure.id === "human-fixed") return figure.sublabel;
  return figure.lengthM >= figure.heightM
    ? `${formatLength(figure.lengthM, unit)} long`
    : `${formatHeight(figure.heightM, unit)} tall`;
}

function ComparisonScene({
  animal,
  referenceIds,
  showRulers,
  viewerHeightCm,
  unit,
}: {
  animal: Animal;
  referenceIds: string[];
  showRulers: boolean;
  viewerHeightCm: number;
  unit: MeasurementUnit;
}) {
  const quality = useQuality();

  const specs = React.useMemo<FigureSpec[]>(() => {
    const references = REFERENCE_FIGURES_WITHOUT_HUMAN.filter((reference) => referenceIds.includes(reference.id));
    return [figureFromAnimal(animal), viewerFigure(viewerHeightCm / 100), ...references];
  }, [animal, referenceIds, viewerHeightCm]);

  const { figures } = React.useMemo(() => layoutFigures(specs), [specs]);

  return (
    <>
      <ambientLight intensity={1.15} />
      <hemisphereLight args={["#cfe9ff", "#050810", 0.75]} />
      <directionalLight position={[12, 18, 10]} intensity={2.6} color="#ffffff" />
      <directionalLight position={[-14, 6, -10]} intensity={0.9} color="#a97bff" />

      {/* `key` remounts Bounds only when the *set* of figures changes: dragging the
          height slider must move the figures, not yank the camera every frame. */}
      <Bounds key={`${animal.id}-${referenceIds.join("-")}`} fit clip observe margin={1.18}>
        {figures.map((figure) => (
          <ScaledFigure
            key={figure.id}
            figure={figure}
            showRuler={showRulers}
            label={labelFor(figure, viewerHeightCm, unit)}
          />
        ))}
      </Bounds>

      {quality.contactShadows ? (
        <ContactShadows position={[0, 0, 0]} opacity={0.35} scale={60} blur={3} far={12} color="#000000" />
      ) : null}
      <Grid
        position={[0, -0.02, 0]}
        args={[60, 60]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#1b2842"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#35f0c0"
        fadeDistance={90}
        infiniteGrid
      />

      <OrbitControls
        makeDefault
        enablePan
        enableDamping
        dampingFactor={0.08}
        minDistance={2}
        maxDistance={120}
        maxPolarAngle={Math.PI / 2.05}
      />
    </>
  );
}

/**
 * A rig scaled to real measurements, standing on the ground plane.
 *
 * Position and scale are *animated* towards their targets rather than set: the
 * height slider changes every figure's size and therefore the whole row's layout,
 * and snapping between two layouts reads as a glitch. The exponential step is the
 * same one the model viewer's camera uses.
 */
function ScaledFigure({ figure, showRuler, label }: { figure: PlacedFigure; showRuler: boolean; label: string }) {
  const group = React.useRef<THREE.Group>(null);
  const inner = React.useRef<THREE.Group>(null);
  const settled = React.useRef(false);

  const targetPosition = React.useMemo(() => new THREE.Vector3(...figure.position), [figure.position]);
  const targetScale = React.useMemo(() => new THREE.Vector3(...figure.scale), [figure.scale]);

  useFrame((_, delta) => {
    const outer = group.current;
    const scaled = inner.current;
    if (!outer || !scaled) return;

    // The first frame places the figure exactly; only later changes animate.
    if (!settled.current) {
      outer.position.copy(targetPosition);
      scaled.scale.copy(targetScale);
      settled.current = true;
      return;
    }

    const t = 1 - Math.exp(-9 * Math.min(delta, 0.1));
    outer.position.lerp(targetPosition, t);
    scaled.scale.lerp(targetScale, t);
  });

  return (
    <group ref={group}>
      <group ref={inner}>
        <ProceduralAnimal kind={figure.kind} accent={figure.accent} animated={false} />
      </group>

      {showRuler ? (
        <mesh position={[figure.leftEdge - figure.position[0], figure.top / 2, 0]}>
          <cylinderGeometry
            args={[
              Math.max(figure.renderedHeight * 0.0015, 0.003),
              Math.max(figure.renderedHeight * 0.0015, 0.003),
              figure.top,
              6,
            ]}
          />
          <meshBasicMaterial color="#35f0c0" transparent opacity={0.4} />
        </mesh>
      ) : null}

      {/* Labels stay screen-sized regardless of how large the chart gets. */}
      <Html
        position={[0, figure.top + figure.renderedHeight * 0.08, 0]}
        center
        zIndexRange={[30, 0]}
        style={{ pointerEvents: "none" }}
      >
        <div className="flex -translate-y-3 flex-col items-center gap-1 whitespace-nowrap">
          <span className="glass rounded-full px-2.5 py-1 text-[11px] font-medium text-white/85">
            {figure.emoji} {figure.label}
          </span>
          <span className="rounded-full bg-void/75 px-2 py-0.5 text-[10px] tabular-nums text-neon ring-1 ring-neon/25">
            {label}
          </span>
        </div>
      </Html>
    </group>
  );
}

export interface SizeComparisonProps {
  animal: Animal;
  className?: string;
}

export function SizeComparison({ animal, className }: SizeComparisonProps) {
  const [referenceIds, setReferenceIds] = React.useState<string[]>(["human", "whale"]);
  const [showRulers, setShowRulers] = React.useState(true);
  const [viewerHeightCm, setViewerHeightCm] = React.useState<number>(VIEWER_HEIGHT_CM.default);
  const [unit, setUnit] = React.useState<MeasurementUnit>("metric");

  // Read once on mount: touching storage during render would make the server and
  // client disagree about the size of the human in the chart.
  React.useEffect(() => {
    try {
      const storedHeight = Number(window.localStorage.getItem(HEIGHT_STORAGE_KEY));
      if (Number.isFinite(storedHeight) && storedHeight > 0) setViewerHeightCm(clampHeight(storedHeight));
      if (window.localStorage.getItem(UNIT_STORAGE_KEY) === "imperial") setUnit("imperial");
    } catch {
      // Private mode, blocked storage: the defaults are fine.
    }
  }, []);

  React.useEffect(() => {
    try {
      window.localStorage.setItem(HEIGHT_STORAGE_KEY, String(viewerHeightCm));
    } catch {
      // Ditto.
    }
  }, [viewerHeightCm]);

  React.useEffect(() => {
    try {
      window.localStorage.setItem(UNIT_STORAGE_KEY, unit);
    } catch {
      // Ditto.
    }
  }, [unit]);

  const toggle = (id: string) =>
    setReferenceIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));

  const comparison = compareToViewer(
    { lengthM: animal.length_m || animal.scale_ratio, heightM: animal.height_m || animal.scale_ratio },
    viewerHeightCm / 100,
  );
  const format = React.useCallback(
    (metres: number) => (comparison.dimension === "length" ? formatLength(metres, unit) : formatHeight(metres, unit)),
    [comparison.dimension, unit],
  );

  return (
    <div className={cn("space-y-3", className)}>
      <CanvasShell
        className="h-[360px] w-full rounded-[var(--radius-card)] bg-abyss/60 ring-1 ring-white/10 sm:h-[460px]"
        camera={{ position: [0, 6, 26], fov: 42, near: 0.1, far: 800 }}
        label={`Size comparison chart showing ${animal.name} next to reference figures`}
        fallback={<CanvasFallback message="WebGL is unavailable, so the size chart cannot be shown." />}
      >
        <ComparisonScene
          animal={animal}
          referenceIds={referenceIds}
          showRulers={showRulers}
          viewerHeightCm={viewerHeightCm}
          unit={unit}
        />
      </CanvasShell>

      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-white/45">
          <Ruler className="size-3.5 text-neon" />
          Compare with
        </span>
        {[{ id: "human", label: "You", emoji: "🧍" }, ...REFERENCE_FIGURES_WITHOUT_HUMAN].map((reference) => {
          const active = referenceIds.includes(reference.id);
          const spec = reference as { id: string; label: string; emoji: string };
          return (
            <button
              key={spec.id}
              type="button"
              onClick={() => toggle(spec.id)}
              aria-pressed={active}
              className={cn(
                "rounded-full px-3 py-1.5 text-[11px] font-medium ring-1 transition-colors",
                active
                  ? "bg-neon/18 text-neon ring-neon/40"
                  : "bg-white/6 text-white/60 ring-white/12 hover:bg-white/10 hover:text-white",
              )}
            >
              {spec.emoji} {spec.label}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setShowRulers((value) => !value)}
          aria-pressed={showRulers}
          className={cn(
            "rounded-full px-3 py-1.5 text-[11px] font-medium ring-1 transition-colors",
            showRulers ? "bg-white/10 text-white ring-white/20" : "bg-white/6 text-white/55 ring-white/12",
          )}
        >
          Height rulers
        </button>
      </div>

      {/* The visitor's own height, and the unit they read in */}
      <div className="glass flex flex-wrap items-center gap-x-4 gap-y-3 rounded-[var(--radius-card)] p-3">
        <label htmlFor="viewer-height" className="flex shrink-0 items-center gap-2 text-[11px] font-medium text-white/65">
          <RulerDimensionLine className="size-3.5 text-neon" />
          Your height
          <span className="tabular-nums text-white">{formatBodyHeight(viewerHeightCm, unit)}</span>
        </label>
        <input
          id="viewer-height"
          type="range"
          min={VIEWER_HEIGHT_CM.min}
          max={VIEWER_HEIGHT_CM.max}
          step={VIEWER_HEIGHT_CM.step}
          value={viewerHeightCm}
          onChange={(event) => setViewerHeightCm(clampHeight(Number(event.target.value)))}
          aria-valuetext={formatBodyHeight(viewerHeightCm, unit)}
          className="h-1.5 min-w-[10rem] flex-1 cursor-pointer appearance-none rounded-full bg-white/12 accent-neon outline-none focus-visible:ring-2 focus-visible:ring-neon/60 [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-neon"
        />

        <div role="group" aria-label="Measurement units" className="flex items-center gap-1 rounded-full bg-white/6 p-0.5 ring-1 ring-white/12">
          {(["metric", "imperial"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setUnit(option)}
              aria-pressed={unit === option}
              className={cn(
                "rounded-full px-2.5 py-1 text-[11px] font-medium capitalize transition-colors",
                unit === option ? "bg-white/14 text-white" : "text-white/55 hover:text-white",
              )}
            >
              {option === "metric" ? "Metric" : "Imperial"}
            </button>
          ))}
        </div>
      </div>

      {/* The answer, recomputed as the slider moves */}
      <p className="text-sm text-white/70" aria-live="polite">
        <strong className="font-semibold text-white">{animal.name}</strong>{" "}
        {describeComparison(comparison, format)}
      </p>

      <p className="text-[11px] leading-relaxed text-white/40">
        Figures are stylised proxies scaled onto real measurements: the dominant dimension is exact and the secondary
        dimension is corrected within ±40%. Upload a production <code className="text-white/55">.glb</code> and the
        same maths still applies.
      </p>
    </div>
  );
}

/** Keeps a stored or dragged value inside the control's own range. */
function clampHeight(cm: number) {
  if (!Number.isFinite(cm)) return VIEWER_HEIGHT_CM.default;
  return Math.min(VIEWER_HEIGHT_CM.max, Math.max(VIEWER_HEIGHT_CM.min, Math.round(cm)));
}
