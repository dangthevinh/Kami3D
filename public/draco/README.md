# DRACO decoder (vendor this folder for offline deployments)

The 3D viewer loads its DRACO decoder from the gstatic CDN by default. To serve it yourself:

```bash
cp -R node_modules/three/examples/jsm/libs/draco/* public/draco/
```

Then set the decoder path in `.env.local`:

```
NEXT_PUBLIC_DRACO_DECODER_PATH=/draco/
```

`next.config.ts` already serves everything under `/draco/*` with
`Cache-Control: public, max-age=31536000, immutable`, so these files are cached for a year.

The decoder is only fetched when a species actually has a `model_url`; the procedural rigs used by
the rest of the catalogue never need it.
