import "server-only";

import { AwsClient } from "aws4fetch";

/**
 * Cloudflare R2 is the only object store this application writes to.
 *
 * Phase 34 measured what Supabase Storage actually held: `animal-assets` **0** objects,
 * `animal-sounds` **6**, `manga-panels` **0**. Everything the site served came from `public/**` in the
 * repository, and its R2 mirror. So "move Storage to R2" was never a migration of data — it was a
 * decision about where a **new** file goes. That decision is this module: the upload form, the admin
 * inbox, the manga panel uploader and the fetch pipelines all end up here, and none of them calls
 * `supabase.storage` any more.
 *
 * ## Why one module and not four call sites
 *
 * The four writers used to share `supabase.storage.from(bucket)`, which is why they shared a policy,
 * a size limit and a MIME allow-list. Replacing that with four copies of "sign a request and PUT it"
 * would have replaced one shared contract with four private ones. So the contract lives here:
 * `put`, `get`, `list`, `remove`, `publicUrl` — the same five verbs the Supabase client offered.
 *
 * ## One bucket, and the prefix is the old bucket name
 *
 * R2 has a single bucket (`R2_BUCKET`) that also holds the `models/` and `sounds/` mirror of
 * `public/**`. Uploads therefore carry their own prefix rather than their own bucket:
 *
 *   uploads/inbox/**      the admin inbox — drop a .glb + .json sidecar here
 *   uploads/published/**  what the inbox published, kept as the paper trail
 *   uploads/rejected/**   refused, with a .reason.txt beside it
 *   uploads/models/**     the served copies (timestamped, so a replacement is never a stale cache hit)
 *   panels/**             manga panel images
 *
 * `uploads/models/` on purpose, not `models/`: the latter is the repository mirror, and a generated
 * mirror must never be confused with an upload.
 *
 * ## What replaced what
 *
 * Two Supabase behaviours do not exist in S3 and are restored here rather than assumed away:
 *
 *   - **`upsert: false`.** PutObject always overwrites. When a caller asks for no-upsert (the manga
 *     panel path, whose keys are content-addressed), this does a HEAD first and refuses a collision
 *     instead of silently replacing somebody's image;
 *   - **a readable failure.** Supabase returned `{ data, error }`; a bare `fetch` throws on some
 *     failures and returns a status on others. Every method here answers with the same
 *     `{ ok: true, value } | { ok: false, reason }` shape, so a caller can put the reason in a 503
 *     sentence — which is what `lib/manga/panel.ts` was already doing for a missing service key.
 *
 * The signature comes from `aws4fetch`, never from this repository: a hand-rolled SigV4 canonical
 * request is how the first R2 attempt answered 403 while the credentials were perfectly fine.
 */

/** What a bucket listing returns for one object. */
export interface R2ListEntry {
  name: string;
  size: number;
}

export interface R2PutOptions {
  contentType: string;
  /** Defaults to the immutable header the Supabase path used, so the two hosts never differed. */
  cacheControl?: string;
  /** `false` refuses to overwrite an existing key. Defaults to `true`, like Supabase's default. */
  upsert?: boolean;
}

export type R2Result<T> = { ok: true; value: T } | { ok: false; reason: string };

const DEFAULT_CACHE_CONTROL = "public, max-age=31536000, immutable";

interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicBase: string;
}

function readConfig(): R2Config | null {
  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  const bucket = process.env.R2_BUCKET?.trim();
  const publicBase = process.env.NEXT_PUBLIC_R2_PUBLIC_URL?.trim().replace(/\/+$/, "");

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicBase) return null;
  return { accountId, accessKeyId, secretAccessKey, bucket, publicBase };
}

/** The sentence a 503 shows: the missing variables by name, never their values. */
export function r2StorageStatus(): string {
  if (readConfig()) return "R2 is configured";

  const missing = [
    ["R2_ACCOUNT_ID", process.env.R2_ACCOUNT_ID],
    ["R2_ACCESS_KEY_ID", process.env.R2_ACCESS_KEY_ID],
    ["R2_SECRET_ACCESS_KEY", process.env.R2_SECRET_ACCESS_KEY],
    ["R2_BUCKET", process.env.R2_BUCKET],
    ["NEXT_PUBLIC_R2_PUBLIC_URL", process.env.NEXT_PUBLIC_R2_PUBLIC_URL],
  ]
    .filter(([, value]) => !value || !String(value).trim())
    .map(([name]) => name);

  return "Cloudflare R2 is not configured — set " + missing.join(", ") + " (see README.md)";
}

/** Any credential that could reach an error message. */
function redact(message: string): string {
  const secrets = [process.env.R2_SECRET_ACCESS_KEY, process.env.R2_ACCESS_KEY_ID].filter(
    (value): value is string => typeof value === "string" && value.length >= 8,
  );
  let out = message;
  for (const secret of secrets) out = out.split(secret).join("REDACTED");
  return out.replace(/Signature=[^&\s]+/gi, "Signature=REDACTED");
}

