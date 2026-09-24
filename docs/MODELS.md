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
model) point `animals.model_url` at the public URL. All 24 models of the shipped catalogue are stored this way
(10.0 MB), each verified byte-for-byte after upload.

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

### Filling in the quality signals of models fetched earlier

A model fetched before this phase has a title and a licence in the manifest and nothing else, so its score is a
floor rather than a measurement. `--refresh-quality` looks each one up by its Sketchfab uid and fills in the
missing numbers — no download, and with `--upload` it corrects the row that is already in `model_assets`
rather than storing the file again:

```bash
npm run models:fetch -- --refresh-quality --upload
```

```
↻ african-bush-elephant: 50.3 → 90.4 (downloads 1531, likes 71, faces 4,806)
↻ blue-whale: 50.3 → 91.2 (downloads 1717, likes 104, faces 21,868)
```

Run without `--upload` it stops at the manifest, which is the honest boundary: the manifest is committed, the
table is a copy of it. After the refresh the shipped catalogue scores **60.1–93.3 (average 82.4)**, which is
the ranking working on real numbers rather than on a placeholder.

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

## Why a model can look black

A visitor reported that the lion was "dark and hazy, I cannot see anything", and asked for it to look like the
Sketchfab viewer. It was not one bug. Three, stacked, each of which alone would have made the model hard to see:

| # | Cause | Where it lives |
| --- | --- | --- |
| 1 | **No environment to reflect.** The lion is `metallicFactor 0.52, roughnessFactor 0` — a mirror. A metallic
      surface shows what surrounds it; the scene had lamps and no environment, so the `envMapIntensity` the viewer
      had always set applied to nothing | `components/3d/StudioEnvironment.tsx` |
| 2 | **A fog fixed in world units.** The fog started at 9 units; the lion is **81 units** across, so `<Bounds fit>`
      put the camera ~100 units out — past the fog far plane. The model was drawn through fog at full strength and
      came out the colour of the background | `components/3d/ModelScene.tsx` (`FOG_NEAR_RATIO`) |
| 3 | **A blend mode on a material nothing can blend.** `alphaMode: "BLEND"` with no alpha map and an opacity of 1
      buys no depth writes, so the model's own faces sorted against each other and it read as a ghost | `components/3d/apply-model-materials.ts` |

Measured on the species canvas for `lion`, before and after. The model auto-rotates, so repeated runs land
between 49,900 and 57,400 colours and between 13.8% and 14.4% bright pixels; the figures below are one run:

| | distinct colours | p90 luminance | pixels above 60/255 |
| --- | --- | --- | --- |
| Before | 4,727 | 13 | 1.1% |
| After | **~50,000** | **83** | **13.8%** |

Two rules keep it from coming back. `npm run check:materials` pins the material maths and the shape of the fix, and
asserts that both surfaces mount the studio, that its base colour is bright, and that the fog is still derived from
the camera distance rather than being a constant. The studio itself downloads nothing: it is `Lightformer` panels
rendered into a cube map, so the "no third-party asset on the critical path" rule holds.

The card preview is smaller and brighter for the same three reasons plus its own framing — it scales the asset to
1.9 units and looks from ~3.6 units, which is why it now reports a p95 of 65/255 rather than 36/255.

## The card draws the real model

The species card used to show a procedural silhouette and the real model was reserved for the species page. That
was a decision about weight, and it stopped being the right one once every model in the catalogue was
DRACO-compressed: the smallest is 5 kB, the lion is 341 kB, and all but one are under half a megabyte.

`components/3d/AnimalModelPreview.tsx` loads `animal.model_url` on hover, through the same DRACO decoder path the
full viewer uses, with the two habits the project already had: the cached scene's clone is drawn and handed back
with `disposeClone` on unmount, and the asset is centred and scaled by its own bounding box, because its units and
origin are whatever the author's exporter decided.

