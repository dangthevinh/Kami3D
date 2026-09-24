/**
 * How the two copies of "which theme is this" stop arguing with each other.
 *
 * One preference, two stores - and **both are shared between documents**:
 *
 *   kami-theme      next-themes' own key, written by its inline script and by
 *                   setTheme, and read before the first paint
 *   kami-settings   the settings object, which also syncs to the account
 *
 * components/settings/SettingsProvider.tsx reconciles them. Its first version was
 * level-triggered: it compared the two values and re-imposed **its own** whenever they
 * differed. That is invisible in one tab and catastrophic in two, because each document
 * holds its own settings in memory - tab A wrote light, the storage event flipped tab B,
 * tab B wrote dark straight back, and the page blinked between them forever.
 *
 * Measured against the running app, two documents on one origin sharing one
 * localStorage: **20 alternating writes in 25 seconds and still climbing**.
 *
 * The rule below is edge-triggered instead, and it is deliberately asymmetric:
 *
 *   - a document reacts to a *change* in one of the two values, never to a standing
 *     disagreement;
 *   - a value that arrived from outside is **adopted** into the settings object and
 *     never pushed back, so the exchange ends after one round instead of echoing.
 *
 * scripts/check-theme-sync.mjs simulates two documents running this function and fails
 * if the exchange does not settle; `npm run audit:theme-stability` measures the real
 * thing in a browser.
 */

import type { ThemeChoice } from "@/lib/user-settings";

export type ThemeValue = ThemeChoice;

export interface ThemeSyncState {
  /** False until this browser's copy of the settings has been read. */
  ready: boolean;
  /** next-themes' current value - null before it has mounted. */
  theme: string | null;
  /** The preference this document's settings object holds. */
  settingsTheme: ThemeValue;
  /** The value this document last asked next-themes for, until it sees it land. */
  pushed: ThemeValue | null;
  /** The last next-themes value this document has reconciled with. */
  seen: ThemeValue | null;
}

export interface ThemeSyncStep {
  /** Write this into next-themes, or null for "nothing to do". */
  push: ThemeValue | null;
  /** Write this into the settings object, or null for "nothing to do". */
  adopt: ThemeValue | null;
  /** Remember these for the next step. */
  pushed: ThemeValue | null;
  seen: ThemeValue | null;
}

/** A theme value from an untrusted source (localStorage, next-themes' own state). */
export function isThemeValue(value: string | null | undefined): value is ThemeValue {
  return value === "light" || value === "dark" || value === "system";
}

/**
 * One reconciliation step. Pure: the caller owns the two refs.
 *
 * At most one of `push` and `adopt` is ever set, so a single effect can apply both
 * without the order of two effects deciding the outcome.
 */
export function nextThemeSync(state: ThemeSyncState): ThemeSyncStep {
  const { ready, theme, settingsTheme } = state;
  let { pushed, seen } = state;

  if (!ready || !isThemeValue(theme)) return { push: null, adopt: null, pushed, seen };

  // Our own request has landed, so it is no longer in flight.
  if (pushed === theme) pushed = null;

  // next-themes moved to a value this document did not ask for: another document wrote
  // the shared key, or the pre-paint script restored a stored choice. Take it as ours.
  // Adopting writes only this document's settings, never the shared key, which is what
  // stops two documents from echoing each other.
  if (seen !== null && theme !== seen && theme !== pushed) {
    return { push: null, adopt: theme === settingsTheme ? null : theme, pushed, seen: theme };
  }

  // Our own preference has not reached next-themes yet: a first load, or the account's
  // value arriving after the local one.
  if (settingsTheme !== theme && pushed === null) {
    return { push: settingsTheme, adopt: null, pushed: settingsTheme, seen: theme };
  }

  return { push: null, adopt: null, pushed, seen: theme };
}
