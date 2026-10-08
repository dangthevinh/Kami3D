"use client";

import { Loader2, Sparkles, TriangleAlert } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { errorText, mangaRequest } from "@/components/manga-studio/api";
import { useMangaQuery } from "@/components/manga-studio/hooks";
import type { MangaAiStatus, MangaPanel } from "@/lib/manga/types";
import { cn } from "@/lib/utils";

/**
 * Generate a panel from a prompt.
 *
 * Three rules from the phase brief are visible in this file:
 *
 *   1. **the reason is on the screen.** `/api/manga/ai/status` answers `{ configured, provider, model,
 *      reason }`, and when `configured` is false the `reason` is rendered as-is - it is the sentence
 *      that names the missing environment variable. A greyed-out button with no explanation is the
 *      failure mode this component exists to avoid;
 *   2. **nothing fails silently.** A prompt with no provider, a provider that returned 500, a timeout,
 *      a rate limit: each of them lands in the same visible `role="alert"` box with the API's own words;
 *   3. **the upload path still works.** The panel below says so and links to the uploader, because a
 *      studio whose AI half is unconfigured is still a studio.
 *
 * The request is one `fetch` through `lib/net-retry.ts` on the server side; nothing about the provider
 * is known here, and no key is ever sent to the browser.
 */

export function AIGenerator({
  chapterId,
  onGenerated,
  className,
}: {
  chapterId: string;
  onGenerated?: (panel: MangaPanel) => void;
  className?: string;
}) {
  const status = useMangaQuery<MangaAiStatus>("/api/manga/ai/status");
  const [prompt, setPrompt] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [made, setMade] = React.useState<MangaPanel | null>(null);

  async function generate() {
    const text = prompt.trim();
    if (text.length === 0 || busy) return;

    setBusy(true);
    setError(null);
    setMade(null);
    try {
      const data = await mangaRequest<{ panel: MangaPanel }>("/api/manga/ai/panel", {
        method: "POST",
        body: { chapterId, prompt: text },
      });
      setMade(data.panel);
      onGenerated?.(data.panel);
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusy(false);
    }
  }

  const ai: MangaAiStatus | null = status.data;
  const blocked = ai ? !ai.configured : status.status === "error";

  return (
    <section className={cn("glass rounded-[var(--radius-card)] p-5", className)} aria-labelledby="ai-panel">
      <h2 id="ai-panel" className="flex items-center gap-2 text-sm font-semibold text-white/85">
        <Sparkles className="size-4 text-iris" aria-hidden />
        Generate a panel
      </h2>

      {status.status === "loading" ? (
        <p className="mt-2 text-xs text-white/45">Checking whether an AI provider is configured…</p>
      ) : null}

      {status.status === "error" ? (
        <p role="alert" className="mt-2 rounded-xl bg-coral/10 px-3 py-2 text-xs leading-relaxed text-coral ring-1 ring-coral/25">
          {status.error}
        </p>
      ) : null}

      {ai ? (
        ai.configured ? (
          <p className="mt-2 text-xs leading-relaxed text-white/50">
            Provider <span className="text-white/75">{ai.provider ?? "configured"}</span>
            {ai.model ? (
              <>
                {" · model "}
                <span className="text-white/75">{ai.model}</span>
              </>
            ) : null}
            . The image is fetched by the server, stored in the panel bucket, and the prompt, provider and model are
            recorded with it.
          </p>
        ) : (
          <div className="mt-3 rounded-xl bg-solar/10 p-3 ring-1 ring-solar/25">
            <p className="flex items-center gap-2 text-xs font-medium text-solar">
              <TriangleAlert className="size-3.5" aria-hidden />
              No AI provider is configured
            </p>
            <p className="mt-1 text-xs leading-relaxed text-white/70">
              {ai.reason ?? "The server did not say why, only that it is not configured."}
            </p>
            <p className="mt-2 text-[11px] leading-relaxed text-white/45">
              Everything else in the studio works without it: upload the panels you already have, and the AI route
              can be configured later without touching a chapter.
            </p>
          </div>
        )
      ) : null}

      <label className="mt-4 block">
        <span className="text-[11px] font-medium uppercase tracking-wide text-white/45">Prompt</span>
        <textarea
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          rows={4}
          maxLength={1000}
          placeholder="A rain-soaked rooftop at dusk, one figure under a lantern, wide shot"
          className="mt-1 w-full rounded-xl bg-white/6 px-3.5 py-2.5 text-sm text-white placeholder:text-white/40 ring-1 ring-white/12 outline-none transition focus:bg-white/10 focus:ring-2 focus:ring-neon/60"
        />
      </label>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button type="button" variant="iris" size="sm" disabled={busy || prompt.trim().length === 0} onClick={() => void generate()}>
          {busy ? <Loader2 className="animate-spin" aria-hidden /> : <Sparkles aria-hidden />}
          {busy ? "Generating…" : "Generate panel"}
        </Button>
        {busy ? (
          <span role="status" className="text-[11px] text-white/45">
            The provider can take up to a minute. Nothing else on this page is blocked.
          </span>
        ) : null}
        {blocked && !busy ? (
          <span className="text-[11px] text-white/45">Expected to fail until a provider is configured — the error is shown here.</span>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="mt-3 rounded-xl bg-coral/10 px-3 py-2 text-xs leading-relaxed text-coral ring-1 ring-coral/25">
          {error}
        </p>
      ) : null}

      {made ? (
        <figure className="mt-4 overflow-hidden rounded-xl ring-1 ring-white/10">
          {/* eslint-disable-next-line @next/next/no-img-element -- an AI-generated file on the panel bucket. */}
          <img src={made.imageUrl} alt="The generated panel" className="w-full object-cover" loading="lazy" />
          <figcaption className="space-y-1 bg-white/5 px-3 py-2 text-[11px] leading-relaxed text-white/50">
            <span className="block text-neon">Added to the panel strip.</span>
            <span className="block">
              {made.aiProvider ?? "provider unknown"} · {made.aiModel ?? "model unknown"}
            </span>
            {made.aiPrompt ? <span className="block text-white/40">“{made.aiPrompt}”</span> : null}
          </figcaption>
        </figure>
      ) : null}
    </section>
  );
}
