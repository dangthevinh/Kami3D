/**
 * The user-settings model — the single place that knows which preferences exist,
 * what each may contain, and how a database row becomes a validated object.
 *
 * It is pure and imports nothing, for one reason: `scripts/check-sql.mjs` reads
 * it directly and asserts that every preference here has a column in
 * `supabase/schema.sql` whose CHECK constraint permits every value this module
 * can produce. If the two ever drift, the database would reject a write the UI
 * happily offered, so the drift has to be a failing test rather than a runtime
 * surprise.
 *
 * Every bound here mirrors a CHECK constraint in the schema on purpose. A visitor's
 * browser is not a trustworthy source of values, and a row written by an older
 * release must still load: `coerceUserSettings` therefore *repairs* input instead
 * of throwing, clamping a volume of 5000 to 100 and discarding an unknown accent.
 */

export type ThemeChoice = "system" | "dark" | "light";
export type AccentColor = "cyan" | "emerald" | "violet" | "amber" | "rose";
export type GlassIntensity = "low" | "medium" | "high";
export type QualityPreset = "auto" | "low" | "medium" | "high" | "ultra";
export type LanguageCode = "vi" | "en";
export type MeasurementUnit = "metric" | "imperial";
export type MaxDpr = 1 | 1.5 | 2;

export interface UserSettings {
  theme: ThemeChoice;
  accentColor: AccentColor;
  glassIntensity: GlassIntensity;
  reduceMotion: boolean;
  qualityPreset: QualityPreset;
  enableShadows: boolean;
  enableReflections: boolean;
  maxDpr: MaxDpr;
  autoRotate: boolean;
  masterVolume: number;
  animalVolume: number;
  uiSounds: boolean;
  autoplaySounds: boolean;
  language: LanguageCode;
  measurementUnit: MeasurementUnit;
  emailNotifications: boolean;
  pushNotifications: boolean;
}

export type SettingsKey = keyof UserSettings;
export type UserSettingsPatch = Partial<UserSettings>;

/**
 * Where each preference lives in Postgres. The app speaks camelCase, the database
 * speaks snake_case, and this map is the only translation — an inline string
 * literal in a query would be a typo waiting for a preview deployment to find.
 */
export const SETTINGS_COLUMNS: Record<SettingsKey, string> = {
  theme: "theme",
  accentColor: "accent_color",
  glassIntensity: "glass_intensity",
  reduceMotion: "reduce_motion",
  qualityPreset: "quality_preset",
  enableShadows: "enable_shadows",
  enableReflections: "enable_reflections",
  maxDpr: "max_dpr",
  autoRotate: "auto_rotate",
  masterVolume: "master_volume",
  animalVolume: "animal_volume",
  uiSounds: "ui_sounds",
  autoplaySounds: "autoplay_sounds",
  language: "language",
  measurementUnit: "measurement_unit",
  emailNotifications: "email_notifications",
  pushNotifications: "push_notifications",
};

/**
 * The defaults, which are also the schema defaults: a visitor who has never
 * opened `/settings` behaves exactly as one who saved this object.
 *
 * `qualityPreset: "auto"` is deliberate — it is the one value that keeps
 * `lib/quality.ts` in charge, which is what every visitor gets today. Picking a
 * fixed preset is the visitor overriding the measurement, not the app guessing.
 * `enableReflections` defaults to true because the hero viewer was designed with
 * a mirror floor; the low tier turns it off on its own.
 */
export const DEFAULT_USER_SETTINGS: UserSettings = {
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
};

/**
 * The colour each accent paints with, in the dark theme.
 *
 * These are the same values as the `html[data-accent="…"]` block in
 * `app/globals.css`, and `scripts/check-settings.mjs` asserts that they are —
 * a swatch that promises a colour the interface does not apply is worse than no
 * swatch at all.
 */
export const ACCENT_SWATCHES: Record<AccentColor, string> = {
  cyan: "#38e0ff",
  emerald: "#35f0c0",
  violet: "#a97bff",
  amber: "#ffb738",
  rose: "#ff5d8f",
};

export const THEME_CHOICES: readonly ThemeChoice[] = ["system", "dark", "light"];
export const ACCENT_COLORS: readonly AccentColor[] = ["cyan", "emerald", "violet", "amber", "rose"];
export const GLASS_INTENSITIES: readonly GlassIntensity[] = ["low", "medium", "high"];
export const QUALITY_PRESETS: readonly QualityPreset[] = ["auto", "low", "medium", "high", "ultra"];
export const MAX_DPRS: readonly MaxDpr[] = [1, 1.5, 2];
export const LANGUAGES: readonly LanguageCode[] = ["vi", "en"];
export const MEASUREMENT_UNITS: readonly MeasurementUnit[] = ["metric", "imperial"];

/** The volume range, mirrored by `check (master_volume between 0 and 100)`. */
export const VOLUME_RANGE = { min: 0, max: 100 } as const;

/** The storage key guests' settings live under, next to next-themes' own key. */
export const SETTINGS_STORAGE_KEY = "kami-settings";

function oneOf<T extends string>(allowed: readonly T[], fallback: T) {
  return (value: unknown): T => (typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : fallback);
}

function bool(fallback: boolean) {
  return (value: unknown): boolean => (typeof value === "boolean" ? value : fallback);
}

/** Volume: rounded, then clamped, so `80.6` and `1000` both become writable. */
export function clampVolume(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  const rounded = Math.round(value);
  return Math.min(VOLUME_RANGE.max, Math.max(VOLUME_RANGE.min, rounded));
}

function maxDprValue(value: unknown, fallback: MaxDpr): MaxDpr {
  return value === 1 || value === 1.5 || value === 2 ? value : fallback;
}

