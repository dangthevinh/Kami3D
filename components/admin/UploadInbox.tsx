"use client";

import { Inbox, Loader2, Play } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { fileSizeLabel } from "@/lib/model-upload";

/**
 * The automatic door: a folder in Storage that the app watches.
 *
 * The panel shows what is waiting and can process it on the spot, but it does not have to: the same
 * tick that drives the auto-pilot checks the inbox, so an admin who drops a file and closes the tab
 * still gets it published. Both routes call `ingestInbox()`, which calls the same publish function
 * the form calls - one set of rules, two ways in.
 */

interface InboxItem {
  name: string;
  slug: string;
  bytes: number | null;
  hasSidecar: boolean;
}

interface IngestReport {
  ok: boolean;
  reason: string | null;
  seen: number;
  published: number;
  rejected: number;
  failed: number;
  items: { name: string; slug: string; outcome: string; reason: string | null; cardEligible: boolean }[];
}

export function UploadInbox({ items, folder }: { items: InboxItem[]; folder: string }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [report, setReport] = React.useState<IngestReport | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function process() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/models/inbox", { method: "POST" });
      const data = (await response.json().catch(() => null)) as IngestReport | null;
      if (!data) throw new Error("HTTP " + response.status);
      setReport(data);
      if (!data.ok) setError(data.reason ?? "the inbox could not be processed");
      router.refresh();
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs leading-relaxed text-white/55">
        Drop <code className="text-white/75">{"<slug>.glb"}</code> and <code className="text-white/75">{"<slug>.json"}</code>{" "}
        (title, author, licence, sourceUrl) into <code className="text-white/75">{folder}</code> in the{" "}
        <code className="text-white/75">animal-assets</code> bucket. The app checks that folder on every tick, or press the
        button. A file without a usable credit is moved to <code className="text-white/75">uploads/rejected/</code> with a{" "}
        <code className="text-white/75">.reason.txt</code> beside it; a published one goes to{" "}
        <code className="text-white/75">uploads/published/</code> so it is never processed twice.
      </p>

      {items.length === 0 ? (
        <p className="flex items-center gap-2 text-xs text-white/45">
          <Inbox className="size-3.5" aria-hidden /> the inbox is empty
        </p>
      ) : (
        <ul className="divide-y divide-white/8 rounded-xl bg-white/4 ring-1 ring-white/10">
          {items.map((item) => (
            <li key={item.name} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-xs">
              <span className="text-white/75">{item.name}</span>
              <span className="text-white/45">
                {item.slug} · {item.bytes === null ? "size unknown" : fileSizeLabel(item.bytes)} ·{" "}
                {item.hasSidecar ? "credit found" : "NO credit sidecar"}
              </span>
            </li>
          ))}
        </ul>
      )}

      <Button size="sm" variant="outline" disabled={busy || items.length === 0} onClick={process}>
        {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Play className="size-4" aria-hidden />}
        Process the inbox now
      </Button>

      {error ? <p className="text-xs text-amber-200/90">{error}</p> : null}

      {report ? (
        <div className="rounded-xl bg-black/40 p-3 text-xs text-white/70 ring-1 ring-white/10">
          <p className="text-[11px] font-medium uppercase tracking-wide text-white/45">
            {report.published} published · {report.rejected} rejected · {report.failed} failed, out of {report.seen}
          </p>
          {report.items.map((item) => (
            <p key={item.name} className="mt-1">
              <span className={item.outcome === "published" ? "text-neon" : "text-amber-200/90"}>{item.outcome}</span>{" "}
              {item.name}
              {item.reason ? " — " + item.reason : ""}
              {item.outcome === "published" ? (item.cardEligible ? " (on the card)" : " (species page only)") : ""}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}
