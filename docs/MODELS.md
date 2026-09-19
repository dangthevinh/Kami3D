# Automatic 3D model acquisition

`scripts/fetch-models.mjs` finds and downloads redistributable 3D models for the species in the catalogue, then
records the attribution each licence requires.

```bash
npm run models:report                                  # what is out there, nothing downloaded
npm run models:fetch -- --species=lion --apply --wire  # one species, downloaded and wired in
npm run models:fetch -- --all --apply --wire           # every species still missing a model
```

Nothing downloads unless you pass `--apply`. Without it the script is a pure report.

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

Providers hand you whatever they have; compress before committing. See `docs/ASSETS.md` for the DRACO pipeline
(`gltf-transform optimize … --compress draco`). Budget: **≤ 1.5 MB and ≤ 75k triangles** per model.

## Scale correctness

A downloaded model is *not* automatically the right size. `SizeComparison` uses the recorded measurements in
`data/animals.ts`, not the mesh's own units, so a model exported in centimetres will look wrong beside the human
until you either rescale it or leave `model_url` unset for that species. Check the species page after fetching.
