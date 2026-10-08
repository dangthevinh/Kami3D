/**
 * Phase 24 (Manga Studio): the export writer, the AI refusals, and the bytes of a CBZ.
 *
 *   node --test scripts/check-manga-export.mjs
 *
 * Why this file exists, separately from check-manga.mjs: that one pins the geometry and the SQL, and
 * this one pins two things that cannot be seen by reading the code.
 *
 *   - **The CBZ really is a ZIP.** A comic reader does not forgive a wrong CRC-32 or a central
 *     directory that disagrees with the local headers: it reports "corrupt file" and nothing else. So
 *     the reader below is written **independently** of the writer in lib/manga/export.ts - it parses
 *     the archive from the bytes, and the CRC is checked with node:zlib's own implementation rather
 *     than with the one the writer uses. A test that called the writer's own crc32() would agree with
 *     a wrong answer.
 *   - **The AI module refuses before it spends anything.** No key, an unknown provider and a missing
 *     model are three different refusals, and a 4xx from the provider must be an answer rather than a
 *     retry: the last test counts the fetches to prove it, because "we do not retry 4xx" is a claim
 *     about behaviour under a failure nobody usually sees.
 */

import assert from "node:assert/strict";
import { test } from "node:test";
import { crc32 as zlibCrc32 } from "node:zlib";

import {
  PRINT_ATTRIBUTES,
  PRINT_STYLESHEET,
  ZIP_END_OF_CENTRAL_DIRECTORY_SIZE,
  ZIP_MAX_ENTRIES,
  buildCbz,
  comicInfoXml,
  crc32,
  exportFileName,
  msDosDateTime,
  panelImageFileName,
  zipStoreOnly,
} from "../lib/manga/export.ts";
import { buildImageRequest, decodeBase64, extractImageSource, mangaAiStatus, readMangaAiConfig, requestPanelImage } from "../lib/manga/ai.ts";
import { MANGA_IMAGE_TYPES, imageDimensions, sniffImageType } from "../lib/manga/rules.ts";
import { cbzEntryName, mangaSlug } from "../lib/manga-layout.ts";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/** The bytes of a PNG with a real signature and a real IHDR, so both the sniffer and the parser bite. */
function pngBytes(width, height, payload = "panel") {
  const bytes = new Uint8Array(33 + payload.length);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  const view = new DataView(bytes.buffer);
  view.setUint32(8, 13, false); // IHDR chunk length
  bytes.set([0x49, 0x48, 0x44, 0x52], 12); // "IHDR"
  view.setUint32(16, width, false);
  view.setUint32(20, height, false);
  bytes.set(encoder.encode(payload), 33);
  return bytes;
}

/** A JPEG: SOI, then an APP0 segment to skip, then an SOF0 frame carrying the size. */
function jpegBytes(width, height) {
  const bytes = new Uint8Array(24);
  const view = new DataView(bytes.buffer);
  bytes.set([0xff, 0xd8], 0);
  bytes.set([0xff, 0xe0], 2);
  view.setUint16(4, 4, false); // APP0 length 4: two more bytes then the next marker
  bytes.set([0xff, 0xc0], 8);
  view.setUint16(10, 11, false); // SOF0 length
  bytes[12] = 8; // precision
  view.setUint16(13, height, false);
  view.setUint16(15, width, false);
  return bytes;
}

/**
 * A ZIP reader written from the format, not from the writer.
 *
 * It walks the central directory (which is what every real reader trusts), then checks each entry
 * against its own local header and hands back the stored bytes.
 */
