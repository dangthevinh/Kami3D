import { cbzEntryName, mangaSlug } from "../manga-layout.ts";

/**
 * Phase 24 (Manga Studio): export, with no new dependency.
 *
 * A CBZ is a ZIP whose entries are the pages in reading order, so the whole job is one small ZIP
 * writer: **store only**, no compression. That is not a shortcut - a page is a ZIP-bomb-shaped PNG
 * or JPEG that is already compressed, so deflating it buys a fraction of a percent and costs a
 * dependency (`archiver`, `jszip`) or a Node stream this file must not depend on if it is to run in
 * the browser as well.
 *
 * The other two exports in the brief are deliberately *not* implemented here as encoders:
 *
 *   - **PDF** is the reader's print stylesheet (`PRINT_STYLESHEET` below) and the browser's own
 *     "Save as PDF". A hand-written PDF writer would be a thousand lines of font embedding to
 *     produce something worse than what the browser already does with `@page`.
 *   - **PNG** is per-panel canvas in the browser (`canvas.toBlob`), which needs no code here.
 *
 * So this module is pure: `Uint8Array` in, `Uint8Array` out, no DOM, no Node API, no `server-only`.
 * It is imported by the studio UI *and* by `scripts/check-manga-export.mjs`, which reads back the
 * archive this file wrote and checks the structure byte by byte.
 */

/** The bytes a ZIP reserves in front of every file: local header, central directory, end record. */
export const ZIP_LOCAL_HEADER_SIZE = 30;
export const ZIP_CENTRAL_HEADER_SIZE = 46;
export const ZIP_END_OF_CENTRAL_DIRECTORY_SIZE = 22;
/** The field is 16 bits wide, so this is the format's own limit, not a choice. */
export const ZIP_MAX_ENTRIES = 65_535;
/** And the size field is 32 bits wide; beyond this a ZIP64 record would be required. */
export const ZIP_MAX_ENTRY_BYTES = 0xffff_ffff;

export interface ZipEntryInput {
  /** The path inside the archive. Kept as given: CBZ entry order is the reading order. */
  name: string;
  bytes: Uint8Array;
  /** Modification time recorded in the entry. Defaults to the archive's date. */
  date?: Date;
}

export interface ZipStoreOptions {
  /** The date every entry gets when it does not carry its own. */
  date?: Date;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    table[index] = value >>> 0;
  }
  return table;
})();

/**
 * The CRC-32 the ZIP format requires (IEEE 802.3, polynomial 0xEDB88320).
 *
 * A wrong CRC is the failure mode that hurts: the archive opens, the file list looks right, and every
 * reader then reports "corrupt file" with no hint as to why. The check suite recomputes it over the
 * stored bytes and compares.
 */
