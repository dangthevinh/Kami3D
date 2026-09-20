/**
 * What Kami3D is allowed to ship as an animal call.
 *
 * The rules are here, in a pure module, rather than inside the fetch script,
 * because they are the part that has to be *provably* right: a share-alike or
 * non-commercial recording inside an ad-supported site is a licensing problem, and
 * "the script looked like it checked" is not an answer. `npm run check:sounds`
 * pins every branch, and the fetch script imports the same functions.
 *
 * The policy is the one the 3D model pipeline already enforces for geometry:
 *
 *   CC0 / public domain   → accepted, no attribution required (but recorded anyway)
 *   CC BY (2.0 – 4.0)     → accepted, attribution required
 *   everything else       → refused, with the reason
 */

/** The two values the `sound_assets.license` column accepts. */
export type SoundLicense = "CC0" | "CC-BY";

export interface LicenseVerdict {
  ok: boolean;
  /** Normalised licence for the database, when accepted. */
  license?: SoundLicense;
  /** The label exactly as the provider wrote it. */
  label: string;
  /** True when the licence obliges us to credit somebody. */
  attributionRequired: boolean;
  reason?: string;
}

/**
 * Accepted labels, mapped to the database's two-value vocabulary.
 *
 * Public domain is folded into `CC0`: both mean "no conditions", and the column is
 * constrained to the two values the product cares about. The original label is
 * preserved in `sound_assets.attribution`, so nothing is lost.
 */
const ALLOWLIST: Record<string, { license: SoundLicense; attributionRequired: boolean }> = {
  // Freesound labels
  "Creative Commons 0": { license: "CC0", attributionRequired: false },
  "Creative Commons Attribution": { license: "CC-BY", attributionRequired: true },
  // Wikimedia Commons / generic labels
  CC0: { license: "CC0", attributionRequired: false },
  "CC0 1.0": { license: "CC0", attributionRequired: false },
  "Public domain": { license: "CC0", attributionRequired: false },
  "Public Domain": { license: "CC0", attributionRequired: false },
  "CC BY 2.0": { license: "CC-BY", attributionRequired: true },
  "CC BY 2.5": { license: "CC-BY", attributionRequired: true },
  "CC BY 3.0": { license: "CC-BY", attributionRequired: true },
  "CC BY 4.0": { license: "CC-BY", attributionRequired: true },
  "CC-BY-4.0": { license: "CC-BY", attributionRequired: true },
};

/** Matched by substring, after the exact labels above have been tried. */
const DENYLIST: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /non-?commercial|\bNC\b|\bBY-NC/i, reason: "non-commercial is incompatible with ad-supported pages" },
  { pattern: /share-?alike|\bSA\b|\bBY-SA/i, reason: "share-alike would impose obligations on the whole site" },
  { pattern: /no-?deriv|\bND\b|\bBY-ND/i, reason: "no-derivatives forbids the compression we apply" },
  { pattern: /all rights reserved|copyright|©|proprietary/i, reason: "all rights reserved" },
  { pattern: /sampling|\+\s*licen/i, reason: "sampling+ licences restrict reuse in other media" },
];

/**
 * Any CC BY version we have not listed explicitly is still attribution-only,
 * including the jurisdiction ports Wikimedia uses ("CC BY 2.0 fr", "CC BY 3.0 de").
 * The denylist above has already run, so an NC or SA variant can never reach here.
 */
const CC_BY_ANY = /^cc[ -]?by(?:[ -]?\d(?:\.\d)?)?(?:[ -][a-z]{2})?$/i;

export function evaluateSoundLicense(label: string | null | undefined): LicenseVerdict {
  const trimmed = (label ?? "")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!trimmed) return { ok: false, label: "", attributionRequired: false, reason: "no licence declared" };

  const exact = ALLOWLIST[trimmed];
  if (exact) return { ok: true, license: exact.license, label: trimmed, attributionRequired: exact.attributionRequired };

  // Refusals are checked before the permissive pattern, so "CC BY-NC 4.0" cannot
  // slip through as a plain attribution licence.
  for (const { pattern, reason } of DENYLIST) {
    if (pattern.test(trimmed)) return { ok: false, label: trimmed, attributionRequired: false, reason };
  }

  if (CC_BY_ANY.test(trimmed)) return { ok: true, license: "CC-BY", label: trimmed, attributionRequired: true };

  return { ok: false, label: trimmed, attributionRequired: false, reason: `unrecognised licence "${trimmed}" — refusing by default` };
}

/* -------------------------------------------------------------------------- */
/* Size and format                                                            */
/* -------------------------------------------------------------------------- */