function readZip(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  let eocd = -1;
  for (let at = bytes.length - ZIP_END_OF_CENTRAL_DIRECTORY_SIZE; at >= 0; at -= 1) {
    if (view.getUint32(at, true) === 0x06054b50) {
      eocd = at;
      break;
    }
  }
  assert.notEqual(eocd, -1, "no end-of-central-directory record: this is not a ZIP");

  const diskEntries = view.getUint16(eocd + 8, true);
  const totalEntries = view.getUint16(eocd + 10, true);
  const cdSize = view.getUint32(eocd + 12, true);
  const cdOffset = view.getUint32(eocd + 16, true);
  assert.equal(view.getUint16(eocd + 4, true), 0, "single disk archives say disk 0");
  assert.equal(view.getUint16(eocd + 20, true), 0, "no archive comment");
  assert.equal(diskEntries, totalEntries, "a split archive is not what this writer makes");
  assert.equal(cdOffset + cdSize, eocd, "the central directory must end exactly where the EOCD begins");

  const entries = [];
  let at = cdOffset;
  for (let index = 0; index < totalEntries; index += 1) {
    assert.equal(view.getUint32(at, true), 0x02014b50, "central directory header signature");
    const nameLength = view.getUint16(at + 28, true);
    const extraLength = view.getUint16(at + 30, true);
    const commentLength = view.getUint16(at + 32, true);
    const localOffset = view.getUint32(at + 42, true);

    const entry = {
      name: decoder.decode(bytes.subarray(at + 46, at + 46 + nameLength)),
      flags: view.getUint16(at + 8, true),
      method: view.getUint16(at + 10, true),
      time: view.getUint16(at + 12, true),
      date: view.getUint16(at + 14, true),
      crc: view.getUint32(at + 16, true),
      compressedSize: view.getUint32(at + 20, true),
      uncompressedSize: view.getUint32(at + 24, true),
      localOffset,
    };

    assert.equal(view.getUint32(localOffset, true), 0x04034b50, entry.name + ": local file header signature");
    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    assert.equal(
      decoder.decode(bytes.subarray(localOffset + 30, localOffset + 30 + localNameLength)),
      entry.name,
      "the local header and the central directory must name the same file",
    );
    assert.equal(view.getUint16(localOffset + 8, true), entry.method, entry.name + ": the two headers disagree on the method");
    assert.equal(view.getUint32(localOffset + 14, true), entry.crc, entry.name + ": the two headers disagree on the CRC");
    assert.equal(view.getUint32(localOffset + 18, true), entry.uncompressedSize, entry.name + ": the two headers disagree on the size");

    const start = localOffset + 30 + localNameLength + localExtraLength;
    entry.bytes = bytes.subarray(start, start + entry.compressedSize);
    entries.push(entry);

    at += 46 + nameLength + extraLength + commentLength;
  }

  return { entries, cdSize, cdOffset, eocd, totalEntries };
}

/** Every entry, checked the way a reader checks it: stored, no data descriptor, and the CRC matches. */
function assertReadableZip(bytes, expectedNames) {
  const archive = readZip(bytes);
  assert.deepEqual(
    archive.entries.map((entry) => entry.name),
    expectedNames,
    "the entries must be in the order they were written",
  );
  for (const entry of archive.entries) {
    assert.equal(entry.method, 0, entry.name + " is not stored");
    assert.equal(entry.flags & 0x0008, 0, entry.name + " uses a data descriptor, which simple readers do not follow");
    assert.equal(entry.compressedSize, entry.uncompressedSize, entry.name + " is stored, so both sizes are the same");
    assert.equal(entry.bytes.length, entry.uncompressedSize, entry.name + ": the stored bytes match the declared size");
    assert.equal(entry.crc >>> 0, zlibCrc32(Buffer.from(entry.bytes)) >>> 0, entry.name + ": wrong CRC-32");
    assert.equal(entry.crc >>> 0, crc32(entry.bytes) >>> 0, entry.name + ": node:zlib and the writer must agree");
  }
  return archive;
}

test("a stored ZIP reads back: entries, order, method, sizes and CRC-32", () => {
  const archive = zipStoreOnly([
    { name: "a.txt", bytes: encoder.encode("hello") },
    { name: "b/c.txt", bytes: encoder.encode("a longer body than the first one, so nothing is symmetric") },
  ]);

  const read = assertReadableZip(archive, ["a.txt", "b/c.txt"]);
  assert.equal(decoder.decode(read.entries[0].bytes), "hello");
  assert.ok(decoder.decode(read.entries[1].bytes).startsWith("a longer body"));
});

test("the CRC is the format's, not an approximation", () => {
  // The published CRC-32 of these strings, from the IEEE polynomial every ZIP tool uses.
  assert.equal(crc32(encoder.encode("")), 0);
  assert.equal(crc32(encoder.encode("hello")), 0x3610a686);
  assert.equal(crc32(encoder.encode("123456789")), 0xcbf43926);
  assert.equal(crc32(encoder.encode("hello")), zlibCrc32(Buffer.from("hello")));
});

