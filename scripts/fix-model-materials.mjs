#!/usr/bin/env node
/**
 * Give a model back the colours it already has.
 *
 *   node scripts/fix-model-materials.mjs            # dry run: what would change
 *   node scripts/fix-model-materials.mjs --apply    # rewrite the .glb files
 *
 * ## The bug
 *
 * Nine species rendered pure white — `american-alligator`, `axolotl`, `blue-ringed-octopus`,
 * `california-condor`, `capybara`, `gila-monster`, `hippopotamus`, `komodo-dragon`,
 * `monarch-butterfly` — and the cause is not missing textures. Two of the landmark models the
 * second catalogue fetched had the same thing (`taj-mahal`, `great-wall`), which is why this script
 * walks both folders: a licence rule and a colour rule are not about animals or buildings. Their textures are embedded in the
 * file, and their materials describe the colour perfectly. The colour is written in an extension
 * that **three.js does not implement**:
 *
 *   material.extensions.KHR_materials_pbrSpecularGlossiness.diffuseTexture
 *
 * `KHR_materials_pbrSpecularGlossiness` was deprecated by Khronos and removed from three's
 * `GLTFLoader`; the loader registers clearcoat, transmission, volume, specular, sheen, iridescence
 * and the rest, but not this one. A material it does not understand becomes the default
 * `MeshStandardMaterial`: white. So the site was showing the right geometry with the colour left
 * behind in a field nobody reads.
 *
 * ## The conversion
 *
 * Specular-glossiness is the older way of describing a surface; the core of glTF 2.0 is
 * metallic-roughness. Khronos' own migration guidance maps one to the other:
 *
 *   baseColorFactor   <- diffuseFactor      (default [1,1,1,1])
 *   baseColorTexture  <- diffuseTexture
 *   metallicFactor    <- 0                  (specular-glossiness has no metalness; a dielectric)
 *   roughnessFactor   <- 1 - glossinessFactor
 *
 * The roughness is **clamped to 0.35**: several of these assets carry glossiness 1, which converts to
 * a perfect mirror, and a mirror in a studio with an environment map does not look like an animal —
 * it looks like chrome. The clamp is a judgement, it is written down here, and it is the only number
 * in this file that is not a direct translation.
 *
 * The specular-glossiness **map** is dropped rather than reused: its RGB is a specular colour and its
 * alpha is glossiness, which is not what a metallic-roughness map holds. Reusing it would be worse
 * than not having it.
 *
 * Only materials with **no** metallic-roughness base colour are touched. A file where the core PBR
 * part already works is left exactly as it is — three reads that half, and rewriting it from the
 * older field could change a model that is not broken.
 */

import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
/** Both catalogues. A model is a model, and the same loader reads both folders. */
const MODEL_DIRS = [join(ROOT, "public", "models"), join(ROOT, "public", "models", "landmarks")];
const APPLY = process.argv.includes("--apply");

const EXTENSION = "KHR_materials_pbrSpecularGlossiness";
/** See the header: a glossiness of 1 would otherwise become a mirror. */
const MIN_ROUGHNESS = 0.35;
const GLB_MAGIC = 0x46546c67;
const CHUNK_JSON = 0x4e4f534a;

const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

/** Split a .glb into its JSON chunk and everything after it. */
function readGlb(buffer) {
  if (buffer.readUInt32LE(0) !== GLB_MAGIC) throw new Error("not a .glb");
  if (buffer.readUInt32LE(16) !== CHUNK_JSON) throw new Error("the first chunk is not JSON");
  const length = buffer.readUInt32LE(12);
  return {
    json: JSON.parse(buffer.slice(20, 20 + length).toString("utf8")),
    rest: buffer.slice(20 + length),
    declared: buffer.readUInt32LE(8),
  };
}

/**
 * Pack the JSON chunk back in front of the untouched binary chunk.
 *
 * The JSON is padded with spaces to a four-byte boundary, which is what the spec asks for and what
 * every reader expects; the binary chunk is not touched at all, so no texture is re-encoded.
 */
