/**
 * Whether this browser can start a WebGL context at all.
 *
 * Two very different renderers need this answer: React Three Fiber for the 3D models
 * and the globe, and MapLibre for the maps. Both report the failure by logging, which
 * leaves the visitor with an empty rectangle and no explanation - and it is not a rare
 * case: old Android builds, locked-down enterprise browsers, and any machine with
 * hardware acceleration switched off all land here.
 *
 * Asking first means each of them can show a real fallback panel instead of a blank
 * canvas. Kept in one place so the answer cannot drift between the two.
 */
export function canCreateWebGL(): boolean {
  try {
    const probe = document.createElement("canvas");
    return Boolean(probe.getContext("webgl2") ?? probe.getContext("webgl"));
  } catch {
    return false;
  }
}
