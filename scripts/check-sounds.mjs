/**
 * Assertions for the sound licence policy.
 *
 * This is the file that decides whether Kami3D may redistribute somebody's
 * recording, so every branch is pinned: the exact labels the two providers emit,
 * the refusals (including the one that would otherwise slip through, "CC BY-NC"
 * looking like "CC BY"), the size window, and the header check that stops a
 * provider's error page from being uploaded as a bird call.
 *
 * Run with: npm run check:sounds
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import {
  SOUND_DURATION,
  SOUND_SIZE,
  audioExtension,
  evaluateSoundLicense,
  evaluateSoundSize,
  looksLikeAudio,
  normaliseAudioMime,
  soundFileName,
} from "../lib/sound-licenses.ts";

test("the licences we may ship are accepted", () => {
  const accepted = [
    ["Creative Commons 0", "CC0", false],
    ["CC0", "CC0", false],
    ["Public domain", "CC0", false],
    ["Creative Commons Attribution", "CC-BY", true],
    ["CC BY 2.0", "CC-BY", true],
    ["CC BY 2.5", "CC-BY", true],
    ["CC BY 3.0", "CC-BY", true],
    ["CC BY 4.0", "CC-BY", true],
  ];

  for (const [label, license, attributionRequired] of accepted) {
    const verdict = evaluateSoundLicense(label);
    assert.equal(verdict.ok, true, `${label} should be accepted`);
    assert.equal(verdict.license, license);
    assert.equal(verdict.attributionRequired, attributionRequired, `${label} attribution`);
  }
});

test("share-alike, non-commercial and no-derivatives are refused", () => {
  const refused = [
    "CC BY-SA 3.0",
    "CC BY-SA 4.0",
    "Creative Commons Attribution-ShareAlike",
    "CC BY-NC 4.0",
    "CC BY-NC-SA 3.0",
    "Creative Commons Attribution-NonCommercial",
    "CC BY-ND 4.0",
    "All rights reserved",
    "© 2019 Someone",
    "Standard",
  ];

  for (const label of refused) {
    const verdict = evaluateSoundLicense(label);
    assert.equal(verdict.ok, false, `${label} must be refused`);
    assert.ok(verdict.reason && verdict.reason.length > 0, `${label} needs a reason`);
  }
});

test("a non-commercial licence cannot pass as a plain attribution licence", () => {
  // The bug this guards: a loose /^cc[ -]?by/ test would accept "CC BY-NC 4.0".
  const verdict = evaluateSoundLicense("CC BY-NC 4.0");
  assert.equal(verdict.ok, false);
  assert.match(verdict.reason ?? "", /non-commercial/);

  const sa = evaluateSoundLicense("CC BY-SA 4.0");
  assert.equal(sa.ok, false);
  assert.match(sa.reason ?? "", /share-alike/);
});

test("unknown and missing licences are refused by default", () => {
  for (const label of ["", "   ", null, undefined, "Some Random Licence", "CC BY-4.0-EXTRA"]) {
    const verdict = evaluateSoundLicense(label);
    assert.equal(verdict.ok, false, `${String(label)} must not be accepted`);
  }
  assert.equal(evaluateSoundLicense("").reason, "no licence declared");
});

test("provider HTML in a licence field does not smuggle a licence through", () => {
  // Wikimedia's extmetadata wraps values in links.
  const verdict = evaluateSoundLicense('<a href="https://creativecommons.org/publicdomain/zero/1.0/">CC0</a>');
  assert.equal(verdict.ok, true);
  assert.equal(verdict.license, "CC0");
});

test("the size window is the range real recordings live in", () => {
  assert.equal(SOUND_SIZE.minBytes, 12 * 1024);
  assert.equal(SOUND_SIZE.maxBytes, 900 * 1024);

  assert.equal(evaluateSoundSize(157 * 1024).ok, true, "a 5.7 s raven call");
  assert.equal(evaluateSoundSize(518 * 1024).ok, true, "a 61 s humpback song");
  assert.equal(evaluateSoundSize(12 * 1024).ok, true, "the floor itself is included");
  assert.equal(evaluateSoundSize(900 * 1024).ok, true, "the ceiling itself is included");

  assert.match(evaluateSoundSize(900 * 1024 + 1).reason ?? "", /over the/);
  assert.match(evaluateSoundSize(11 * 1024).reason ?? "", /under the/);
  assert.equal(evaluateSoundSize(0).ok, false);
  assert.equal(evaluateSoundSize(Number.NaN).ok, false);
});

test("a custom window overrides the defaults", () => {
  const wide = { minBytes: 0, maxBytes: 6 * 1024 * 1024 };
  assert.equal(evaluateSoundSize(3 * 1024 * 1024, wide).ok, true);
  assert.equal(evaluateSoundSize(3 * 1024 * 1024).ok, false, "the default still refuses it");
});

test("durations are bounded like sizes", () => {
  assert.ok(SOUND_DURATION.maxSeconds <= 180, "a call is not an album");
  assert.ok(SOUND_DURATION.minSeconds >= 1, "a 0.2 s blip is not a call");
});

test("MIME types map to extensions a browser can play", () => {
  assert.equal(audioExtension("audio/mpeg"), ".mp3");
  assert.equal(audioExtension("audio/ogg"), ".ogg");
  assert.equal(audioExtension("application/ogg"), ".ogg");
  assert.equal(audioExtension("audio/wav"), ".wav");
  assert.equal(audioExtension("audio/flac"), ".flac");
  assert.equal(audioExtension("audio/mp4"), ".m4a");
  // Anything else is refused rather than guessed at.
  assert.equal(audioExtension("application/pdf"), null);
  assert.equal(audioExtension(""), null);
});

test("MIME aliases are normalised to what the bucket and the browser accept", () => {
  // Wikimedia says application/ogg for an .ogg file; the storage bucket allows
  // audio/ogg and rejects the alias with a 415.
  assert.equal(normaliseAudioMime("application/ogg"), "audio/ogg");
  assert.equal(normaliseAudioMime("application/ogg; charset=binary"), "audio/ogg");
  assert.equal(normaliseAudioMime("audio/x-wav"), "audio/wav");
  assert.equal(normaliseAudioMime("audio/mp3"), "audio/mpeg");
  assert.equal(normaliseAudioMime("audio/x-m4a"), "audio/mp4");
  assert.equal(normaliseAudioMime("audio/ogg"), "audio/ogg");
  assert.equal(normaliseAudioMime("application/pdf"), null);
  assert.equal(normaliseAudioMime(""), null);
});

test("a downloaded file has to look like audio", () => {
  const ogg = new Uint8Array([0x4f, 0x67, 0x67, 0x53, 0, 2, 0, 0, 0, 0, 0, 0]);
  const wav = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x41, 0x56, 0x45]);
  const flac = new Uint8Array([0x66, 0x4c, 0x61, 0x43, 0, 0, 0, 34, 0, 0, 0, 0]);
  const mp3 = new Uint8Array([0x49, 0x44, 0x33, 3, 0, 0, 0, 0, 0, 0, 0, 0]);
  const mp4 = new Uint8Array([0, 0, 0, 32, 0x66, 0x74, 0x79, 0x70, 0x4d, 0x34, 0x41, 0x20]);
  const html = new TextEncoder().encode("<!DOCTYPE html><html><body>404</body></html>");

  for (const [name, bytes] of [["ogg", ogg], ["wav", wav], ["flac", flac], ["mp3", mp3], ["mp4", mp4]]) {
    assert.equal(looksLikeAudio(bytes), true, `${name} should be recognised`);
  }
  assert.equal(looksLikeAudio(html), false, "an HTML error page is not audio");
  assert.equal(looksLikeAudio(new Uint8Array(4)), false, "too short to be anything");
});

test("stored files are named after the slug, never after the provider", () => {
  assert.equal(soundFileName("lion", ".ogg"), "lion.ogg");
  assert.equal(soundFileName("African Bush Elephant", ".mp3"), "african-bush-elephant.mp3");
  assert.equal(soundFileName("../../etc/passwd", ".wav"), "etc-passwd.wav");
  assert.equal(soundFileName("", ".ogg"), "sound.ogg");
});

/* -------------------------------------------------------------------------- */
/* The fetch pipeline's own rules                                             */
/* -------------------------------------------------------------------------- */

