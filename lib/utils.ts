import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** shadcn-style class combiner: conditional classes + conflict-free Tailwind merge. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(value: number, options?: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 1, ...options }).format(value);
}

/** "1.4 t" for heavy animals, "45 kg" for lighter ones. */
export function formatWeight(kg: number) {
  if (kg >= 1000) return `${formatNumber(kg / 1000)} t`;
  return `${formatNumber(kg)} kg`;
}

export function formatLength(m: number) {
  return `${formatNumber(m)} m`;
}

export function formatHeight(m: number) {
  return `${formatNumber(m)} m`;
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Deterministic pseudo-random in [0,1) from a string seed (stable SSR/CSR output). */
export function seededRandom(seed: string, index = 0) {
  let h = 2166136261 ^ index;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Compact counter for the card stat line.
 *
 *   942      -> "942"
 *   1_240    -> "1.2k"
 *   18_400   -> "18k"
 *   999_999  -> "1M"     (not "1000k")
 *   2_500_000 -> "2.5M"
 *
 * The rounding has to happen before the unit is chosen, which is why the boundary
 * cases are handled explicitly rather than by a chain of thresholds.
 */
export function formatCount(value: number) {
  if (!Number.isFinite(value)) return "0";

  const scaled = (amount: number, unit: string) =>
    amount < 10
      ? `${amount.toFixed(1).replace(/\.0$/, "")}${unit}`
      : `${Math.round(amount)}${unit}`;

  if (value < 1000) return String(Math.round(value));

  const thousands = value / 1000;
  if (thousands < 999.5) return scaled(thousands, "k");

  const millions = value / 1_000_000;
  if (millions < 999.5) return scaled(millions, "M");

  return scaled(value / 1_000_000_000, "B");
}

/* -------------------------------------------------------------------------- */
/* Downloads                                                                  */
/* -------------------------------------------------------------------------- */

/** The eight bytes every PNG starts with. */
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/**
 * The bytes behind a `data:` URL.
 *
 * The viewer paints a frame with WebGL and reads it back with `toDataURL`, which
 * is a base64 string. A browser will not download a `data:` URL — Chrome refuses
 * it as an insecure download and says nothing — so the string has to become a
 * blob first, which means decoding it here.
 *
 * Throws on anything that is not a base64 data URL: a silently empty download is
 * worse than a visible failure.
 */
export function dataUrlToBytes(dataUrl: string): Uint8Array<ArrayBuffer> {
  const match = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(dataUrl);
  if (!match || !match[2]) throw new Error("Not a base64 data URL");

  const binary = atob(match[3]);
  // An explicit ArrayBuffer keeps the result assignable to BlobPart.
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

/** True when the bytes really are a PNG, so a broken capture is caught. */
export function isPngBytes(bytes: Uint8Array): boolean {
  return bytes.length > PNG_SIGNATURE.length && PNG_SIGNATURE.every((byte, index) => bytes[index] === byte);
}

/** The filename offered when someone saves a picture of a species. */
export function pngFileName(slug: string): string {
  const safe = slug
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `kami3d-${safe || "model"}.png`;
}

export function shuffle<T>(items: readonly T[], seed: string): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(seededRandom(seed, i) * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
