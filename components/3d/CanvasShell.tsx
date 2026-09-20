"use client";

import { Canvas, type CanvasProps } from "@react-three/fiber";
import * as React from "react";
import { Component, Suspense, type ReactNode } from "react";

import { useQuality } from "@/components/3d/useQuality";
import { cn } from "@/lib/utils";

/**
 * Shared wrapper for every Kami3D canvas.
 *
 * - clamps device pixel ratio so 4K/retina phones do not render 4x the pixels
 * - keeps the R3F tree out of the server render (this module is client-only)
 * - catches WebGL/shader failures and shows a graceful fallback instead of a
 *   blank rectangle, which matters on older mobile GPUs
 */

interface BoundaryState {
  failed: boolean;
}

class WebGLBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, BoundaryState> {
  state: BoundaryState = { failed: false };

  static getDerivedStateFromError(): BoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    console.warn("[kami3d] 3D scene failed to initialise:", error.message);
  }

  render() {
    if (this.state.failed) return this.props.fallback;
    return this.props.children;
  }
}

export interface CanvasShellProps extends Omit<CanvasProps, "children"> {
  children: ReactNode;
  className?: string;
  /** Shown while async assets (GLB/textures) load, and if WebGL is unavailable. */
  fallback?: ReactNode;
  /** Screen-reader description of what the canvas shows. */
  label?: string;
}

/**
 * Whether this browser can start a WebGL context at all.
 *
 * React Three Fiber reports the failure by logging, which leaves the visitor with
 * an empty rectangle and no explanation — and it is not a rare case: old Android
 * builds, locked-down enterprise browsers and any machine with hardware
 * acceleration disabled all land here. Asking first means the viewer can show its
 * fallback panel (and say what to do) instead of a blank canvas.
 */
function canCreateWebGL(): boolean {
  try {
    const probe = document.createElement("canvas");
    return Boolean(probe.getContext("webgl2") ?? probe.getContext("webgl"));
  } catch {
    return false;
  }
}

export function CanvasShell({ children, className, fallback, label, ...canvasProps }: CanvasShellProps) {
  // Resolution and shadow maps come from the device, not from a constant: a phone
  // that cannot afford a 1.8 dpr now renders one it can afford, and a desktop
  // keeps the settings the product was designed with. See `lib/quality.ts`.
  const quality = useQuality();
  // `null` until measured: the server and the first client render both assume the
  // device is capable, so nothing changes for the devices that are.
  const [webgl, setWebgl] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    setWebgl(canCreateWebGL());
  }, []);

  return (
    <div
      className={cn("kami-canvas relative h-full w-full overflow-hidden", className)}
      role="img"
      aria-label={label}
      // Observable on purpose: the tier decides resolution and shadows, and
      // without this there is no way to check which one a device got — the
      // browser audit asserts on it (see scripts/audit-*.mjs).
      data-quality={quality.tier}
      data-quality-dpr={quality.dpr[1]}
    >
      <WebGLBoundary fallback={fallback ?? <CanvasFallback />}>
        {webgl === false ? (
          (fallback ?? <CanvasFallback />)
        ) : (
        <Canvas
          dpr={canvasProps.dpr ?? quality.dpr}
          gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
          {...canvasProps}
          shadows={quality.shadows && canvasProps.shadows !== false}
        >
          <Suspense fallback={null}>{children}</Suspense>
        </Canvas>
        )}
      </WebGLBoundary>
    </div>
  );
}

/** Static stand-in used when WebGL cannot start (or before hydration). */
export function CanvasFallback({ message = "3D view unavailable on this device" }: { message?: string }) {
  return (
    <div className="grid h-full w-full place-items-center rounded-[var(--radius-card)] bg-gradient-to-br from-surface to-abyss ring-1 ring-white/8">
      <div className="flex flex-col items-center gap-2 px-6 text-center">
        <span className="text-3xl">🌍</span>
        <p className="text-sm text-white/50">{message}</p>
      </div>
    </div>
  );
}
