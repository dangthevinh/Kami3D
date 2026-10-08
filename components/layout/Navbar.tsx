"use client";

import { BookOpen, Boxes, Compass, Gamepad2, LayoutGrid, MapPinned, Menu, Search, Sparkles, X, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";

import { KamiLogo } from "@/components/brand/KamiLogo";
import { SettingsMenu } from "@/components/layout/SettingsMenu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { readSessionHint } from "@/lib/auth-hint";
import { COMING_SOON_MODULES, comingSoonById } from "@/lib/coming-soon";
import { cn } from "@/lib/utils";

interface NavEntry {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Built but not launched: drawn for everybody, greyed out, and only an admin can open it. */
  comingSoon?: boolean;
}

const NAV_LINKS: readonly NavEntry[] = [
  { href: "/", label: "Home", icon: Sparkles },
  { href: "/explore", label: "Explore", icon: Compass },
  // Phase 25's front door: the index over every subject the site holds, including the two with
  // entries today and the three being built. It sits next to Explore because they answer the two
  // halves of the same question - "show me everything" and "show me everything of this kind".
  { href: "/categories", label: "Catalogue", icon: LayoutGrid },
  { href: "/map", label: "Map", icon: MapPinned },
  // Landmarks used to sit here as a second front door. It is the **Architecture** subject of the
  // catalogue - /categories/architecture draws the same 47 monuments with the same cards - so the
  // navbar entry was a duplicate of one the catalogue already had, and this row is long enough as it
  // is. The route stays (see app/landmarks/page.tsx, which is the list with its own filters) and is
  // reached from the catalogue; nothing links to a 404 either way (npm run check:catalog pins that).
  // Manga Studio is a second product surface, like Data2Map, so it gets one entry here and keeps its
  // own sub-navigation inside `app/manga-studio` (see `StudioHeader`).
  //
  // `comingSoon` marks an entry that is built but not launched: it is drawn for everybody, greyed out
  // and labelled "Coming soon", and only the people working on it can open it. The list of those
  // modules lives in `lib/coming-soon.ts`, which the middleware reads too, so the menu and the gate
  // cannot disagree about which modules are open.
  //
  // The icon is a lucide glyph and nothing else: this file sits in the root layout, so anything it
  // imports is downloaded by every visitor on every route before the page becomes interactive.
  { href: "/manga-studio", label: "Manga Studio", icon: BookOpen, comingSoon: true },
  { href: "/quiz", label: "Quiz", icon: Gamepad2 },
  // Everything else moved into the settings menu (components/layout/SettingsMenu.tsx): Most viewed,
  // Collection, Insights and Pricing are about the visitor rather than about the site, and eleven words
  // in a row is a paragraph, not navigation. The mobile disclosure draws from this same array, so both
  // menus changed together and nothing is out of reach.
];

/**
 * Data2Map is a second product surface, not another encyclopedia page: one navbar entry, and its own
 * five sub-links live in the module layout. It is built but not launched, so it is drawn greyed out
 * with a "Coming soon" label - see `lib/coming-soon.ts`.
 */
const DATA2MAP_LINK: NavEntry = { href: "/data2map", label: "Data2Map", icon: Boxes, comingSoon: true };

const MODULE_CACHE_KEY = "kami3d:module-access";

/** The modules the launch switches have already opened for everybody, read from the client bundle. */
const OPEN_BY_SWITCH: readonly string[] = COMING_SOON_MODULES.filter((module) => module.isOpen()).map(
  (module) => module.href,
);

/**
 * The unlaunched modules **this** visitor may open.
 *
 * The question is asked once per tab, from one small route, and only when the session hint says
 * somebody might be signed in - a guest never pays for it, and the answer for a guest is always "none
 * of them" unless a launch switch has opened a module to everybody, which is knowable without asking.
 *
 * It decides whether an entry is a link or a greyed-out label. It decides nothing else: the
 * middleware answers the same question again on every request, including for each module's API, and
 * a client that lies about this answer draws a link it cannot follow.
 */
function useOpenModules(): ReadonlySet<string> {
  const [open, setOpen] = React.useState<ReadonlySet<string>>(() => new Set(OPEN_BY_SWITCH));

  React.useEffect(() => {
    if (OPEN_BY_SWITCH.length === COMING_SOON_MODULES.length) return; // everything is already open

    try {
      const cached = window.sessionStorage.getItem(MODULE_CACHE_KEY);
      // "guest" is an answer, not a miss: it was asked, nobody is signed in, nothing to open.
      if (cached === "guest") return;
      if (cached) {
        setOpen(new Set([...OPEN_BY_SWITCH, ...(JSON.parse(cached) as string[])]));
        return;
      }
    } catch {
      // Private mode, or storage disabled: fall through and ask the server.
    }

    // Nobody signed in means nobody who could be an admin, so there is nothing to ask.
    if (readSessionHint(document.cookie) === "out") {
      try {
        window.sessionStorage.setItem(MODULE_CACHE_KEY, "guest");
      } catch {
        // Ignored: the answer is only a cache.
      }
      return;
    }

    let cancelled = false;
    fetch("/api/module-access", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : { modules: {} }))
      .then((data: { modules?: Record<string, boolean> }) => {
        if (cancelled) return;
        const hrefs = Object.entries(data.modules ?? {})
          .filter(([, allowed]) => allowed)
          .map(([id]) => comingSoonById(id)?.href)
          .filter((href): href is string => typeof href === "string");
        setOpen(new Set([...OPEN_BY_SWITCH, ...hrefs]));
        try {
          window.sessionStorage.setItem(MODULE_CACHE_KEY, JSON.stringify(hrefs));
        } catch {
          // Ignored.
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  return open;
}

/** The label on a module that is built but not launched. */
function ComingSoonPill() {
  return (
    <span className="ml-0.5 rounded-full bg-white/8 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/45">
      Soon
    </span>
  );
}

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
  const openModules = useOpenModules();

  // Every entry is always drawn, including the ones that are not launched: a link that vanishes
  // teaches a visitor nothing, while "Coming soon" answers the question they were about to ask. What
  // the answer changes is whether the entry is a link or a label - and the pill is measured again
  // when the probe comes back, because a locked entry has no active state to sit under.
  const links = React.useMemo(() => [...NAV_LINKS, DATA2MAP_LINK], []);

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
  }, [pathname, links]);

  React.useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const term = query.trim();
    // Phase 30: the box searches every catalogue, not just the species. `/explore?q=` still works for
    // a deep link into the animal catalogue, and the SearchAction in the structured data points here so
    // the two cannot disagree about where a query goes.
    router.push(term ? `/search?q=${encodeURIComponent(term)}` : "/search");
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
          {links.map((link) => {
            const locked = link.comingSoon === true && !openModules.has(link.href);
            const active = !locked && isActive(link.href, pathname);
            return (
              <li key={link.href}>
                {locked ? (
                  <span
                    data-coming-soon={link.href}
                    aria-disabled="true"
                    title={link.label + " is coming soon"}
                    className="relative flex cursor-not-allowed items-center gap-2 rounded-full px-3.5 py-2 text-sm text-white/30"
                  >
                    <link.icon className="size-4" />
                    {link.label}
                    <ComingSoonPill />
                  </span>
                ) : (
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
                )}
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
              {links.map((link) => {
                const locked = link.comingSoon === true && !openModules.has(link.href);
                return (
                  <li key={link.href}>
                    {locked ? (
                      <span
                        data-coming-soon={link.href}
                        aria-disabled="true"
                        className="flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-3 text-sm text-white/30"
                      >
                        <link.icon className="size-4 text-white/30" />
                        {link.label}
                        <ComingSoonPill />
                      </span>
                    ) : (
                      <Link
                        href={link.href}
                        className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-white/80 transition-colors hover:bg-white/8 hover:text-white"
                      >
                        <link.icon className="size-4 text-neon" />
                        {link.label}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
            <div className="flex items-center gap-3 border-t border-white/8 pt-3 sm:hidden">{authSlot}</div>
          </div>
        </div>
      </div>
    </header>
  );
}
