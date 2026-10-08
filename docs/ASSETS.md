# Adding 3D models, audio and images

Kami3D renders every species without any assets, using the procedural rigs in `lib/rigs.ts`. This document is
about replacing those placeholders with production media.

## Where files live

| Asset | Column | Where it actually is | Notes |
| --- | --- | --- | --- |
| 3D model | `model_url` | `public/models/**` in this repository, mirrored on R2 | `.glb` preferred, DRACO-compressed |
| Photo / illustration | `image_url` | `public/images/**` or a Supabase Storage URL | AVIF/WebP, served through `next/image` |
| Call recording | `sound_url` | `public/sounds/**` in this repository, mirrored on R2 | `.mp3` or `.ogg`, no autoplay |

Both columns store a **host-free path** (`/models/lion.glb`), never a full URL — the host is decided in one
place when a page reads the row (`lib/r2.ts`). That is what makes moving hosts a one-line change instead of a
79-row migration.

## Supabase Storage is retired

**Nothing writes to Supabase Storage any more.** It was never the library it was assumed to be, and the
measurement is what settled it:

| Bucket | Objects found | What they were |
| --- | --- | --- |
| `animal-assets` | **107** | 69 identical to R2, 35 models that existed nowhere else, 9 pre-compression originals |
| `animal-sounds` | 6 | the recordings, already mirrored |
| `manga-panels` | 0 | — |

PLAN.md recorded `animal-assets` as holding 0 objects. It held 179,8 MiB, including 35 models for species
that are in neither `data/**` nor the `animals` table. A script that trusted the note would have deleted
them. So the retirement is a script that proves before it deletes:

```bash
node scripts/migrate-storage-to-r2.mjs            # report only: what is there, what is safe
node scripts/migrate-storage-to-r2.mjs --restore  # copy and verify, never delete
node scripts/migrate-storage-to-r2.mjs --apply    # copy, verify by md5, rewrite rows, then empty it
```

The order is the safety argument: **compare by md5** (R2's ETag is the md5 of a single-part upload, so the R2
side need not be downloaded), **copy** what is missing, **read every copy back over the public URL**, only then
**rewrite** the rows, and only then **delete**. It refuses to delete anything that is not accounted for.

Where a Supabase object had *different* bytes from the served file — the 9 pre-compression originals — the
served copy was **not** overwritten. `models/axolotl.glb` on R2 is the file the site serves and the file the
repository holds, and those two must stay identical; the original is parked at `originals/models/axolotl.glb`
instead. `data/r2-manifest.json` records both, and an entry with `source: null` means "on R2, produced from no
file in this repository".

### Where a write goes now

| What | Module | Key |
| --- | --- | --- |
| Admin upload, published model | `lib/model-publish.ts` | `uploads/models/<slug>-<stamp>.glb` |
| Admin inbox, published and rejected | `lib/upload-ingest.ts` | `uploads/inbox/**`, `uploads/published/**`, `uploads/rejected/**` |
| Manga panel image | `lib/manga/panel.ts` | `panels/<user>/<chapter>/<uuid>.png` |
| Pipeline downloads | `scripts/fetch-models.mjs`, `scripts/fetch-sounds.mjs` | `models/<file>`, `sounds/<file>` |

All of it goes through `lib/r2-storage.ts`, which is the only module holding object-store credentials, and
through `lib/r2-paths.ts`, which holds the one rule that turns an old bucket path into an R2 key. Supabase is
still the database — `model_assets`, `sound_assets` and `animals` all live there, and a `public_url` column
now names an R2 URL.

## The CDN (Cloudflare R2)

`public/models/**` and `public/sounds/**` are mirrored to a Cloudflare R2 bucket. The push is resumable and
byte-verified, not a "copy files somewhere" script:

```bash
npm run r2:check     # ListObjectsV2 + PutObject + public GET + DeleteObject — do the keys work at all?
npm run r2:push      # push sounds and models; skips anything already there by size, so it resumes
npm run r2:verify    # HEAD every manifest key over the PUBLIC url and compare bytes with the repository
npm run r2:probe     # ask real Chrome whether a browser may load a model / a recording from the CDN
npm run r2:list      # what is in the bucket right now
```

