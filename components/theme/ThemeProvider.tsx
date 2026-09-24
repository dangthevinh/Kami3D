"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * Light and dark, chosen by the visitor — under **Settings** in the navbar.
 *
 * `next-themes` writes the choice as a class on `<html>` before the first paint
 * (it inlines a blocking script), which is what makes the flip free of a flash of
 * the wrong theme — and why `app/globals.css` can express the whole light palette
 * as a `.light` block that redefines the tokens the utilities already use.
 *
 * Dark is the default: Kami3D is designed as a night product, so a first visit
 * looks the way every screenshot and social card does. The choice is remembered
 * in `localStorage`, per browser, and the switch itself lives in the navbar's
 * Settings menu (`components/layout/SettingsMenu.tsx`).
 *
 * **`enableSystem` is on, and it has to be.** The navbar menu offers only Light and
 * Dark, but `/settings` offers System, and without the flag next-themes treats the
 * word "system" as a literal theme: it wrote `class="system"` on `<html>`, which no
 * rule in `app/globals.css` matches, and — because the class it removes is only the
 * one it is about to add — that stray class then stayed for the rest of the session.
 * With the flag on, "system" resolves to the OS preference and the applied class is
 * always `light` or `dark`; `defaultTheme="dark"` still means a first visit is dark.
 *
 * Turning it on is also safe for the two-store reconciliation in
 * `components/settings/SettingsProvider.tsx`, which now converges instead of
 * echoing another tab back (see `lib/theme-sync.ts`).
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      enableColorScheme
      storageKey="kami-theme"
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
