"use client";

import { Bounds, ContactShadows, Grid, Html, OrbitControls } from "@react-three/drei";
import { Ruler } from "lucide-react";
import * as React from "react";

import { CanvasFallback, CanvasShell } from "@/components/3d/CanvasShell";
import { ProceduralAnimal } from "@/components/3d/ProceduralAnimal";
import { useQuality } from "@/components/3d/useQuality";
import { REFERENCE_FIGURES, figureFromAnimal, layoutFigures, type FigureSpec } from "@/lib/size-comparison";
import { cn } from "@/lib/utils";
import type { Animal } from "@/types/animal";

/**
 * "How big is it really?" — the species rendered at true scale beside a human, a
 * blue whale and a T. rex.
 *
 * The layout maths live in `lib/size-comparison.ts` and are unit-tested
 * (`npm run check:size`): the dominant dimension is exact, figures never overlap,
 * and the row is centred. Models are procedural rigs, so this works before any
 * asset pipeline exists; each rig is scaled per-axis within a +/-40% band so the
 * rendered creature matches recorded measurements rather than the rig's stylised
 * proportions.
 */

type PlacedFigure = ReturnType<typeof layoutFigures>["figures"][number];

function ComparisonScene({
  animal,
  referenceIds,
  showRulers,
}: {
  animal: Animal;
  referenceIds: string[];
  showRulers: boolean;
}) {
  const quality = useQuality();

  const { figures } = React.useMemo(() => {
    const references = REFERENCE_FIGURES.filter((reference) => referenceIds.includes(reference.id));
    const specs: FigureSpec[] = [figureFromAnimal(animal), ...references];
    return layoutFigures(specs);
  }, [animal, referenceIds]);

  return (
    <>
      <ambientLight intensity={1.15} />
      <hemisphereLight args={["#cfe9ff", "#050810", 0.75]} />
      <directionalLight position={[12, 18, 10]} intensity={2.6} color="#ffffff" />
      <directionalLight position={[-14, 6, -10]} intensity={0.9} color="#a97bff" />

      {/* `key` remounts Bounds so the camera re-frames when the set of figures changes. */}
      <Bounds key={`${animal.id}-${referenceIds.join("-")}`} fit clip observe margin={1.18}>
        {figures.map((figure) => (
          <ScaledFigure key={figure.id} figure={figure} showRuler={showRulers} />
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

/** A rig scaled to real measurements, standing on the ground plane. */
function ScaledFigure({ figure, showRuler }: { figure: PlacedFigure; showRuler: boolean }) {
  return (
    <group position={figure.position}>
      <group scale={figure.scale}>
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
            {figure.sublabel}
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

  const toggle = (id: string) =>
    setReferenceIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));

  return (
    <div className={cn("space-y-3", className)}>
      <CanvasShell
        className="h-[360px] w-full rounded-[var(--radius-card)] bg-abyss/60 ring-1 ring-white/10 sm:h-[460px]"
        camera={{ position: [0, 6, 26], fov: 42, near: 0.1, far: 800 }}
        label={`Size comparison chart showing ${animal.name} next to reference figures`}
        fallback={<CanvasFallback message="WebGL is unavailable, so the size chart cannot be shown." />}
      >
        <ComparisonScene animal={animal} referenceIds={referenceIds} showRulers={showRulers} />
      </CanvasShell>

      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-white/45">
          <Ruler className="size-3.5 text-neon" />
          Compare with
        </span>
        {REFERENCE_FIGURES.map((reference) => {
          const active = referenceIds.includes(reference.id);
          return (
            <button
              key={reference.id}
              type="button"
              onClick={() => toggle(reference.id)}
              aria-pressed={active}
              className={cn(
                "rounded-full px-3 py-1.5 text-[11px] font-medium ring-1 transition-colors",
                active
                  ? "bg-neon/18 text-neon ring-neon/40"
                  : "bg-white/6 text-white/60 ring-white/12 hover:bg-white/10 hover:text-white",
              )}
            >
              {reference.emoji} {reference.label} · {reference.sublabel}
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

      <p className="text-[11px] leading-relaxed text-white/40">
        Figures are stylised proxies scaled onto real measurements: the dominant dimension is exact and the secondary
        dimension is corrected within ±40%. Upload a production <code className="text-white/55">.glb</code> and the
        same maths still applies.
      </p>
    </div>
  );
}