export function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let index = 0; index < bytes.length; index += 1) {
    crc = CRC_TABLE[(crc ^ bytes[index]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/**
 * MS-DOS date and time, which is what a ZIP header stores.
 *
 * The format has no time zone and counts from 1980, so a date before then cannot be expressed and is
 * clamped rather than wrapped (a negative year wraps to a random future one, which is how an archive
 * ends up dated 2107).
 */
export function msDosDateTime(date: Date): { time: number; date: number } {
  const year = Math.max(1980, date.getFullYear());
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | (Math.floor(date.getSeconds() / 2) & 0x1f),
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  };
}

const encoder = new TextEncoder();

function asBytes(value: string | Uint8Array): Uint8Array {
  return typeof value === "string" ? encoder.encode(value) : value;
}

/**
 * Write entries as a ZIP with method 0 (stored).
 *
 * The layout is the one every reader implements: for each entry a local file header followed
 * immediately by the raw bytes, then the central directory, then the end-of-central-directory
 * record. Nothing here uses a data descriptor (the sizes are known before the header is written), so
 * the archive is readable by the simplest readers, including the ones that only look at the central
 * directory.
 */
export function zipStoreOnly(entries: ZipEntryInput[], options: ZipStoreOptions = {}): Uint8Array {
  if (entries.length > ZIP_MAX_ENTRIES) {
    throw new Error("a ZIP holds at most " + ZIP_MAX_ENTRIES + " entries, and this archive would have " + entries.length);
  }

  const archiveDate = options.date ?? new Date();
  const prepared = entries.map((entry) => {
    const name = asBytes(entry.name);
    const bytes = entry.bytes instanceof Uint8Array ? entry.bytes : new Uint8Array(entry.bytes);
    if (bytes.length > ZIP_MAX_ENTRY_BYTES) {
      throw new Error(entry.name + " is larger than the 4 GB a ZIP entry can address");
    }
    return { name, bytes, crc: crc32(bytes), stamp: msDosDateTime(entry.date ?? archiveDate) };
  });

  const localSize = prepared.reduce((total, entry) => total + ZIP_LOCAL_HEADER_SIZE + entry.name.length + entry.bytes.length, 0);
  const centralSize = prepared.reduce((total, entry) => total + ZIP_CENTRAL_HEADER_SIZE + entry.name.length, 0);
  const archive = new Uint8Array(localSize + centralSize + ZIP_END_OF_CENTRAL_DIRECTORY_SIZE);
  const view = new DataView(archive.buffer);
  // Bit 11 tells the reader the name is UTF-8. Set only when that is true of the name, because a
  // reader that honours the bit for an ASCII name still has to guess the encoding of everything else.
  const utf8Flag = (name: Uint8Array): number => (name.some((byte) => byte > 0x7f) ? 0x0800 : 0);

  let offset = 0;
  const centralOffsets: number[] = [];

  for (const entry of prepared) {
    centralOffsets.push(offset);
    const flags = utf8Flag(entry.name);

    view.setUint32(offset, 0x04034b50, true); // local file header signature
    view.setUint16(offset + 4, 20, true); // version needed to extract: 2.0
    view.setUint16(offset + 6, flags, true);
    view.setUint16(offset + 8, 0, true); // method 0: stored
    view.setUint16(offset + 10, entry.stamp.time, true);
    view.setUint16(offset + 12, entry.stamp.date, true);
    view.setUint32(offset + 14, entry.crc, true);
    view.setUint32(offset + 18, entry.bytes.length, true); // compressed size = stored size
    view.setUint32(offset + 22, entry.bytes.length, true);
    view.setUint16(offset + 26, entry.name.length, true);
    view.setUint16(offset + 28, 0, true); // no extra field
    offset += ZIP_LOCAL_HEADER_SIZE;

    archive.set(entry.name, offset);
    offset += entry.name.length;
    archive.set(entry.bytes, offset);
    offset += entry.bytes.length;
  }

  const centralStart = offset;
  prepared.forEach((entry, index) => {
    const flags = utf8Flag(entry.name);
    view.setUint32(offset, 0x02014b50, true); // central directory header signature
    view.setUint16(offset + 4, 20, true); // version made by
    view.setUint16(offset + 6, 20, true); // version needed
    view.setUint16(offset + 8, flags, true);
    view.setUint16(offset + 10, 0, true); // stored
    view.setUint16(offset + 12, entry.stamp.time, true);
    view.setUint16(offset + 14, entry.stamp.date, true);
    view.setUint32(offset + 16, entry.crc, true);
    view.setUint32(offset + 20, entry.bytes.length, true);
    view.setUint32(offset + 24, entry.bytes.length, true);
    view.setUint16(offset + 28, entry.name.length, true);
    view.setUint16(offset + 30, 0, true); // extra field length
    view.setUint16(offset + 32, 0, true); // comment length
    view.setUint16(offset + 34, 0, true); // disk number
    view.setUint16(offset + 36, 0, true); // internal attributes
    view.setUint32(offset + 38, 0, true); // external attributes
    view.setUint32(offset + 42, centralOffsets[index], true);
    offset += ZIP_CENTRAL_HEADER_SIZE;
    archive.set(entry.name, offset);
    offset += entry.name.length;
  });

  view.setUint32(offset, 0x06054b50, true); // end of central directory
  view.setUint16(offset + 4, 0, true); // this disk
  view.setUint16(offset + 6, 0, true); // disk with the central directory
  view.setUint16(offset + 8, prepared.length, true);
  view.setUint16(offset + 10, prepared.length, true);
  view.setUint32(offset + 12, centralSize, true);
  view.setUint32(offset + 16, centralStart, true);
  view.setUint16(offset + 20, 0, true); // no archive comment

  return archive;
}

export interface CbzPage {
  /** The page's number in the chapter, which is also its reading order. */
  pageNumber: number;
  /** The rendered page: a PNG or JPEG the browser produced from a canvas. */
  bytes: Uint8Array;
  /** Defaults to `png`. `cbzEntryName` pads it so a reader sorts it correctly. */
  extension?: string;
}

export interface CbzComicInfo {
  title?: string;
  series?: string;
  writer?: string;
  summary?: string;
  /** "Yes"/"No" fields comic readers show in their library. */
  webtoon?: boolean;
}

export interface CbzOptions extends ZipStoreOptions {
  /** Writes `ComicInfo.xml` as the first entry, which is where readers look for it. */
  comicInfo?: CbzComicInfo;
}

/** XML has five characters that cannot appear raw in text. */
function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
    // Control characters are not representable in XML 1.0 at all, so they are dropped rather than
    // escaped: an escaped control character is still an invalid document.
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "");
}

