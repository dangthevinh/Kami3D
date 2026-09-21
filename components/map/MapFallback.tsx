import { Map as MapIcon } from "lucide-react";

/**
 * Shown when the map cannot start.
 *
 * MapLibre needs WebGL, and so does every 3D viewer in this product - but a map page
 * that says "your browser cannot do this" and stops is a dead end. This one states the
 * problem, says what the map would have shown, and links somewhere useful instead.
 */
export function MapFallback({
  speciesCount,
  regionCount,
  message = "This browser cannot start WebGL, so the map cannot be drawn.",
}: {
  speciesCount: number;
  regionCount: number;
  message?: string;
}) {
  return (
    <div className="grid h-full w-full place-items-center rounded-[var(--radius-card)] bg-gradient-to-br from-surface to-abyss p-6 ring-1 ring-white/8">
      <div className="max-w-md text-center">
        <MapIcon className="mx-auto size-8 text-white/35" aria-hidden />
        <p className="mt-3 text-sm font-medium text-white/75">{message}</p>
        <p className="mt-2 text-xs leading-relaxed text-white/45">
          The habitat layer holds {speciesCount} species across {regionCount} regions, and every one of them is
          still browsable without a map.
        </p>
        <a
          href="/explore"
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/8 px-4 py-2 text-xs font-medium text-white/80 ring-1 ring-white/12 transition-colors hover:bg-white/14 hover:text-white"
        >
          Browse the catalogue instead
        </a>
      </div>
    </div>
  );
}
