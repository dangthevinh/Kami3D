"use client";

import { Sparkles, X } from "lucide-react";
import dynamic from "next/dynamic";
import * as React from "react";

import { Button } from "@/components/ui/button";
import type { Animal } from "@/types/animal";

/**
 * The 3D half of the hybrid map view: the species selected on the map, in three dimensions.
 *
 * Four rules shape it, and they are why this is a component rather than a link:
 *
 *   1. **it mounts when the visitor opens it** - never on hover and never on selection. The map
 *      already owns a WebGL context, and a viewer that appeared because a pointer moved would
 *      create a second one on every pass over a shape;
 *   2. **it is the only second context** the page is allowed. Closing it unmounts the canvas, which
 *      is also what returns the GLB engine memory (`lib/three-dispose.ts`);
 *   3. **on a phone the map is unmounted while it is open** - done by `MapExperience`, not by CSS.
 *      A canvas hidden with `display: none` is still a context;
 *   4. **it fetches the species it needs**. The map payload carries a light record per species, and
 *      pulling twenty-four encyclopaedia entries into it for a viewer most visitors never open would
 *      be the wrong trade, so `/api/animals/[slug]` answers when the panel actually opens.
 *
 * The viewer module is `next/dynamic` with `ssr: false`: three.js sits behind that import, and
 * `check:bundle` fails if it ever reaches the first paint of a content route.
 */

const ModelViewer = dynamic(() => import("@/components/3d/ModelViewer").then((mod) => mod.ModelViewer), {
  ssr: false,
  loading: () => <ViewerPlaceholder message="Loading the model…" />,
});

/**
 * The panel's own placeholder, written here rather than imported.
 *
 * It used to be `CanvasFallback` from `components/3d/CanvasShell` - one import, and `check:bundle`
 * caught what it cost: that module imports `@react-three/fiber` at the top, so a *fallback* for the
 * 3D viewer pulled three.js into `/map`'s initial chunks, 377 kB of them. The marker
 * `WebGLRenderer` in `scripts/bundle-budget.mjs` is what noticed, and the lesson is the phase's own
 * rule: nothing on this route may reference the 3D stack except behind `next/dynamic`.
 */
function ViewerPlaceholder({ message }: { message: string }) {
  return (
    <div className="grid h-full w-full place-items-center rounded-[var(--radius-card)] bg-gradient-to-br from-surface to-abyss ring-1 ring-white/8">
      <p className="px-6 text-center text-sm text-white/50">{message}</p>
    </div>
  );
}

export interface HybridModelPanelProps {
  /** The light record the map already has. */
  slug: string;
  name: string;
  emoji?: string | null;
  /** Rendered under the canvas: what the map is doing while the model is open. */
  note: string;
  onClose: () => void;
}

type LoadState =
  | { status: "loading" }
  | { status: "ready"; animal: Animal }
  | { status: "failed"; reason: string };

export function HybridModelPanel({ slug, name, emoji, note, onClose }: HybridModelPanelProps) {
  const [state, setState] = React.useState<LoadState>({ status: "loading" });

  React.useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });

    fetch(`/api/animals/${encodeURIComponent(slug)}`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return (await response.json()) as Animal;
      })
      .then((animal) => {
        if (!cancelled) setState({ status: "ready", animal });
      })
      .catch((error: Error) => {
        if (!cancelled) setState({ status: "failed", reason: error.message });
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  return (
    <section className="glass flex h-full flex-col overflow-hidden rounded-[var(--radius-card)]" aria-label={`${name} in three dimensions`}>
      <header className="flex items-center justify-between gap-2 px-4 pt-4">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">
            <Sparkles className="size-3 text-neon" aria-hidden />
            3D view
          </p>
          <p className="mt-0.5 truncate text-sm font-medium text-white/85">
            {emoji ? <span aria-hidden className="mr-1.5">{emoji}</span> : null}
            {name}
          </p>
        </div>

        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close the 3D view">
          <X />
        </Button>
      </header>

      <div className="mt-3 min-h-[280px] flex-1 px-1.5 pb-1.5">
        {state.status === "ready" ? (
          <ModelViewer animal={state.animal} className="h-full w-full" />
        ) : state.status === "loading" ? (
          <ViewerPlaceholder message="Loading the model…" />
        ) : (
          <ViewerPlaceholder message={`The 3D view could not load this species (${state.reason}).`} />
        )}
      </div>

      <p className="px-4 pb-4 text-[10px] leading-relaxed text-white/40">{note}</p>
    </section>
  );
}