test("queries lead with the overrides but never drop the terms that worked", async () => {
  const { queriesFor } = await import("../scripts/fetch-sounds.mjs");
  const animal = { slug: "lion", name: "Lion", latin_name: "Panthera leo" };

  assert.deepEqual(queriesFor(animal, {}), ["Panthera leo", "Lion", "Lion sound"]);
  // A replacement list that matched nothing used to lose the species entirely.
  assert.deepEqual(queriesFor(animal, { lion: ["Lion roar"] }), ["Lion roar", "Panthera leo", "Lion", "Lion sound"]);
  assert.equal(queriesFor(animal, { lion: ["a", "b", "c", "d", "e"] }).length, 4, "capped, so one species cannot spam a provider");
});

test("a recording has to name the animal, in the title or by full binomial", async () => {
  const { matchAgainstSpecies } = await import("../scripts/fetch-sounds.mjs");
  const giraffe = { name: "Giraffe", latin_name: "Giraffa camelopardalis" };

  assert.equal(matchAgainstSpecies("Giraffe Hum.oga", "", giraffe).matched, true);
  assert.equal(matchAgainstSpecies("Giraffa camelopardalis call.ogg", "", giraffe).matched, true);
  assert.equal(matchAgainstSpecies("Recording", "Giraffa camelopardalis of Etosha", giraffe).matched, true);

  // The bug this guards: a crickets recording filed under a giraffe project was
  // accepted for the giraffe because the category mentioned the genus.
  const cricket = matchAgainstSpecies("Sndcrickets.wav", "Giraffa angolensis of Etosha National Park", giraffe);
  assert.equal(cricket.matched, false);

  const wolf = { name: "Gray Wolf", latin_name: "Canis lupus" };
  assert.equal(matchAgainstSpecies("Rallying.ogg", "Canis lupus", wolf).via, "category");
  assert.equal(matchAgainstSpecies("Rallying.ogg", "", wolf).matched, false);

  // A qualifier is the species, not decoration. Matching the head noun alone found
  // a *red* panda for the giant panda and a *little* penguin for the emperor, so a
  // bare "Wolf howl" is refused: better no call than the wrong animal's.
  assert.equal(matchAgainstSpecies("Wolf howl.ogg", "", wolf).matched, false);
  assert.equal(matchAgainstSpecies("Red panda twittering.ogg", "", { name: "Giant Panda", latin_name: "Ailuropoda melanoleuca" }).matched, false);
  assert.equal(
    matchAgainstSpecies("20091121 Little Penguin calls.ogg", "", { name: "Emperor Penguin", latin_name: "Aptenodytes forsteri" }).matched,
    false,
  );
});

