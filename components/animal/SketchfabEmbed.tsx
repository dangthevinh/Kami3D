"use client";

import { Box, ExternalLink } from "lucide-react";
import * as React from "react";

import { embedFrameAttributes, type SketchfabEmbed as EmbedRecord } from "@/lib/sketchfab";
import { cn } from "@/lib/utils";

export interface SketchfabEmbedProps {
  embed: EmbedRecord;
  /** "card" fills a fixed-aspect tile; "panel" is the wide block on a species page. */
  variant?: "card" | "panel";
  className?: string;
}

/**
 * A community model from Sketchfab, shown inside the page.
 *
 * **Nothing loads until somebody asks for it.** A Sketchfab viewer is a few megabytes of their
 * JavaScript, it opens its own WebGL context and it sets their cookies — dropped into a grid of
 * species cards it would do all three two dozen times while a visitor only scrolls past. So this
 * renders a poster first: what the model is, who made it, under which licence, and a button.
 *
 * The credit line is rendered **before** the iframe and stays visible after it, because CC BY
 * obliges us to name the author wherever the work appears — `npm run check:embeds` fails if this
 * component stops printing it.
 */
export function SketchfabEmbed({ embed, variant = "panel", className }: SketchfabEmbedProps) {
  const [loaded, setLoaded] = React.useState(false);
  const frame = embedFrameAttributes(embed);

  return (
    <div className={cn("flex flex-col", variant === "card" ? "h-full" : "gap-2", className)}>
      <div
        className={cn(
          "relative overflow-hidden ring-1 ring-inset ring-white/10",
          variant === "card"
            ? "h-full rounded-2xl bg-void/35 backdrop-blur-[2px]"
            : "aspect-video rounded-[var(--radius-card)] bg-void/60",
        )}
      >
        {loaded ? (
          <iframe {...frame} className="absolute inset-0 size-full border-0" />
        ) : (
          <button
            type="button"
            onClick={() => setLoaded(true)}
            className="group/embed absolute inset-0 grid cursor-pointer place-items-center gap-2 text-center"
            aria-label={`Load the interactive 3D model "${embed.title}" by ${embed.author} from Sketchfab`}
          >
            <span
              className="absolute inset-0"
              style={{ background: "radial-gradient(120% 100% at 50% 0%, rgba(28,170,217,0.22), transparent 70%)" }}
              aria-hidden
            />
            <span className="relative flex flex-col items-center gap-1.5 px-3">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full bg-void/80 font-semibold text-neon ring-1 ring-neon/35 backdrop-blur transition-colors group-hover/embed:bg-void/70",
                  variant === "card" ? "px-2.5 py-1.5 text-[11px]" : "px-4 py-2 text-sm",
                )}
              >
                <Box className={variant === "card" ? "size-3.5" : "size-4"} />
                {variant === "card" ? "View in 3D" : "Load the 3D model"}
              </span>
              {variant === "panel" ? (
                <span className="text-[11px] text-white/50">
                  {embed.title} — {embed.faceCount ? `${embed.faceCount.toLocaleString()} faces, ` : ""}loads from sketchfab.com
                </span>
              ) : null}
            </span>
          </button>
        )}
      </div>

      {/* The licence line. Rendered in both states, on purpose. */}
      <p className={cn("leading-relaxed text-white/40", variant === "card" ? "mt-1.5 text-[10px]" : "mt-2 text-[11px]")}>
        {variant === "card" ? null : "Sketchfab: "}
        <a
          href={embed.sourceUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="text-white/60 underline decoration-white/20 underline-offset-2 transition-colors hover:text-neon"
        >
          {embed.title}
        </a>
        {" by "}
        <a
          href={embed.authorUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="text-white/60 underline decoration-white/20 underline-offset-2 transition-colors hover:text-neon"
        >
          {embed.author}
        </a>
        {" — "}
        {embed.licenseLabel}
        <a
          href={embed.sourceUrl}
          target="_blank"
          rel="noreferrer noopener"
          aria-label="Open the model page on Sketchfab"
          className="ml-1 inline-flex align-text-bottom text-white/45 transition-colors hover:text-neon"
        >
          <ExternalLink className="size-3" />
        </a>
        {variant === "panel" ? <span className="block text-white/30">Licence last checked {embed.checkedAt}.</span> : null}
      </p>
    </div>
  );
}
