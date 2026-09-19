# Adding 3D models, audio and images

Kami3D renders every species without any assets, using the procedural rigs in `lib/rigs.ts`. This document is
about replacing those placeholders with production media.

## Where files live

| Asset | Column | Storage | Notes |
| --- | --- | --- | --- |
| 3D model | `model_url` | `animal-assets` bucket | `.glb` preferred, DRACO-compressed |
| Photo / illustration | `image_url` | `animal-assets` bucket | AVIF/WebP, served through `next/image` |
| Call recording | `sound_url` | `animal-assets` bucket | `.mp3` or `.ogg`, no autoplay |

The bucket is public-read and capped at 25 MB per file with a MIME allow-list (see `supabase/schema.sql`).

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
