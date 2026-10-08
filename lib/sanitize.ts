/**
 * Input hygiene, in one pure module.
 *
 * What this is for, stated exactly, because a sanitizer that overstates itself is worse than none:
 *
 *   - **React escapes text.** Every field below is rendered as a text node, so `<script>` in a manga
 *     title is *displayed*, not executed. This module therefore does **not** try to "make input safe
 *     for HTML" — that job belongs to the renderer, and a second implementation of it here would be a
 *     rule nobody can check.
 *   - **What it does instead is bound and normalise.** Control characters (NUL, C0/C1, the bidi
 *     overrides) survive JSON, break logs, and are invisible in a UI; they are dropped here. Length is
 *     capped before a value reaches a column, a filename or a log line. And `<control>\n</control>` is
 *     not stored, so every consumer sees one shape.
 *   - **It is pure, so it can be tested without a server.** `npm run check:security` drives it.
 *
 * The one place where markup matters is a sink that does **not** escape — and this project has exactly
 * two `dangerouslySetInnerHTML` calls, both fed by serializers rather than by user text
 * (`components/seo/JsonLd.tsx` escapes `<`, `>` and `&`; `components/brand/KamiLogo.tsx` renders a
 * string generated from constants). `looksLikeMarkup` exists so a *new* sink of that kind has a check
 * to call, and `check:security` pins the list of sinks so adding a third one is a deliberate act.
 */

/** Characters JavaScript treats as line/paragraph separators, which JSON may carry through. */
const LINE_SEPARATORS = /[\u2028\u2029]/g;

/**
 * Control characters that carry no meaning in a text field.
 *
 * Tab and newline are kept: a manga script is typed with both, and dropping them would silently reflow
 * an author's work. Everything else in C0/C1 is removed, including NUL (which truncates a C string and
 * a Postgres `text` alike) and DEL.
 */
const CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/g;

/** Bidi overrides and zero-width characters: invisible, and used to disguise a value. */
const INVISIBLE = /[\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g;

/**
 * Drop the characters a text field must never carry, and normalise the line endings.
 *
 * `multiline: false` also collapses every run of whitespace to one space, because a single-line field
 * (a title, a genre, a plan name) has no use for a newline and a stray one breaks a log line.
 */
export function stripControl(value: string, { multiline = true }: { multiline?: boolean } = {}): string {
  const withoutInvisible = value.replace(CONTROL, "").replace(INVISIBLE, "");
  const normalised = withoutInvisible.replace(/\r\n?/g, "\n").replace(LINE_SEPARATORS, "\n");
  return multiline ? normalised : normalised.replace(/\s+/g, " ");
}

export interface CleanTextOptions {
  /** The ceiling. A longer value is refused, never truncated: silently shortening somebody's words is
   * its own bug, and the caller can say why. */
  max: number;
  /** Default true. False collapses whitespace and permits no newline. */
  multiline?: boolean;
}

/**
 * A stored string, or null when the value is unusable.
 *
 * Null rather than a throw, matching `lib/manga/rules.ts`: every caller already answers a null with a
 * 400 that names the field, and a throw would turn a bad form into a 500.
 */
export function cleanText(value: unknown, { max, multiline = true }: CleanTextOptions): string | null {
  if (typeof value !== "string") return null;

  const cleaned = stripControl(value, { multiline }).trim();
  if (cleaned.length === 0) return null;
  if (cleaned.length > max) return null;
  return cleaned;
}

/** `cleanText` for a value that may legitimately be absent: absent stays absent, empty becomes null. */
export function cleanOptionalText(value: unknown, options: CleanTextOptions): string | null {
  if (value === undefined || value === null) return null;
  return cleanText(value, options);
}

/**
 * Does this text contain something a browser would read as markup?
 *
 * Deliberately narrow: a `<` followed by a letter, `/` or `!` is a tag, and the two URL schemes below
 * execute in every browser that still honours them. A lone `<` ("5 < 6") is not markup and is not
 * reported as one — a check that cries wolf gets turned off.
 */
export function looksLikeMarkup(value: string): boolean {
  if (/<\s*[a-z!/]/i.test(value)) return true;
  if (/<\/\s*[a-z]/i.test(value)) return true;
  if (/javascript\s*:/i.test(value)) return true;
  if (/data\s*:\s*text\/html/i.test(value)) return true;
  return false;
}

/**
 * The prefix of an address that is kept in a security log.
 *
 * A raw client address is personal data and a log line is the easiest place to leak it. `/24` for IPv4
 * and `/48` for IPv6 keeps "the same network did this four times" while dropping the host, which is
 * what a rate-limit investigation actually needs. Anything unrecognised becomes null rather than a
 * guess.
 */
export function anonymiseAddress(value: string | null | undefined): string | null {
  if (!value) return null;
  const address = value.trim().replace(/^\[|\]$/g, "");
  if (address.length === 0) return null;

  if (address.includes(":")) return ipv6Prefix(address);

  const parts = address.split(".");
  if (parts.length !== 4) return null;
  if (parts.some((part) => !/^\d{1,3}$/.test(part) || Number(part) > 255)) return null;
  // Leading zeros are stripped, so "203.000.113.42" and "203.0.113.42" land on the same string and a
  // log line can be compared, counted and grouped without a second normalisation step.
  return parts.slice(0, 3).map((part) => String(Number(part))).join(".") + ".0/24";
}

/**
 * The first three hextets, written canonically.
 *
 * The first version of this function split on ":" and took the first three non-empty groups, which
 * turned the loopback address `::1` into `1::/48` - a string that means something else entirely. The
 * compressed form therefore has to be read rather than split: `::` is expanded for the purpose of
 * counting, and every hextet is padded to four digits so two spellings of one network compare equal.
 */
function ipv6Prefix(address: string): string | null {
  const bare = address.split("%")[0] ?? "";
  const halves = bare.split("::");
  if (halves.length > 2) return null;

  const head = (halves[0] ?? "").split(":").filter((group) => group.length > 0);
  const tail = halves.length === 2 ? (halves[1] ?? "").split(":").filter((group) => group.length > 0) : [];
  const groups = [...head, ...tail];

  if (groups.length === 0 || groups.length > 8) return null;
  if (groups.some((group) => !/^[0-9a-f]{1,4}$/i.test(group))) return null;

  // The compressed groups are in the **middle**, so they have to be filled in before the first three
  // hextets mean anything: the first three of `::1` are zeros, not `1`. Getting this wrong is how the
  // first version of this function turned the loopback address into "1::/48".
  const missing = 8 - groups.length;
  const full = [...head, ...Array(missing).fill("0"), ...tail];

  return full
    .slice(0, 3)
    .map((group) => group.toLowerCase().padStart(4, "0"))
    .join(":") + "::/48";
}