const themeValue = oneOf(THEME_CHOICES, DEFAULT_USER_SETTINGS.theme);
const accentValue = oneOf(ACCENT_COLORS, DEFAULT_USER_SETTINGS.accentColor);
const glassValue = oneOf(GLASS_INTENSITIES, DEFAULT_USER_SETTINGS.glassIntensity);
const presetValue = oneOf(QUALITY_PRESETS, DEFAULT_USER_SETTINGS.qualityPreset);
const languageValue = oneOf(LANGUAGES, DEFAULT_USER_SETTINGS.language);
const unitValue = oneOf(MEASUREMENT_UNITS, DEFAULT_USER_SETTINGS.measurementUnit);

/**
 * Reads one preference out of a mixed bag of keys.
 *
 * Both spellings are accepted — `accentColor` from the browser and `accent_color`
 * from Postgres — because a settings object is read from both places, and a
 * translation step at every call site is a translation step someone will forget.
 */
function pick(input: Record<string, unknown>, key: SettingsKey): unknown {
  const camel = input[key];
  if (camel !== undefined) return camel;
  return input[SETTINGS_COLUMNS[key]];
}

/**
 * Turns anything — an API body, a database row, a stale localStorage blob, null —
 * into a complete, valid settings object. Never throws: a preferences panel that
 * fails to open because one field was malformed is worse than one that opens with
 * a repaired value.
 */
export function coerceUserSettings(input: unknown): UserSettings {
  const source = (input ?? {}) as Record<string, unknown>;
  if (typeof input !== "object" || Array.isArray(input)) return { ...DEFAULT_USER_SETTINGS };

  const read = (key: SettingsKey) => pick(source, key);

  return {
    theme: themeValue(read("theme")),
    accentColor: accentValue(read("accentColor")),
    glassIntensity: glassValue(read("glassIntensity")),
    reduceMotion: bool(DEFAULT_USER_SETTINGS.reduceMotion)(read("reduceMotion")),
    qualityPreset: presetValue(read("qualityPreset")),
    enableShadows: bool(DEFAULT_USER_SETTINGS.enableShadows)(read("enableShadows")),
    enableReflections: bool(DEFAULT_USER_SETTINGS.enableReflections)(read("enableReflections")),
    maxDpr: maxDprValue(read("maxDpr"), DEFAULT_USER_SETTINGS.maxDpr),
    autoRotate: bool(DEFAULT_USER_SETTINGS.autoRotate)(read("autoRotate")),
    masterVolume: clampVolume(read("masterVolume"), DEFAULT_USER_SETTINGS.masterVolume),
    animalVolume: clampVolume(read("animalVolume"), DEFAULT_USER_SETTINGS.animalVolume),
    uiSounds: bool(DEFAULT_USER_SETTINGS.uiSounds)(read("uiSounds")),
    autoplaySounds: bool(DEFAULT_USER_SETTINGS.autoplaySounds)(read("autoplaySounds")),
    language: languageValue(read("language")),
    measurementUnit: unitValue(read("measurementUnit")),
    emailNotifications: bool(DEFAULT_USER_SETTINGS.emailNotifications)(read("emailNotifications")),
    pushNotifications: bool(DEFAULT_USER_SETTINGS.pushNotifications)(read("pushNotifications")),
  };
}

/** A database row (`user_settings`), as the API returns it. */
export function settingsFromRow(row: unknown): UserSettings {
  return coerceUserSettings(row as Record<string, unknown>);
}

/**
 * A partial update, in column names, containing only the keys actually present.
 *
 * Partial matters: the settings form saves one group at a time, and sending the
 * whole object would let a stale tab overwrite a change made in another one.
 */
export function patchToRow(patch: UserSettingsPatch): Record<string, string | number | boolean> {
  const coerced = coerceUserSettings({ ...DEFAULT_USER_SETTINGS, ...patch });
  const row: Record<string, string | number | boolean> = {};

  for (const key of Object.keys(patch) as SettingsKey[]) {
    if (!(key in SETTINGS_COLUMNS)) continue;
    row[SETTINGS_COLUMNS[key]] = coerced[key];
  }
  return row;
}

/** Whole-object row, for an upsert. `userId` is the Clerk id or Supabase uid. */
export function settingsToRow(settings: UserSettings, userId: string): Record<string, string | number | boolean> {
  const row = patchToRow(settings);
  row.user_id = userId;
  return row;
}

/**
 * The effective audio gain, 0–1: master times the channel it is playing on.
 *
 * Multiplying means master at 0 silences everything without every call site
 * having to know about it, which is what a "master" volume is for.
 */
export function volumeGain(masterVolume: number, channelVolume: number): number {
  const master = clampVolume(masterVolume, 0) / 100;
  const channel = clampVolume(channelVolume, 0) / 100;
  return Math.round(master * channel * 100) / 100;
}

/** True when two settings objects say the same thing (order-independent). */
export function settingsEqual(a: UserSettings, b: UserSettings): boolean {
  return (Object.keys(SETTINGS_COLUMNS) as SettingsKey[]).every((key) => a[key] === b[key]);
}

/**
 * The attributes the settings put on `<html>`, and the whole reason a stored
 * preference is not a decorative one: every one of these is read by a rule in
 * `app/globals.css`, so the page re-tints and re-animates from a token change
 * rather than from a re-render.
 */
export function settingsAttributes(settings: UserSettings): Record<string, string> {
  return {
    "data-accent": settings.accentColor,
    "data-glass": settings.glassIntensity,
    "data-motion": settings.reduceMotion ? "reduced" : "full",
  };
}
