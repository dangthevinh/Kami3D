/**
 * Where the site's own assets are served from.
 *
 * Phase 34 pushed **242 objects, 488,5 MB** to Cloudflare R2 and read every one of them back over the
 * public URL with the right byte count: 236 models (487,8 MB) and the 6 call recordings (620 KiB).
 * Supabase Storage was never the thing to migrate — it holds 0 / 6 / 0 objects — the catalogue that is
 * actually served lives in `public/models/**`, and that is what moved.
 *
 * ## Changing the host, not the path
 *
 * A key in the bucket is the path under `public/` with the leading slash dropped, so
 * `public/models/lion.glb` is the key `models/lion.glb` and the public URL is `{base}/models/lion.glb`.
 * Nothing in `data/**` and nothing in Postgres has to change: both already store host-free paths —
 * every one of the 73 `animals` rows was read back from the live database and is `/models/…`. The host
 * is therefore decided **here**, once, instead of in 79 rows that would then disagree with each other.
 *
 * ## Two switches, on purpose
 *
 * `NEXT_PUBLIC_R2_PUBLIC_URL` says *where the bucket is* — the scripts upload there.
 * `NEXT_PUBLIC_R2_ASSETS=on` says *whether the site reads from it*. Uploading and cutting over are
 * different events, and this migration needs them apart for a reason a real browser settled:
 *
 *     npm run r2:probe
 *     → CHẶN  model fetch (useGLTF path)   Failed to fetch
 *     → OK    audio element (SoundButton)  canplaythrough fired
 *
 * A public R2 bucket sends **no** `access-control-allow-origin` header, so `useGLTF` cannot read a
 * model cross-origin: three's `FileLoader` goes through `fetch()`
 * (`node_modules/three/src/loaders/FileLoader.js:141`). An `<audio>` element has no such restriction,
 * which is why the recordings already play from R2 and the models do not yet. The missing piece is one
 * CORS rule on the bucket — and the S3 key in `.env.local` is object-scoped, so `PutBucketCors` answers
 * 403: it has to be added in the Cloudflare dashboard, or with a token that has Admin Read & Write.
 *
 * Until that rule exists the flag stays off and the repository copy is what the site serves — which is
 * also the fallback decision 0b asks for, so Demo Mode and a self-host still run with no keys at all.
 *
 * ## Why this module has no imports
 *
 * `scripts/check-r2.mjs` imports it directly, and `lib/catalog-project.ts` — which a suite already
 * imports with plain Node — calls it. `@/…` means nothing outside the bundler, so the two environment
 * reads happen here instead of through `lib/env.ts`, and at call time rather than at module load, which
 * is what lets one suite exercise both the on and the off state.
 */

/** The bucket's public base URL, trailing slash removed. Empty when R2 is not configured. */
export function assetCdnBase(): string {
  return (process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? "").trim().replace(/\/+$/, "");
}

/** True only when a bucket is configured **and** the cutover has been switched on. */
export function isAssetCdnEnabled(): boolean {
  return (process.env.NEXT_PUBLIC_R2_ASSETS ?? "").trim() === "on" && assetCdnBase().length > 0;
}

/**
 * Point a host-free asset path at the CDN, when there is one and the cutover has been made.
 *
 * Four rules, in order, and each is a case that exists in this repository today:
 *
 *   1. `null`/empty stays as it is — a species with no model must keep rendering without one;
 *   2. a path that is not root-relative is left alone: an admin-uploaded model has an absolute Supabase
 *      Storage URL, and an attribution image can live on any host, so rewriting those would break them;
 *   3. `//host/path` is protocol-relative, not a local path, so it is left alone too;
 *   4. otherwise the path is appended to the CDN base — the key in the bucket is that same path.
 */
export function assetUrl(path: string): string;
export function assetUrl(path: string | null): string | null;
export function assetUrl(path: string | null): string | null {
  if (!path) return path;
  if (!isAssetCdnEnabled()) return path;
  if (!path.startsWith("/") || path.startsWith("//")) return path;

  return assetCdnBase() + path;
}