/**
 * The size window, in bytes.
 *
 * Twelve kilobytes to nine hundred: the range real animal recordings live in. A
 * survey of Wikimedia Commons found calls between 12 kB (a 0.9 s chirp) and ~900 kB
 * (a 93 s humpback song); files above a megabyte in the same search were almost
 * always *spoken word* recordings — pronunciations and audiobooks — which are both
 * the wrong content and, at 2–6 MB each, fifty to a hundred and fifty megabytes of
 * them. `npm run sounds:report` prints what the window is rejecting.
 */
export const SOUND_SIZE = { minBytes: 12 * 1024, maxBytes: 900 * 1024 } as const;

export interface SizeVerdict {
  ok: boolean;
  reason?: string;
}

export function evaluateSoundSize(bytes: number, window: { minBytes: number; maxBytes: number } = SOUND_SIZE): SizeVerdict {
  if (!Number.isFinite(bytes) || bytes <= 0) return { ok: false, reason: "empty file" };
  if (bytes < window.minBytes) {
    return { ok: false, reason: `${Math.round(bytes / 1024)} kB is under the ${Math.round(window.minBytes / 1024)} kB floor` };
  }
  if (bytes > window.maxBytes) {
    return { ok: false, reason: `${Math.round(bytes / 1024)} kB is over the ${Math.round(window.maxBytes / 1024)} kB ceiling` };
  }
  return { ok: true };
}

/** Duration guard: a call is a few seconds to a couple of minutes, not an album. */
export const SOUND_DURATION = { minSeconds: 1, maxSeconds: 180 } as const;

/** A file extension for a MIME type we can actually serve to a browser. */
export function audioExtension(mime: string): string | null {
  switch ((mime ?? "").toLowerCase()) {
    case "audio/mpeg":
    case "audio/mp3":
      return ".mp3";
    case "audio/ogg":
    case "application/ogg":
      return ".ogg";
    case "audio/wav":
    case "audio/x-wav":
    case "audio/wave":
      return ".wav";
    case "audio/flac":
    case "audio/x-flac":
      return ".flac";
    case "audio/mp4":
    case "audio/m4a":
    case "audio/x-m4a":
      return ".m4a";
    case "audio/webm":
      return ".webm";
    default:
      return null;
  }
}

/**
 * The MIME type to send and store, normalised to what browsers and Supabase accept.
 *
 * Wikimedia reports `application/ogg` for an .ogg file, which the storage bucket
 * rejects (415) because the type it allows is `audio/ogg` — the same bytes under a
 * different label. Normalising here means the upload, the database row and the
 * `<audio>` element all agree.
 */
export function normaliseAudioMime(mime: string): string | null {
  const lower = (mime ?? "").toLowerCase().split(";")[0].trim();

  const aliases: Record<string, string> = {
    "application/ogg": "audio/ogg",
    "audio/vorbis": "audio/ogg",
    "audio/opus": "audio/ogg",
    "audio/x-wav": "audio/wav",
    "audio/wave": "audio/wav",
    "audio/mp3": "audio/mpeg",
    "audio/x-flac": "audio/flac",
    "audio/x-m4a": "audio/mp4",
    "audio/m4a": "audio/mp4",
  };

  if (aliases[lower]) return aliases[lower];
  return audioExtension(lower) ? lower : null;
}

/**
 * Does this look like the audio file its headers claim?
 *
 * Checked after the download, because a provider outage or a redirect to an error
 * page yields a perfectly sized file full of HTML — and that file would then be
 * uploaded, linked from a species page and played as silence.
 */
export function looksLikeAudio(bytes: Uint8Array): boolean {
  if (bytes.length < 12) return false;

  const startsWith = (signature: number[], offset = 0) =>
    signature.every((byte, index) => bytes[offset + index] === byte);

  // OggS
  if (startsWith([0x4f, 0x67, 0x67, 0x53])) return true;
  // RIFF....WAVE
  if (startsWith([0x52, 0x49, 0x46, 0x46]) && startsWith([0x57, 0x41, 0x56, 0x45], 8)) return true;
  // fLaC
  if (startsWith([0x66, 0x4c, 0x61, 0x43])) return true;
  // ID3-tagged MP3
  if (startsWith([0x49, 0x44, 0x33])) return true;
  // Bare MPEG frame sync (0xFF 0xEx/0xFx)
  if (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0) return true;
  // ISO base media (mp4/m4a): 'ftyp' at offset 4
  if (startsWith([0x66, 0x74, 0x79, 0x70], 4)) return true;

  return false;
}

/** `lion.ogg` — a slug, never the provider's file name. */
export function soundFileName(slug: string, extension: string): string {
  const safe = slug
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${safe || "sound"}${extension}`;
}
