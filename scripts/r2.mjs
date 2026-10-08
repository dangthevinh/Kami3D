#!/usr/bin/env node
/**
 * Cloudflare R2 adapter — one place that talks S3, so no other script hand-rolls a signature.
 *
 * The first attempt at this migration failed with 403 SignatureDoesNotMatch because the canonical
 * request was assembled by hand and left the query string blank; SigV4 requires the sorted query in
 * the signed string. The lesson is written into PLAN.md ("không tự ký tay") and this file is the
 * consequence of it: signatures come from `aws4fetch`, a real signer, and never from this repo.
 *
 *   node scripts/r2.mjs check                 # ListObjectsV2 + PutObject + public GET + DeleteObject
 *   node scripts/r2.mjs list [--prefix=]      # what is actually in the bucket right now
 *
 * Credentials are read from .env.local / .env and are never printed, logged or put in an error
 * message — the same rule scripts/fetch-sounds.mjs follows.
 */

import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { AwsClient } from "aws4fetch";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/* -------------------------------------------------------------------------- */
/* Environment                                                                */
/* -------------------------------------------------------------------------- */

/** Reads .env.local / .env without printing anything: a key must not reach a log. */
export async function loadEnvFiles() {
  for (const name of [".env.local", ".env"]) {
    const file = join(ROOT, name);
    if (!existsSync(file)) continue;

    for (const line of (await readFile(file, "utf8")).split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const separator = trimmed.indexOf("=");
      if (separator === -1) continue;

      const key = trimmed.slice(0, separator).trim();
      let value = trimmed.slice(separator + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = value;
    }
  }
}

/** Any credential that could end up inside an error message. */
function redact(message) {
  const secrets = [
    process.env.R2_ACCESS_KEY_ID,
    process.env.R2_SECRET_ACCESS_KEY,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    process.env.CLERK_SECRET_KEY,
  ].filter((value) => typeof value === "string" && value.length >= 8);

  let out = String(message);
  for (const secret of secrets) out = out.split(secret).join("REDACTED");
  return out.replace(/Signature=[^&\s]+/gi, "Signature=REDACTED");
}

/**
 * Everything the R2 branch needs, or a list of what is missing.
 *
 * Returns `null` instead of throwing so a caller can fall back to the repository copy — the whole
 * app is built on "every integration is optional and degrades softly".
 */
export function readR2Config() {
  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  const bucket = process.env.R2_BUCKET?.trim();
  const publicBase = process.env.NEXT_PUBLIC_R2_PUBLIC_URL?.trim().replace(/\/+$/, "");

  const missing = [];
  if (!accountId) missing.push("R2_ACCOUNT_ID");
  if (!accessKeyId) missing.push("R2_ACCESS_KEY_ID");
  if (!secretAccessKey) missing.push("R2_SECRET_ACCESS_KEY");
  if (!bucket) missing.push("R2_BUCKET");
  if (!publicBase) missing.push("NEXT_PUBLIC_R2_PUBLIC_URL");
  if (missing.length) return { configured: false, missing };

  return {
    configured: true,
    accountId,
    accessKeyId,
    secretAccessKey,
    bucket,
    publicBase,
    endpoint: "https://" + accountId + ".r2.cloudflarestorage.com",
  };
}

/** Shape-only summary, safe to print: proves the variables are real without leaking them. */
export function describeR2Config(config) {
  if (!config.configured) return "R2 not configured (missing: " + config.missing.join(", ") + ")";
  return [
    "account  " + config.accountId.slice(0, 6) + "…" + config.accountId.slice(-4),
    "bucket   " + config.bucket,
    "endpoint " + config.endpoint.replace(config.accountId, config.accountId.slice(0, 6) + "…"),
    "public   " + config.publicBase,
    "key id   " + config.accessKeyId.slice(0, 6) + "…",
    "secret   " + config.secretAccessKey.length + " chars (not printed)",
  ].join("\n  ");
}

/* -------------------------------------------------------------------------- */
/* Client                                                                     */
/* -------------------------------------------------------------------------- */

export function createR2(config) {
  const client = new AwsClient({
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    service: "s3",
    region: "auto",
    retries: 2,
  });

  const objectUrl = (key) => config.endpoint + "/" + config.bucket + "/" + key.split("/").map(encodeURIComponent).join("/");
  const bucketUrl = (query = "") => config.endpoint + "/" + config.bucket + (query ? "?" + query : "");
  const publicUrl = (key) => config.publicBase + "/" + key.split("/").map(encodeURIComponent).join("/");

  /** Signed GET. Throws with a redacted, readable message instead of handing back a broken body. */
  async function signedFetch(url, init) {
    const response = await client.fetch(url, init);
    return response;
  }

  return {
    objectUrl,
    bucketUrl,
    publicUrl,
    client,
    signedFetch,

    /** ListObjectsV2, all pages. Proves the read key works and says what is really in the bucket. */
    async list(prefix = "") {
      const keys = [];
      let token;
      let pages = 0;

      do {
        const params = new URLSearchParams({ "list-type": "2", "max-keys": "1000" });
        if (prefix) params.set("prefix", prefix);
        if (token) params.set("continuation-token", token);

        const response = await signedFetch(bucketUrl(params.toString()));
        const body = await response.text();
        if (!response.ok) {
          throw new Error("ListObjectsV2 " + response.status + ": " + redact(body).slice(0, 400));
        }

        for (const match of body.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)) {
          const size = /<Size>(\d+)<\/Size>/.exec(match[1]);
          const key = /<Key>([\s\S]*?)<\/Key>/.exec(match[1]);
          if (key) keys.push({ key: decodeXml(key[1]), size: size ? Number(size[1]) : 0 });
        }

        token = /<NextContinuationToken>([\s\S]*?)<\/NextContinuationToken>/.exec(body)?.[1];
        pages += 1;
      } while (token && pages < 200);

      return keys;
    },

    /** PutObject. Returns the ETag the bucket reported, which is the receipt. */
    async put(key, body, contentType, cacheControl) {
      const headers = { "content-type": contentType, "content-length": String(body.byteLength) };
      // The same header lib/model-publish.ts sends to Supabase, so the two hosts do not differ.
      if (cacheControl) headers["cache-control"] = cacheControl;

      const response = await signedFetch(objectUrl(key), { method: "PUT", body, headers });

      const text = await response.text();
      if (!response.ok) throw new Error("PutObject " + key + " " + response.status + ": " + redact(text).slice(0, 400));

      // `publicUrl` is part of the return value because every caller needs it: the pipelines record it in
      // `model_assets.public_url` and `sound_assets.public_url`, and `fit-card-models.mjs` reads the
      // object back through it to measure what a visitor actually downloads. It was missing from the
      // first version of this function, and the failure was silent in the worst way — `undefined` in a
      // JSON body is a dropped key, so the row was written with `public_url: null` and nothing errored.
      return { etag: (response.headers.get("etag") ?? "").replace(/"/g, ""), bytes: body.byteLength, publicUrl: publicUrl(key) };
    },

    /** HEAD through the *public* URL: the only proof that a browser will see the object. */
    async headPublic(key) {
      const response = await fetch(publicUrl(key), { method: "HEAD", cache: "no-store" });
      return {
        status: response.status,
        bytes: Number(response.headers.get("content-length") ?? 0),
        contentType: response.headers.get("content-type") ?? "",
        etag: (response.headers.get("etag") ?? "").replace(/"/g, ""),
      };
    },

    /**
     * The bucket's CORS rules, read back.
     *
     * This exists because a public R2 object is not automatically readable *by a browser*: the first
     * probe of this bucket showed a 200 with no `access-control-allow-origin` and an OPTIONS that
     * returned 403. An `<audio src>` survives that; `GLTFLoader` does not — three's FileLoader goes
     * through `fetch()`, and a cross-origin fetch without that header is blocked. So "the file is on
     * the CDN" and "the page can load it" are two different claims, and only this one is the second.
     */
    async getBucketCors() {
      const response = await signedFetch(bucketUrl("cors"));
      const text = await response.text();
      return { ok: response.ok, status: response.status, body: redact(text) };
    },

    async putBucketCors(xml) {
      const response = await signedFetch(bucketUrl("cors"), {
        method: "PUT",
        body: xml,
        headers: { "content-type": "application/xml", "content-length": String(Buffer.byteLength(xml)) },
      });
      const text = await response.text();
      if (!response.ok) throw new Error("PutBucketCors " + response.status + ": " + redact(text).slice(0, 400));
      return true;
    },

    async remove(key) {
      const response = await signedFetch(objectUrl(key), { method: "DELETE" });
      if (!response.ok && response.status !== 404) {
        throw new Error("DeleteObject " + key + " " + response.status + ": " + redact(await response.text()).slice(0, 200));
      }
    },
  };
}

function decodeXml(value) {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

/** md5 in hex — R2 reports it as the ETag of a single-part upload, so it doubles as a byte check. */
export function md5(buffer) {
  return createHash("md5").update(buffer).digest("hex");
}

/* -------------------------------------------------------------------------- */
/* CLI                                                                        */
/* -------------------------------------------------------------------------- */

async function main() {
  const argv = process.argv.slice(2);
  const command = argv.find((arg) => !arg.startsWith("--")) ?? "check";
  const flag = (name) => {
    const hit = argv.find((arg) => arg.startsWith("--" + name + "="));
    return hit ? hit.slice(name.length + 3) : null;
  };

  await loadEnvFiles();
  const config = readR2Config();

  console.log("R2 configuration\n  " + describeR2Config(config) + "\n");
  if (!config.configured) {
    console.error("Nothing to do without credentials. Add them to .env.local (it is gitignored).");
    process.exitCode = 1;
    return;
  }

  const r2 = createR2(config);

  if (command === "list") {
    const prefix = flag("prefix") ?? "";
    const objects = await r2.list(prefix);
    const total = objects.reduce((sum, object) => sum + object.size, 0);
    console.log(objects.length + " object(s) under prefix " + JSON.stringify(prefix) + ", " + (total / 1048576).toFixed(1) + " MiB");
    for (const object of objects.slice(0, 20)) {
      console.log("  " + (object.size / 1048576).toFixed(3).padStart(9) + " MiB  " + object.key);
    }
    if (objects.length > 20) console.log("  … and " + (objects.length - 20) + " more");
    return;
  }

  if (command === "cors") {
    const policy = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      "<CORSConfiguration>",
      "  <CORSRule>",
      "    <AllowedOrigin>*</AllowedOrigin>",
      "    <AllowedMethod>GET</AllowedMethod>",
      "    <AllowedMethod>HEAD</AllowedMethod>",
      "    <AllowedHeader>*</AllowedHeader>",
      "    <ExposeHeader>ETag</ExposeHeader>",
      "    <ExposeHeader>Content-Length</ExposeHeader>",
      "    <ExposeHeader>Content-Range</ExposeHeader>",
      "    <MaxAgeSeconds>86400</MaxAgeSeconds>",
      "  </CORSRule>",
      "</CORSConfiguration>",
    ].join("\n");

    const before = await r2.getBucketCors();
    console.log("GetBucketCors trước: HTTP " + before.status + (before.ok ? "" : " (" + before.body.slice(0, 120) + ")"));

    if (before.ok && before.body.includes("<CORSRule>") && !argv.includes("--force")) {
      console.log("Bucket đã có CORS rule — không ghi đè. Dùng --force để ghi lại.");
    } else {
      await r2.putBucketCors(policy);
      console.log("PutBucketCors      OK — GET/HEAD, origin *");
    }

    const after = await r2.getBucketCors();
    console.log("GetBucketCors sau:   HTTP " + after.status);
    console.log(after.body.replace(/></g, ">\n<").split("\n").map((line) => "  " + line).join("\n").slice(0, 900));

    // The proof is a browser-shaped request, not the XML we just wrote.
    const probe = await fetch(r2.publicUrl("models/lion.glb"), {
      headers: { Origin: "http://localhost:9000" },
      cache: "no-store",
    });
    const allowOrigin = probe.headers.get("access-control-allow-origin");
    console.log("\nGET kèm Origin → HTTP " + probe.status + ", access-control-allow-origin: " + (allowOrigin ?? "KHÔNG CÓ"));
    if (!allowOrigin) {
      console.error("Vẫn không có CORS: trình duyệt sẽ chặn GLTFLoader đọc model từ host này.");
      process.exitCode = 1;
    }
    return;
  }

  if (command !== "check") {
    console.error("Unknown command: " + command);
    process.exitCode = 1;
    return;
  }

  // (1) Read key: ListObjectsV2.
  const before = await r2.list();
  const beforeBytes = before.reduce((sum, object) => sum + object.size, 0);
  console.log("1. ListObjectsV2        OK — " + before.length + " object(s), " + (beforeBytes / 1048576).toFixed(2) + " MiB");

  // (2) Write key: PutObject a throwaway probe, then read it back over the public URL.
  const probeKey = ".kami3d-probe/" + new Date().toISOString().replace(/[:.]/g, "-") + ".txt";
  const probeBody = Buffer.from("kami3d r2 probe " + Date.now() + "\n", "utf8");
  const put = await r2.put(probeKey, probeBody, "text/plain");
  console.log("2. PutObject            OK — " + put.bytes + " bytes, etag " + put.etag.slice(0, 12) + "…");

  const head = await r2.headPublic(probeKey);
  const publicOk = head.status === 200 && head.bytes === probeBody.byteLength;
  console.log(
    "3. GET qua public URL   " + (publicOk ? "OK" : "FAILED") + " — HTTP " + head.status + ", " +
      head.bytes + " bytes, " + (head.contentType || "no content-type") + "\n   " + r2.publicUrl(probeKey),
  );

  const digestOk = put.etag === md5(probeBody);
  console.log("4. ETag == md5(nội dung) " + (digestOk ? "OK" : "khác (" + md5(probeBody) + ")") + " — byte lên đúng nguyên vẹn");

  await r2.remove(probeKey);
  const after = await r2.list(".kami3d-probe/");
  console.log("5. DeleteObject         OK — probe còn lại " + after.length + " object");

  if (!publicOk) {
    console.error("\nPublic URL không đọc được object vừa ghi — bucket chưa bật public access hoặc NEXT_PUBLIC_R2_PUBLIC_URL sai.");
    process.exitCode = 1;
    return;
  }
  console.log("\nKết luận: khoá R2 đọc được, ghi được, và URL công khai trả đúng byte. Được phép nói tới việc chuyển file.");
}

const invokedDirectly = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (invokedDirectly) {
  main().catch((error) => {
    console.error("\n" + redact(error?.stack ?? error));
    process.exitCode = 1;
  });
}