test("an empty archive is still a valid archive", () => {
  const archive = zipStoreOnly([]);
  assert.equal(archive.length, ZIP_END_OF_CENTRAL_DIRECTORY_SIZE);
  const read = readZip(archive);
  assert.equal(read.entries.length, 0);
  assert.equal(read.cdSize, 0);
  assert.equal(read.cdOffset, ZIP_END_OF_CENTRAL_DIRECTORY_SIZE - ZIP_END_OF_CENTRAL_DIRECTORY_SIZE);
});

test("MS-DOS timestamps clamp before 1980 instead of wrapping", () => {
  const stamp = msDosDateTime(new Date(1970, 0, 1, 0, 0, 0));
  assert.equal(stamp.date >> 9, 0, "1980 is year zero in the format");
  const later = msDosDateTime(new Date(2026, 4, 17, 13, 45, 30));
  assert.equal((later.date >> 9) + 1980, 2026);
  assert.equal((later.date >> 5) & 0x0f, 5);
  assert.equal(later.date & 0x1f, 17);
  assert.equal(later.time >> 11, 13);
  assert.equal((later.time >> 5) & 0x3f, 45);
  assert.equal((later.time & 0x1f) * 2, 30, "seconds are stored in two-second steps");
});

test("a non-ASCII entry name sets the UTF-8 flag, and an ASCII one does not", () => {
  const archive = zipStoreOnly([
    { name: "plain.png", bytes: new Uint8Array([1]) },
    { name: "trang-1.png", bytes: new Uint8Array([2]) },
  ]);
  const read = readZip(archive);
  assert.equal(read.entries[0].flags & 0x0800, 0);
  assert.equal(read.entries[1].flags & 0x0800, 0);

  const nonAscii = readZip(zipStoreOnly([{ name: "trang-\u00e1.png", bytes: new Uint8Array([3]) }]));
  assert.equal(nonAscii.entries[0].flags & 0x0800, 0x0800, "a UTF-8 name must say so");
  assert.equal(nonAscii.entries[0].name, "trang-\u00e1.png");
});

test("a CBZ names its pages the way a comic reader sorts them", () => {
  const pages = [
    { pageNumber: 10, bytes: pngBytes(8, 8, "ten") },
    { pageNumber: 2, bytes: pngBytes(8, 8, "two") },
    { pageNumber: 1, bytes: pngBytes(8, 8, "one") },
  ];

  const archive = assertReadableZip(buildCbz(pages), [cbzEntryName(1), cbzEntryName(2), cbzEntryName(10)]);
  assert.deepEqual(
    archive.entries.map((entry) => entry.name),
    ["0001.png", "0002.png", "0010.png"],
    "the file-name order is the reading order, which is what the zero padding is for",
  );
  assert.equal(decoder.decode(archive.entries[0].bytes.subarray(33)), "one", "pages are sorted, not left as sent");
  assert.ok(cbzEntryName(2) < cbzEntryName(10));
});

test("a CBZ carries ComicInfo.xml first when it is asked for", () => {
  const archive = assertReadableZip(
    buildCbz([{ pageNumber: 1, bytes: pngBytes(4, 4) }, { pageNumber: 2, bytes: pngBytes(4, 4) }], {
      comicInfo: { title: "Night & Day", series: "Kitsune", writer: "A. Author", webtoon: false },
      date: new Date(2026, 4, 17, 13, 45, 30),
    }),
    ["ComicInfo.xml", "0001.png", "0002.png"],
  );

  const xml = decoder.decode(archive.entries[0].bytes);
  assert.ok(xml.startsWith('<?xml version="1.0" encoding="utf-8"?>'), "a reader expects the declaration first");
  assert.ok(xml.includes("<PageCount>2</PageCount>"), "the page count excludes ComicInfo.xml itself");
  assert.ok(xml.includes("<Title>Night &amp; Day</Title>"), "ampersands must be escaped or the file is not XML");
  assert.ok(xml.includes("<Manga>YesAndRightToLeft</Manga>"), "a print manga reads right to left");
  assert.ok(comicInfoXml({ webtoon: true }, 1).includes("<Manga>No</Manga>"), "a webtoon scrolls, so it is not right-to-left");
  assert.ok(!comicInfoXml({}, 1).includes("<Manga>"), "nothing is claimed about the reading direction when nobody said");
});

