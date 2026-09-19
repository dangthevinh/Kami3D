# Local 3D models

Kami3D serves species models from Supabase Storage (the `animal-assets` bucket) and references them
through the `model_url` column, so nothing needs to live here.

This folder exists for the cases where you would rather ship models with the app: drop `.glb` files
here and point `model_url` at `/models/<file>.glb`. Everything under `/models/*` is served with
`Cache-Control: public, max-age=31536000, immutable`, which means filenames must change when a model
changes (for example `elephant-v2.glb`).

Keep each file under ~1.5 MB and 75k triangles — see `docs/ASSETS.md` for the compression pipeline.
