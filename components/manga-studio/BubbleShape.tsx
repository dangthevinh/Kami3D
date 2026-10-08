import type { ReactNode } from "react";

import { BUBBLE_STYLE, type BubbleType } from "@/lib/manga-layout";
import { cn } from "@/lib/utils";

/**
 * One speech bubble, drawn.
 *
 * The look of each kind lives in `lib/manga-layout.ts` (`BUBBLE_STYLE`) rather than here, so the
 * composer and the reader cannot disagree about what a thought bubble is. This component only turns
 * that description into classes - a cloud is a very round rectangle, a narration box is square, a
 * scream is a sixteen-point burst cut with `clip-path`. No tails: a tail is a second rectangle that
 * has to be clamped as well, and the layout maths does not describe one yet, so the bubble says so by
 * simply not having one rather than by having a wrong one.
 */

export const BUBBLE_LABELS: Record<BubbleType, string> = {
  speech: "Speech",
  thought: "Thought",
  narration: "Narration",
  scream: "Scream",
};

/** The burst of a scream bubble: sixteen alternating points, cut out of the box. */
const SPIKY =
  "[clip-path:polygon(50%_0%,61%_18%,82%_8%,79%_31%,100%_50%,79%_69%,82%_92%,61%_82%,50%_100%,39%_82%,18%_92%,21%_69%,0%_50%,21%_31%,18%_8%,39%_18%)]";

const SHAPE: Record<string, string> = {
  round: "rounded-full",
  cloud: "rounded-[45%]",
  box: "rounded-[0.35rem]",
  spiky: SPIKY + " rounded-[30%]",
};

export interface BubbleFaceProps {
  bubbleType: BubbleType;
  className?: string;
}

/** Just the silhouette, for a palette button or a legend swatch. */
export function BubbleFace({ bubbleType, className }: BubbleFaceProps) {
  return (
    <span
      aria-hidden
      className={cn(
        "block size-6 border border-white/45 bg-white/85",
        SHAPE[BUBBLE_STYLE[bubbleType].shape],
        className,
      )}
    />
  );
}

export interface BubbleShapeProps {
  bubbleType: BubbleType;
  children: ReactNode;
  className?: string;
}

/**
 * A bubble holding text, sized by its container.
 *
 * The type is printed on the bubble as well as shaping it: shape alone is a convention readers know,
 * and a screen reader does not.
 */
export function BubbleShape({ bubbleType, children, className }: BubbleShapeProps) {
  const style = BUBBLE_STYLE[bubbleType];
  const spoken = typeof children === "string" && children.trim().length > 0;

  return (
    <span
      data-bubble-type={bubbleType}
      className={cn(
        "flex h-full w-full items-center justify-center overflow-hidden border border-white/50 bg-white/88 px-2 py-1 text-center leading-tight text-void",
        SHAPE[style.shape],
        className,
      )}
      style={{ fontWeight: style.weight, fontStyle: style.italic ? "italic" : "normal" }}
    >
      {spoken ? children : <span className="sr-only">{BUBBLE_LABELS[bubbleType]} bubble, empty</span>}
    </span>
  );
}
