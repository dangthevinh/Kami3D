![Kami3D](public/brand/kami3d-mark.svg)

# Kami3D — 3D World Wildlife Encyclopedia

[![CI](https://github.com/dangthevinh/Kami3D/actions/workflows/ci.yml/badge.svg)](https://github.com/dangthevinh/Kami3D/actions/workflows/ci.yml)
[![Next.js](https://img.shields.io/badge/Next.js-15-000?logo=next.js)](https://nextjs.org)
[![React Three Fiber](https://img.shields.io/badge/React%20Three%20Fiber-9-000?logo=three.js)](https://docs.pmnd.rs/react-three-fiber)

An interactive encyclopedia where every species can be rotated, measured against your own body, and
identified by its silhouette. Built with Next.js App Router, React Three Fiber, Clerk and Supabase.

**The app runs with zero configuration.** With no environment variables it boots in *Demo Mode*: a bundled
24-species dataset, cookie-backed favourites and quiz scores, and procedural 3D models. Add keys and the same
code paths switch to Clerk auth, Supabase persistence and real ad slots.

```bash
npm install
npm run dev        # http://localhost:9000
```

Optional next step: `npm run models:report` lists downloadable 3D models for every species, and
`npm run models:fetch` pulls the redistributable ones in. See [docs/MODELS.md](docs/MODELS.md).

> **Progress and roadmap: [PLAN.md](PLAN.md)** — every phase, what shipped, how it was verified, and what is
> still open.

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

There is no committed env template: the only env file is `.env.local`, which is **gitignored**. Create it and
fill in what you need — every value is optional, and with none of them set the app runs in Demo Mode.

```bash
# --- Clerk (https://dashboard.clerk.com) — enables /sign-in, <UserButton />, sync
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/

# --- Supabase (https://supabase.com/dashboard) — catalogue, favourites, scores
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=          # or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY=              # server only, never NEXT_PUBLIC_

# --- 3D model downloads
SKETCHFAB_API_TOKEN=                    # https://sketchfab.com/settings/password
SI_API_KEY=                             # optional, https://api.data.gov/signup/
POLY_PIZZA_API_KEY=                     # optional, https://poly.pizza/api
NEXT_PUBLIC_DRACO_DECODER_PATH=         # empty = the vendored copy in public/draco/

# --- Site and ads
NEXT_PUBLIC_SITE_URL=http://localhost:9000
NEXT_PUBLIC_ADSENSE_CLIENT=             # empty renders labelled placeholders
```

| Variable | Read by | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` + `CLERK_SECRET_KEY` | app | Both required; with one missing the app stays in Demo Mode |
| `NEXT_PUBLIC_SUPABASE_URL` + anon/publishable key | app | Public by design; RLS is what protects the data |
| `SUPABASE_SERVICE_ROLE_KEY` | server only | Bypasses RLS. Without it, favourites and scores fall back to a cookie |
| `SKETCHFAB_API_TOKEN` | `scripts/fetch-models.mjs` | Searching works without it, downloading does not |
| `SI_API_KEY`, `POLY_PIZZA_API_KEY` | `scripts/fetch-models.mjs` | Optional extra model providers |
| `NEXT_PUBLIC_SITE_URL` | app | Canonical URLs, sitemap, OG images — must match the public origin. Falls back to the Vercel/Netlify production URL, then to `http://localhost:9000` (which the build warns about) |
| `NEXT_PUBLIC_DRACO_DECODER_PATH` | browser | Empty uses the self-hosted decoder |
| `NEXT_PUBLIC_ADSENSE_CLIENT` | browser | Empty renders ad placeholders |

> A tracked `.env.example` was removed deliberately: a template that looks like a place to paste real keys is
> how credentials end up in a public repository. The table above is the template instead.

### Connecting Supabase

1. Create a project, then run `supabase/schema.sql` in the SQL editor (or `npm run db:schema` with an access
   token — see below).
2. Load the catalogue. **Do not skip this.** Favourites reference a species by foreign key, so with an empty
   `animals` table every save is rejected — the API answers 409 with the run-the-seed instruction rather than
   pretending it worked.

   ```bash
   npm run db:status   # what the database currently holds
   npm run db:seed     # load or update the 24 species, idempotently
   ```

   `db:seed` needs one credential in `.env.local` (gitignored). It auto-detects either:

   | Variable | Where to get it | What it does |
   | --- | --- | --- |
   | `SUPABASE_ACCESS_TOKEN` | <https://supabase.com/dashboard/account/tokens> (`sbp_…`) | Runs `supabase/seed.sql` verbatim through the Management API |
   | `SUPABASE_SERVICE_ROLE_KEY` | Project → Settings → API | Upserts through PostgREST, matched on `slug` so re-running is safe |

   The anon key cannot do this by design: it has no INSERT grant on `animals` and RLS denies it on personal
   tables. The script says so instead of failing obscurely.
3. Put the URL and the **anon or publishable** key in `NEXT_PUBLIC_SUPABASE_*`. The service-role key is optional
   and only needed for privileged maintenance — sign-in, favourites and scores all work without it.

`animals` is publicly readable. Every personal table is protected by row level security keyed on
`auth.uid()::text`, so a signed-in visitor can only ever read and write their own rows, and the anon role has no
access at all. Nothing in the application holds a key that could bypass that.

### View counts

Each species card shows how many times its page has been opened, counted in the database.

- `animals.view_count` holds the total. It is runtime data, so `db:seed` **never writes it** — re-seeding the
  catalogue leaves real counts alone.
- The increment goes through `increment_animal_view(slug)`, a deliberately narrow `SECURITY DEFINER` function.
  RLS grants `anon` no UPDATE on `animals`, so this is the only way a visitor can count a view; the function takes
  a slug, increments one integer in one column of one row and returns it. It cannot read anything back, touch another
  column or create rows, and its `search_path` is pinned empty.
- `POST /api/views` is called from the species page after hydration, because the page is statically generated and
  counting at build time would count deployments rather than visitors.
- Repeat views from the same browser within six hours are not counted again (a first-party cookie). That is a coarse
  guard against a refresh inflating the number, not an analytics identity.
- With no database configured there is no counter to read, so the figure is omitted rather than invented.

### Leaderboard and trends

`/leaderboard` ranks species by total views and charts the last thirty days.

- `animal_views_daily` holds one row per species per day, keyed `(animal_id, day)`. The increment function writes
  the total and the daily row **in the same call**, so a view can never land in one and be lost from the other.
  Day counts are aggregate, not personal data, so the table is publicly readable — and has no insert or update
  policy at all, which means the function remains the only way in.
- `lib/trend.ts` is the chart maths: gap-filling, sparkline paths, bar geometry and the summary figures. It is
  pure and tested, with dates pinned so the suite cannot fail on a particular calendar day.
- The charts are server-rendered SVG, so the page ships no client JavaScript and the sparklines can be rendered
  straight into static HTML.

> The advisors warn that `increment_animal_view` is a `SECURITY DEFINER` function executable by `anon`. That is
> deliberate and the reason it exists: the catalogue is public, and this is a narrower door than granting `anon`
> UPDATE on `animals`. The function takes a slug, increments one integer in one column of one row and returns it.

### Accounts and sign-in

**Supabase Auth is the default provider** and needs nothing beyond the project above. Set `NEXT_PUBLIC_SUPABASE_URL`
and a key, restart, and `/sign-in` and `/sign-up` become real email + password forms. Pressing sign-out clears the
session cookie in the browser; `middleware.ts` refreshes it on every request that carries one, and skips the round
trip entirely for anonymous traffic.

Two project settings are worth knowing about:

- **Confirm email** (Authentication → Sign In / Providers → Email). Supabase enables it by default: a new account
  is created but cannot sign in until the emailed link is opened, and the form says so. Turn it off while you are
  testing and sign-up signs you in immediately.
- **Minimum password length** is enforced at 8 characters by the form (Supabase's own default is 6).

**Clerk is supported as a full alternative.** Add both Clerk keys and the app uses Clerk's hosted sign-in and
`<UserButton />`. Exactly one provider is authoritative, chosen in `lib/auth-provider.ts` and used by the layout,
the auth pages, `middleware.ts` and the server helpers alike:

| `AUTH_PROVIDER` | Behaviour |
| --- | --- |
| *(empty)* | Supabase when configured, otherwise Clerk, otherwise Demo Mode |
| `supabase` | Supabase Auth, even if Clerk keys are present |
| `clerk` | Clerk, even if Supabase is configured |
| `none` | Demo Mode: no accounts, browser-local collection |

The two providers differ in where ownership is enforced, which is the one thing worth understanding before
switching:

- **Supabase Auth** issues the JWTs the database understands, so personal rows go through the signed-in client and
  **row level security enforces ownership in Postgres**. Nothing in the application can reach another account's rows.
- **Clerk** authenticates the visitor, but `auth.uid()` is always null, so `SUPABASE_SERVICE_ROLE_KEY` is required
  and every query is filtered by `user_id` in application code. Weaker than RLS — it depends on never forgetting
  the filter — which is why both paths live side by side in `lib/personal-data.ts`. The RLS policies still apply:
  they are what keeps the public anon key out of personal rows.

With neither configured, `/sign-in` explains what to add and the whole app still works in Demo Mode with a
browser-local collection.

### Light and dark

The visitor picks a theme in the navbar's **Settings** menu (the gear, next to the account area) →
*Appearance* → **Light** or **Dark**. Dark is the default, and the choice is remembered per browser in
`localStorage` under `kami-theme`.

It is a palette, not a second stylesheet. The whole UI is written as white overlays on a night canvas —
`text-white/60`, `bg-white/6`, `ring-white/12` — and Tailwind v4 compiles those to
`color-mix(in oklab, var(--color-white) N%, transparent)`. The `.light` block in `app/globals.css` therefore
redefines a few dozen tokens, and **every one of those 220-odd utilities flips at once**:

| Token | Dark | Light | Why |
| --- | --- | --- | --- |
| `--color-white` | `#fff` | `#0a1024` | the overlays above become ink instead of light |
| `--color-void` / `--color-abyss` | `#04060f` / `#070c1a` | `#f4f6fc` / `#fff` | page and panel surfaces |
| `--color-neon` and friends | bright | darkened | the same hues, legible on white |
| `--color-*-300` | Tailwind default | 700-level | IUCN status chips vanish on white otherwise |
| `--color-on-accent` | `#04121a` | `#fff` | ink for text *on* a solid accent fill |

Two decisions worth knowing:

- **The 3D stage stays dark in both themes.** Every scene is lit for a dark room (key light, violet rim, contact
  shadows on a dark floor); re-lighting three scenes for daylight would change how the models read. The viewer
  keeps its own night surface, like a photo lightbox — `.kami-canvas` in `app/globals.css`.
- **Contrast is tested, not eyeballed.** `npm run check:theme` parses both palettes out of the stylesheet and
  asserts WCAG AA in both directions (accent text on the page, *and* the on-accent ink on a solid accent fill);
  `npm run audit:theme` drives a real browser over every route in both themes and reports unreadable text and
  dark panels that failed to follow the theme. Both pass today, for all 12 route/theme combinations.

To follow the operating system instead of defaulting to dark, set `enableSystem` and
`defaultTheme="system"` in `components/theme/ThemeProvider.tsx` — the provider is already `next-themes`, which
writes the class before the first paint, so there is no flash either way.

---

## Data

`data/animals.ts` is the single source of truth for the species catalogue. `supabase/seed.sql` is **generated**
from it, so the two can never drift:

```bash
npm run seed:generate   # rewrites supabase/seed.sql from data/animals.ts
```

Editing a species means editing one typed object. The `Animal` interface in `types/animal.ts` mirrors the SQL
schema column for column.

### Map data

The globe is drawn from **Natural Earth**'s 110m land polygons (<https://www.naturalearthdata.com>), which are
**public domain**. `public/geo/land-110m.json` is that layer simplified to two decimal places (~1.1 km at the
equator — far finer than the 2048px texture it feeds) and committed, so the globe needs no external request and no
photo licence.

`lib/earth-map.ts` holds the projection and the point-in-polygon test as pure functions, and `npm run check:geo`
proves them against real coordinates: twelve cities must fall on land, seven mid-ocean points must not, and the
land fraction has to come out near 29%. Getting the projection wrong would put Africa in the Pacific, which is
exactly the kind of mistake nobody notices from a screenshot of the code.

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

## Automatic 3D models

`npm run models:report` searches Sketchfab, Smithsonian Open Access and Poly Pizza for every species and prints
what is available — nothing is downloaded, and it works with no API keys because Sketchfab's search endpoint is
public.

```bash
npm run models:report                                    # licence audit, downloads nothing
npm run models:fetch -- --species=lion --apply --wire    # fetch one species and wire it in
npm run models:fetch                                     # all species (--all --apply --wire)
```

Downloads are gated on a licence allow-list (CC0, public domain, CC BY). Share-alike, no-derivatives,
non-commercial and all-rights-reserved models are refused, and every accepted model records its author, source
and licence in `data/model-attribution.json` — which the species page renders as a credit line. A CC BY model
therefore cannot reach the site without its attribution.

The shipped catalogue already contains **24 DRACO-compressed models (10 MB, down from 61 MB)** under CC BY 4.0,
with the decoder vendored in `public/draco/` so nothing is fetched from a CDN.

Full details, including which key each provider needs: [docs/MODELS.md](docs/MODELS.md).

## Scripts

```bash
npm run dev             # development server on :9000
npm run build           # production build (pre-renders every species + OG image)
npm run start           # serve the production build
npm run typecheck       # tsc --noEmit
npm run check           # typecheck + all node check suites
npm run check:rigs      # procedural rig geometry assertions
npm run check:size      # size-comparison scale assertions for all 24 species
npm run check:sql       # schema.sql / seed.sql / dataset agreement
npm run check:seo       # JSON-LD graph shape, absolute URLs, script-tag escaping
npm run check:auth      # the session hint that keeps auth SDKs off anonymous pages
npm run check:theme     # both palettes: token completeness and WCAG contrast maths
npm run check:quality   # device tier rules (saveData, weak hardware, unknown APIs)
npm run check:camera    # viewer camera maths: presets, damped flights, orbit, dolly
npm run check:quiz      # quiz round builder (variants, determinism) + scoring rules
npm run check:bundle    # after a build: per-route JS budget + "no eager 3D/auth" gate
npm run audit:theme     # a real browser: unreadable text and dark panels in light mode
npm run audit:perf      # headless Chrome: TTFB/FCP/LCP/CLS and what loaded before paint
                        #   THROTTLE=1 adds Slow 4G + a 4x CPU slowdown
npm run seed:generate   # regenerate supabase/seed.sql from the dataset
npm run db:status       # what the database currently holds
npm run db:seed         # push the catalogue into Supabase (idempotent)
npm run models:report   # what 3D models are available, with licences
npm run models:fetch    # download the redistributable ones
npm run publish -- "message"   # verify, build, commit, push — one step per phase
```

## Automation

| Workflow | Trigger | What it does |
| --- | --- | --- |
| `.github/workflows/ci.yml` | every push and pull request | `npm ci` → typecheck → the node check suites → fails if `supabase/seed.sql` is stale → production build → **bundle budget** (`check:bundle`: per-route JavaScript limit plus "no three.js, Clerk or Supabase in the first paint"). A second job runs the model pipeline with no keys, proving it degrades instead of crashing. |
| `.github/workflows/auto-merge.yml` | Dependabot PRs and anything labelled `automerge` | enables squash auto-merge once checks pass; patch and minor dependency bumps get the label automatically, majors wait for a human. |
| `.github/dependabot.yml` | weekly | dependency and GitHub Actions updates, grouped so `three`/`@react-three/*` and the React trio move together. |

Locally, `scripts/publish.sh` (via `npm run publish`) runs the same checks plus a production build before it
commits and pushes, and `.githooks/pre-push` runs the fast checks on every push. Enable the hook once per clone:

```bash
git config core.hooksPath .githooks
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

Four rules keep the app honest:

1. **Every external dependency is optional and fails soft.** No Clerk keys, no Supabase keys, no models, no
   audio — each degrades to something that still works rather than an error page.
2. **Heavy 3D code never blocks content.** `three` and R3F are loaded through `next/dynamic` with
   `ssr: false`, and `MountWhenVisible` holds the download until the canvas is near the viewport and the browser
   is idle; species text and metadata are static HTML.
3. **Auth code is not part of a page nobody signed in to.** The root layout imports no auth SDK: the account
   menu is fetched with `import()` only when `middleware.ts` reports a session. See
   [docs/PERFORMANCE.md](docs/PERFORMANCE.md).
4. **Maths that can be checked, is checked.** Geometry, scaling and database agreement live in pure modules
   with node assertions attached.

---

## Deployment

Any Node host works (Vercel, Fly, a container). Set the environment variables from the table above, run
`npm run build`, and serve with `npm run start`. `NEXT_PUBLIC_SITE_URL` must match the public origin so that
canonical URLs and OG images resolve.
