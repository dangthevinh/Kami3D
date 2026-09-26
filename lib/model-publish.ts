import "server-only";

import { loadNodeModule, runCommand } from "@/lib/child-process";
import { scoreModelQuality } from "@/lib/model-quality";
import {
  attributionFor,
  cardEligible,
  fileSizeLabel,
  parseGlb,
  servedPath,
  validateUploadMeta,
  type GlbFacts,
  type UploadMeta,
} from "@/lib/model-upload";
import { ASSET_BUCKET } from "@/lib/supabase";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * The one place where a file an admin brought becomes a model the site serves.
 *
 * Both doors - the upload form and the Storage inbox - end up here, which is the point: there is no
 * "manual path" and "automatic path" with separate rules. A publish does exactly what the provider
 * pipeline does, in the same order:
 *
 *   1. **reserve** through `public.reserve_model_download()` with `provider = 'upload'`, so the
 *      per-model cap, the total cap, the daily/monthly limits and the licence allow-list all apply.
 *      There is no flag that skips this, and a failure hands the slot back by settling as 'failed';
 *   2. **measure** the file itself - the triangle count comes from the GLB's own JSON chunk;
 *   3. **compress** with the same DRACO step the pipeline uses, when the tool is installed, and only
 *      if it actually makes the file smaller;
 *   4. **store** the model at a timestamped path, so replacing a model is never a stale CDN hit;
 *   5. **record** it in `model_assets` (licence, credit, face count, bytes, path) as the primary one;
 *   6. **wire** `animals.model_url` to the public URL and `animals.preview_eligible` to whether the
 *      card may draw it - the second one is why an upload shows up on a card without a rebuild;
 *   7. **settle** the reservation with the real byte count, keeping the slot or handing it back.
 */

export interface PublishReport {
  ok: boolean;
  slug: string;
  /** Bytes as uploaded, before compression. */
  bytes: number;
  /** Bytes actually stored. */
  storedBytes: number;
  triangles: number;
  compressed: boolean;
  storagePath: string | null;
  publicUrl: string | null;
  cardEligible: boolean;
  qualityScore: number | null;
  reason: string | null;
  facts: GlbFacts | null;
}

/** The bucket's own file_size_limit (supabase/schema.sql). Above it the storage API refuses, not this. */
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

function fail(slug: string, reason: string, extra: Partial<PublishReport> = {}): PublishReport {
  return {
    ok: false,
    slug,
    bytes: extra.bytes ?? 0,
    storedBytes: 0,
    triangles: extra.triangles ?? 0,
    compressed: false,
    storagePath: null,
    publicUrl: null,
    cardEligible: false,
    qualityScore: null,
    reason,
    facts: extra.facts ?? null,
  };
}

/**
 * DRACO, through the same tool the pipeline uses.
 *
 * The CLI is a devDependency, so a production host may not have it; that is a reportable fact, not a
 * silent difference. Compression is only kept when it produces a smaller file, because "compressed"
 * is a claim about a number.
 */
async function compressForStorage(bytes: Uint8Array, filename: string): Promise<{ bytes: Uint8Array; compressed: boolean; note: string | null }> {
  const fs = await loadNodeModule<typeof import("node:fs/promises")>("node:fs/promises");
  const os = await loadNodeModule<typeof import("node:os")>("node:os");
  const path = await loadNodeModule<typeof import("node:path")>("node:path");
  if (!fs || !os || !path) {
    return { bytes, compressed: false, note: "not compressed: this runtime has no filesystem" };
  }

  const { mkdtemp, readFile, rm, writeFile } = fs;
  const { tmpdir } = os;
  const { join } = path;

  const directory = await mkdtemp(join(tmpdir(), "kami-upload-"));
  const source = join(directory, filename);
  const target = join(directory, "draco.glb");

  try {
    await writeFile(source, bytes);
    const result = await runCommand(
      process.execPath,
      [join(process.cwd(), "node_modules", "@gltf-transform", "cli", "bin", "cli.js"), "draco", source, target],
      { timeoutMs: 180_000 },
    );
    if (!result.ok) {
      return { bytes, compressed: false, note: "not compressed: " + (result.spawnError ?? result.stderr.split("\n")[0] ?? "the tool failed") };
    }

    const compressed = new Uint8Array(await readFile(target));
    if (compressed.byteLength === 0 || compressed.byteLength >= bytes.byteLength) {
      return { bytes, compressed: false, note: "not compressed: DRACO produced " + compressed.byteLength + " bytes" };
    }
    return { bytes: compressed, compressed: true, note: null };
  } catch (error) {
    return { bytes, compressed: false, note: "not compressed: " + String(error).split("\n")[0] };
  } finally {
    await rm(directory, { recursive: true, force: true }).catch(() => {});
  }
}

