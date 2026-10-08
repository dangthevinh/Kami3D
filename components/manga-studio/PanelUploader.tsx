"use client";

import { ImagePlus, Loader2, Upload } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { errorText, mangaRequest } from "@/components/manga-studio/api";
import type { MangaPanel } from "@/lib/manga/types";
import { cn } from "@/lib/utils";

/**
 * The upload half of the panel pipeline.
 *
 * This is the path that always works. The AI route can be unconfigured, rate limited or down, and the
 * brief for this phase says it plainly: missing keys must never leave the studio unable to make a
 * panel. So the file input is a first-class door, not a fallback that appears when the other one
 * fails.
 *
 * The size cap is the bucket's (8 MB per panel, images only). It is checked here as well as on the
 * server, for the one reason a client check is ever worth having: a 40 MB phone photo should not have
 * to travel the network to be refused.
 */

export const PANEL_MAX_BYTES = 8 * 1024 * 1024;
export const PANEL_ACCEPT = "image/png,image/jpeg,image/webp,image/gif";

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  if (bytes >= 1024) return Math.round(bytes / 1024) + " kB";
  return bytes + " B";
}

export function PanelUploader({
  chapterId,
  onUploaded,
  className,
}: {
  chapterId: string;
  /** Called with the panel the server stored, so the strip can grow without a refetch. */
  onUploaded?: (panel: MangaPanel) => void;
  className?: string;
}) {
  const [file, setFile] = React.useState<File | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const preview = React.useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  React.useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function choose(event: React.ChangeEvent<HTMLInputElement>) {
    const picked = event.target.files?.[0] ?? null;
    setDone(null);
    setError(null);
    if (picked && picked.size > PANEL_MAX_BYTES) {
      setFile(null);
      setError(picked.name + " is " + formatBytes(picked.size) + "; the limit is " + formatBytes(PANEL_MAX_BYTES) + " per panel.");
      return;
    }
    setFile(picked);
  }

  async function upload() {
    if (!file || busy) return;
    setBusy(true);
    setError(null);
    setDone(null);

    const body = new FormData();
    body.set("file", file);

    try {
      const data = await mangaRequest<{ panel: MangaPanel }>(
        "/api/manga/chapters/" + encodeURIComponent(chapterId) + "/panels",
        { method: "POST", body },
      );
      setDone("Uploaded — the panel is in the strip below.");
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      onUploaded?.(data.panel);
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={cn("glass rounded-[var(--radius-card)] p-5", className)} aria-labelledby="panel-upload">
      <h2 id="panel-upload" className="flex items-center gap-2 text-sm font-semibold text-white/85">
        <ImagePlus className="size-4 text-neon" aria-hidden />
        Upload a panel
      </h2>
      <p className="mt-1 text-xs leading-relaxed text-white/50">
        PNG, JPEG, WebP or GIF, up to {formatBytes(PANEL_MAX_BYTES)} — the cap the storage bucket enforces. The image
        is stored and the row records its URL and size.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-[9rem_minmax(0,1fr)]">
        <div className="grid h-24 place-items-center overflow-hidden rounded-xl bg-white/5 ring-1 ring-white/10">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element -- a local object URL, never a remote host.
            <img src={preview} alt="The file you chose" className="size-full object-cover" />
          ) : (
            <span className="text-[11px] text-white/35">No file chosen</span>
          )}
        </div>

        <div className="space-y-3">
          <label className="block">
            <span className="text-[11px] font-medium uppercase tracking-wide text-white/45">Image file</span>
            <input
              ref={inputRef}
              type="file"
              accept={PANEL_ACCEPT}
              onChange={choose}
              className="mt-1 w-full rounded-xl bg-white/6 px-3 py-2 text-xs text-white ring-1 ring-white/12 outline-none file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-xs file:text-white focus:ring-neon/50"
            />
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" size="sm" disabled={!file || busy} onClick={() => void upload()}>
              {busy ? <Loader2 className="animate-spin" aria-hidden /> : <Upload aria-hidden />}
              {busy ? "Uploading…" : "Upload panel"}
            </Button>
            {file ? <span className="text-[11px] text-white/40">{formatBytes(file.size)}</span> : null}
          </div>

          {done ? (
            <p role="status" className="text-xs text-neon">
              {done}
            </p>
          ) : null}
          {error ? (
            <p role="alert" className="rounded-xl bg-coral/10 px-3 py-2 text-xs leading-relaxed text-coral ring-1 ring-coral/25">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
