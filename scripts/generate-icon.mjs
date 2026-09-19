/**
 * Writes app/icon.svg from the single brand definition in lib/brand.ts.
 *
 * Next.js serves app/icon.svg as the favicon automatically. Generating it rather
 * than hand-maintaining a second copy means the tab icon, the navbar mark and the
 * OpenGraph badge are always the same artwork.
 *
 * Run with: npm run brand:icon
 */

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { kamiMarkSvg } from "../lib/brand.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const target = join(root, "app", "icon.svg");

// 48 px with explicit dimensions: some browsers ignore a favicon SVG that only
// carries a viewBox.
const svg = kamiMarkSvg({ idPrefix: "favicon", width: 48, height: 48 });

writeFileSync(target, `${svg}\n`, "utf8");
console.log(`wrote ${target} (${svg.length} bytes)`);
