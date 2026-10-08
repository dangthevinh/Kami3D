"use client";

import { Heart } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { errorText, mangaRequest } from "@/components/manga-studio/api";
import { cn, formatCount } from "@/lib/utils";

/**
 * The like button.
 *
 * Optimistic, and then corrected: the click flips the heart immediately - waiting for a round trip to
 * acknowledge a tap feels broken - but the number that stays on screen is the one the server sent
 * back in `{ liked, likeCount }`. There is no local "+1" arithmetic anywhere in this file, because
 * the day the API decides a like is a no-op (the row already exists, the visitor is the author) the
 * optimistic guess would be permanently wrong on screen.
 *
 * A visitor with no session gets the API's own 401 sentence rather than a dead button.
 */

export function LikeButton({
  projectId,
  initialCount,
  initialLiked = false,
  className,
}: {
  projectId: string;
  initialCount: number;
  /** Only trust this when the server actually said so; it defaults to "not liked". */
  initialLiked?: boolean;
  className?: string;
}) {
  const [liked, setLiked] = React.useState(initialLiked);
  const [count, setCount] = React.useState(initialCount);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onClick() {
    if (busy) return;
    const previous = { liked, count };

    // The optimistic step: the heart moves, the number does not. A count that moves before the
    // server has agreed is the thing that ends up wrong.
    setBusy(true);
    setError(null);
    setLiked(!liked);

    try {
      const result = await mangaRequest<{ liked: boolean; likeCount: number }>(
        "/api/manga/projects/" + encodeURIComponent(projectId) + "/like",
        { method: "POST" },
      );
      setLiked(result.liked);
      setCount(result.likeCount);
    } catch (caught) {
      setLiked(previous.liked);
      setCount(previous.count);
      setError(errorText(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <Button
        type="button"
        variant={liked ? "default" : "secondary"}
        size="sm"
        aria-pressed={liked}
        aria-label={liked ? "Unlike this project" : "Like this project"}
        disabled={busy}
        onClick={onClick}
        className={cn("max-sm:h-11", liked && "bg-coral/90 text-on-accent hover:bg-coral")}
      >
        <Heart className={cn("size-4", liked && "fill-current")} aria-hidden />
        {liked ? "Liked" : "Like"}
        <span className="tabular-nums">{formatCount(count)}</span>
      </Button>

      {error ? (
        <p role="alert" className="text-[11px] leading-relaxed text-coral">
          {error}
        </p>
      ) : null}
    </div>
  );
}