test("ComicInfo.xml drops characters XML cannot represent at all", () => {
  const xml = comicInfoXml({ title: "a\u0000b", summary: "<script>" }, 1);
  assert.ok(!xml.includes("a\u0000b"), "a NUL cannot be escaped into validity, so it is removed");
  assert.ok(xml.includes("&lt;script&gt;"));
});

test("two pages with the same number are refused, not written twice", () => {
  assert.throws(
    () => buildCbz([{ pageNumber: 3, bytes: pngBytes(2, 2) }, { pageNumber: 3, bytes: pngBytes(2, 2) }]),
    /numbered 3/,
  );
});

test("an empty CBZ is a valid archive rather than an exception", () => {
  assertReadableZip(buildCbz([]), []);
  assert.equal(readZip(buildCbz([])).totalEntries, 0);
});

test("the writer refuses more entries than the format can address", () => {
  const entries = new Array(ZIP_MAX_ENTRIES + 1).fill({ name: "x", bytes: new Uint8Array(0) });
  assert.throws(() => zipStoreOnly(entries), /at most/);
});

test("export file names use the shared slug and the padded panel number", () => {
  assert.equal(exportFileName("  Night of the Kitsune!! ", "cbz", new Date(Date.UTC(2026, 4, 17))), mangaSlug("Night of the Kitsune!!") + "-2026-05-17.cbz");
  assert.equal(exportFileName("x", ".zip", new Date(Date.UTC(2026, 0, 2))), "x-2026-01-02.zip", "the dot is not doubled");
  assert.equal(panelImageFileName(3, 0), "chapter-03-panel-001.png");
  assert.equal(panelImageFileName(12, 9, "jpg"), "chapter-12-panel-010.jpg");
});

test("the PDF path is a print stylesheet the reader can point at", () => {
  assert.ok(PRINT_STYLESHEET.includes("@media print"));
  assert.ok(PRINT_STYLESHEET.includes("@page"), "without @page the browser adds its own header and footer");
  for (const attribute of Object.values(PRINT_ATTRIBUTES)) {
    assert.ok(PRINT_STYLESHEET.includes(attribute), attribute + " is in the reader but not in the stylesheet");
  }
  assert.ok(PRINT_STYLESHEET.includes("break-after: page"), "a manga page must not be split across two sheets");
  assert.ok(PRINT_STYLESHEET.includes("background: #ffffff"), "a dark theme would print as a black rectangle");
});

test("the AI module refuses without a key, and says which variable is missing", () => {
  const empty = readMangaAiConfig({});
  assert.equal(empty.configured, false);
  assert.ok(empty.reason.includes("MANGA_AI_PROVIDER"));

  const typo = readMangaAiConfig({ MANGA_AI_PROVIDER: "opnai", MANGA_AI_API_KEY: "k", MANGA_AI_MODEL: "m" });
  assert.equal(typo.configured, false);
  assert.ok(typo.reason.includes("opnai"), "the sentence repeats what was set, so a typo is visible");

  const noKey = readMangaAiConfig({ MANGA_AI_PROVIDER: "openai", MANGA_AI_MODEL: "gpt-image-1" });
  assert.equal(noKey.configured, false);
  assert.equal(noKey.apiKey, null, "the key is never handed back when it is absent");
  assert.ok(noKey.reason.includes("MANGA_AI_API_KEY"));

  const noModel = readMangaAiConfig({ MANGA_AI_PROVIDER: "openai", MANGA_AI_API_KEY: "k" });
  assert.equal(noModel.configured, false);
  assert.ok(noModel.reason.includes("MANGA_AI_MODEL"), "a model name is never guessed");

  const status = mangaAiStatus(empty);
  assert.equal(status.configured, false);
  assert.equal(status.provider, null);
  assert.equal(status.reason, empty.reason);
  assert.equal(JSON.stringify(status).includes("MANGA_AI_API_KEY\""), false, "the status never carries the key");
});

