/**
 * An admin's own model: what a file is, what a credit must say, and whether a card may draw it.
 *
 * All of it is pure, so `npm run check:model-upload` can run the rules against the real .glb files in
 * `public/models/` without a server, a database or a bucket. The parts that touch Storage and the
 * budget live in `lib/model-publish.ts`, and the parts that read an inbox live in
 * `lib/upload-ingest.ts`: this file only decides.
 *
 * Two rules are worth stating plainly, because both are refusals rather than defaults:
 *
 *   - **the triangle count is read from the file**, not from a form field or a provider's summary.
 *     A GLB is a header, a JSON chunk and a binary chunk; the numbers are in the JSON, and a file
 *     that does not parse is not a model;
 *   - **a licence is never assumed**. A credit must name the licence, and it must be CC0 or CC BY,
 *     which is the same allow-list the database enforces. "Unknown" is not on it.
 */

// A relative import with an explicit extension, the same shape lib/geo.ts and lib/quiz.ts use: this
// module is pure and the check suite imports it straight from Node, which resolves neither the "@/"
// alias nor an extensionless path.
import { withinPreviewBudget } from "./model-preview.ts";

export const UPLOAD_LICENSES = ["CC0", "CC-BY"] as const;

export type UploadLicense = (typeof UPLOAD_LICENSES)[number];

/** Where an uploaded model is served from, and where the inbox keeps its files. */
export const UPLOAD_PREFIXES = {
  inbox: "uploads/inbox",
  published: "uploads/published",
  rejected: "uploads/rejected",
  /** The served copies. A timestamp in the path means a replaced model is never a stale cache hit. */
  served: "uploads/models",
} as const;

export interface UploadMeta {
  title: string;
  author: string;
  license: UploadLicense;
  sourceUrl: string | null;
  note: string | null;
}

export interface GlbFacts {
  bytes: number;
  version: number;
  generator: string | null;
  meshes: number;
  materials: number;
  textures: number;
  /** Triangles as the file itself counts them, summed over every TRIANGLES primitive. */
  triangles: number;
}

export type GlbResult = { ok: true; facts: GlbFacts } | { ok: false; error: string };

const GLB_MAGIC = 0x46546c67; // "glTF"
const CHUNK_JSON = 0x4e4f534a; // "JSON"
const MODE_TRIANGLES = 4;

/**
 * Read a .glb the way a loader would: header first, then the JSON chunk.
 *
 * Everything is length-checked before it is read, because the input is a file an admin uploaded and
 * "trusted" is not a property of a byte array.
 */
export function parseGlb(input: Uint8Array): GlbResult {
  const bytes = input.byteLength;
  if (bytes < 20) return { ok: false, error: "the file is too small to be a .glb (" + bytes + " bytes)" };

  const view = new DataView(input.buffer, input.byteOffset, input.byteLength);
  const magic = view.getUint32(0, true);
  if (magic !== GLB_MAGIC) {
    return { ok: false, error: "not a .glb: the first four bytes are not \"glTF\" (a .gltf, .obj or .zip will not do)" };
  }

  const version = view.getUint32(4, true);
  const declared = view.getUint32(8, true);
  if (version !== 2) return { ok: false, error: "glTF version " + version + " is not supported; re-export as glTF 2.0" };
  if (declared > bytes) return { ok: false, error: "the file is truncated: it declares " + declared + " bytes but has " + bytes };
  if (declared < 20) return { ok: false, error: "the header declares " + declared + " bytes, which cannot hold a chunk" };

  const chunkLength = view.getUint32(12, true);
  const chunkType = view.getUint32(16, true);
  if (chunkType !== CHUNK_JSON) return { ok: false, error: "the first chunk is not the JSON chunk" };
  if (20 + chunkLength > declared) return { ok: false, error: "the JSON chunk runs past the end of the file" };

  let json: unknown;
  try {
    json = JSON.parse(new TextDecoder().decode(input.subarray(20, 20 + chunkLength)));
  } catch {
    return { ok: false, error: "the JSON chunk is not valid JSON" };
  }
  if (typeof json !== "object" || json === null) return { ok: false, error: "the JSON chunk is not an object" };

  const document = json as Record<string, unknown>;
  const accessors = Array.isArray(document.accessors) ? (document.accessors as Record<string, unknown>[]) : [];
  const meshes = Array.isArray(document.meshes) ? (document.meshes as Record<string, unknown>[]) : [];

  let triangles = 0;
  for (const mesh of meshes) {
    const primitives = Array.isArray(mesh.primitives) ? (mesh.primitives as Record<string, unknown>[]) : [];
    for (const primitive of primitives) {
      const mode = typeof primitive.mode === "number" ? primitive.mode : MODE_TRIANGLES;
      if (mode !== MODE_TRIANGLES) continue;
      const indices = typeof primitive.indices === "number" ? accessors[primitive.indices] : undefined;
      const attributes = (primitive.attributes ?? {}) as Record<string, unknown>;
      const position = typeof attributes.POSITION === "number" ? accessors[attributes.POSITION] : undefined;
      const count = typeof indices?.count === "number" ? indices.count : typeof position?.count === "number" ? position.count : 0;
      triangles += Math.floor(count / 3);
    }
  }

  return {
    ok: true,
    facts: {
      bytes,
      version,
      generator: typeof document.asset === "object" && document.asset !== null && typeof (document.asset as Record<string, unknown>).generator === "string"
        ? ((document.asset as Record<string, unknown>).generator as string)
        : null,
      meshes: meshes.length,
      materials: Array.isArray(document.materials) ? document.materials.length : 0,
      textures: Array.isArray(document.textures) ? document.textures.length : 0,
      triangles,
    },
  };
}

