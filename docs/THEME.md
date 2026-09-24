# Light and dark

One preference, three choices (`dark`, `light`, `system`), and — this is the part that caused a bug — **two stores**.
This note records how they are kept in agreement, and the measurements behind the rule.

| Store | Key | Written by | Shared between documents? |
| --- | --- | --- | --- |
| next-themes | `kami-theme` | its inline script (before first paint) and `setTheme()` | yes — one origin, one `localStorage` |
| The settings object | `kami-settings`, plus `user_settings` in Postgres | `SettingsProvider.update()` | yes |

`<html>` carries `class="light"` or `class="dark"`; `app/globals.css` keeps the dark tokens as the default and
`.light` redefines them, so a page with no JavaScript still renders. `/settings` switches between the three
choices; the navbar menu offers the two a visitor changes often, Light and Dark.

## The bug: two tabs blinking forever

The first version of the reconciler in `components/settings/SettingsProvider.tsx` was **level-triggered**: it
compared next-themes’ value with the settings value and re-imposed its own whenever they differed. In one tab
that is invisible. In two it is an infinite argument, because each document holds *its own* copy of the settings
in memory:

```
tab A: settings = light  ->  writes kami-theme = light
tab B: storage event      ->  theme = light, but its settings still say dark
tab B: disagrees          ->  writes kami-theme = dark
tab A: storage event      ->  theme = dark, but its settings still say light
tab A: disagrees          ->  writes kami-theme = light        ...and it never ends
```

Measured on the running app — two documents on one origin, one document choosing Light and the other Dark:

| | writes to `<html>` in 25 s | outcome |
| --- | --- | --- |
| Before | **20 and climbing** | the page alternated light/dark until one document was closed |
| After | **4**, then silence | both documents on the same theme |

## The rule that replaced it

`lib/theme-sync.ts` decides one reconciliation step and is pure, so both the simulation below and the component
use exactly the same code:

1. **Edge-triggered.** A document reacts to a *change* in one of the two values, never to a standing
   disagreement. A disagreement that nothing changed is a disagreement that nothing needs to fix.
2. **Asymmetric.** A value that arrived from outside — another document wrote the shared key, or the pre-paint
   script restored a stored choice — is **adopted** into the settings and never pushed back. Adoption writes only
   the local settings object, so it produces no storage event in the other document, and the exchange ends after
   one round.
3. **One direction per step.** `push` and `adopt` are never both set, so no effect ordering can decide the outcome.

A value this document pushed is remembered until it is seen to land, so a push is not mistaken for an outside
change; the account’s value from `/api/settings` still wins over the local one on load, because that is a *change*
to the settings — which is the edge that pushes.

## `system` is a value, not a class

`ThemeProvider` sets `enableSystem`. It has to: without the flag next-themes treats the word `system` as a literal
palette name, wrote `class="system"` on `<html>` — which no rule in `globals.css` matches, so the page silently
rendered dark — and because the only classes it removes are the ones it is about to add, that stray class then
stayed for the rest of the session and accumulated alongside `light`/`dark`.

With the flag on, `system` resolves to the OS preference and the applied class is always `light` or `dark`, and a
visitor whose choice is System follows a change of OS preference live. `defaultTheme="dark"` still means a first
visit looks the way every screenshot does.

## Verifying it

```bash
npm run check:theme           # the two palettes, for contrast (WCAG AA)
npm run check:theme-sync      # the rule, incl. two documents simulated in-process
npm run audit:theme           # contrast as rendered, light and dark, in a real browser
npm run audit:theme-stability # two live documents, counting how often <html> flips
```

`check:theme-sync` runs the old level-triggered rule through the same simulator and asserts that it does **not**
settle, so the regression test cannot quietly stop testing anything. `audit:theme-stability` needs Chrome and a
running server (`npm run build && npm start`), and fails if the two documents keep writing or end on different
themes.