test("a configured provider builds the request its API documents", () => {
  const openai = readMangaAiConfig({ MANGA_AI_PROVIDER: "openai", MANGA_AI_API_KEY: "sk-test", MANGA_AI_MODEL: "gpt-image-1" });
  assert.equal(openai.configured, true);
  const openaiRequest = buildImageRequest(openai, "a fox at night");
  assert.equal(openaiRequest.url, "https://api.openai.com/v1/images/generations");
  assert.equal(openaiRequest.init.headers.authorization, "Bearer sk-test");
  const body = JSON.parse(String(openaiRequest.init.body));
  assert.equal(body.model, "gpt-image-1");
  assert.equal(body.prompt, "a fox at night");
  assert.equal(body.response_format, undefined, "the newest image models reject response_format");

  const stability = readMangaAiConfig({ MANGA_AI_PROVIDER: "stability", MANGA_AI_API_KEY: "sk-s", MANGA_AI_MODEL: "core" });
  const stabilityRequest = buildImageRequest(stability, "a fox");
  assert.equal(stabilityRequest.url, "https://api.stability.ai/v2beta/stable-image/generate/core");
  assert.ok(stabilityRequest.init.body instanceof FormData);
  assert.equal(stabilityRequest.init.body.get("prompt"), "a fox");
  assert.equal(stabilityRequest.init.headers.accept, "image/*");

  const badModel = readMangaAiConfig({ MANGA_AI_PROVIDER: "stability", MANGA_AI_API_KEY: "sk-s", MANGA_AI_MODEL: "../../etc" });
  assert.equal(badModel.configured, false, "a model name is a path segment and must not be able to escape it");

  const replicate = readMangaAiConfig({ MANGA_AI_PROVIDER: "replicate", MANGA_AI_API_KEY: "r8", MANGA_AI_MODEL: "black-forest-labs/flux-schnell" });
  const replicateRequest = buildImageRequest(replicate, "a fox");
  assert.equal(replicateRequest.url, "https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions");
  assert.equal(replicateRequest.init.headers.prefer, "wait=60", "the route is synchronous, so it asks for the result rather than polling");
  assert.deepEqual(JSON.parse(String(replicateRequest.init.body)), { input: { prompt: "a fox" } });

  const notOwned = readMangaAiConfig({ MANGA_AI_PROVIDER: "replicate", MANGA_AI_API_KEY: "r8", MANGA_AI_MODEL: "flux-schnell" });
  assert.equal(notOwned.configured, false, "Replicate names a model as owner/name");
});

test("reading a provider's JSON answer", () => {
  assert.deepEqual(extractImageSource({ data: [{ b64_json: "AAAA" }] }), { kind: "base64", value: "AAAA" });
  assert.deepEqual(extractImageSource({ data: [{ url: "https://example.test/a.png" }] }), { kind: "url", value: "https://example.test/a.png" });
  assert.deepEqual(extractImageSource({ output: ["https://example.test/b.png"] }), { kind: "url", value: "https://example.test/b.png" });
  assert.equal(extractImageSource({ status: "processing" }), null, "a prediction that has not finished is not an image");
  assert.throws(() => extractImageSource({ error: "NSFW content detected" }), /NSFW/, "the provider's own reason is passed on");
  assert.deepEqual(decodeBase64("aGVsbG8="), encoder.encode("hello"));
  assert.deepEqual(decodeBase64("data:image/png;base64,aGVsbG8="), encoder.encode("hello"));
  assert.throws(() => decodeBase64("not base64 at all !!"), /base64/);
});

