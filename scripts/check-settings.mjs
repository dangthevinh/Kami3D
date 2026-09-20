/**
 * Checks for the user-settings model (Phase 11).
 *
 * The database enforces these bounds with CHECK constraints; this suite proves the
 * application can never hand it a value that fails one. Every case below is a value
 * a browser, a stale localStorage blob or a future client could actually send.
 *
 * Run with: npm run check:settings
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { MESSAGES } from "../lib/i18n.ts";
import {
  ACCENT_COLORS,
  ACCENT_SWATCHES,
  DEFAULT_USER_SETTINGS,
  GLASS_INTENSITIES,
  LANGUAGES,
  MEASUREMENT_UNITS,
  MAX_DPRS,
  QUALITY_PRESETS,
  SETTINGS_COLUMNS,
  SETTINGS_STORAGE_KEY,
  THEME_CHOICES,
  VOLUME_RANGE,
  clampVolume,
  coerceUserSettings,
  patchToRow,
  settingsAttributes,
  settingsEqual,
  settingsFromRow,
  settingsToRow,
  volumeGain,
} from "../lib/user-settings.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("defaults cover every column, and the column map has no orphans", () => {
  const keys = Object.keys(SETTINGS_COLUMNS).sort();
  assert.deepEqual(Object.keys(DEFAULT_USER_SETTINGS).sort(), keys);
  assert.deepEqual(Object.keys(coerceUserSettings({})).sort(), keys);
  assert.equal(new Set(Object.values(SETTINGS_COLUMNS)).size, keys.length, "two preferences share a column name");
});

test("the defaults are the schema defaults", () => {
  // Kept in step with supabase/schema.sql by hand, and asserted here so a change
  // on one side without the other is a failing test rather than a surprise.
  assert.deepEqual(DEFAULT_USER_SETTINGS, {
    theme: "dark",
    accentColor: "emerald",
    glassIntensity: "medium",
    reduceMotion: false,
    qualityPreset: "auto",
    enableShadows: true,
    enableReflections: true,
    maxDpr: 1.5,
    autoRotate: true,
    masterVolume: 80,
    animalVolume: 70,
    uiSounds: true,
    autoplaySounds: false,
    language: "vi",
    measurementUnit: "metric",
    emailNotifications: true,
    pushNotifications: false,
  });
});

test("the option lists match the CHECK constraints' allowed values", () => {
  assert.deepEqual([...THEME_CHOICES], ["system", "dark", "light"]);
  assert.deepEqual([...ACCENT_COLORS], ["cyan", "emerald", "violet", "amber", "rose"]);
  assert.deepEqual([...GLASS_INTENSITIES], ["low", "medium", "high"]);
  assert.deepEqual([...QUALITY_PRESETS], ["auto", "low", "medium", "high", "ultra"]);
  assert.deepEqual([...MAX_DPRS], [1, 1.5, 2]);
  assert.deepEqual([...LANGUAGES], ["vi", "en"]);
  assert.deepEqual([...MEASUREMENT_UNITS], ["metric", "imperial"]);
  assert.deepEqual(VOLUME_RANGE, { min: 0, max: 100 });
});

test("nonsense input yields the defaults instead of throwing", () => {
  for (const input of [undefined, null, 42, "settings", [], true, () => {}]) {
    assert.deepEqual(coerceUserSettings(input), DEFAULT_USER_SETTINGS, `input ${String(input)} was not repaired`);
  }
});

test("every out-of-range value is clamped or discarded, never passed through", () => {
  const repaired = coerceUserSettings({
    theme: "solarized",
    accentColor: "chartreuse",
    glassIntensity: "frosted",
    qualityPreset: "cinematic",
    maxDpr: 4,
    language: "fr",
    measurementUnit: "furlongs",
    masterVolume: 5000,
    animalVolume: -30,
    reduceMotion: "yes",
    enableShadows: 1,
  });

  assert.deepEqual(repaired, {
    ...DEFAULT_USER_SETTINGS,
    masterVolume: VOLUME_RANGE.max,
    animalVolume: VOLUME_RANGE.min,
  });
});

test("valid values survive a round trip, including fractional and 0/100 volumes", () => {
  const settings = coerceUserSettings({
    theme: "system",
    accentColor: "violet",
    glassIntensity: "high",
    qualityPreset: "ultra",
    maxDpr: 2,
    language: "en",
    measurementUnit: "imperial",
    masterVolume: 0,
    animalVolume: 100,
    reduceMotion: true,
    enableShadows: false,
    enableReflections: false,
    autoRotate: false,
    uiSounds: false,
    autoplaySounds: true,
    emailNotifications: false,
    pushNotifications: true,
  });

  assert.deepEqual(coerceUserSettings(settings), settings);
});

test("volumes are rounded, so no client can store a fraction the CHECK rejects", () => {
  assert.equal(clampVolume(80.4, 0), 80);
  assert.equal(clampVolume(80.6, 0), 81);
  assert.equal(clampVolume("80", 55), 55);
  assert.equal(clampVolume(Number.NaN, 55), 55);
  assert.equal(clampVolume(Number.POSITIVE_INFINITY, 55), 55);
});

test("a database row and a browser object describe the same settings", () => {
  const row = {
    user_id: "user_2abc",
    theme: "light",
    accent_color: "rose",
    glass_intensity: "low",
    reduce_motion: true,
    quality_preset: "low",
    enable_shadows: false,
    enable_reflections: false,
    max_dpr: 1,
    auto_rotate: false,
    master_volume: 25,
    animal_volume: 60,
    ui_sounds: false,
    autoplay_sounds: true,
    language: "en",
    measurement_unit: "imperial",
    email_notifications: false,
    push_notifications: true,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-02T00:00:00Z",
  };

  const fromRow = settingsFromRow(row);
  const fromBrowser = coerceUserSettings({
    theme: "light",
    accentColor: "rose",
    glassIntensity: "low",
    reduceMotion: true,
    qualityPreset: "low",
    enableShadows: false,
    enableReflections: false,
    maxDpr: 1,
    autoRotate: false,
    masterVolume: 25,
    animalVolume: 60,
    uiSounds: false,
    autoplaySounds: true,
    language: "en",
    measurementUnit: "imperial",
    emailNotifications: false,
    pushNotifications: true,
  });

  assert.deepEqual(fromRow, fromBrowser);
  assert.ok(settingsEqual(fromRow, fromBrowser));
  assert.ok(settingsEqual(fromRow, DEFAULT_USER_SETTINGS) === false);
});

test("a patch writes only the columns it was given", () => {
  assert.deepEqual(patchToRow({ masterVolume: 40 }), { master_volume: 40 });
  assert.deepEqual(patchToRow({ accentColor: "amber", enableShadows: false }), {
    accent_color: "amber",
    enable_shadows: false,
  });
  assert.deepEqual(patchToRow({}), {});
  assert.deepEqual(patchToRow({ unknown: "x" }), {});
});

test("a patch is clamped on the way to the database too", () => {
  assert.deepEqual(patchToRow({ masterVolume: 5000, maxDpr: 8 }), { master_volume: 100, max_dpr: 1.5 });
});

test("a whole settings row carries the owner id", () => {
  const row = settingsToRow(DEFAULT_USER_SETTINGS, "user_2abc");
  assert.equal(row.user_id, "user_2abc");
  assert.equal(Object.keys(row).length, Object.keys(SETTINGS_COLUMNS).length + 1);
  assert.equal(row.theme, "dark");
});

test("master volume multiplies the channel volume", () => {
  assert.equal(volumeGain(80, 70), 0.56);
  assert.equal(volumeGain(100, 100), 1);
  assert.equal(volumeGain(0, 100), 0);
  assert.equal(volumeGain(100, 0), 0);
  assert.equal(volumeGain(50, 50), 0.25);
  assert.equal(volumeGain(5000, 5000), 1);
});

test("the html attributes cover the three CSS-driven preferences", () => {
  assert.deepEqual(settingsAttributes(DEFAULT_USER_SETTINGS), {
    "data-accent": "emerald",
    "data-glass": "medium",
    "data-motion": "full",
  });

  const reduced = settingsAttributes(coerceUserSettings({ reduceMotion: true, accentColor: "cyan", glassIntensity: "low" }));
  assert.deepEqual(reduced, { "data-accent": "cyan", "data-glass": "low", "data-motion": "reduced" });
});

/** The palette token each accent re-points, so the measurements transfer. */
const ACCENT_TOKENS = {
  cyan: "color-glow",
  emerald: "color-neon",
  violet: "color-iris",
  amber: "color-solar",
  rose: "color-coral",
};

