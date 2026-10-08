"use client";

import { Check, Share2 } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Share a catalogue entry.
 *
 * The animal cards carry a heart and no share control, so this is one step past parity rather than a
 * copy of it - and it is written once, here, because the second subject that needs it should not have
 * to invent a second behaviour.
 *
 * Two paths, in order: the **system share sheet** when the browser has one (a phone, mostly), and
 * otherwise the clipboard with the button saying "Copied" for a moment. Nothing is sent anywhere: the
 * only thing that leaves the page is the URL the visitor is already looking at.
 */
export interface ShareButtonProps {
  /** The absolute or root-relative URL to share. A path is resolved against the current origin. */
  href: string;
  title: string;
  /** One line of context for the share sheet. */
  text?: string;
  className?: string;
}

export function ShareButton({ href, title, text, className }: ShareButtonProps) {
  const [copied, setCopied] = React.useState(false);
  const timer = React.useRef<number | null>(null);

  React.useEffect(() => {
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);

  async function onClick(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();

    const url = new URL(href, window.location.origin).toString();

    try {
      if (navigator.share) {
        await navigator.share({ title, text, url });
        return;
      }
    } catch {
      // A cancelled share sheet is not a failure, and a browser that refuses to share falls through to
      // the clipboard rather than doing nothing.
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard denied (an insecure origin, or a permission): say nothing rather than lie.
    }
  }

  return (
    <Button
      type="button"
      onClick={onClick}
      variant="secondary"
      size="icon"
      aria-label={"Share " + title}
      title={copied ? "Link copied" : "Share"}
      className={cn("size-9", className)}
    >
      {copied ? <Check className="text-neon" /> : <Share2 />}
    </Button>
  );
}
