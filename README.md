# Kami3D — 3D World Wildlife Encyclopedia

An interactive encyclopedia where every species can be rotated, measured against your own body, and
identified by its silhouette. Built with Next.js App Router, React Three Fiber, Clerk and Supabase.

**The app runs with zero configuration.** With no environment variables it boots in *Demo Mode*: a bundled
24-species dataset, cookie-backed favourites and quiz scores, and procedural 3D models. Add keys and the same
code paths switch to Clerk auth, Supabase persistence and real ad slots.

```bash
npm install
npm run dev        # http://localhost:9000
```

---

## What is in here

| Route | What it does |
| --- | --- |
| `/` | Landing page: stats, an interactive 3D globe, featured species, prehistoric teaser |
| `/explore` | Full catalogue with region/class/status/sort filters, deep-linkable via query string |
| `/animal/[slug]` | Species page: 3D model viewer, size comparison, fact sheet, favourites, dynamic OG image |
| `/quiz` | Ten-round 3D silhouette quiz with timers, streaks and badges |
| `/profile` | Collection: favourites, badges, score history |
| `/sign-in`, `/sign-up` | Clerk forms, or an explainer while Clerk is unconfigured |
| `/about` | How it is built, data sources, ad policy, accessibility notes |

### Feature highlights

- **3D viewer** — orbit/zoom/pan, wireframe toggle, three lighting presets, auto-spin, fullscreen, DRACO
  loading, and a graceful panel if WebGL is unavailable.
- **True-scale size comparison** — the species beside a human, a blue whale and a T. rex, with the dominant
  dimension rendered exactly (`npm run check:size` proves it).
- **Silhouette quiz** — dark rotating models, three distractors chosen from the same class/region, server-side
  score validation.
- **Procedural models** — 9 parametric creature rigs (quadruped, biped, theropod, bird, marine, whale, serpent,
  insect, human) mean no species is ever missing a 3D view. Drop in a `.glb` and it takes over automatically.
- **Ad-safe layout** — slots reserve fixed height, never cover a canvas, and render labelled placeholders until
  `NEXT_PUBLIC_ADSENSE_CLIENT` is set.

---

## Configuration

Copy `.env.example` to `.env.local` and fill in what you need. Every value is optional.

```bash
# Clerk — enables /sign-in, <UserButton /> and cross-device sync
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# Supabase — catalogue, favourites, quiz scores, 3D asset storage
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=      # server only, never NEXT_PUBLIC_

# Optional
NEXT_PUBLIC_SITE_URL=http://localhost:9000
NEXT_PUBLIC_ADSENSE_CLIENT=
NEXT_PUBLIC_DRACO_DECODER_PATH= # defaults to the gstatic CDN
```

### Connecting Supabase

1. Create a project, then run `supabase/schema.sql` in the SQL editor.
2. Run `supabase/seed.sql` (generated — see below) to load the 24 species.
3. Put the URL and the **anon** key in `NEXT_PUBLIC_SUPABASE_*`, and the **service role** key in
   `SUPABASE_SERVICE_ROLE_KEY`.

Clerk is the identity provider, so Supabase never sees a JWT it could use for `auth.uid()`. Per-user tables
therefore have RLS enabled with **no** anon policies: every personal read and write is mediated by the server with
the service role. `animals` is the only table the browser reads directly.

### Enabling auth

Add both Clerk keys and restart. `middleware.ts` constructs `clerkMiddleware()` only when both are present, and
`/profile` becomes a protected route. Without keys the middleware is a pass-through, so Demo Mode is unaffected.

---

## Data

`data/animals.ts` is the single source of truth for the species catalogue. `supabase/seed.sql` is **generated**
from it, so the two can never drift:

```bash
npm run seed:generate   # rewrites supabase/seed.sql from data/animals.ts
```

Editing a species means editing one typed object. The `Animal` interface in `types/animal.ts` mirrors the SQL
schema column for column.

### Adding your own species

1. Append an entry to `data/animals.ts` (all fields are required; `model_url`, `image_url` and `sound_url`
   may be `null`).
2. `npm run check` — fails loudly if an enum value does not match the SQL CHECK constraints.
3. `npm run seed:generate` and apply the seed.

### Adding real 3D models

1. Compress to `.glb` and apply DRACO compression.
2. Upload to the `animal-assets` Supabase Storage bucket.
3. Put the public URL in `model_url`. The species page loads it through `useGLTF` automatically and the
   procedural rig is retired for that species — no code change.

For an offline deployment, copy the DRACO decoder from
`node_modules/three/examples/jsm/libs/draco/` into `public/draco/` and point
`NEXT_PUBLIC_DRACO_DECODER_PATH` at it.

---

## Scripts

```bash
npm run dev             # development server
npm run build           # production build (pre-renders every species + OG image)
npm run start           # serve the production build
npm run typecheck       # tsc --noEmit
npm run check           # typecheck + all node check suites
npm run check:rigs      # procedural rig geometry assertions
npm run check:size      # size-comparison scale assertions for all 24 species
npm run check:sql       # schema.sql / seed.sql / dataset agreement
npm run seed:generate   # regenerate supabase/seed.sql
```

The check suites run in plain Node (type-stripping, no bundler) against the pure modules in `lib/`. They are the
reason the geometry maths can be trusted without a human staring at a viewport: `check:size` asserts that every
species renders at its recorded dominant dimension and that no two figures overlap.

---

## Architecture notes

```
app/                 routes (server components by default)
components/3d/       canvas shell, globe, model viewer, size chart, procedural rigs
components/animal/   grid, cards, filters, fact sheet, favourite button
lib/rigs.ts          parametric creature geometry + bounding-box maths (pure, tested)
lib/size-comparison.ts  true-scale layout maths (pure, tested)
lib/animals.ts       the only read path for species data (Supabase -> bundled dataset fallback)
lib/supabase.ts      anon client; lib/supabase-admin.ts  service-role client (server-only)
data/animals.ts      the catalogue
supabase/            schema.sql + generated seed.sql
scripts/             node check suites and the seed generator
```

Three rules keep the app honest:

1. **Every external dependency is optional and fails soft.** No Clerk keys, no Supabase keys, no models, no
   audio — each degrades to something that still works rather than an error page.
2. **Heavy 3D code never blocks content.** `three` and R3F are loaded through `next/dynamic` with
   `ssr: false`; species text and metadata are static HTML.
3. **Maths that can be checked, is checked.** Geometry, scaling and database agreement live in pure modules
   with node assertions attached.

---

## Deployment

Any Node host works (Vercel, Fly, a container). Set the environment variables from the table above, run
`npm run build`, and serve with `npm run start`. `NEXT_PUBLIC_SITE_URL` must match the public origin so that
canonical URLs and OG images resolve.