What a hover may fetch is capped by `PREVIEW_BUDGET` in `lib/model-preview.ts` — under 1.5 MB and 75k triangles,
which is the repository's own shipping budget from `public/models/README.md`. Inside it the card draws the model;
outside it (today: `african-bush-elephant`, 2.8 MB) the tile keeps the silhouette and the species page still shows
the full viewer. A missing triangle count is unknown, not disqualified — the same reading `lib/model-quality.ts`
takes. `npm run check:preview` pins all of it, including that every admitted file is actually present in `public/`.

The decision is made in the browser, so **what it reads matters**. Answering it from `lib/attribution.ts` dragged
both credit manifests into the client bundle of `/quiz`, `/explore` and `/` — measured at **+5.6 kB gzip**, which
pushed `/quiz` past its 165 kB budget — so the card reads `data/model-preview.json` through
`lib/model-preview-index.ts` instead: about a kilobyte of `slug -> [bytes, triangles]`, written by
`scripts/fetch-models.mjs` from the same object it writes the manifest from. The two cannot drift, because
`check:preview` compares them entry by entry, and `/explore` went back to **153.1 kB** (measured after the change,
against 157.7 kB before it).
## Embedded models: the Sketchfab iframe

Some species have a second model that we do **not** host: it stays on Sketchfab and their viewer draws it inside an
iframe. That is a different act from downloading — nothing is copied into this repository, so
`data/model-attribution.json` is the wrong place for it, and the record lives in
[`data/sketchfab-embeds.json`](../data/sketchfab-embeds.json) instead:

```json
{
  "slug": "lion",
  "uid": "79d5e1173bba4f2b80661620a2eca9bc",
  "title": "Lion",
  "author": "doizy",
  "license": "CC-BY",
  "licenseLabel": "CC Attribution (CC BY 4.0)",
  "sourceUrl": "https://sketchfab.com/3d-models/lion-79d5e1173bba4f2b80661620a2eca9bc",
  "faceCount": 5497,
  "checkedAt": "2026-09-22"
}
```

### The licence rule is the same one

The embed allow-list is imported from `lib/model-quality.ts`, not retyped: **CC0 and CC BY only**. An iframe is not
a loophole — the model still appears on a page that carries advertising, so a NonCommercial or "Standard"
(all-rights-reserved) model is refused here exactly as it is refused for downloads. CC BY obliges us to name the
author **wherever the work appears**, which is why the credit line is rendered above and below the frame, in both
states of the component (`check:embeds` fails if it ever stops being).

### Nothing loads until a visitor asks for it

The iframe is never in the initial HTML. `components/animal/SketchfabEmbed.tsx` renders a poster first — what the
model is, who made it, under which licence, and a button — and the frame appears only after that button is clicked.
Three reasons, in order of how much they cost:

1. **It is somebody else's application.** The viewer is megabytes of JavaScript, opens its own WebGL context and sets
   Sketchfab's cookies. Dropped into a grid of species cards it would do all three two dozen times for visitors who
   only scrolled past.
2. **One live 3D context per surface.** The project arranges its 3D deliberately — hover previews are opt-in and the
   map and viewer never coexist. A card that carries an embed stands its procedural hover preview down entirely
   (`previewReady && !embed`), so a tile never runs two contexts.
3. **Nothing third-party on arrival.** No request to `sketchfab.com` — not even their thumbnail, which is available
   and tempting — before a click. The poster is drawn from our own CSS.

### Where it appears

| Surface | How |
| --- | --- |
| Species page | A "Community model on Sketchfab" block under our own viewer, anchored at `/animal/<slug>#sketchfab` |

A species with no entry in the data file gains **no markup at all** — the lookup returns `null` and the page
renders nothing.

The **explore card is deliberately not on that list.** It used to be, while the card had nothing better to show;
it now draws the species' own `.glb` (next section), so a third-party viewer in the same tile would be a WebGL
context nobody asked for. `check:embeds` fails if the card ever mounts the iframe again.

### Adding one

Read the model page, confirm the licence is CC0 or CC BY, then add an entry and run the guard:

```bash
npm run check:embeds   # uid shape, licence, credit, deferral, URL origin, wiring
```

The uid is the only thing the frame URL is built from, so an entry cannot point the iframe at another origin, and the
face count is checked against the same ceiling (`FACE_BUDGET.max`) a downloaded model has to pass.
