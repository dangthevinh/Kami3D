# Automatic 3D model acquisition

`scripts/fetch-models.mjs` finds and downloads redistributable 3D models for the species in the catalogue, then
records the attribution each licence requires.

```bash
npm run models:report                                  # what is out there, nothing downloaded
npm run models:fetch -- --species=lion --apply --wire  # one species, downloaded and wired in
npm run models:fetch -- --all --apply --wire           # every species still missing a model
npm run models:fetch -- --species=lion --apply --compress --upload   # compressed and stored
npm run models:fetch -- --species=lion --count=3 --apply             # keep the top three
```

Nothing downloads unless you pass `--apply`. Without it the script is a pure report.

## Quality ranking

Search relevance is not quality. The first licensed hit for "lion" is regularly a 2.4-million-triangle
statue with no thumbnail and no downloads, so every licensed candidate is scored and the best one wins
(`lib/model-quality.ts`, pinned by `npm run check:models`):

| Signal | Weight | What it means |
| --- | --- | --- |
| Title | 30 | exact species or binomial name > contains it > contains it in reverse |
| Licence | 15 | CC0/Public Domain 15, CC BY 8.25 — no-attribution first, as a tie-break |
| Popularity | 25 | downloads (60%) and likes (40%), log-scaled and capped |
| Complexity | 20 | face count against a mobile budget; unknown counts are neutral, not zero |
| Thumbnail | 10 | a clear preview means a usable card and social image |

The total is 0–100 and is stored verbatim in `model_assets.quality_score`. The report prints the parts, so a
ranking can be argued with instead of merely believed:

```
🦁 Lion (lion)
   ✔     75  excellent CC-BY-4.0 Lion                                       sketchfab
        ↳ title 30 · licence 8.3 · popularity 6.7 · complexity 20 · thumbnail 10 · 42,710 faces
   ✔   74.8  good      CC-BY-4.0 Lion                                       sketchfab
        ↳ title 30 · licence 8.3 · popularity 6.5 · complexity 20 · thumbnail 10 · 5,497 faces
```

A licence the project refuses can never win, however good the model is: refused candidates are listed with
the reason but are filtered out before selection.

## The licence rule

This is the part that matters. A model is written to disk **only** if its licence is on the allow-list:

| Licence | Allowed | Why |
| --- | --- | --- |
| CC0 1.0 / Public Domain Mark | yes | no obligations |
| CC BY 4.0 | yes | attribution is recorded and rendered automatically |
| CC BY-SA | **no** | share-alike would impose obligations on the whole site |
| CC BY-ND | **no** | no-derivatives forbids the rescaling and compression we apply |
| Any NonCommercial variant | **no** | incompatible with ad-supported pages |
| "Standard" (Sketchfab default) | **no** | all rights reserved |

Anything unrecognised is refused by default, and the report prints the reason for each refusal, so a
`--report` run is also a licence audit.

When a model is accepted, the script writes `data/model-attribution.json`:

```json
{
  "lion": {
    "title": "Lion", "author": "doizy", "authorUrl": "https://sketchfab.com/doizy",
    "license": "CC-BY-4.0", "licenseUrl": "https://creativecommons.org/licenses/by/4.0/",
    "sourceUrl": "https://sketchfab.com/3d-models/lion-…", "provider": "sketchfab",
    "file": "/models/lion.glb", "format": "glb", "bytes": 842133, "sha256": "…",
    "attributionRequired": true, "fetchedAt": "2026-01-01T00:00:00.000Z"
  }
}
```

Commit that file. `lib/attribution.ts` reads it at build time and the species page renders the credit under the
viewer — so a CC BY model can never ship without its author. Nothing else needs to change when you add a model.

## Providers

| Provider | Key | Notes |
| --- | --- | --- |
| `sketchfab` | `SKETCHFAB_API_TOKEN` | Official v3 API. **Search is public** (so `--report` works with no key); downloading needs an OAuth token from <https://sketchfab.com/settings/password>. Only models whose author enabled download are considered. |
| `smithsonian` | `SI_API_KEY` | Smithsonian Open Access, CC0. Free key from <https://api.data.gov/signup/>. |
| `polypizza` | `POLY_PIZZA_API_KEY` | Poly Pizza, the CC0 archive of Google Poly. |
| `direct` | none | A list you maintain in `data/model-sources.json`. Always works, no key. |

Add the keys to `.env.local`:

```bash
SKETCHFAB_API_TOKEN=…
SI_API_KEY=…
POLY_PIZZA_API_KEY=…
```

Missing keys are not an error: the provider is skipped with a note, and the others still run.

### `data/model-sources.json`

For models you have already vetted, or that no provider indexes:

```json
{
  "gray-wolf": {
    "url": "https://example.org/wolf.glb",
    "title": "Gray wolf (rigged)",
    "author": "Someone",
    "authorUrl": "https://example.org/someone",
    "license": "CC0",
    "licenseUrl": "https://creativecommons.org/publicdomain/zero/1.0/",
    "sourceUrl": "https://example.org/models/wolf",
    "faceCount": 12000
  }
}
```