test("ranking refuses what must not ship and prefers what should", async () => {
  const { rankCandidates } = await import("../scripts/fetch-sounds.mjs");
  const animal = { slug: "lion", name: "Lion", latin_name: "Panthera leo" };

  const base = {
    provider: "wikimedia",
    id: "1",
    licenseUrl: null,
    author: null,
    duration: 12,
    mime: "audio/ogg",
    downloadUrl: "https://example.test/lion.ogg",
    sourceUrl: "https://example.test/File:Lion.ogg",
    categories: "",
  };

  const { best, rejected } = rankCandidates(
    [
      { ...base, title: "Lion roar (CC BY-SA)", bytes: 80_000, licenseLabel: "CC BY-SA 4.0" },
      { ...base, title: "De-Lion pronunciation.ogg", bytes: 40_000, licenseLabel: "CC0" },
      { ...base, title: "Lion roar.ogg", bytes: 76_000, licenseLabel: "CC BY 4.0" },
      { ...base, title: "Lion roar (huge).ogg", bytes: 4_000_000, licenseLabel: "CC0" },
      { ...base, title: "Lion roar (tiny).ogg", bytes: 2_000, licenseLabel: "CC0" },
      { ...base, title: "Unrelated.ogg", bytes: 50_000, licenseLabel: "CC0" },
      { ...base, title: "Lion roar (pdf)", bytes: 80_000, licenseLabel: "CC0", mime: "application/pdf" },
      { ...base, title: "Lion roar (long).ogg", bytes: 80_000, licenseLabel: "CC0", duration: 900 },
    ],
    animal,
  );

  assert.equal(best.candidate.title, "Lion roar.ogg");
  assert.equal(best.licence.license, "CC-BY");
  assert.equal(rejected.length, 7, "everything else must be refused, with a reason");
  for (const item of rejected) assert.ok(item.reason && item.reason.length > 5, "every refusal carries a reason");

  const reasons = rejected.map((item) => item.reason).join(" | ");
  assert.match(reasons, /share-alike/);
  assert.match(reasons, /spoken-word/);
  assert.match(reasons, /over the/);
  assert.match(reasons, /under the/);
  assert.match(reasons, /never names this species/);
  assert.match(reasons, /unsupported format/);
  assert.match(reasons, /outside/);
});

