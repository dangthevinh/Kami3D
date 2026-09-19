"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Compass, Gamepad2, Heart, Menu, Search, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/", label: "Home", icon: Sparkles },
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/quiz", label: "Quiz", icon: Gamepad2 },
  { href: "/profile", label: "Collection", icon: Heart },
] as const;

export function KamiLogo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("group flex items-center gap-2.5", className)} aria-label="Kami3D home">
      <span className="relative grid size-9 place-items-center rounded-xl bg-gradient-to-br from-neon to-glow text-[15px] font-black text-[#04121a] shadow-[0_0_22px_-4px_rgba(53,240,192,0.85)] transition-transform duration-300 group-hover:scale-105">
        神
        <span className="absolute inset-0 rounded-xl ring-1 ring-inset ring-white/40" />
      </span>
      <span className="font-display text-lg font-bold tracking-tight text-white">
        Kami<span className="text-neon">3D</span>
      </span>
    </Link>
  );
}

export interface NavbarProps {
  /** Clerk `<UserButton />` when auth is configured, otherwise sign-in links. */
  authSlot: React.ReactNode;
}

export function Navbar({ authSlot }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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
        <KamiLogo />

        <ul className="ml-4 hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((link) => {
            const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={cn(
                    "relative flex items-center gap-2 rounded-full px-3.5 py-2 text-sm transition-colors",
                    active ? "text-white" : "text-white/60 hover:text-white",
                  )}
                >
                  <link.icon className="size-4" />
                  {link.label}
                  {active ? (
                    <motion.span
                      layoutId="nav-active"
                      className="absolute inset-0 -z-10 rounded-full bg-white/8 ring-1 ring-white/12"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  ) : null}
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
            onClick={() => setMobileOpen((open) => !open)}
          >
            {mobileOpen ? <X /> : <Menu />}
          </Button>
        </div>
      </nav>

      <AnimatePresence initial={false}>
        {mobileOpen ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-t border-white/8 bg-void/92 backdrop-blur-xl lg:hidden"
          >
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
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