export type MetaResult = { ok: true; meta: UploadMeta } | { ok: false; error: string };

/**
 * The credit, checked.
 *
 * A file without a stated licence is refused rather than published with a guess: the whole reason the
 * provider pipeline has an allow-list is that "we did not know" is not a licence, and an admin's own
 * file is not exempt from that.
 */
export function validateUploadMeta(value: unknown): MetaResult {
  const input = (typeof value === "object" && value !== null ? value : {}) as Record<string, unknown>;
  const clean = (field: unknown, max = 200): string => (typeof field === "string" ? field.trim().slice(0, max) : "");

  const title = clean(input.title);
  const author = clean(input.author);
  const license = clean(input.license, 20);
  const sourceUrl = clean(input.sourceUrl, 400);
  const note = clean(input.note, 400);

  if (!title) return { ok: false, error: "a credit needs a title" };
  if (!author) return { ok: false, error: "a credit needs an author or a source name" };
  if (!(UPLOAD_LICENSES as readonly string[]).includes(license)) {
    return { ok: false, error: "licence must be one of " + UPLOAD_LICENSES.join(", ") + " - got " + (license || "(none)") };
  }
  if (sourceUrl && !/^https?:\/\//.test(sourceUrl)) return { ok: false, error: "the source URL must start with http:// or https://" };

  return {
    ok: true,
    meta: { title, author, license: license as UploadLicense, sourceUrl: sourceUrl || null, note: note || null },
  };
}

/** The credit line the site will print, in the same shape the provider pipeline writes. */
export function attributionFor(meta: UploadMeta): string {
  const source = meta.sourceUrl ? " (" + meta.sourceUrl + ")" : "";
  return meta.title + " by " + meta.author + ", " + meta.license + source + " - uploaded by an admin";
}

/** `Bengal Tiger (rev 2).GLB` -> `bengal-tiger-rev-2`, the shape every slug in the catalogue has. */
export function slugFromFilename(filename: string): string {
  return filename
    .replace(/^.*[\\/]/, "")
    .replace(/\.(glb|gltf)$/i, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

export const sidecarName = (slug: string): string => slug + ".json";
export const modelName = (slug: string): string => slug + ".glb";

/** The metadata sidecar an inbox file may ship with. Same rules as the form: no licence, no publish. */
export function parseSidecar(value: unknown): MetaResult {
  if (typeof value !== "object" || value === null) return { ok: false, error: "the sidecar is not a JSON object" };
  return validateUploadMeta(value);
}

/** Whether the species card may fetch this model. One budget, one place: lib/model-preview.ts. */
export function cardEligible(bytes: number, triangles: number): boolean {
  return withinPreviewBudget({ bytes, faceCount: triangles });
}

/** `uploads/models/lion-20260925T164500.glb` - timestamped so a replacement cannot be a stale cache hit. */
export function servedPath(slug: string, at: Date = new Date()): string {
  const stamp = at.toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z").replace("T", "-").replace("Z", "");
  return UPLOAD_PREFIXES.served + "/" + slug + "-" + stamp + ".glb";
}

export const fileSizeLabel = (bytes: number): string => (bytes / 1_048_576).toFixed(1) + " MB";
