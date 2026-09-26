"use client";

import { Loader2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { PREVIEW_BUDGET } from "@/lib/model-preview";
import { UPLOAD_LICENSES, fileSizeLabel } from "@/lib/model-upload";

/**
 * The manual door: pick a species, pick a file, say where it came from.
 *
 * The form does not decide anything. It sends the file and the credit to
 * `POST /api/admin/models/upload`, which reserves a budget slot, reads the triangle count out of the
 * GLB itself, compresses it with the same DRACO step the pipeline uses, stores it and wires it to the
 * species - and then reports what happened, refusals included. The licence field is a two-option list
 * because the allow-list is a rule, not a suggestion: CC0 or CC BY, or the upload is refused.
 */

interface UploadReport {
  ok: boolean;
  slug: string;
  bytes: number;
  storedBytes: number;
  triangles: number;
  compressed: boolean;
  storagePath: string | null;
  publicUrl: string | null;
  cardEligible: boolean;
  qualityScore: number | null;
  reason: string | null;
}

export function ModelUploadForm({
  slugs,
  maxBytes,
  remainingToday,
}: {
  slugs: string[];
  maxBytes: number;
  remainingToday: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [report, setReport] = React.useState<UploadReport | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [drawOnCard, setDrawOnCard] = React.useState(true);
  const form = React.useRef<HTMLFormElement>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setReport(null);

    try {
      const body = new FormData(event.currentTarget);
      body.set("drawOnCard", drawOnCard ? "true" : "false");

      const response = await fetch("/api/admin/models/upload", { method: "POST", body });
      const data = (await response.json().catch(() => null)) as UploadReport | null;
      if (!data) throw new Error("HTTP " + response.status);
      if (!data.ok) {
        setReport(data);
        throw new Error(data.reason ?? "the upload was refused");
      }
      setReport(data);
      form.current?.reset();
      router.refresh();
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const input =
    "mt-1 w-full rounded-lg bg-white/6 px-3 py-2 text-sm text-white ring-1 ring-white/12 outline-none focus:ring-neon/50";

  return (
    <form ref={form} onSubmit={submit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-[11px] font-medium uppercase tracking-wide text-white/45">Species</span>
          <select name="slug" className={input} required defaultValue="">
            <option value="" disabled className="bg-night">
              choose a species
            </option>
            {slugs.map((slug) => (
              <option key={slug} value={slug} className="bg-night">
                {slug}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-[11px] font-medium uppercase tracking-wide text-white/45">Model file (.glb)</span>
          <input
            name="file"
            type="file"
            accept=".glb,model/gltf-binary"
            required
            className={input + " file:mr-3 file:rounded-md file:border-0 file:bg-white/10 file:px-2 file:py-1 file:text-xs file:text-white"}
          />
          <span className="mt-1 block text-[10px] text-white/35">
            up to {fileSizeLabel(maxBytes)} (the policy&apos;s per-model cap) · {remainingToday} budget slot(s) left today
          </span>
        </label>

        <label className="block">
          <span className="text-[11px] font-medium uppercase tracking-wide text-white/45">Title</span>
          <input name="title" className={input} required placeholder="Bengal Tiger (photogrammetry)" />
        </label>

        <label className="block">
          <span className="text-[11px] font-medium uppercase tracking-wide text-white/45">Author / source name</span>
          <input name="author" className={input} required placeholder="who made it" />
        </label>

        <label className="block">
          <span className="text-[11px] font-medium uppercase tracking-wide text-white/45">Licence</span>
          <select name="license" className={input} required defaultValue="">
            <option value="" disabled className="bg-night">
              choose the licence you are publishing under
            </option>
            {UPLOAD_LICENSES.map((license) => (
              <option key={license} value={license} className="bg-night">
                {license}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-[10px] text-white/35">
            no licence, no publish: the allow-list is what keeps the catalogue redistributable
          </span>
        </label>

        <label className="block">
          <span className="text-[11px] font-medium uppercase tracking-wide text-white/45">Source URL (optional)</span>
          <input name="sourceUrl" className={input} placeholder="https://…" />
        </label>
      </div>

      <label className="flex items-center gap-2 text-xs text-white/65">
        <input type="checkbox" checked={drawOnCard} onChange={(event) => setDrawOnCard(event.target.checked)} />
        Draw it on the species card as well (only if it fits the card budget:{" "}
        {(PREVIEW_BUDGET.bytes / 1_048_576).toFixed(1)} MB and {PREVIEW_BUDGET.faces.toLocaleString("en-US")} triangles)
      </label>

      <Button type="submit" size="sm" disabled={busy}>
        {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Upload className="size-4" aria-hidden />}
        Upload and publish
      </Button>

      {error ? <p className="text-xs text-amber-200/90">Refused: {error}</p> : null}

      {report ? (
        <div className="rounded-xl bg-black/40 p-3 text-xs text-white/70 ring-1 ring-white/10">
          <p className="text-[11px] font-medium uppercase tracking-wide text-white/45">This upload</p>
          <p className="mt-1">
            {fileSizeLabel(report.bytes)} in, {fileSizeLabel(report.storedBytes)} stored
            {report.compressed ? " (DRACO)" : " (not compressed)"} · {report.triangles.toLocaleString("en-US")} triangles ·
            quality {report.qualityScore ?? "—"}
          </p>
          <p className="mt-1">
            card: {report.cardEligible ? "yes — the species card will draw it" : "no — the card keeps its silhouette"}
            {report.reason ? " · " + report.reason : ""}
          </p>
          {report.publicUrl ? <p className="mt-1 break-all text-white/40">{report.publicUrl}</p> : null}
        </div>
      ) : null}
    </form>
  );
}