test("a 4xx from the provider is an answer: it is never retried", async () => {
  const config = readMangaAiConfig({ MANGA_AI_PROVIDER: "openai", MANGA_AI_API_KEY: "sk-test", MANGA_AI_MODEL: "gpt-image-1" });
  const realFetch = globalThis.fetch;
  const retry = { attempts: 4, baseDelayMs: 1, sleep: async () => {} };

  try {
    let calls = 0;
    globalThis.fetch = async () => {
      calls += 1;
      return new Response("invalid api key", { status: 401 });
    };
    await assert.rejects(() => requestPanelImage(config, "a fox", { retry }), /401.*invalid api key/s);
    assert.equal(calls, 1, "a rejected key is not worth asking again");

    calls = 0;
    globalThis.fetch = async () => {
      calls += 1;
      return new Response("nope", { status: 429 });
    };
    await assert.rejects(() => requestPanelImage(config, "a fox", { retry }));
    assert.equal(calls, 4, "429 is transient, so lib/net-retry.ts retries the whole budget");

    calls = 0;
    globalThis.fetch = async () => {
      calls += 1;
      return new Response("upstream exploded", { status: 503 });
    };
    await assert.rejects(() => requestPanelImage(config, "a fox", { retry }));
    assert.equal(calls, 4, "5xx is transient too: the difference from 4xx is the whole point");
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("a successful generation is turned into image bytes, and a non-image is refused", async () => {
  const config = readMangaAiConfig({ MANGA_AI_PROVIDER: "openai", MANGA_AI_API_KEY: "sk-test", MANGA_AI_MODEL: "gpt-image-1" });
  const realFetch = globalThis.fetch;
  const png = pngBytes(64, 32, "image body");

  try {
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ data: [{ b64_json: Buffer.from(png).toString("base64") }] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    const generated = await requestPanelImage(config, "a fox");
    assert.equal(generated.contentType, "image/png", "the type comes from the bytes, not from a header");
    assert.deepEqual([...generated.bytes.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    assert.deepEqual(imageDimensions(generated.bytes), { width: 64, height: 32 });

    globalThis.fetch = async () => new Response(JSON.stringify({ data: [{ b64_json: Buffer.from("not an image").toString("base64") }] }), { status: 200 });
    await assert.rejects(() => requestPanelImage(config, "a fox"), /PNG, JPEG, WebP or AVIF/);

    // A URL answer means a second request: the prediction, then the image it points at.
    let downloads = 0;
    globalThis.fetch = async (url) => {
      if (String(url).includes("replicate.com")) {
        return new Response(JSON.stringify({ status: "succeeded", output: "https://example.test/panel.png" }), { status: 200 });
      }
      downloads += 1;
      return new Response(pngBytes(16, 16), { status: 200, headers: { "content-type": "image/png" } });
    };
    const drawn = await requestPanelImage(
      readMangaAiConfig({ MANGA_AI_PROVIDER: "replicate", MANGA_AI_API_KEY: "r8", MANGA_AI_MODEL: "owner/model" }),
      "a fox",
    );
    assert.equal(downloads, 1, "the image URL is fetched exactly once");
    assert.equal(drawn.contentType, "image/png");
    assert.deepEqual(imageDimensions(drawn.bytes), { width: 16, height: 16 });
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("an image larger than the bucket allows is cut off before it is read", async () => {
  const config = readMangaAiConfig({ MANGA_AI_PROVIDER: "replicate", MANGA_AI_API_KEY: "r8", MANGA_AI_MODEL: "owner/model" });
  const realFetch = globalThis.fetch;

  try {
    globalThis.fetch = async (url) => {
      if (String(url).includes("replicate.com")) {
        return new Response(JSON.stringify({ output: "https://example.test/huge.png" }), { status: 200 });
      }
      return new Response(pngBytes(4, 4), { status: 200, headers: { "content-length": String(9 * 1024 * 1024) } });
    };
    await assert.rejects(() => requestPanelImage(config, "a fox"), /larger than the 8 MB/);
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("image bytes are recognised, and their size read, from the header alone", () => {
  for (const type of MANGA_IMAGE_TYPES) assert.equal(typeof type, "string");
  assert.equal(sniffImageType(pngBytes(1, 1)), "image/png");
  assert.equal(sniffImageType(jpegBytes(1, 1)), "image/jpeg");
  assert.equal(sniffImageType(encoder.encode("RIFF....WEBPVP8 ")), "image/webp");
  assert.equal(sniffImageType(new Uint8Array([0, 0, 0, 32, 0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66])), "image/avif");
  assert.equal(sniffImageType(encoder.encode("<svg>not a raster image</svg>")), null, "an SVG is not on the bucket's list");
  assert.equal(sniffImageType(encoder.encode("plain text")), null);

  assert.deepEqual(imageDimensions(pngBytes(1200, 630)), { width: 1200, height: 630 });
  assert.deepEqual(imageDimensions(jpegBytes(800, 600)), { width: 800, height: 600 });
  assert.equal(imageDimensions(encoder.encode("RIFF....WEBPVP8 ")), null, "an unparsed format is null, never a guess");
});
