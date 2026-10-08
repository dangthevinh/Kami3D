"use client";

import { Check, Moon, Settings2, Sun } from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";
import * as React from "react";

import { useSettings } from "@/components/settings/SettingsProvider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * The Settings menu: the quick switch in the navbar, and the way in to `/settings`.
 *
 * It holds the one preference a visitor changes often enough to want it one click
 * away — appearance — plus a link to the full panel. Everything else (accent,
 * glass, 3D quality, audio, units, notifications) lives at `/settings`, where
 * there is room to explain what a switch actually does.
 *
 * Light and Dark, and no "System" row: that was a deliberate call — the OS
 * preference is still honoured as the *initial* guess by `next-themes`, but a
 * three-way switch in a 288-pixel popover is a worse control than a two-way one.
 * The full panel offers System for visitors who want the page to follow the OS.
 *
 * It is a client component in the navbar so it works for signed-out visitors too,
 * and it never reads a cookie on the server: the stored theme is read on the
 * client only, which is why the active state is gated on `mounted`.
 */

/** The site's secondary surfaces. Kept here rather than in the navbar row: see the note in the panel. */
const SECONDARY_LINKS = [
  { href: "/leaderboard", label: "Most viewed" },
  { href: "/profile", label: "Your collection" },
  { href: "/analytics", label: "Insights" },
  { href: "/pricing", label: "Pricing" },
] as const;

const THEMES = [
  { value: "light", label: "Light", icon: Sun, hint: "Bright surface, dark ink" },
  { value: "dark", label: "Dark", icon: Moon, hint: "The default night studio" },
] as const;

export function SettingsMenu() {
  const { theme, setTheme } = useTheme();
  const { update } = useSettings();
  const [open, setOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const container = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function chooseTheme(value: "light" | "dark") {
    // next-themes repaints immediately; the settings context is what stores the
    // choice (in the account when there is one, in this browser otherwise).
    setTheme(value);
    update({ theme: value });
  }

  return (
    <div ref={container} className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Settings"
        title="Settings"
      >
        <Settings2 />
      </Button>

      {open ? (
        <div
          role="dialog"
          aria-label="Settings"
          className="glass-strong animate-drop-in absolute right-0 top-[calc(100%+0.5rem)] z-50 w-72 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl p-3"
        >
          <h2 className="px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">Settings</h2>

          <section className="mt-3">
            <div className="flex items-baseline justify-between px-1">
              <h3 className="text-xs font-medium text-white/75">Appearance</h3>
              <span className="text-[10px] text-white/35">Saved for you</span>
            </div>

            <div
              role="group"
              aria-label="Appearance"
              className="mt-2 grid grid-cols-2 gap-1.5 rounded-2xl bg-white/6 p-1.5 ring-1 ring-white/10"
            >
              {THEMES.map((option) => {
                const active = mounted && theme === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => chooseTheme(option.value)}
                    aria-pressed={active}
                    title={option.hint}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-medium transition-colors",
                      active
                        ? "bg-white/14 text-white ring-1 ring-neon/40"
                        : "text-white/60 hover:bg-white/8 hover:text-white",
                    )}
                  >
                    <option.icon className="size-4" aria-hidden />
                    <span className="inline-flex items-center gap-1">
                      {option.label}
                      {active ? <Check className="size-3 text-neon" aria-hidden /> : null}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <p className="mt-3 px-1 text-[11px] leading-relaxed text-white/40">
            The 3D viewers keep their own dark studio in both themes, so a model is lit the same way either way.
          </p>

          <Link
            href="/settings"
            onClick={() => setOpen(false)}
            className="mt-3 flex items-center justify-between rounded-xl bg-white/6 px-3 py-2.5 text-xs font-medium text-white/80 ring-1 ring-white/10 transition-colors hover:bg-white/10 hover:text-white"
          >
            All settings
            <span className="text-[10px] text-white/40">accent · 3D · audio · units</span>
          </Link>

          {/* The rest of the site, in one place.
              These four used to sit in the top row, which had grown to eleven entries and read as a
              wall of words rather than as navigation. They are the surfaces a visitor reaches *about
              themselves* (what they watched, collected, the numbers, what it costs), so they belong in
              the menu that already holds their settings — the row keeps the five things that are about
              the site. Nothing moved out of reach: every entry is one click away, and the mobile
              disclosure draws from the same array, so both menus changed together. */}
          <div role="group" aria-label="More of Kami3D" className="mt-2 rounded-xl bg-white/6 p-1.5 ring-1 ring-white/10">
            {SECONDARY_LINKS.map((entry) => (
              <Link
                key={entry.href}
                href={entry.href}
                onClick={() => setOpen(false)}
                className="block rounded-lg px-3 py-2 text-xs font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
              >
                {entry.label}
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