test("nothing usable is an honest answer, not the least bad file", async () => {
  const { rankCandidates } = await import("../scripts/fetch-sounds.mjs");
  const animal = { slug: "woolly-mammoth", name: "Woolly Mammoth", latin_name: "Mammuthus primigenius" };
  const { best } = rankCandidates(
    [
      {
        provider: "wikimedia",
        id: "1",
        title: "Yellowstone sound library - Ruffed Grouse - 003.mp3",
        licenseLabel: "Public domain",
        licenseUrl: null,
        author: null,
        bytes: 420_000,
        duration: 30,
        mime: "audio/mpeg",
        downloadUrl: "https://example.test/grouse.mp3",
        sourceUrl: null,
        categories: "Yellowstone sound library",
      },
    ],
    animal,
  );
  assert.equal(best, null, "a grouse is not a mammoth");
});

test("a download is validated again after it arrives", async () => {
  const script = await import("../scripts/fetch-sounds.mjs");
  const candidate = { mime: "audio/ogg" };
  const ogg = new Uint8Array(20 * 1024);
  ogg.set([0x4f, 0x67, 0x67, 0x53]);

  assert.equal(script.validateDownload(ogg, candidate).ok, true);
  assert.equal(script.validateDownload(new TextEncoder().encode("<html>404</html>".repeat(1000)), candidate).ok, false);
  assert.equal(script.validateDownload(new Uint8Array(1024), candidate).ok, false, "too small");
  assert.equal(script.validateDownload(new Uint8Array(2 * 1024 * 1024), candidate).ok, false, "too large");
});

test("a placeholder token is not a token", async () => {
  const { freesoundToken } = await import("../scripts/fetch-sounds.mjs");
  const before = process.env.FREESOUND_API_KEY;

  process.env.FREESOUND_API_KEY = "abc";
  assert.equal(freesoundToken(), null, "a three-character placeholder would spend the run on 401s");

  process.env.FREESOUND_API_KEY = "x".repeat(32);
  assert.equal(freesoundToken(), "x".repeat(32));

  if (before === undefined) delete process.env.FREESOUND_API_KEY;
  else process.env.FREESOUND_API_KEY = before;
});

/* -------------------------------------------------------------------------- */
/* The catalogue                                                              */
/* -------------------------------------------------------------------------- */

test("every species that plays a call has a credit, a licence and a file", async () => {
  const { existsSync } = await import("node:fs");
  const { join, dirname } = await import("node:path");
  const { fileURLToPath } = await import("node:url");

  const { ANIMALS } = await import("../data/animals.ts");
  const { readFileSync } = await import("node:fs");

  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const manifest = JSON.parse(readFileSync(join(root, "data", "sound-attribution.json"), "utf8"));

  const wired = ANIMALS.filter((animal) => animal.sound_url);
  assert.ok(wired.length > 0, "at least one species should have a call wired up");

  for (const animal of wired) {
    const entry = manifest[animal.slug];
    assert.ok(entry, `${animal.slug} has a sound_url but no credit — CC BY would be violated`);
    assert.ok(["CC0", "CC-BY"].includes(entry.license), `${animal.slug}: licence ${entry.license}`);
    assert.ok(entry.sourceUrl, `${animal.slug}: a credit needs a source`);
    assert.ok(entry.license === "CC0" || entry.author, `${animal.slug}: CC BY without an author`);
    assert.equal(entry.file, animal.sound_url, `${animal.slug}: credit and dataset disagree about the file`);

    const file = join(root, "public", entry.file.replace(/^\//, ""));
    assert.ok(existsSync(file), `${animal.slug}: ${entry.file} is missing from public/`);
  }

  // And the reverse: a credit for a species that no longer plays anything is stale.
  for (const slug of Object.keys(manifest)) {
    assert.ok(wired.some((animal) => animal.slug === slug), `${slug} is credited but no longer wired`);
  }
});

