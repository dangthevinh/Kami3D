/**
 * Manga page geometry and speech bubbles, as arithmetic (Phase 24).
 *
 * The composer is a canvas of rectangles: a page is split into panels by a template, and every
 * bubble lives inside one of those rectangles. Both are pure functions here so that
 * `npm run check:manga` can prove the two things a person cannot see by looking: that a template's
 * panels do not overlap or fall off the page, and that a bubble never escapes the panel it belongs to.
 *
 * Coordinates are **normalised**: x/y/w/h are fractions of the page, so the same layout renders at
 * any width - a phone, a tablet, a print page. Presentation code multiplies by the real pixel size.
 */

export type MangaTemplate = "classic-4" | "classic-3" | "action-5" | "splash" | "webtoon";

export interface PanelRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface MangaTemplateSpec {
  id: MangaTemplate;
  label: string;
  /** Reading order, top-right first: the Japanese order the classic templates follow. */
  panels: PanelRect[];
  /** Webtoon pages are tall and scroll; print pages keep a ratio a printer can handle. */
  aspect: number;
}

/** The gutter between panels, in page units. A manga without gutters reads as one grey smear. */
export const GUTTER = 0.012;

const grid = (rows: number, cols: number, extras: PanelRect[] = []): PanelRect[] => {
  const w = (1 - GUTTER * (cols + 1)) / cols;
  const h = (1 - GUTTER * (rows + 1)) / rows;
  const panels: PanelRect[] = [];
  // Right to left, top to bottom: the order a Japanese page is read in.
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      panels.push({ x: GUTTER + (cols - 1 - col) * (w + GUTTER), y: GUTTER + row * (h + GUTTER), w, h });
    }
  }
  return [...panels, ...extras];
};

export const MANGA_TEMPLATES: MangaTemplateSpec[] = [
  { id: "classic-4", label: "Classic four panels", panels: grid(2, 2), aspect: 1.4 },
  { id: "classic-3", label: "Classic three panels", panels: grid(2, 2).slice(0, 2).concat([{ x: GUTTER, y: 0.5 + GUTTER / 2, w: 1 - GUTTER * 2, h: 0.5 - GUTTER * 1.5 }]), aspect: 1.4 },
  {
    id: "action-5",
    label: "Action five panels",
    // Built from the same three-band grid as the others instead of hand-typed rectangles: a
    // hand-typed set is how the first version of this template ended one thousandth of a page
    // below the paper, which the check suite caught. The top band is one wide shot, then two
    // rows of two - five panels, all inside the page by construction.
    panels: (() => {
      const [a, b, c, d, e, f] = grid(3, 2);
      const wide = { x: GUTTER, y: a.y, w: 1 - GUTTER * 2, h: a.h };
      return [wide, c, d, e, f].filter(Boolean) as PanelRect[];
    })(),
    aspect: 1.4,
  },
  { id: "splash", label: "One splash panel", panels: [{ x: GUTTER, y: GUTTER, w: 1 - GUTTER * 2, h: 1 - GUTTER * 2 }], aspect: 1.4 },
  {
    id: "webtoon",
    label: "Webtoon (vertical scroll)",
    panels: [0, 1, 2].map((index) => ({ x: GUTTER, y: GUTTER + index * (1 / 3), w: 1 - GUTTER * 2, h: 1 / 3 - GUTTER * 1.5 })),
    aspect: 3,
  },
];

export const panelRects = (template: MangaTemplate | string): PanelRect[] =>
  MANGA_TEMPLATES.find((entry) => entry.id === template)?.panels ?? MANGA_TEMPLATES[0].panels;

/** Overlap between two rectangles, as page units. Zero means they do not touch. */
export function overlapArea(a: PanelRect, b: PanelRect): number {
  const width = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const height = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return width <= 0 || height <= 0 ? 0 : width * height;
}

export type BubbleType = "speech" | "thought" | "narration" | "scream";

export const BUBBLE_TYPES: BubbleType[] = ["speech", "thought", "narration", "scream"];

/** The look of each bubble kind. Narration is a box, not a bubble: that is the convention. */
export const BUBBLE_STYLE: Record<BubbleType, { shape: "round" | "cloud" | "box" | "spiky"; italic: boolean; weight: number }> = {
  speech: { shape: "round", italic: false, weight: 500 },
  thought: { shape: "cloud", italic: true, weight: 500 },
  narration: { shape: "box", italic: false, weight: 400 },
  scream: { shape: "spiky", italic: false, weight: 700 },
};

/**
 * Keep a bubble inside its panel.
 *
 * A bubble that crosses a gutter hides the art underneath and reads as belonging to the wrong
 * panel - the kind of mistake that is easy to miss on a big screen and obvious on a phone. So the
 * rectangle is moved back inside, and shrunk only when it cannot fit at all.
 */
export function clampBubble(bubble: PanelRect, panel: PanelRect): PanelRect {
  const w = Math.min(Math.max(bubble.w, 0.02), panel.w);
  const h = Math.min(Math.max(bubble.h, 0.02), panel.h);
  const x = Math.min(Math.max(bubble.x, panel.x), panel.x + panel.w - w);
  const y = Math.min(Math.max(bubble.y, panel.y), panel.y + panel.h - h);
  return { x: Number(x.toFixed(4)), y: Number(y.toFixed(4)), w: Number(w.toFixed(4)), h: Number(h.toFixed(4)) };
}

/** Which panel a point falls in, or null in a gutter. Used when a bubble is dropped. */
export function panelAt(rects: PanelRect[], x: number, y: number): number | null {
  for (let index = 0; index < rects.length; index += 1) {
    const rect = rects[index];
    if (x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h) return index;
  }
  return null;
}

/** The next page number for a chapter: 1 for the first, and never a duplicate. */
export function nextPageNumber(existing: number[]): number {
  const used = new Set(existing.filter((value) => Number.isFinite(value) && value > 0));
  let candidate = 1;
  while (used.has(candidate)) candidate += 1;
  return candidate;
}

/** A short, stable slug for a project title, used in file names rather than in URLs. */
export function mangaSlug(title: string): string {
  return title
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "manga";
}

/** CBZ files are read by comic readers: page order is the file-name order, zero padded. */
export function cbzEntryName(pageNumber: number, extension = "png"): string {
  return String(Math.max(1, Math.round(pageNumber))).padStart(4, "0") + "." + extension;
}