function writeGlb(json, rest) {
  const encoded = Buffer.from(JSON.stringify(json), "utf8");
  const padded = Math.ceil(encoded.length / 4) * 4;
  const chunk = Buffer.alloc(padded, 0x20);
  encoded.copy(chunk);

  const header = Buffer.alloc(20);
  header.writeUInt32LE(GLB_MAGIC, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(20 + padded + rest.length, 8);
  header.writeUInt32LE(padded, 12);
  header.writeUInt32LE(CHUNK_JSON, 16);

  return Buffer.concat([header, chunk, rest]);
}

const changed = [];
const untouched = [];

const glbFiles = MODEL_DIRS.flatMap((dir) =>
  readdirSync(dir)
    .filter((entry) => entry.endsWith(".glb"))
    .sort()
    .map((name) => join(dir, name)),
);

for (const file of glbFiles) {
  const name = file.slice(ROOT.length + 1).replace(/^public\/models\//, "");
  const buffer = readFileSync(file);
  const { json, rest } = readGlb(buffer);

  const materials = json.materials ?? [];
  const converted = [];

  for (const material of materials) {
    const specGloss = material.extensions?.[EXTENSION];
    if (!specGloss) continue;

    const pbr = (material.pbrMetallicRoughness ??= {});
    if (pbr.baseColorTexture || pbr.baseColorFactor) continue; // the core half already works

    pbr.baseColorFactor = specGloss.diffuseFactor ?? [1, 1, 1, 1];
    if (specGloss.diffuseTexture) pbr.baseColorTexture = specGloss.diffuseTexture;
    pbr.metallicFactor = 0;
    pbr.roughnessFactor = clamp(1 - (specGloss.glossinessFactor ?? 1), MIN_ROUGHNESS, 1);

    delete material.extensions[EXTENSION];
    if (Object.keys(material.extensions).length === 0) delete material.extensions;
    converted.push({
      name: material.name ?? "?",
      colour: pbr.baseColorFactor.map((value) => Number(value).toFixed(3)).join(","),
      texture: pbr.baseColorTexture ? "#" + pbr.baseColorTexture.index : "none",
      roughness: pbr.roughnessFactor.toFixed(2),
    });
  }

  if (converted.length === 0) {
    untouched.push(name);
    continue;
  }

  // The extension leaves the file only when no material still needs it.
  const stillUsed = (json.materials ?? []).some((material) => material.extensions?.[EXTENSION]);
  if (!stillUsed) {
    for (const key of ["extensionsUsed", "extensionsRequired"]) {
      if (Array.isArray(json[key])) {
        json[key] = json[key].filter((entry) => entry !== EXTENSION);
        if (json[key].length === 0) delete json[key];
      }
    }
  }

  const next = writeGlb(json, rest);
  const reread = readGlb(next);
  if (JSON.stringify(reread.json) !== JSON.stringify(json)) throw new Error("the rewrite did not round-trip: " + name);

  changed.push({ name: name.replace(/\.glb$/, ""), converted, before: buffer.length, after: next.length });
  if (APPLY) writeFileSync(file, next);
}

console.log(changed.length + " models have materials written in an extension three does not implement:");
for (const row of changed) {
  console.log("\n  " + row.name + "  (" + row.converted.length + " material(s), " + (row.before / 1048576).toFixed(1) + " MB -> " + (row.after / 1048576).toFixed(1) + " MB)");
  for (const material of row.converted) {
    console.log("      " + material.name.padEnd(18) + "baseColor=" + material.colour.padEnd(22) + "texture=" + material.texture.padEnd(5) + "roughness=" + material.roughness);
  }
}

console.log("\n" + untouched.length + " models already describe their colour in the core format and were not touched.");
console.log(APPLY ? "\nWrote " + changed.length + " files." : "\nDry run. Add --apply to rewrite them.");
