import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** shadcn-style class combiner: conditional classes + conflict-free Tailwind merge. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(value: number, options?: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 1, ...options }).format(value);
}

/**
 * "1.4 t" for heavy animals, "45 kg" for lighter ones.
 *
 * Imperial reports pounds up to a short ton, because nobody pictures 130 tonnes as
 * 287,000 pounds: the visitor who chose feet gets a unit a person would say out
 * loud at both ends of the range.
 */
export function formatWeight(kg: number, unit: MeasurementUnit = "metric") {
  if (unit === "imperial") {
    const pounds = kg / 0.45359237;
    return pounds >= 2000 ? `${formatNumber(pounds / 2000)} tn` : `${formatNumber(pounds)} lb`;
  }
  if (kg >= 1000) return `${formatNumber(kg / 1000)} t`;
  return `${formatNumber(kg)} kg`;
}

/**
 * Metric or imperial, for every measurement the UI prints.
 *
 * The encyclopedia is metric by nature — IUCN records and every model in the
 * catalogue use metres — but "2.5 m" is not a size until the reader can picture
 * it, and a visitor who thinks in feet gets nothing from the number. Imperial
 * output is an exact conversion (/ 0.3048) rounded to the nearest inch: "8 ft 2 in"
 * is honest, "8.2 ft" is not, because the reader divides by 12 and gets a
 * different answer.
 */
export type MeasurementUnit = "metric" | "imperial";

/** Feet and inches from metres, e.g. 2.5 -> { feet: 8, inches: 2 }. */
export function toFeetInches(m: number): { feet: number; inches: number } {
  const totalInches = Math.round((Math.abs(m) / 0.3048) * 12);
  return { feet: Math.floor(totalInches / 12), inches: totalInches % 12 };
}

function imperial(m: number): string {
  const { feet, inches } = toFeetInches(m);
  const sign = m < 0 ? "-" : "";
  if (feet === 0) return `${sign}${inches} in`;
  return `${sign}${feet} ft ${inches} in`;
}

export function formatLength(m: number, unit: MeasurementUnit = "metric") {
  return unit === "imperial" ? imperial(m) : `${formatNumber(m)} m`;
}

export function formatHeight(m: number, unit: MeasurementUnit = "metric") {
  return unit === "imperial" ? imperial(m) : `${formatNumber(m)} m`;
}

/** A person's height in the unit the visitor chose: "1.75 m" or "5 ft 9 in". */
export function formatBodyHeight(cm: number, unit: MeasurementUnit = "metric") {
  return unit === "imperial" ? imperial(cm / 100) : `${formatNumber(cm / 100)} m`;
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
