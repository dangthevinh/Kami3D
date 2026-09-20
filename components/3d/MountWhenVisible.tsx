"use client";

import * as React from "react";

import { whenIdle } from "@/lib/idle";

/**
 * Holds a heavy child until it is worth paying for.
 *
 * The 3D surfaces are already behind `next/dynamic`, which keeps them out of the
 * server render and out of the route's own chunks — but a dynamic import still
 * starts the moment the component renders, and on the landing page and the
 * species pages that is immediately. The result was a first paint racing ~300 KB
 * of `three` for bandwidth and main-thread time, on pages whose largest
 * contentful paint is a line of text.
 *
 * So a canvas now waits for two things it can afford to wait for:
 *
 *   1. it has to be near the viewport (240 px of margin, so scrolling into it
 *      still feels instant), and
 *   2. the browser has to be idle, which in practice means the text, the fonts and
 *      the layout are done.
 *
 * `placeholder` must have the same footprint as the child; every 3D surface here
 * has a skeleton that does, so nothing moves when the swap happens.
 */
export interface MountWhenVisibleProps {
  children: React.ReactNode;
  /** Same footprint as the real thing, so the swap costs no layout shift. */
  placeholder: React.ReactNode;
  className?: string;
  /** How far outside the viewport to start loading. */
  rootMargin?: string;
  /** Ceiling on how long the browser may stay busy before the child mounts. */
  idleTimeout?: number;
}

export function MountWhenVisible({
  children,
  placeholder,
  className,
  rootMargin = "240px",
  idleTimeout = 1200,
}: MountWhenVisibleProps) {
  const container = React.useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    const node = container.current;
    if (!node || typeof IntersectionObserver !== "function") {
      setMounted(true);
      return;
    }

    let cancelIdle: () => void = () => undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        cancelIdle = whenIdle(() => setMounted(true), idleTimeout);
      },
      { rootMargin },
    );

    observer.observe(node);
    return () => {
      observer.disconnect();
      cancelIdle();
    };
  }, [idleTimeout, rootMargin]);

  return (
    <div ref={container} className={className}>
      {mounted ? children : placeholder}
    </div>
  );
}
