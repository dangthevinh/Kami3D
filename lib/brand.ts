/**
 * Kami3D brand assets.
 *
 * The mark is defined once, as an SVG string, and consumed by the navbar, the
 * footer, the favicon and the per-species OpenGraph images. Four copies of a logo
 * drift apart the moment one of them is tweaked, so there is exactly one here.
 *
 * The design: a rounded prism tile carrying a gradient from the product's mint
 * accent through cyan to violet, with an isometric cube (the "3D" in the name)
 * sitting inside an orbit ring plus a single bright node — the globe and its
 * regional hotspots, reduced to one glyph. The cube's top face is lit and its
 * sides are cut from the void colour, so the mark reads as a solid object rather
 * than a flat icon, at sizes from 16 px (favicon) upward.
 */

// Relative with an explicit extension on purpose: scripts/generate-icon.mjs runs
// this module in plain Node (type stripping, no bundler), where a "@/" alias would
// not resolve. tsconfig sets allowImportingTsExtensions for exactly this case.
import { roundedPolygonPath, squircleRectPath } from "./squircle.ts";

export const BRAND = {
  mint: "#2ee6b0",
  cyan: "#38e0ff",
  violet: "#8b5cf6",
  /** Same value as --color-void, so the cube's shadowed faces match the app. */
  ink: "#04121a",
} as const;

/**
 * Corner geometry.
 *
 * Both the tile and the cube use continuous-curvature corners. The tile's corners
 * are 90°, so the rounding is dramatic and the Apple-style fullness is obvious:
 * the cut drops from 5.80 to 4.30 units at the same nominal radius. The cube's
 * silhouette corners are 120°, and an obtuse corner is geometrically limited —
 * a tangent of `t` can only be cut back about 0.26·t — so its rounding is a
 * genuine but much quieter softening, which is why it uses the longest tangent
 * that still leaves a straight run along each edge.
 */
const TILE_CORNER = { tangent: 14, fullness: 1.35 };
const CUBE_CORNER = { tangent: 3.6, fullness: 1.35 };

/** The cube's outer silhouette: top, upper-right, lower-right, bottom, lower-left, upper-left. */
const CUBE_OUTLINE: Array<[number, number]> = [
  [24, 13],
  [33.53, 18.5],
  [33.53, 29.5],
  [24, 35],
  [14.47, 29.5],
  [14.47, 18.5],
];

const TILE_PATH = squircleRectPath(0, 0, 48, 48, TILE_CORNER);
const CUBE_PATH = roundedPolygonPath(CUBE_OUTLINE, CUBE_CORNER);

export interface KamiMarkOptions {
  /**
   * Prefix for the SVG's internal ids. Two marks on one page need distinct ids
   * for their gradients, so callers pass something stable ("nav", "footer").
   */
  idPrefix?: string;
  /** Omit both to let CSS size the mark; set them for a standalone file. */
  width?: number;
  height?: number;
}

/** The Kami3D mark as standalone SVG markup. */
export function kamiMarkSvg({ idPrefix = "kami", width, height }: KamiMarkOptions = {}): string {
  const p = idPrefix;
  const size = width && height ? ` width="${width}" height="${height}"` : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"${size} fill="none" aria-hidden="true" focusable="false">
  <defs>
    <linearGradient id="${p}-tile" x1="4" y1="2" x2="44" y2="46" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${BRAND.mint}"/>
      <stop offset="0.48" stop-color="${BRAND.cyan}"/>
      <stop offset="1" stop-color="${BRAND.violet}"/>
    </linearGradient>
    <radialGradient id="${p}-gloss" cx="0.3" cy="0.12" r="0.85">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.5"/>
      <stop offset="0.5" stop-color="#ffffff" stop-opacity="0.07"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="${p}-top" x1="24" y1="13" x2="24" y2="24" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0.82"/>
    </linearGradient>
    <clipPath id="${p}-clip">
      <path d="${TILE_PATH}"/>
    </clipPath>
    <!-- The cube is clipped to its own rounded silhouette, so the three faces keep
         their sharp interior edges while the outside corners are softened. -->
    <clipPath id="${p}-cube">
      <path d="${CUBE_PATH}"/>
    </clipPath>
  </defs>

  <path d="${TILE_PATH}" fill="url(#${p}-tile)"/>
  <path d="${TILE_PATH}" fill="url(#${p}-gloss)"/>

  <g clip-path="url(#${p}-clip)">
    <!-- orbit: the globe, and the ring the hotspots sit on -->
    <ellipse cx="24" cy="24" rx="17" ry="6.2" transform="rotate(-22 24 24)"
             stroke="${BRAND.ink}" stroke-opacity="0.3" stroke-width="1.3"/>
    <!-- a lit node on that orbit -->
    <circle cx="37.31" cy="15.8" r="4.6" fill="#ffffff" fill-opacity="0.28"/>
    <circle cx="37.31" cy="15.8" r="2.4" fill="#ffffff"/>
  </g>

  <!-- isometric cube: lit top, then two shadowed faces for depth -->
  <g clip-path="url(#${p}-cube)">
    <polygon points="24,13 33.53,18.5 24,24 14.47,18.5" fill="url(#${p}-top)"/>
    <polygon points="14.47,18.5 24,24 24,35 14.47,29.5" fill="${BRAND.ink}" fill-opacity="0.34"/>
    <polygon points="33.53,18.5 24,24 24,35 33.53,29.5" fill="${BRAND.ink}" fill-opacity="0.55"/>
  </g>

  <!-- crisp edge so the tile holds up against any background -->
  <path d="${squircleRectPath(0.75, 0.75, 46.5, 46.5, { tangent: 13.25, fullness: 1.35 })}"
        stroke="#ffffff" stroke-opacity="0.4" stroke-width="1.5" fill="none"/>
</svg>`;
}