## What `--wire` does

`model_url` in `data/animals.ts` stays the single source of truth for which model a species uses — the same
column the SQL schema and Supabase Storage rely on. `--wire` sets it to the local file for the species that was
just fetched, scoped to that species' own object literal and verified before writing.

After wiring, run `npm run seed:generate` so `supabase/seed.sql` carries the URLs into the database.

## Shape of a fetched model

- `public/models/<slug>.glb` — the file the app serves
- `data/model-attribution.json` — the credit
- archives (`.zip`) are written for providers that only ship glTF bundles: extract the `.glb` and delete the
  archive. `.zip` files are gitignored; `.glb` files are tracked, because a committed `model_url` must resolve.

If a model is missing or corrupt, the viewer catches the failure and falls back to the procedural rig rather
than showing a broken canvas.

## Compressing before you ship

Providers hand you whatever they have; compress before committing. `--compress` runs the DRACO pass for you,
through `@gltf-transform/cli` (a **devDependency**: `check:bundle` fails if a glTF toolchain ever reaches the
browser bundle, and a visitor has no reason to download a compactor). Budget: **≤ 1.5 MB and ≤ 75k triangles**
per model.

```bash
npm run models:fetch -- --species=lion --apply --compress
```

The pass is skipped when it does not help, which is not a theoretical case: every model already in the
catalogue was compressed by hand, and re-running DRACO over one of them produces a *slightly larger* file
(measured: `lion.glb` 341.08 KB → 341.23 KB). The script reports "no gain, keeping the original file" and
leaves the bytes alone rather than committing a regression.

## Storage and the database

`--upload` is the Phase 12 path: upload to Supabase Storage, write a `model_assets` row, and (for the primary
model) point `animals.model_url` at the public URL.

```bash
npm run models:fetch -- --all --upload        # the models already in public/models
```

With no `--apply` and a local file present, `--upload` is an upload-only pass: it stores the file that is
already committed and records it, which is how the existing catalogue gets into storage. Without
`--upload`, nothing touches Supabase and `data/animals.ts` stays the only wiring — the same dual path as the
call recordings: the bundle keeps a repo-relative `/models/…` URL so Demo Mode works offline, and the database
gets the storage URL.

| Where | What |
| --- | --- |
| Bucket | `animal-assets` (the one asset bucket; the `models/` prefix keeps it apart from images and calls) |
| Table | `public.model_assets` — one row per model, at most one `is_primary` per species (partial unique index) |
| Credit | `attribution` column, rendered as a tooltip/link in the viewer alongside the JSON manifest credit |

Order matters once: `npm run db:seed` rewrites `animals.model_url` from the dataset, so seed first, then
`--upload`. Re-running the upload is safe — `(animal_id, source_url)` is unique, so a row is updated rather
than duplicated, and the previous primary is demoted before a new one is promoted.

## Scale and orientation

Mesh units do **not** need normalising. `ModelViewer` wraps the model in `<Center bottom>` inside `<Bounds>`, so
any scale or origin offset is framed automatically, and the size chart on a species page is drawn from the
procedural rigs plus the recorded measurements in `data/animals.ts` — never from the mesh. A model exported in
centimetres will therefore still look right.

What does vary between models is **orientation and pose**: one may face -Z, another may be modelled lying down.
Give each newly fetched species one look in the browser; that is the only thing the pipeline cannot check for you.

## What the shipped catalogue contains

24 species fetched from Sketchfab, all **CC BY 4.0**, and all compressed with:

```bash
gltf-transform optimize in.glb out.glb --compress draco --texture-compress webp --texture-size 1024
```

**61 MB → 10 MB (84% smaller)**, with a valid glTF 2.0 container and `KHR_draco_mesh_compression` in
`extensionsRequired` for every file.

Because the models are DRACO-compressed, the decoder is vendored in `public/draco/` (copied from
`three/examples/jsm/libs/draco/`) and is the **default** decoder path — no CDN request, and the app works
offline. After compressing or otherwise editing a model, refresh its manifest entry:

```bash
npm run models:fetch -- --rehash
```

## Search overrides

A species' display name is not always the best search term — searching Sketchfab for "Common Octopus" returns an
octopus *fillet*. `data/model-queries.json` overrides the query and can reject words that must not appear in a
title:

```json
{
  "common-octopus": {
    "query": "octopus",
    "reject": ["fillet", "sashimi", "food", "dish", "plate", "cooked", "recipe"]
  },
  "gooty-tarantula": { "query": "tarantula" }
}
```

`--strict-match` goes further and refuses any candidate whose title does not name the species.

## Known imperfections in the current set

Attribution is complete and every licence is redistributable, but a few models are *representatives* rather than
the exact taxon: `gooty-tarantula` is a Mexican red-knee tarantula, and `weddell-seal` is a generic seal. Replace
them through `data/model-sources.json` when you find better ones.