### The key is the path

A key is the path under `public/` with the leading slash dropped, so `public/models/lion.glb` is the key
`models/lion.glb`. **Changing the host, not the path** is what makes this cheap: nothing in `data/**` and
nothing in Postgres has to move, because both store host-free paths already.

The receipt is committed as `data/r2-manifest.json`: one line per object, with its byte count and the md5 R2
reported as the ETag. `npm run check:r2` compares that manifest against every `model_url` and `sound_url` in
the data files, so a model the catalogue points at but the bucket does not have fails a test instead of
producing a 404 in production.

### Two switches, deliberately apart

| Variable | Means |
| --- | --- |
| `NEXT_PUBLIC_R2_PUBLIC_URL` | **Where the bucket is.** The scripts upload here. |
| `NEXT_PUBLIC_R2_ASSETS=on` | **Whether the site reads from it.** Anything else keeps the repository copy. |

Uploading 488 MB and changing what a visitor downloads are different events, and this migration needs them
apart for a reason a real browser settled:

```
npm run r2:probe
→ CHẶN  model fetch (useGLTF path)   Failed to fetch
→ OK    audio element (SoundButton)  canplaythrough fired
```

A public R2 bucket sends **no** `access-control-allow-origin` header. `useGLTF` goes through `fetch()`
(three's `FileLoader`), so a model cannot be read cross-origin from it — while an `<audio>` element has no
such restriction, which is why recordings already play from R2 and models do not yet.

**Before setting `NEXT_PUBLIC_R2_ASSETS=on`, add a CORS rule to the bucket** (Cloudflare dashboard → R2 →
bucket → Settings → CORS policy): allow `GET` and `HEAD` from origin `*`. The S3 key in `.env.local` is
object-scoped, so `PutBucketCors` answers 403; either use the dashboard or create a token with Admin Read &
Write and run `npm run r2:cors`, then confirm with `npm run r2:probe`.

Serve from a custom domain before this is production traffic: `pub-*.r2.dev` is Cloudflare's development
endpoint, rate-limited and without an SLA. Swapping the base URL is then a one-variable change.

## Card previews: a picture of the model, not the model

Every card in the catalogue draws a **rendered picture** of its model before anything is fetched. The
renderer walks `public/models/**` and writes `public/previews/<same path>.webp`:

```bash
node scripts/render-model-previews.mjs            # resumable: skips what already exists
node scripts/render-model-previews.mjs --force    # re-render everything
npm run r2:push -- --previews                     # mirror the images to the CDN
```

- **512×512 WebP, transparent background, 3/4 view**, lit to match the model viewer on the species page.
- The card places it with `object-contain`, so nothing is cropped, on the entry's own accent gradient.
- `data/previews.json` is the receipt: one entry per image with its bytes and md5.
- `lib/model-previews.ts` derives the path from `model_url` — `/models/lion.glb` → `/previews/lion.webp`,
  `/models/landmarks/taj-mahal.glb` → `/previews/landmarks/taj-mahal.webp` — so there is **no column, no
  migration and no index shipped to the browser**. A model with no picture (or a picture that fails to
  load) keeps the emoji plate the card has always had.

### Why not draw the model on hover

It used to. `lib/model-preview.ts` allowed it only under 1.5 MB / 75k triangles, which meant most of the
catalogue — every landmark, every large animal — could never show anything but an emoji, and a hover could
start a download nobody asked for. A picture costs a few kilobytes, works for every model regardless of
size, and answers the same question the hover was answering: *what does this look like?*

The live model is still drawn on the card for entries inside that budget, unchanged — the picture is the
state before that, and the state when there is no model to draw.

### Keeping the repository copy

The repository keeps every file. That is decision 0b: a self-host and Demo Mode must run with no keys at all, so
the bundled copy is the fallback rather than a leftover. It also means the 488 MB is duplicated by design — if
you would rather the repository not carry it, that is a separate decision with a separate cost (the local dev
setup and the offline deployment both stop having models).

## Naming convention

```
models/<slug>.glb          models/african-bush-elephant.glb
models/<slug>.draco.glb    DRACO-compressed variant
audio/<slug>.mp3           audio/gray-wolf.mp3
images/<slug>.avif         images/blue-whale.avif
```

Keeping the slug as the filename means a rebuild can regenerate URLs mechanically.

## Compressing a model

Install the tooling once:

```bash
npm i -g @gltf-transform/cli
```

Then, per model:

```bash
# Inspect first — know what you are paying for.
gltf-transform inspect raw/elephant.glb

# Weld, simplify, resize textures to 1K, and apply Draco.
gltf-transform optimize raw/elephant.glb models/african-bush-elephant.glb \
  --texture-compress webp \
  --texture-size 1024 \
  --simplify-error 0.001 \
  --compress draco
```

Targets that keep mobile comfortable:

- **Under ~1.5 MB** per model after compression.
- **Under 75k triangles**; the detail page shows one model at a time, but the quiz swaps models every question.
- **Textures at 1024px**, WebP or KTX2. A 4K texture costs more than the geometry it covers.

Verify the result loads in the app before uploading; a model that resolves to a 200 MB scene will be obvious on a
mid-range Android phone and invisible on your laptop.

## Wiring a model into the catalogue

1. Upload the file to `animal-assets` and copy its public URL.
2. Set `model_url` on the species in `data/animals.ts`.
3. `npm run check && npm run seed:generate`, then apply the regenerated seed.

No component changes are required. `ModelViewer` (`components/3d/ModelViewer.tsx`) picks `model_url` up through
`useGLTF`, applies the DRACO decoder, drops the model onto the ground plane with `<Center bottom>`, and
auto-frames it with `<Bounds>`. When `model_url` is `null` the procedural rig renders instead, so a partially
populated catalogue always works.

## Offline / air-gapped deployments

The DRACO decoder defaults to the gstatic CDN. To vendor it:

```bash
mkdir -p public/draco
cp -R node_modules/three/examples/jsm/libs/draco/* public/draco/
```

…then set `NEXT_PUBLIC_DRACO_DECODER_PATH=/draco/`. `next.config.ts` already serves `/draco/*` and
`/models/*` with immutable cache headers.

## Sound recordings

The sound button is disabled with an explicit reason while `sound_url` is `null` — it never pretends to play
something. Upload a short clip (2–6 seconds is plenty), set `sound_url`, and the button becomes active. Playback
is user-initiated only, so nothing plays on page load.

## Images

`image_url` is optional. When present, prefer AVIF with a WebP fallback and add the hostname to
`images.remotePatterns` in `next.config.ts` if it is not Supabase.

## Licensing

Record the licence and source for every uploaded asset in the commit message or a sibling `.license` file.
Model licences vary per species — a CC0 skeleton and a CC-BY-NC museum scan are not interchangeable.

## Backing the bucket up

A copy of the bucket does not need the token. The token only buys the object *index* — ListObjectsV2 — and
`data/r2-manifest.json` already is one: `npm run r2:push` records every object's key, byte length and md5 as it
uploads, so the manifest describes the bucket exactly as it was last written to. `npm run r2:backup` walks that
manifest, fetches each key from the public URL, and checks the byte length and md5 against it. It never lists the
bucket, so it runs with no key at all, and it treats a failed check as a failed file: anything that does not match
is deleted and fetched again rather than trusted.

Re-running is safe and cheap. Anything already on disk with the right size and md5 is skipped, so an interrupted
run resumes instead of starting over — long transfers do drop occasionally, and a single re-run normally clears
them. `--limit=N` fetches a sample, `--concurrency=N` trades bandwidth for gentleness (the default is 8), and
`--dry-run` reports what would happen. The exit code is 1 if anything failed, so the script chains in a shell.

The mirror lands in `kami3d-storage-backup/`, which `.gitignore` blocks. It is a copy — mostly of assets the
repository already ships under `public/`, plus the CDN-only orphans the manifest records — and never a source.

`rclone` is the obvious tool right up until the token dies: `rclone copy r2:kami3d-storage` needs that same key.
`rclone lsf r2:kami3d-storage` lists with it, but `rclone lsd r2:` never will — a bucket-scoped token is not
granted `ListBuckets`.
