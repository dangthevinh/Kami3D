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
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      enableColorScheme
      storageKey="kami-theme"
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
