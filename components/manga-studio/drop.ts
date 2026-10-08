/**
 * Where a dragged thing lands on a page.
 *
 * The geometry itself is not here: `lib/manga-layout.ts` owns the templates, the hit test and the
 * clamp, and it is covered by `npm run check:manga`. This file is the thin layer that turns a
 * browser event - a pointer position in pixels, a dragged payload - into the normalised page units
 * that module speaks, and nothing more. If a rectangle is ever computed twice, the two versions
 * disagree on the day someone moves a gutter.
 */

import { clampBubble, overlapArea, panelAt, type PanelRect } from "@/lib/manga-layout";

/** The rectangle a freshly dropped bubble gets, before it is clamped into its panel. */
export const DROPPED_BUBBLE_SIZE = { w: 0.34, h: 0.14 } as const;

/** How far outside a panel a drop may land and still be pulled in, in page units. */
const MAX_GUTTER_REACH = 0.14;

/**
 * Which panel a dropped bubble belongs to.
 *
 * `panelAt` answers for a point, and a point in a gutter has no panel - which is the situation the
 * whole clamp exists for. So a miss widens a probe square around the drop until it touches a panel,
 * scored with `overlapArea`, and the panel it touches first wins. That keeps one hit test in the
 * codebase: the gutter case reuses the same rectangle maths rather than a second "nearest panel"
 * routine that could drift from it.
 *
 * `null` means the drop was nowhere near a panel, and the caller says so instead of guessing.
 */
export function panelIndexForDrop(rects: PanelRect[], x: number, y: number): number | null {
  const direct = panelAt(rects, x, y);
  if (direct !== null) return direct;

  for (let probe = 0.01; probe <= MAX_GUTTER_REACH; probe += 0.01) {
    const box: PanelRect = { x: x - probe / 2, y: y - probe / 2, w: probe, h: probe };
    let best = -1;
    let bestArea = 0;
    for (let index = 0; index < rects.length; index += 1) {
      const area = overlapArea(box, rects[index]);
      if (area > bestArea) {
        bestArea = area;
        best = index;
      }
    }
    if (best >= 0) return best;
  }

  return null;
}

/** The rectangle for a bubble dropped at a point, already inside its panel. */
export function bubbleRectAt(panel: PanelRect, x: number, y: number): PanelRect {
  return clampBubble(
    { x: x - DROPPED_BUBBLE_SIZE.w / 2, y: y - DROPPED_BUBBLE_SIZE.h / 2, w: DROPPED_BUBBLE_SIZE.w, h: DROPPED_BUBBLE_SIZE.h },
    panel,
  );
}

/**
 * A pointer position as page units.
 *
 * Clamped to 0-1 because a drag that ends past the edge of an <img> still has coordinates, and page
 * units outside the page would clamp to the same place anyway - one clamp instead of two.
 */
export function normalisePoint(element: HTMLElement, clientX: number, clientY: number): { x: number; y: number } {
  const box = element.getBoundingClientRect();
  const x = (clientX - box.left) / Math.max(1, box.width);
  const y = (clientY - box.top) / Math.max(1, box.height);
  return { x: Math.min(1, Math.max(0, x)), y: Math.min(1, Math.max(0, y)) };
}

/** Normalised page units as CSS. The single place a rectangle becomes a style. */
export function rectStyle(rect: PanelRect): { left: string; top: string; width: string; height: string } {
  return {
    left: (rect.x * 100).toFixed(3) + "%",
    top: (rect.y * 100).toFixed(3) + "%",
    width: (rect.w * 100).toFixed(3) + "%",
    height: (rect.h * 100).toFixed(3) + "%",
  };
}