export interface PublishInput {
  actor: string;
  slug: string;
  filename: string;
  bytes: Uint8Array;
  meta: UploadMeta;
  /** The admin's choice from the form; the measurements still have the last word. */
  drawOnCard: boolean;
  origin: "manual" | "inbox";
}

export async function publishUploadedModel(input: PublishInput): Promise<PublishReport> {
  const { actor, slug, filename, meta, drawOnCard, origin } = input;

  if (!/^[a-z0-9-]{1,64}$/.test(slug)) return fail(slug, "the slug must be lowercase letters, digits and dashes");
  if (input.bytes.byteLength === 0) return fail(slug, "the file is empty");
  if (input.bytes.byteLength > MAX_UPLOAD_BYTES) {
    return fail(slug, "the file is " + fileSizeLabel(input.bytes.byteLength) + ", over the " + fileSizeLabel(MAX_UPLOAD_BYTES) + " upload ceiling", { bytes: input.bytes.byteLength });
  }

  const parsed = parseGlb(input.bytes);
  if (!parsed.ok) return fail(slug, parsed.error, { bytes: input.bytes.byteLength });

  const checkedMeta = validateUploadMeta(meta);
  if (!checkedMeta.ok) return fail(slug, checkedMeta.error, { bytes: input.bytes.byteLength, facts: parsed.facts });

  const supabase = getSupabaseAdmin();
  if (!supabase) return fail(slug, "uploads need Supabase: the budget and the bucket are both there");

  const { data: animal } = await supabase.from("animals").select("id,slug,name,category,latin_name").eq("slug", slug).maybeSingle();
  if (!animal) return fail(slug, "no species with that slug in the catalogue", { bytes: input.bytes.byteLength, facts: parsed.facts });

  // 1. The budget decides first. An admin's own file is still bytes in the bucket, and the caps that
  //    exist for that reason apply to it exactly as they apply to a download.
  const reserved = await supabase.rpc("reserve_model_download", {
    p_provider: "upload",
    p_provider_id: filename.slice(0, 200),
    p_title: checkedMeta.meta.title,
    p_license: checkedMeta.meta.license,
    p_bytes: input.bytes.byteLength,
    p_animal_slug: slug,
    p_actor: actor,
    p_order_id: null,
    p_approved: true,
  });

  if (reserved.error) return fail(slug, "the budget could not be asked: " + reserved.error.message, { bytes: input.bytes.byteLength, facts: parsed.facts });

  const decision = (reserved.data ?? {}) as Record<string, unknown>;
  const reservationId = typeof decision.id === "string" ? decision.id : null;
  if (decision.allowed !== true) {
    return fail(slug, String(decision.reason ?? "the download budget refused this upload"), { bytes: input.bytes.byteLength, facts: parsed.facts });
  }

  // 2 and 3. Measure, compress, measure again: the stored facts are the ones the card rules read.
  const compressed = await compressForStorage(input.bytes, filename);
  const finalBytes = compressed.bytes;
  const finalParse = parseGlb(finalBytes);
  if (!finalParse.ok) {
    if (reservationId) await supabase.rpc("settle_model_download", { p_id: reservationId, p_outcome: "failed", p_bytes: null, p_storage_path: null, p_reason: "the upload did not finish" });
    return fail(slug, "the file stopped parsing after compression: " + finalParse.error, { bytes: input.bytes.byteLength, facts: parsed.facts });
  }

  // 4. Store it under a timestamped path.
  const storagePath = servedPath(slug);
  const card = cardEligible(finalBytes.byteLength, finalParse.facts.triangles) && drawOnCard;

  const upload = await supabase.storage.from(ASSET_BUCKET).upload(storagePath, finalBytes, {
    contentType: "model/gltf-binary",
    upsert: true,
    cacheControl: "public, max-age=31536000, immutable",
  });

  if (upload.error) {
    if (reservationId) await supabase.rpc("settle_model_download", { p_id: reservationId, p_outcome: "failed", p_bytes: null, p_storage_path: null, p_reason: "the upload did not finish" });
    return fail(slug, "the bucket refused the file: " + upload.error.message, { bytes: input.bytes.byteLength, facts: parsed.facts });
  }

  const publicUrl = supabase.storage.from(ASSET_BUCKET).getPublicUrl(storagePath).data.publicUrl;

  // 5. The record. The quality score uses the same function the provider pipeline ranks with, so an
  //    uploaded model is comparable with a fetched one instead of living outside the ranking.
  const quality = scoreModelQuality({
    title: checkedMeta.meta.title,
    terms: [String(animal.name), String(animal.latin_name ?? ""), String(animal.category ?? "")],
    spdx: checkedMeta.meta.license === "CC0" ? "CC0-1.0" : "CC-BY-4.0",
    faceCount: finalParse.facts.triangles,
    downloadCount: null,
    likeCount: null,
    hasThumbnail: true,
  });

  await supabase.from("model_assets").update({ is_primary: false }).eq("animal_id", animal.id).eq("is_primary", true);

  const stored = await supabase
    .from("model_assets")
    .upsert(
      {
        animal_id: animal.id,
        provider: "upload",
        title: checkedMeta.meta.title,
        license: checkedMeta.meta.license,
        source_url: checkedMeta.meta.sourceUrl ?? "upload:" + origin + ":" + filename,
        attribution: attributionFor(checkedMeta.meta),
        face_count: finalParse.facts.triangles,
        file_size_bytes: finalBytes.byteLength,
        storage_path: storagePath,
        public_url: publicUrl,
        quality_score: quality.total,
        is_primary: true,
      },
      { onConflict: "animal_id,source_url" },
    )
    .select("id")
    .maybeSingle();

  if (stored.error) {
    if (reservationId) await supabase.rpc("settle_model_download", { p_id: reservationId, p_outcome: "failed", p_bytes: null, p_storage_path: null, p_reason: "the upload did not finish" });
    return fail(slug, "the model was stored but could not be recorded: " + stored.error.message, { bytes: input.bytes.byteLength, facts: finalParse.facts });
  }

  // 6. Wire it to the species, including the card decision. This is the step that makes the model
  //    live without a rebuild: the page and the card read both values from the database.
  const wired = await supabase
    .from("animals")
    .update({ model_url: publicUrl, preview_eligible: card })
    .eq("id", animal.id);

  if (wired.error) {
    if (reservationId) await supabase.rpc("settle_model_download", { p_id: reservationId, p_outcome: "failed", p_bytes: null, p_storage_path: null, p_reason: "the upload did not finish" });
    return fail(slug, "the model was stored but could not be wired to the species: " + wired.error.message, { bytes: input.bytes.byteLength, facts: finalParse.facts });
  }

  // 7. Settle: 'downloaded' keeps the slot, with the real size and where it lives.
  if (reservationId) {
    // The real signature is (p_id, p_outcome, p_bytes, p_storage_path, p_reason): a live run against
    // the database is what caught the names this file used to invent, and a 404 from PostgREST is how
    // it said so. A wrong argument name is not a type error anywhere - the call is a string and an
    // object - which is exactly why the upload path was exercised against the real project.
    await supabase.rpc("settle_model_download", {
      p_id: reservationId,
      p_outcome: "downloaded",
      p_bytes: finalBytes.byteLength,
      p_storage_path: storagePath,
      p_reason: "published by an admin upload",
    });
  }

  return {
    ok: true,
    slug,
    bytes: input.bytes.byteLength,
    storedBytes: finalBytes.byteLength,
    triangles: finalParse.facts.triangles,
    compressed: compressed.compressed,
    storagePath,
    publicUrl,
    cardEligible: card,
    qualityScore: quality.total,
    reason: compressed.note,
    facts: finalParse.facts,
  };
}
