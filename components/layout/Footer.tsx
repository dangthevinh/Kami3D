import { Code2, Globe2, Leaf } from "lucide-react";
import Link from "next/link";

import { KamiLogo } from "@/components/layout/Navbar";
import { isDemoMode } from "@/lib/env";

const GROUPS = [
  {
    title: "Explore",
    links: [
      { href: "/explore", label: "All species" },
      { href: "/explore?region=Oceans", label: "Ocean life" },
      { href: "/explore?prehistoric=true", label: "Prehistoric 3D" },
      { href: "/quiz", label: "Silhouette quiz" },
    ],
  },
  {
    title: "Collection",
    links: [
      { href: "/profile", label: "My favourites" },
      { href: "/profile#badges", label: "Badges" },
      { href: "/sign-in", label: "Sign in" },
      { href: "/sign-up", label: "Create account" },
    ],
  },
  {
    title: "Project",
    links: [
      { href: "/about", label: "About & data sources" },
      { href: "/about#privacy", label: "Privacy & ads" },
      { href: "/about#accessibility", label: "Accessibility" },
    ],
  },
] as const;

export function Footer() {
  return (
    <footer className="relative z-10 border-t border-white/8 bg-void/60 backdrop-blur-xl">
      <div className="section-shell grid gap-10 py-14 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="space-y-4">
          <KamiLogo />
          <p className="max-w-xs text-sm leading-relaxed text-white/55">
            A 3D encyclopedia of the animal kingdom — built with Next.js, React Three Fiber and Supabase.
          </p>
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-white/45">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/6 px-2.5 py-1 ring-1 ring-white/10">
              <Leaf className="size-3 text-neon" />
              Conservation data: IUCN Red List
            </span>
            {isDemoMode ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-solar/10 px-2.5 py-1 text-solar ring-1 ring-solar/25">
                Demo Mode — no keys configured
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-neon/10 px-2.5 py-1 text-neon ring-1 ring-neon/25">
                Supabase connected
              </span>
            )}
          </div>
        </div>

        {GROUPS.map((group) => (
          <nav key={group.title} aria-label={group.title} className="space-y-3">
            <h2 className="font-display text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
              {group.title}
            </h2>
            <ul className="space-y-2">
              {group.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-white/65 transition-colors hover:text-neon">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="border-t border-white/6">
        <div className="section-shell flex flex-col items-center justify-between gap-3 py-5 text-xs text-white/40 sm:flex-row">
          <p>© {new Date().getFullYear()} Kami3D. Educational project — model licences vary per species.</p>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5">
              <Globe2 className="size-3.5" /> Worldwide
            </span>
            <a
              href="https://github.com"
              className="inline-flex items-center gap-1.5 transition-colors hover:text-neon"
              rel="noreferrer noopener"
              target="_blank"
            >
              <Code2 className="size-3.5" /> Source
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