/** The metadata file comic readers read: title, series, author, page count. */
export function comicInfoXml(info: CbzComicInfo, pageCount: number): string {
  const lines = [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<ComicInfo xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">',
  ];
  const element = (name: string, value: string | undefined) => {
    if (value && value.trim().length > 0) lines.push("  <" + name + ">" + xmlEscape(value.trim()) + "</" + name + ">");
  };
  element("Title", info.title);
  element("Series", info.series);
  element("Writer", info.writer);
  element("Summary", info.summary);
  lines.push("  <PageCount>" + pageCount + "</PageCount>");
  // ComicInfo's <Manga> element says which way the pages are read. A webtoon scrolls, so it is not
  // right-to-left; a manga page is, and readers that honour this get the page-turn direction right.
  if (info.webtoon !== undefined) lines.push("  <Manga>" + (info.webtoon ? "No" : "YesAndRightToLeft") + "</Manga>");
  lines.push("</ComicInfo>");
  return lines.join("\n");
}

/**
 * A CBZ from rendered pages: the archive a comic reader opens.
 *
 * Pages are sorted by `pageNumber` and named with `cbzEntryName`, so the file-name order *is* the
 * reading order - that is the whole convention, and it is why the names are zero padded. Pages are
 * keyed by number rather than by position: a page deleted from the middle of a chapter leaves a hole
 * in the numbering (`nextPageNumber` fills it on the next insert), and renumbering the export to
 * close it would silently move a reader's bookmark.
 */
export function buildCbz(pages: CbzPage[], options: CbzOptions = {}): Uint8Array {
  const ordered = [...pages].sort((a, b) => a.pageNumber - b.pageNumber);

  const seen = new Set<string>();
  const entries: ZipEntryInput[] = ordered.map((page) => {
    const name = cbzEntryName(page.pageNumber, page.extension ?? "png");
    if (seen.has(name)) throw new Error("two pages are numbered " + page.pageNumber + ": " + name + " would be written twice");
    seen.add(name);
    return { name, bytes: page.bytes, date: options.date };
  });

  if (options.comicInfo) {
    entries.unshift({ name: "ComicInfo.xml", bytes: encoder.encode(comicInfoXml(options.comicInfo, ordered.length)), date: options.date });
  }

  return zipStoreOnly(entries, options);
}

/** What the browser should name the downloaded file. A title, a slug, and the date. */
export function exportFileName(title: string, extension: string, date = new Date()): string {
  const stamp = date.toISOString().slice(0, 10);
  const suffix = extension.startsWith(".") ? extension : "." + extension;
  return mangaSlug(title) + "-" + stamp + suffix;
}

/** A single panel's PNG, for "export this panel". Numbered the way the composer shows it. */
export function panelImageFileName(chapterNumber: number, orderIndex: number, extension = "png"): string {
  const chapter = String(Math.max(1, Math.round(chapterNumber))).padStart(2, "0");
  const panel = String(Math.max(0, Math.round(orderIndex)) + 1).padStart(3, "0");
  return "chapter-" + chapter + "-panel-" + panel + "." + extension;
}

/**
 * The PDF path: a print stylesheet, not an encoder.
 *
 * "Save as PDF" in any browser prints a page through this. What it has to get right is that the
 * controls and the chrome disappear, that a page break lands between manga pages rather than through
 * one, and that a background does not print as a black rectangle - so the elements the reader marks
 * with the two data attributes below are the whole contract between the reader and this export.
 */
export const PRINT_STYLESHEET = [
  "@media print {",
  "  @page { margin: 10mm; }",
  "  html, body { background: #ffffff !important; color: #000000 !important; }",
  '  [data-manga-print="hide"], nav, header, footer, aside, button { display: none !important; }',
  "  [data-manga-page] { break-after: page; page-break-after: always; }",
  "  [data-manga-page]:last-of-type { break-after: auto; page-break-after: auto; }",
  "  [data-manga-panel] { break-inside: avoid; page-break-inside: avoid; }",
  '  [data-manga-page] img, [data-manga-panel] img { max-width: 100%; height: auto; }',
  "  main, article, section { box-shadow: none !important; border: 0 !important; background: #ffffff !important; }",
  "}",
].join("\n");

/** The attributes the two rules above need to find. Spelled once so the reader cannot invent others. */
export const PRINT_ATTRIBUTES = { hide: "data-manga-print", page: "data-manga-page", panel: "data-manga-panel" } as const;
