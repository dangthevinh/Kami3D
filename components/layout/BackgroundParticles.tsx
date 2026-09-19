"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";

import { seededRandom } from "@/lib/utils";

/**
 * Ambient background: drifting bioluminescent motes over a slowly panning grid.
 *
 * Particle positions come from a deterministic seeded PRNG so the server and the
 * client produce byte-identical markup (no hydration mismatch), and the whole
 * layer is pointer-events-none + aria-hidden so it never interferes with the 3D
 * canvases layered above it.
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
          delay: -(a * 12).toFixed(2),
          drift: -30 + b * 60,
          color: d > 0.66 ? "#38e0ff" : d > 0.33 ? "#35f0c0" : "#a97bff",
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
            "linear-gradient(to right, rgba(255,255,255,0.35) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.35) 1px, transparent 1px)",
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
        <motion.span
          key={particle.id}
          className="absolute rounded-full"
          style={{
            left: particle.left,
            top: particle.top,
            width: particle.size,
            height: particle.size,
            backgroundColor: particle.color,
            boxShadow: `0 0 ${particle.size * 3}px ${particle.color}`,
          }}
          initial={{ opacity: particle.opacity * 0.5 }}
          animate={{
            y: [0, particle.drift, 0],
            x: [0, particle.drift / 2, 0],
            opacity: [particle.opacity * 0.35, particle.opacity, particle.opacity * 0.35],
          }}
          transition={{
            duration: particle.duration,
            delay: Number(particle.delay),
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* Vignette keeps text legible over the aurora */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_0%,transparent_35%,rgba(4,6,15,0.85)_100%)]" />
    </div>
  );
}
