import "server-only";

import { publishUploadedModel, type PublishReport } from "@/lib/model-publish";
import { UPLOAD_PREFIXES, sidecarName, slugFromFilename, validateUploadMeta } from "@/lib/model-upload";
import { ASSET_BUCKET } from "@/lib/supabase";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * The inbox: the automatic half of "an admin brings a model".
 *
 * A form needs somebody to fill it in; an inbox does not. An admin drops `<slug>.glb` - and, next to
 * it, `<slug>.json` with the credit - into `animal-assets/uploads/inbox/`, and the app's clock picks
 * it up (the same tick that drives the auto-pilot) or the admin presses a button. Both end up in
 * `publishUploadedModel()`, so the budget, the licence rule, the DRACO step and the card decision are
 * the ones that always apply.
 *
 * The folder *is* the permission: only the service role can write there, and a file is processed by
 * being **moved out** of the inbox, which is also what stops a second run from publishing it twice.
 * A file without a usable sidecar is moved to `rejected/` with a `.reason.txt` beside it, because a
 * silent refusal is the one outcome an admin cannot act on.
 */

export interface InboxItem {
  name: string;
  slug: string;
  /** Bytes as the bucket reports them, or null when it does not say. */
  bytes: number | null;
  hasSidecar: boolean;
}

export interface IngestItemReport {
  name: string;
  slug: string;
  outcome: "published" | "rejected" | "failed";
  reason: string | null;
  cardEligible: boolean;
  storedBytes: number;
}

export interface IngestReport {
  ok: boolean;
  reason: string | null;
  seen: number;
  published: number;
  rejected: number;
  failed: number;
  items: IngestItemReport[];
}

const EMPTY: IngestReport = { ok: false, reason: null, seen: 0, published: 0, rejected: 0, failed: 0, items: [] };

/** What is in the inbox right now, without touching any of it. */
export async function readInbox(): Promise<InboxItem[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data, error } = await supabase.storage.from(ASSET_BUCKET).list(UPLOAD_PREFIXES.inbox, { limit: 200, sortBy: { column: "name", order: "asc" } });
  if (error || !data) return [];

  const names = data.map((entry) => entry.name);
  const sidecars = new Set(names.filter((name) => name.endsWith(".json")));

  return names
    .filter((name) => name.toLowerCase().endsWith(".glb"))
    .map((name) => {
      const slug = slugFromFilename(name);
      const entry = data.find((candidate) => candidate.name === name);
      const size = entry?.metadata && typeof entry.metadata.size === "number" ? entry.metadata.size : null;
      return { name, slug, bytes: size, hasSidecar: sidecars.has(sidecarName(slug)) };
    });
}

async function moveObject(from: string, to: string): Promise<{ ok: boolean; reason: string | null }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, reason: "no storage client" };

  const { data, error } = await supabase.storage.from(ASSET_BUCKET).download(from);
  if (error || !data) return { ok: false, reason: "could not read " + from + ": " + (error?.message ?? "no data") };

  const bytes = new Uint8Array(await data.arrayBuffer());
  const isJson = to.endsWith(".json") || to.endsWith(".txt");
  const uploaded = await supabase.storage.from(ASSET_BUCKET).upload(to, bytes, {
    contentType: isJson ? "application/json" : "model/gltf-binary",
    upsert: true,
  });
  if (uploaded.error) return { ok: false, reason: "could not write " + to + ": " + uploaded.error.message };

  const removed = await supabase.storage.from(ASSET_BUCKET).remove([from]);
  if (removed.error) return { ok: false, reason: "copied to " + to + " but could not clear " + from + ": " + removed.error.message };
  return { ok: true, reason: null };
}

/**
 * Process everything waiting in the inbox, one file at a time.
 *
 * `actor` is recorded against every budget reservation, so the log answers "who published this"
 * with a real id rather than "the system".
 */
export async function ingestInbox({ actor }: { actor: string }): Promise<IngestReport> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ...EMPTY, reason: "the inbox needs Supabase: the budget and the bucket are both there" };

  const items = await readInbox();
  if (items.length === 0) return { ...EMPTY, ok: true, reason: "the inbox is empty" };

  const report: IngestReport = { ok: true, reason: null, seen: items.length, published: 0, rejected: 0, failed: 0, items: [] };

  for (const item of items) {
    const modelPath = UPLOAD_PREFIXES.inbox + "/" + item.name;
    const sidecarPath = UPLOAD_PREFIXES.inbox + "/" + sidecarName(item.slug);

    const reject = async (reason: string, outcome: IngestItemReport["outcome"] = "rejected") => {
      await supabase.storage.from(ASSET_BUCKET).upload(UPLOAD_PREFIXES.rejected + "/" + item.name + ".reason.txt", new Blob([reason]), { contentType: "text/plain", upsert: true });
      await moveObject(modelPath, UPLOAD_PREFIXES.rejected + "/" + item.name);
      if (item.hasSidecar) await moveObject(sidecarPath, UPLOAD_PREFIXES.rejected + "/" + sidecarName(item.slug));
      report[outcome === "failed" ? "failed" : "rejected"] += 1;
      report.items.push({ name: item.name, slug: item.slug, outcome, reason, cardEligible: false, storedBytes: 0 });
    };

    // A credit is required, and it is read before the file: publishing first and asking later is how
    // an unlicensed model ends up on a species page.
    if (!item.hasSidecar) {
      await reject("no sidecar: upload " + sidecarName(item.slug) + " beside the model with title, author and licence");
      continue;
    }

    const sidecar = await supabase.storage.from(ASSET_BUCKET).download(sidecarPath);
    if (sidecar.error || !sidecar.data) {
      await reject("the sidecar could not be read: " + (sidecar.error?.message ?? "no data"));
      continue;
    }

    let sidecarJson: unknown;
    try {
      sidecarJson = JSON.parse(await sidecar.data.text());
    } catch (error) {
      await reject("the sidecar is not valid JSON: " + String(error).split("\n")[0]);
      continue;
    }

    const parsed = validateUploadMeta(sidecarJson);
    if (!parsed.ok) {
      await reject("the credit is not usable: " + parsed.error);
      continue;
    }

    const file = await supabase.storage.from(ASSET_BUCKET).download(modelPath);
    if (file.error || !file.data) {
      await reject("the model could not be read: " + (file.error?.message ?? "no data"), "failed");
      continue;
    }

    const bytes = new Uint8Array(await file.data.arrayBuffer());
    const published: PublishReport = await publishUploadedModel({
      actor,
      slug: item.slug,
      filename: item.name,
      bytes,
      meta: parsed.meta,
      drawOnCard: parsed.meta.note !== "no-card",
      origin: "inbox",
    });

    if (!published.ok) {
      await reject(published.reason ?? "the publish failed", published.reason?.includes("budget") ? "rejected" : "failed");
      continue;
    }

    await moveObject(modelPath, UPLOAD_PREFIXES.published + "/" + item.name);
    await moveObject(sidecarPath, UPLOAD_PREFIXES.published + "/" + sidecarName(item.slug));

    report.published += 1;
    report.items.push({
      name: item.name,
      slug: item.slug,
      outcome: "published",
      reason: published.reason,
      cardEligible: published.cardEligible,
      storedBytes: published.storedBytes,
    });
  }

  return report;
}