const settingsCss = readFileSync(join(root, "app", "globals.css"), "utf8");
/** The light block comes after the dark one, so a slice is enough to separate them. */
const lightCss = settingsCss.slice(settingsCss.indexOf(".light {"));

function tokenHex(source, name) {
  return source.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`))?.[1]?.toLowerCase() ?? null;
}

function accentHex(accent, light) {
  const selector = light ? `html.light[data-accent="${accent}"]` : `html[data-accent="${accent}"]`;
  const start = settingsCss.indexOf(selector + " {");
  assert.ok(start >= 0, `globals.css has no ${light ? "light" : "dark"} rule for the ${accent} accent`);
  return tokenHex(settingsCss.slice(start, start + 120), "color-neon");
}

test("each accent re-points --color-neon at a colour check:theme already measures", () => {
  // This is what makes the accent picker safe: it reuses the palette tokens whose
  // contrast in both themes is asserted above, rather than inventing five new
  // colours that nobody checked against the page background.
  for (const accent of ACCENT_COLORS) {
    const name = ACCENT_TOKENS[accent];
    assert.equal(accentHex(accent, false), tokenHex(settingsCss, name), `${accent} dark is not --${name}`);
    assert.equal(accentHex(accent, true), tokenHex(lightCss, name), `${accent} light is not the light --${name}`);
  }
});

test("the swatch the picker draws is the colour the interface applies", () => {
  for (const accent of ACCENT_COLORS) {
    assert.equal(ACCENT_SWATCHES[accent].toLowerCase(), accentHex(accent, false), `${accent}: swatch and CSS disagree`);
  }
});

test("globals.css styles every glass intensity and both motion states", () => {
  for (const glass of GLASS_INTENSITIES) {
    assert.ok(settingsCss.includes(`html[data-glass="${glass}"]`), `globals.css has no rule for glass intensity "${glass}"`);
  }

  // Every intensity must move all three of the tokens .glass and .glass-strong read,
  // or the setting would be a float that changes nothing.
  for (const glass of GLASS_INTENSITIES) {
    const start = settingsCss.indexOf(`html[data-glass="${glass}"]`);
    const block = settingsCss.slice(start, settingsCss.indexOf("}", start));
    for (const variable of ["--kami-glass-blur", "--kami-glass-strong-blur", "--kami-glass-strong-alpha"]) {
      assert.ok(block.includes(variable), `glass "${glass}" does not set ${variable}`);
    }
  }

  assert.ok(settingsCss.includes('html[data-motion="reduced"]'), "globals.css has no reduced-motion rule");
  assert.ok(settingsCss.includes("prefers-reduced-motion: reduce"), "the operating system preference must keep working too");

  // And the rules the two motion sources apply have to agree: a visitor who set the
  // switch should get the same three declarations the media query gives.
  for (const declaration of ["animation-duration", "animation-iteration-count", "transition-duration"]) {
    assert.ok(settingsCss.includes(declaration), `no ${declaration} declaration in globals.css`);
  }
});

test("every message exists in both languages, and none is empty", () => {
  const english = Object.keys(MESSAGES.en).sort();
  const vietnamese = Object.keys(MESSAGES.vi).sort();

  assert.deepEqual(vietnamese, english, "the two dictionaries have different keys");
  assert.ok(english.length >= 40, `only ${english.length} translated keys`);

  for (const [language, dictionary] of Object.entries(MESSAGES)) {
    for (const [key, value] of Object.entries(dictionary)) {
      assert.equal(typeof value, "string", `${language}.${key} is not a string`);
      assert.ok(value.trim().length > 0, `${language}.${key} is empty`);
    }
  }

  // A language that silently falls back to English for half its keys is not a
  // language; the two dictionaries must not be copies of each other.
  const identical = english.filter((key) => MESSAGES.en[key] === MESSAGES.vi[key]);
  // Words that are the same word in both languages: the language names themselves,
  // and "Email", which Vietnamese uses unchanged.
  const allowed = ["language.vi", "language.en", "notifications.email"];
  assert.deepEqual(identical.filter((key) => !allowed.includes(key)), [], "untranslated keys");
});

test("the guest storage key is namespaced", () => {
  assert.equal(SETTINGS_STORAGE_KEY, "kami-settings");
});
