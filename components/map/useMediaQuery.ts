"use client";

import * as React from "react";

/**
 * A CSS media query, as a boolean, after hydration only.
 *
 * It exists for one decision: whether the hybrid 3D view can sit beside the map or has to replace it.
 * That cannot be answered in CSS, because the answer changes whether a WebGL context is created at
 * all - and a hidden canvas is still a context.
 *
 * The server has no viewport, so the first render reports false and the effect corrects it. The cost
 * is one layout pass on a page that already mounts its map after hydration.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = React.useState(false);

  React.useEffect(() => {
    const list = window.matchMedia(query);
    const update = () => setMatches(list.matches);
    update();
    list.addEventListener("change", update);
    return () => list.removeEventListener("change", update);
  }, [query]);

  return matches;
}
