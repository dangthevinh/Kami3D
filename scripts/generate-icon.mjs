/**
 * Writes app/icon.svg from the single brand definition in lib/brand.ts.
 *
 * Next.js serves app/icon.svg as the favicon automatically. Generating it rather
 * than hand-maintaining a second copy means the tab icon, the navbar mark and the
 * OpenGraph badge are always the same artwork.
 *
 * Run with: npm run brand:icon
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { kamiMarkSvg } from "../lib/brand.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// 48 px with explicit dimensions: some browsers ignore a favicon SVG that only
// carries a viewBox.
const favicon = kamiMarkSvg({ idPrefix: "favicon", width: 48, height: 48 });
const faviconPath = join(root, "app", "icon.svg");
writeFileSync(faviconPath, `${favicon}\n`, "utf8");
console.log(`wrote ${faviconPath} (${favicon.length} bytes)`);

// Standalone asset for anything outside the app: docs, slides, a store listing.
// Gradients carry no ids of their own, so it is safe to inline anywhere.
const asset = kamiMarkSvg({ idPrefix: "kami" });
const assetPath = join(root, "public", "brand", "kami3d-mark.svg");
mkdirSync(dirname(assetPath), { recursive: true });
writeFileSync(assetPath, `${asset}\n`, "utf8");
console.log(`wrote ${assetPath} (${asset.length} bytes)`);
