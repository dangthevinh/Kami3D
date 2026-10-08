import "server-only";

import { publishUploadedModel, type PublishReport } from "@/lib/model-publish";
import { UPLOAD_PREFIXES, sidecarName, slugFromFilename, validateUploadMeta } from "@/lib/model-upload";
import { getR2Store, r2StorageStatus, type R2Store } from "@/lib/r2-storage";
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
 * The folder *is* the permission: the inbox lives in the R2 bucket, which only this server can write
 * to (the credentials never leave the server), and a file is processed by being **moved out** of the
 * inbox, which is also what stops a second run from publishing it twice. A file without a usable
 * sidecar is moved to `rejected/` with a `.reason.txt` beside it, because a silent refusal is the one
 * outcome an admin cannot act on.
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
  const store = getR2Store();
  if (!store) return [];

  const listed = await store.list(UPLOAD_PREFIXES.inbox, 200);
  if (!listed.ok) return [];

  const entries = listed.value;
  const sidecars = new Set(entries.filter((entry) => entry.name.endsWith(".json")).map((entry) => entry.name));

  return entries
    .filter((entry) => entry.name.toLowerCase().endsWith(".glb"))
    .map((entry) => {
      const slug = slugFromFilename(entry.name);
      return { name: entry.name, slug, bytes: entry.size, hasSidecar: sidecars.has(sidecarName(slug)) };
    });
}

/**
 * Move one object: read it, write it, then clear the original.
 *
 * The order is the whole safety argument. A delete-first move would lose the file if the write failed,
 * and a write without a delete would publish it twice on the next tick. If the write succeeds and the
 * delete does not, the caller is told **exactly that** — "copied, could not clear" is a different
 * situation from "nothing happened", and an admin can only act on the difference.
 */
async function moveObject(store: R2Store, from: string, to: string): Promise<{ ok: boolean; reason: string | null }> {
  const source = await store.get(from);
  if (!source.ok) return { ok: false, reason: "could not read " + from + ": " + source.reason };

  const isText = to.endsWith(".json") || to.endsWith(".txt");
  const written = await store.put(to, source.value, {
    contentType: isText ? "application/json" : "model/gltf-binary",
    // The inbox is a staging area, not a CDN: what lands here must never be cached by a browser.
    cacheControl: "no-store",
  });
  if (!written.ok) return { ok: false, reason: "could not write " + to + ": " + written.reason };

  const cleared = await store.remove([from]);
  if (!cleared.ok) return { ok: false, reason: "copied to " + to + " but could not clear " + from + ": " + cleared.reason };
  return { ok: true, reason: null };
}

/**
 * Process everything waiting in the inbox, one file at a time.
 *
 * `actor` is recorded against every budget reservation, so the log answers "who published this"
 * with a real id rather than "the system".
 */
export async function ingestInbox({ actor }: { actor: string }): Promise<IngestReport> {
  // Two systems, two failures, two sentences: Supabase owns the budget and the catalogue, R2 owns the
  // bytes. Saying "Supabase is missing" when R2 is what is missing would send an operator to the wrong
  // dashboard.
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ...EMPTY, reason: "the inbox needs Supabase: the download budget and the catalogue are both there" };

  const store = getR2Store();
  if (!store) return { ...EMPTY, reason: "the inbox needs an object store: " + r2StorageStatus() };

  const items = await readInbox();
  if (items.length === 0) return { ...EMPTY, ok: true, reason: "the inbox is empty" };

  const report: IngestReport = { ok: true, reason: null, seen: items.length, published: 0, rejected: 0, failed: 0, items: [] };

  for (const item of items) {
    const modelPath = UPLOAD_PREFIXES.inbox + "/" + item.name;
    const sidecarPath = UPLOAD_PREFIXES.inbox + "/" + sidecarName(item.slug);

    const reject = async (reason: string, outcome: IngestItemReport["outcome"] = "rejected") => {
      const rejectedName = UPLOAD_PREFIXES.rejected + "/" + item.name;
      // The reason first, and deliberately: if moving the file then fails, the explanation is already
      // sitting next to it, which is the only thing that makes a failed move diagnosable.
      await store.put(rejectedName + ".reason.txt", new TextEncoder().encode(reason), {
        contentType: "text/plain",
        cacheControl: "no-store",
      });
      await moveObject(store, modelPath, rejectedName);
      if (item.hasSidecar) await moveObject(store, sidecarPath, UPLOAD_PREFIXES.rejected + "/" + sidecarName(item.slug));
      report[outcome === "failed" ? "failed" : "rejected"] += 1;
      report.items.push({ name: item.name, slug: item.slug, outcome, reason, cardEligible: false, storedBytes: 0 });
    };

    // A credit is required, and it is read before the file: publishing first and asking later is how
    // an unlicensed model ends up on a species page.
    if (!item.hasSidecar) {
      await reject("no sidecar: upload " + sidecarName(item.slug) + " beside the model with title, author and licence");
      continue;
    }

    const sidecar = await store.get(sidecarPath);
    if (!sidecar.ok) {
      await reject("the sidecar could not be read: " + sidecar.reason);
      continue;
    }

    let sidecarJson: unknown;
    try {
      sidecarJson = JSON.parse(new TextDecoder().decode(sidecar.value));
    } catch (error) {
      await reject("the sidecar is not valid JSON: " + String(error).split("\n")[0]);
      continue;
    }

    const parsed = validateUploadMeta(sidecarJson);
    if (!parsed.ok) {
      await reject("the credit is not usable: " + parsed.error);
      continue;
    }

    const file = await store.get(modelPath);
    if (!file.ok) {
      await reject("the model could not be read: " + file.reason, "failed");
      continue;
    }

    const bytes = file.value;
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

    await moveObject(store, modelPath, UPLOAD_PREFIXES.published + "/" + item.name);
    await moveObject(store, sidecarPath, UPLOAD_PREFIXES.published + "/" + sidecarName(item.slug));

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
