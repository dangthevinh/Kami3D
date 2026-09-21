"use client";

import { Compass, Gamepad2, Heart, MapPinned, Menu, Search, Sparkles, Trophy, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";

import { KamiLogo } from "@/components/brand/KamiLogo";
import { SettingsMenu } from "@/components/layout/SettingsMenu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/", label: "Home", icon: Sparkles },
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/map", label: "Map", icon: MapPinned },
  { href: "/quiz", label: "Quiz", icon: Gamepad2 },
  { href: "/leaderboard", label: "Most viewed", icon: Trophy },
  { href: "/profile", label: "Collection", icon: Heart },
] as const;

export interface NavbarProps {
  /** Clerk `<UserButton />` when auth is configured, otherwise sign-in links. */
  authSlot: React.ReactNode;
}

function isActive(href: string, pathname: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

/**
 * Sticky top navigation.
 *
 * The active-link pill and the mobile disclosure are animated with CSS only:
 * this component sits in the root layout, so anything it imports is downloaded
 * by every visitor before the page becomes interactive.
 */
export function Navbar({ authSlot }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);
  const listRef = React.useRef<HTMLUListElement>(null);
  const [pill, setPill] = React.useState<{ left: number; width: number } | null>(null);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // The pill measures the active item instead of sampling positions in JS on
  // every render; a ResizeObserver keeps it honest when the webfont swaps in.
  React.useEffect(() => {
    const list = listRef.current;
    if (!list) return;

    const measure = () => {
      const active = list.querySelector<HTMLElement>('[data-active="true"]');
      setPill(active ? { left: active.offsetLeft, width: active.offsetWidth } : null);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    void document.fonts?.ready.then(measure).catch(() => undefined);

    return () => observer.disconnect();
  }, [pathname]);

  React.useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const term = query.trim();
    router.push(term ? `/explore?q=${encodeURIComponent(term)}` : "/explore");
  }

  return (
    <header
      className={cn(
        "sticky top-0 z-50 transition-all duration-300",
        scrolled ? "border-b border-white/8 bg-void/72 backdrop-blur-xl" : "border-b border-transparent",
      )}
    >
      <nav className="section-shell flex h-16 items-center gap-3">
        <KamiLogo idPrefix="nav" />

        <ul ref={listRef} className="relative ml-4 hidden items-center gap-1 lg:flex">
          {pill ? (
            <span
              aria-hidden
              className="pointer-events-none absolute left-0 top-0 h-full rounded-full bg-white/8 ring-1 ring-white/12 transition-[transform,width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
              style={{ transform: `translateX(${pill.left}px)`, width: pill.width }}
            />
          ) : null}
          {NAV_LINKS.map((link) => {
            const active = isActive(link.href, pathname);
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  data-active={active}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex items-center gap-2 rounded-full px-3.5 py-2 text-sm transition-colors",
                    active ? "text-white" : "text-white/60 hover:text-white",
                  )}
                >
                  <link.icon className="size-4" />
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <form onSubmit={onSubmit} className="relative ml-auto hidden max-w-xs flex-1 md:block">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-white/40" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search 24 species…"
            aria-label="Search species"
            className="pl-10"
          />
        </form>

        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <SettingsMenu />

          <Button asChild variant="secondary" size="sm" className="hidden sm:inline-flex">
            <Link href="/quiz">Play quiz</Link>
          </Button>
          <div className="hidden sm:flex">{authSlot}</div>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            aria-controls="nav-mobile-panel"
            onClick={() => setMobileOpen((open) => !open)}
          >
            {mobileOpen ? <X /> : <Menu />}
          </Button>
        </div>
      </nav>

      {/* Always mounted so the open/close transition is CSS-driven; inert keeps
          the closed panel out of the tab order and the accessibility tree. */}
      <div
        id="nav-mobile-panel"
        data-open={mobileOpen}
        inert={!mobileOpen}
        className="disclosure border-t border-white/8 bg-void/92 backdrop-blur-xl lg:hidden"
      >
        <div className={cn("border-white/8", mobileOpen ? "border-t" : "border-t-0")}>
          <div className="section-shell space-y-3 py-4">
            <form onSubmit={onSubmit} className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-white/40" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search species…"
                aria-label="Search species"
                className="pl-10"
              />
            </form>
            <ul className="grid gap-1">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-white/80 transition-colors hover:bg-white/8 hover:text-white"
                  >
                    <link.icon className="size-4 text-neon" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="flex items-center gap-3 border-t border-white/8 pt-3 sm:hidden">{authSlot}</div>
          </div>
        </div>
      </div>
    </header>
  );
}
