import { BookOpen, Images, Plus, Sparkles } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * The studio's own sub-navigation.
 *
 * Manga Studio is a second product surface, like Data2Map: it gets **one** navbar entry and keeps the
 * rest of its links here, so the main menu does not grow a second menu inside it. It is a server
 * component with three <Link>s and an icon - no state, no fetch, nothing that would cost the first
 * paint of a route whose real work is an editor.
 */

export function StudioHeader({
  title,
  subtitle,
  current,
  actions,
}: {
  title: string;
  subtitle?: string;
  current?: "studio" | "gallery" | "create";
  actions?: ReactNode;
}) {
  const links = [
    { href: "/manga-studio", label: "Studio", icon: BookOpen, id: "studio" as const },
    { href: "/manga-studio/gallery", label: "Gallery", icon: Images, id: "gallery" as const },
    { href: "/manga-studio/create", label: "New project", icon: Plus, id: "create" as const },
  ];

  return (
    <header className="border-b border-white/8 bg-void/60 backdrop-blur-xl">
      <div className="section-shell py-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <Link href="/manga-studio" className="flex items-center gap-2 text-sm font-semibold text-white">
            <Sparkles className="size-4 text-neon" aria-hidden />
            Manga Studio
          </Link>

          <nav aria-label="Manga Studio">
            <ul className="flex flex-wrap items-center gap-1">
              {links.map((link) => {
                const active = current === link.id;
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "tap-target flex items-center gap-2 rounded-full px-3 py-1.5 text-xs transition-colors",
                        active ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/8 hover:text-white",
                      )}
                    >
                      <link.icon className="size-3.5" aria-hidden />
                      {link.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {actions ? <div className="ml-auto flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>

        <h1 className="mt-4 font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl">{title}</h1>
        {subtitle ? <p className="mt-1 max-w-2xl text-sm leading-relaxed text-white/55">{subtitle}</p> : null}
      </div>
    </header>
  );
}
