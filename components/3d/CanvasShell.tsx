"use client";

import { Canvas, type CanvasProps } from "@react-three/fiber";
import { Component, Suspense, type ReactNode } from "react";

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

export function CanvasShell({ children, className, fallback, label, ...canvasProps }: CanvasShellProps) {
  return (
    <div
      className={cn("kami-canvas relative h-full w-full overflow-hidden", className)}
      role="img"
      aria-label={label}
    >
      <WebGLBoundary fallback={fallback ?? <CanvasFallback />}>
        <Canvas
          dpr={[1, 1.8]}
          shadows
          gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
          {...canvasProps}
        >
          <Suspense fallback={null}>{children}</Suspense>
        </Canvas>
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
