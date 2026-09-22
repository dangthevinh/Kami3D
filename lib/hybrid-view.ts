/**
 * The hybrid view's one rule, kept out of the component so it can be tested.
 *
 * A map is a WebGL context and a 3D model viewer is a second one. Desktop layouts can hold both;
 * a phone cannot reliably do it at all, and the phase brief forbids trying. So when the viewer is
 * open on a small screen the map must be **unmounted** - not hidden with CSS, which would leave the
 * context alive and still count.
 */
export const HYBRID_BREAKPOINT_PX = 1024;

export function shouldKeepMapMounted({ hybridOpen, wideEnough }: { hybridOpen: boolean; wideEnough: boolean }): boolean {
  if (!hybridOpen) return true;
  return wideEnough;
}

/** Where the viewer lives, which follows from the same answer. */
export function hybridPlacement({ hybridOpen, wideEnough }: { hybridOpen: boolean; wideEnough: boolean }): "aside" | "map" | "closed" {
  if (!hybridOpen) return "closed";
  return wideEnough ? "aside" : "map";
}