/**
 * A `BodyInit` view of exactly these bytes.
 *
 * A `Uint8Array` is not assignable to `BodyInit`, and the reason is not pedantry: it can be a view
 * into a larger buffer, so handing it to `fetch` directly could upload bytes the caller never meant to
 * send. Slicing by the view's own offset and length is what makes the body these bytes and no others.
 */
function bodyOf(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function decodeXml(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

export interface R2Store {
  put(key: string, bytes: Uint8Array, options: R2PutOptions): Promise<R2Result<{ publicUrl: string; bytes: number }>>;
  get(key: string): Promise<R2Result<Uint8Array>>;
  list(prefix: string, limit?: number): Promise<R2Result<R2ListEntry[]>>;
  remove(keys: string[]): Promise<R2Result<number>>;
  /**
   * The one place a public URL is built.
   *
   * It produces the same string `lib/r2.ts` would for the same path, which is what
   * `scripts/check-r2.mjs` asserts: two functions that build URLs from a base and a path are exactly
   * the pair that drifts.
   */
  publicUrl(key: string): string;
}

/**
 * The store, or `null` when R2 is not configured.
 *
 * `null` rather than a throw, for the same reason `getSupabaseAdmin()` returns null: every caller has
 * a sentence to show a person, and a deployment with no object store should say so rather than crash
 * on an import.
 */
export function getR2Store(): R2Store | null {
  const config = readConfig();
  if (!config) return null;

  const client = new AwsClient({
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    service: "s3",
    region: "auto",
    retries: 2,
  });

  const bucketUrl = config.accountId + ".r2.cloudflarestorage.com/" + config.bucket;
  const objectUrl = (key: string) =>
    "https://" + bucketUrl + "/" + key.split("/").map(encodeURIComponent).join("/");
  const publicUrl = (key: string) => config.publicBase + "/" + key.split("/").map(encodeURIComponent).join("/");

  async function failure(verb: string, key: string, response: Response): Promise<R2Result<never>> {
    const body = await response.text().catch(() => "");
    return { ok: false, reason: verb + " " + key + " failed: HTTP " + response.status + " " + redact(body).slice(0, 200) };
  }

  return {
    publicUrl,

    async put(key, bytes, options) {
      const upsert = options.upsert !== false;
      const headers: Record<string, string> = {
        "content-type": options.contentType,
        "cache-control": options.cacheControl ?? DEFAULT_CACHE_CONTROL,
        "content-length": String(bytes.byteLength),
      };

      if (!upsert) {
        // HEAD first: S3 has no "create only" put, so the refusal is built rather than inherited.
        const existing = await client.fetch(objectUrl(key), { method: "HEAD" });
        if (existing.ok) return { ok: false, reason: key + " already exists and this upload must not replace it" };
        if (existing.status !== 404) return failure("HEAD", key, existing);
      }

      const response = await client.fetch(objectUrl(key), { method: "PUT", body: bodyOf(bytes), headers });
      if (!response.ok) return failure("PUT", key, response);

      return { ok: true, value: { publicUrl: publicUrl(key), bytes: bytes.byteLength } };
    },

    async get(key) {
      const response = await client.fetch(objectUrl(key));
      if (!response.ok) return failure("GET", key, response);
      return { ok: true, value: new Uint8Array(await response.arrayBuffer()) };
    },

    async list(prefix, limit = 1000) {
      const params = new URLSearchParams({ "list-type": "2", prefix, "max-keys": String(limit) });
      const response = await client.fetch("https://" + bucketUrl + "?" + params.toString());
      if (!response.ok) return failure("LIST", prefix, response);

      const body = await response.text();
      const objects: R2ListEntry[] = [];
      for (const match of body.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)) {
        const name = /<Key>([\s\S]*?)<\/Key>/.exec(match[1]);
        const size = /<Size>(\d+)<\/Size>/.exec(match[1]);
        if (!name) continue;
        // A listing is by prefix, so the "name" callers get is the part below it — the same shape
        // Supabase's `.list()` returned, which is what the inbox code was written against.
        objects.push({ name: decodeXml(name[1]).slice(prefix.length + 1), size: size ? Number(size[1]) : 0 });
      }

      return { ok: true, value: objects };
    },

    async remove(keys) {
      let removed = 0;
      for (const key of keys) {
        const response = await client.fetch(objectUrl(key), { method: "DELETE" });
        // 404 is the state the caller asked for, not a failure to reach it.
        if (!response.ok && response.status !== 404) return failure("DELETE", key, response);
        removed += 1;
      }
      return { ok: true, value: removed };
    },
  };
}
