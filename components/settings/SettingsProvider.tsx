"use client";

import { useTheme } from "next-themes";
import * as React from "react";

import { readSessionHint } from "@/lib/auth-hint";
import {
  DEFAULT_USER_SETTINGS,
  SETTINGS_STORAGE_KEY,
  coerceUserSettings,
  settingsAttributes,
  settingsEqual,
  type UserSettings,
  type UserSettingsPatch,
} from "@/lib/user-settings";

/**
 * The visitor's preferences, in one place, for the whole product.
 *
 * Three tiers, in the order they are consulted:
 *
 *   1. **`localStorage`** — read synchronously on mount, so a repeat visitor's
 *      accent, glass and motion state are applied before they can see the default.
 *   2. **`/api/settings`** — the row in `user_settings`, fetched once per page
 *      load *only when the session cookie says there is a session to load it for*.
 *      A guest, and every crawler, makes no request at all.
 *   3. **The defaults** — which are the schema defaults, so nothing changes for a
 *      visitor who has never opened `/settings`.
 *
 * The database wins over `localStorage` because it is the copy that follows the
 * visitor to another device — with one exception: a change made *in this tab*
 * before the fetch resolved is re-applied and pushed up, so clicking through the
 * theme menu while the page is still loading does not silently lose the click.
 *
 * Writes are optimistic. If the network refuses, the preference still applies and
 * the UI says it is only saved in this browser, which is what it is.
 */

export interface SettingsContextValue {
  settings: UserSettings;
  /** False until this browser's copy has been read. */
  ready: boolean;
  /** True once the server has confirmed a signed-in visitor. */
  signedIn: boolean;
  /** Where writes are landing right now. */
  source: "browser" | "database";
  saving: boolean;
  error: string | null;
  update: (patch: UserSettingsPatch) => void;
  reset: () => void;
}

/**
 * Guests, and any tree rendered outside the provider (tests, a future embed),
 * get the defaults and a no-op writer rather than a thrown error: a preferences
 * context that can crash a page is worse than one that does nothing.
 */
const SettingsContext = React.createContext<SettingsContextValue>({
  settings: DEFAULT_USER_SETTINGS,
  ready: false,
  signedIn: false,
  source: "browser",
  saving: false,
  error: null,
  update: () => undefined,
  reset: () => undefined,
});

export function useSettings(): SettingsContextValue {
  return React.useContext(SettingsContext);
}

function readStored(): UserSettings | null {
  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    return raw ? coerceUserSettings(JSON.parse(raw)) : null;
  } catch {
    // A corrupt or unreadable blob is not a reason to lose the panel.
    return null;
  }
}

function writeStored(settings: UserSettings) {
  try {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Private-mode storage can refuse writes; the session still works.
  }
}

/**
 * Preferences a visitor could already have set **before** this feature existed.
 *
 * The navbar toggle stored the theme under next-themes' own key, and the size
 * chart kept its unit under `kami-unit`. Both are read once, on the first load of
 * a browser that has no settings object yet — without this, the sync below would
 * push the fresh defaults onto next-themes and quietly reset a returning
 * visitor's theme back to dark.
 */
function readLegacyChoices(): UserSettingsPatch {
  const legacy: UserSettingsPatch = {};
  try {
    const theme = window.localStorage.getItem("kami-theme");
    if (theme === "light" || theme === "dark") legacy.theme = theme;
    if (window.localStorage.getItem("kami-unit") === "imperial") legacy.measurementUnit = "imperial";
  } catch {
    // Storage unavailable: there is nothing to migrate from.
  }
  return legacy;
}

