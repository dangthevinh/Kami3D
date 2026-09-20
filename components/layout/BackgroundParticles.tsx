"use client";

import { useMemo } from "react";

import { seededRandom } from "@/lib/utils";

/**
 * Ambient background: drifting bioluminescent motes over a slowly panning grid.
 *
 * Particle positions come from a deterministic seeded PRNG so the server and the
 * client produce byte-identical markup (no hydration mismatch), and the animation
 * itself is a single CSS keyframe — this layer sits in the root layout, so it must
 * not pull a motion library into every page's JavaScript. The whole layer is
 * pointer-events-none + aria-hidden so it never interferes with the 3D canvases
 * layered above it.
 */

const PARTICLE_COUNT = 26;

export function BackgroundParticles() {
  const particles = useMemo(
    () =>
      Array.from({ length: PARTICLE_COUNT }, (_, index) => {
        const a = seededRandom("kami-particle", index);
        const b = seededRandom("kami-size", index);
        const c = seededRandom("kami-duration", index);
        const d = seededRandom("kami-hue", index);

        return {
          id: index,
          left: `${(a * 100).toFixed(3)}%`,
          top: `${(seededRandom("kami-top", index) * 100).toFixed(3)}%`,
          size: 1.5 + b * 4.5,
          duration: 12 + c * 16,
          delay: -Number((a * 12).toFixed(2)),
          drift: -30 + b * 60,
          // Theme tokens, so a mote darkens with the rest of the palette in
          // light mode instead of glowing white-on-white.
          color: d > 0.66 ? "var(--color-glow)" : d > 0.33 ? "var(--color-neon)" : "var(--color-iris)",
          opacity: 0.18 + d * 0.36,
        };
      }),
    [],
  );

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Panning grid */}
      <div
        className="absolute inset-0 opacity-[0.12] animate-drift"
        style={{
          backgroundImage:
            "linear-gradient(to right, var(--kami-grid-line) 1px, transparent 1px), linear-gradient(to bottom, var(--kami-grid-line) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
          maskImage: "radial-gradient(70% 60% at 50% 30%, #000 20%, transparent 78%)",
          WebkitMaskImage: "radial-gradient(70% 60% at 50% 30%, #000 20%, transparent 78%)",
        }}
      />

      {/* Aurora orbs */}
      <div className="absolute -left-40 top-[-10%] size-[38rem] rounded-full bg-glow/12 blur-[130px]" />
      <div className="absolute -right-40 top-1/4 size-[34rem] rounded-full bg-iris/12 blur-[130px]" />
      <div className="absolute bottom-[-20%] left-1/3 size-[40rem] rounded-full bg-neon/10 blur-[150px]" />

      {/* Motes */}
      {particles.map((particle) => (
        <span
          key={particle.id}
          className="mote absolute rounded-full"
          style={
            {
              left: particle.left,
              top: particle.top,
              width: particle.size,
              height: particle.size,
              backgroundColor: particle.color,
              boxShadow: `0 0 ${particle.size * 3}px ${particle.color}`,
              "--mote-x": `${particle.drift / 2}px`,
              "--mote-y": `${particle.drift}px`,
              "--mote-opacity": particle.opacity,
              "--mote-opacity-min": particle.opacity * 0.35,
              "--mote-duration": `${particle.duration.toFixed(2)}s`,
              "--mote-delay": `${particle.delay}s`,
            } as React.CSSProperties
          }
        />
      ))}

      {/* Vignette keeps text legible over the aurora */}
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(120% 90% at 50% 0%, transparent 35%, var(--kami-vignette) 100%)",
        }}
      />
    </div>
  );
}
