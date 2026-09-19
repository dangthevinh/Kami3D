import Link from "next/link";

import { kamiMarkSvg } from "@/lib/brand";
import { cn } from "@/lib/utils";

/**
 * Brand lockup.
 *
 * Deliberately NOT a client component: the footer used to import this from the
 * navbar, which pulled the entire client navbar into every page's footer. It is
 * plain markup now, so it renders on the server and ships no JavaScript.
 */

const SIZES = {
  sm: { mark: "size-8", word: "text-base", gap: "gap-2" },
  md: { mark: "size-9", word: "text-lg", gap: "gap-2.5" },
  lg: { mark: "size-12", word: "text-2xl", gap: "gap-3" },
} as const;

export type KamiLogoSize = keyof typeof SIZES;

export function KamiMark({
  idPrefix = "kami",
  className,
}: {
  idPrefix?: string;
  className?: string;
}) {
  // The string is authored here, never user input, so there is no injection path.
  return (
    <span
      className={cn("inline-block shrink-0", className)}
      dangerouslySetInnerHTML={{ __html: kamiMarkSvg({ idPrefix }) }}
    />
  );
}

export interface KamiLogoProps {
  href?: string;
  size?: KamiLogoSize;
  /** Distinct per call site so the SVG gradient ids never collide. */
  idPrefix?: string;
  /** "Kami3D" renders the wordmark; "mark" is the glyph on its own. */
  variant?: "full" | "mark";
  className?: string;
}

export function KamiLogo({
  href = "/",
  size = "md",
  idPrefix = "brand",
  variant = "full",
  className,
}: KamiLogoProps) {
  const scale = SIZES[size];

  return (
    <Link
      href={href}
      aria-label="Kami3D home"
      className={cn("group flex items-center", scale.gap, className)}
    >
      <span
        className={cn(
          "relative inline-flex items-center justify-center transition-transform duration-300 ease-out",
          "drop-shadow-[0_6px_18px_rgba(56,224,255,0.35)] group-hover:-rotate-6 group-hover:scale-105",
        )}
      >
        <KamiMark idPrefix={idPrefix} className={scale.mark} />
        {/* Specular sweep on hover */}
        <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-[30%] opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <span className="absolute -left-full top-0 h-full w-1/2 rotate-12 bg-gradient-to-r from-transparent via-white/45 to-transparent transition-transform duration-700 group-hover:translate-x-[350%]" />
        </span>
      </span>

      {variant === "full" ? (
        <span className={cn("font-display font-bold tracking-tight text-white", scale.word)}>
          Kami
          <span className="bg-gradient-to-r from-neon via-glow to-iris bg-clip-text text-transparent">
            3D
          </span>
        </span>
      ) : null}
    </Link>
  );
}