export function SettingsProvider({
  authConfigured,
  children,
}: {
  /** From the server: whether an auth provider is configured at all. */
  authConfigured: boolean;
  children: React.ReactNode;
}) {
  const { theme, setTheme } = useTheme();
  const [settings, setSettings] = React.useState<UserSettings>(DEFAULT_USER_SETTINGS);
  const [ready, setReady] = React.useState(false);
  const [signedIn, setSignedIn] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Refs, not state: `update` is called from event handlers that must not be
  // re-created (and must not read a stale closure) every time a preference moves.
  const current = React.useRef(settings);
  const signedInRef = React.useRef(false);
  const dirty = React.useRef<UserSettingsPatch>({});

  const persist = React.useCallback(async (patch: UserSettingsPatch) => {
    if (Object.keys(patch).length === 0) return;
    setSaving(true);
    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ patch }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setError(null);
    } catch {
      setError("Saved in this browser only — the server did not accept the change.");
    } finally {
      setSaving(false);
    }
  }, []);

  const update = React.useCallback(
    (patch: UserSettingsPatch) => {
      const next = coerceUserSettings({ ...current.current, ...patch });
      if (settingsEqual(next, current.current)) return;

      current.current = next;
      setSettings(next);
      writeStored(next);

      // Only the keys this call touched are sent: two tabs editing different
      // groups must not overwrite each other's columns.
      const touched = {} as UserSettingsPatch;
      // Written through a Record because a union of keys cannot be assigned to
      // itself property-by-property in TypeScript; the values are checked above by
      // the coercion that produced `next`.
      const sink = touched as Record<string, unknown>;
      for (const key of Object.keys(patch) as (keyof UserSettings)[]) sink[key] = next[key];
      dirty.current = { ...dirty.current, ...touched };

      if (signedInRef.current) void persist(touched);
    },
    [persist],
  );

  const reset = React.useCallback(() => update(DEFAULT_USER_SETTINGS), [update]);

  // First read: the browser's copy must land before the first paint that can show
  // it, and the server's copy is only worth asking for when a session exists.
  React.useEffect(() => {
    const stored = readStored();
    if (stored) {
      current.current = stored;
      setSettings(stored);
    } else {
      // One-time migration from the preferences this visitor could already have set
      // (see readLegacyChoices). Writing the object makes them ordinary settings from
      // here on, and — because it happens before the sync effect runs — the theme
      // they chose before this feature existed is the one that survives.
      const legacy = readLegacyChoices();
      if (Object.keys(legacy).length > 0) {
        const migrated = coerceUserSettings({ ...DEFAULT_USER_SETTINGS, ...legacy });
        current.current = migrated;
        setSettings(migrated);
        writeStored(migrated);
      }
    }
    setReady(true);

    // "unknown" counts as "might be signed in": the hint can only ever delay an
    // answer, never invent one, and a wasted request is cheaper than a signed-in
    // visitor silently editing the wrong copy of their settings.
    if (!authConfigured || readSessionHint(document.cookie) === "out") return;

    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/settings", { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as { settings?: unknown; persisted?: boolean };
        if (cancelled || !data.settings) return;

        const remote = coerceUserSettings(data.settings);
        const pending = dirty.current;
        const merged = coerceUserSettings({ ...remote, ...pending });

        signedInRef.current = true;
        setSignedIn(true);
        current.current = merged;
        setSettings(merged);
        writeStored(merged);

        // `persisted: false` means the visitor has no row yet: rather than write
        // this browser's guesses into their account unprompted, the row is created
        // by the first real change — but a change made while this was in flight is
        // a real change and is pushed now.
        if (Object.keys(pending).length > 0) void persist(pending);
      } catch {
        // Offline, or the endpoint is unreachable: the browser's copy stands.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authConfigured, persist]);

  // The three CSS-driven preferences, as attributes on `<html>`. See the
  // "visitor's own preferences" block in app/globals.css for what reads them.
  React.useEffect(() => {
    if (!ready) return;
    const element = document.documentElement;
    for (const [name, value] of Object.entries(settingsAttributes(settings))) element.setAttribute(name, value);
  }, [ready, settings]);

  // Theme is the one preference with a second writer — next-themes' own inline
  // script and the navbar menu. Both directions are reconciled here, so a change
  // made on another device arrives and a change made in the menu is stored.
  React.useEffect(() => {
    if (!ready || !theme || theme === settings.theme) return;
    setTheme(settings.theme);
  }, [ready, theme, settings.theme, setTheme]);

  const value = React.useMemo<SettingsContextValue>(
    () => ({
      settings,
      ready,
      signedIn,
      source: signedIn ? "database" : "browser",
      saving,
      error,
      update,
      reset,
    }),
    [settings, ready, signedIn, saving, error, update, reset],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}
