# Performance notes

Everything here is measurable in this repository: the numbers come from `npm run build`, from the served HTML,
and from `npm run audit:perf`, which drives headless Chrome over the DevTools protocol and reports what the
browser really downloaded and painted.

## What a visitor actually pays for

Measured on the production build (`npm run build && npm start`, then `npm run audit:perf`), cold cache:

| Route | JS before `load` | JS total | Transfer | 3D deferred |
| --- | --- | --- | --- | --- |
| `/` | 142 kB | 405 kB | 537 kB | ~250 kB, ~1.8 s *after* load |
| `/explore` | 146 kB | 405 kB | 535 kB | ~250 kB after load |
| `/animal/[slug]` | 139 kB | 442 kB | 984 kB | model + decoder after load |
| `/quiz` | 150 kB | 150 kB | 264 kB | none on first paint |
| `/leaderboard` | 128 kB | 155 kB | 301 kB | — |
| `/about` | 127 kB | 153 kB | 299 kB | — |

"JS before `load`" is the number that matters for Core Web Vitals: it is what competes with the first paint. The
3D bundles start *after* the page is already usable — see "The core rule" below.

For comparison, the same audit on the pre-optimisation build reported **777 kB of JavaScript and 892 kB of
transfer** for `/` and **596 kB of JavaScript** for `/about` — of which 239 kB was Clerk's UI, fetched from
Clerk's CDN for visitors who were not signed in.

## The core rule: content first, WebGL second

A species page must be readable before a single triangle is drawn. `three`, `@react-three/fiber` and
`@react-three/drei` together are roughly **750 KB of raw JavaScript**, so they are never part of a page's initial
payload:

- The root layout and every page are Server Components; species text, fact sheets, internal links, metadata and
  JSON-LD are static HTML.
- Every canvas sits behind `next/dynamic` with `ssr: false` (`components/3d/LazyViewers.tsx`,
  `components/3d/LazyGlobe.tsx`, and the quiz stage inside `QuizGame`).
- `components/3d/MountWhenVisible.tsx` adds the second half of that promise: a dynamic import starts the moment
  its component renders, which on the landing page and the species pages is immediately. The canvas now waits
  until it is within 240 px of the viewport **and** the browser is idle, so the 3D bytes never race the paint of
  the text that is the largest contentful element.
- `experimental.optimizePackageImports` in `next.config.ts` tree-shakes `lucide-react` and
  `@react-three/drei`.

Verifying that the split is real (not just a smaller number in the report):

```bash
npm run build
# The two largest client chunks are three + R3F/drei:
ls -S .next/static/chunks/*.js | head -2

# Neither is referenced by the served landing page:
curl -s http://localhost:9000/ | grep -c bd904a5c   # -> 0

# ...and the audit shows when they arrive instead:
npm run audit:perf
#   deferred past load: 99.8kB@3453ms  86.9kB@3455ms  45.6kB@3445ms
```

## Auth without the auth SDK

The account UI used to be the largest single cost on every route — including the 24 statically generated species
pages a crawler walks. Two habits caused it, and both are gone:

1. **The root layout imported both providers.** `SupabaseAuthSlot` was imported statically even when Clerk was
   the active provider, which put `@supabase/supabase-js` (~112 kB) into every page's graph. The layout now
   imports neither: `components/auth/AuthSlot.tsx` resolves the provider-specific UI with `import()` inside an
   effect.
2. **`<ClerkProvider>` wrapped the whole app**, so Clerk's client runtime and the UI chunks its components pull
   from Clerk's CDN (~239 kB) loaded for signed-out visitors too. Clerk's provider now lives inside the module
   that renders the account menu, and that module is only fetched when there is a session to show.
   `app/sign-in` and `app/sign-up` mount their own provider — they are the only routes that need the sign-in
   bundle, and neither is indexed.

The layout cannot read cookies without opting every route into dynamic rendering, so `middleware.ts` publishes
what it already knows as a short-lived JS-readable hint cookie (`kami-auth=in|out`, 5 minutes). For Clerk it
copies the verdict from Clerk's own `x-clerk-auth-status` response header; for Supabase it is the presence of
`sb-<ref>-auth-token`. The client reads it synchronously (`lib/auth-hint.ts`) and:

- `in` → load the account UI immediately;
- `out` → load nothing at all — the server already rendered the correct guest state;
- `unknown` → load it when the browser is idle, so a stale or missing hint can only ever *delay* the account
  menu, never hide it from a signed-in visitor.

It is a hint, never a credential: nothing is authorised from it, and the tests in `scripts/check-auth-hint.mjs`
pin the cases that would produce the "it still says Sign in while I am signed in" bug.

## Motion without a motion library

`framer-motion` used to be imported by the navbar and the ambient background — both in the root layout, so every
page downloaded it. The five animated surfaces (nav pill, mobile disclosure, auth dropdown, unlock modal, quiz
transitions) are now CSS keyframes and transitions declared in `app/globals.css`, and the dependency is gone from
`package.json`. Removing it took **42 kB off every route** in the build report and, more importantly, off the
critical path.

## Fonts

Inter and Sora are loaded through `next/font/google` with `display: swap` (self-hosted, so no third-party
request and no render-blocking `<link>`). Sora is requested **without a weight list**, which downloads the single
variable file instead of four static instances.

## Device tiers

The same canvas settings used to go to every device: `dpr={[1, 1.8]}`, a 1024² shadow map, contact shadows and a
1500-star sky. `lib/quality.ts` decides once, from facts the browser offers freely — `deviceMemory`,
`hardwareConcurrency`, `saveData`, and whether the pointer is coarse:

| Tier | When | dpr | Shadows | Stars | Globe segments |
| --- | --- | --- | --- | --- | --- |
| `low` | `saveData`, ≤ 2 GB, or ≤ 2 cores | 1.25 | off | 400 | 48 |
| `balanced` | everything not proven otherwise — phones, and browsers that share nothing | 1.6 | on | 900 | 72 |
| `high` | ≥ 8 GB **and** ≥ 8 cores **and** a fine pointer | 1.8 | on | 1500 | 96 |

Two rules matter more than the numbers:

- **`saveData` outranks everything.** It is the visitor asking us to be cheap, not a hint.
- **Unknown is mid-range, never "high".** Firefox and Safari do not implement `navigator.deviceMemory`; guessing
  high on a device that never answered is how a stutter ships.

`components/3d/useQuality.ts` reads the facts in an effect, not during render. A client component inside a
statically rendered page is still server-rendered, so reading during render described the **build machine** (8
cores, no `deviceMemory`) and hydration then disagreed with the HTML. The first render now uses the middle profile
and the measured one replaces it immediately after mount; the chosen tier is visible as `data-quality` on every 3D
wrapper, which is what the browser checks assert on.

## Per-canvas rules

1. **One live canvas per surface.** The globe is a single canvas for eight regions; the quiz renders one
   silhouette stage, not ten.
2. **Card previews are hover-only and unmounted on leave.** `AnimalCard` mounts the preview after a 220 ms hover
   delay and tears it down on `pointerleave`, so browsing a 24-card grid never accumulates WebGL contexts
   (browsers start dropping the oldest around 16).
3. **Never mount 3D on touch devices that cannot hover.** `(hover: hover) and (pointer: fine)` gates the card
   preview; on a phone the detail page is the 3D surface.
4. **Clamped device pixel ratio.** Every canvas uses `dpr={[1, 1.8]}` (1.5 for card previews). A 3x phone would
   otherwise shade 9x the pixels for no visible gain.
5. **Demand-driven detail.** The globe uses 96×96 sphere segments and 1500 stars; the sky is `<Stars>`, which is
   procedural geometry rather than an HDRI, so no environment map is ever fetched.
6. **No remote asset fetches in the default path.** There is no HDR environment, no fonts are loaded inside a
   canvas, and the globe texture is drawn to a canvas. The DRACO decoder is the only external fetch, and it
   happens on the first `.glb` load — vendor it into `public/draco/` for offline deployments (see
   `docs/ASSETS.md`).

## 3D asset budget

Enforced by review, documented in `docs/ASSETS.md`:

- ≤ 1.5 MB per compressed `.glb`
- ≤ 75k triangles (the quiz swaps models every question)
- textures at 1024 px, WebP or KTX2
- DRACO compression on every model; the decoder is wired through `useGLTF(url, decoderPath)`

## Caching

`next.config.ts` sets `Cache-Control: public, max-age=31536000, immutable` on `/models/*` and `/draco/*`,
which is safe because those filenames are effectively content-addressed by slug plus model version, and
`max-age=86400, stale-while-revalidate=604800` on `/geo/*` (the 76 KB Natural Earth coastline the globe draws
from — unchanged between deploys but not fingerprinted). Species pages revalidate every 5 minutes; the sitemap,
robots file and web app manifest are fully static.

## SEO

- `generateStaticParams` pre-renders all 24 species; `generateMetadata` produces per-species title, description,
  keywords, canonical URL, OpenGraph and Twitter card tags.
- Every page declares an absolute canonical (`metadataBase` plus `alternates.canonical`); `/` is the only route
  that inherits it from the layout.
- Structured data is built as plain objects in `lib/seo.ts` and emitted through `components/seo/JsonLd.tsx`:
  `WebSite` + `SearchAction` (targeting the `?q=` the navbar actually implements) and `Organization` site-wide,
  `BreadcrumbList` on every inner page, `Taxon` + `PropertyValue` measurements per species, `CollectionPage` +
  `ItemList` on `/explore` and `/leaderboard`, and `Quiz` on `/quiz`. `scripts/check-seo.mjs` asserts that every
  URL is absolute, that the types match what the pages render, and that nothing in the payload can close the
  script tag.
- `opengraph-image.tsx` renders a 1200×630 social card with Satori — one per species using its own accent colours
  and measurements, plus one site-wide default.
- `app/sitemap.ts` emits 24 species URLs plus the five landing surfaces; `app/robots.ts` keeps `/api`,
  `/profile`, `/sign-in` and `/sign-up` out of the index; `app/manifest.ts` provides the installable web app
  metadata.
- Filtering on `/explore` happens on the client, so the route is **static** and the prerendered HTML contains all
  24 species links — the internal links a crawler should follow are in the first response, not behind hydration.

## Mobile and touch

- `.kami-canvas canvas { touch-action: none }` (in `app/globals.css`) hands gestures to OrbitControls, so
  one-finger drag rotates, pinch zooms and two-finger drag pans instead of scrolling the page.
- Toolbars sit in the DOM outside the canvas and use 40 px targets; the globe HUD exposes a horizontally
  scrollable chip row as a touch alternative to hitting a pin.
- `viewport.maximumScale = 5` keeps page-level pinch zoom available for reading.

## Motion and WebGL fallbacks

- `prefers-reduced-motion: reduce` disables the ambient particle animation, the idle globe rotation and the
  rise-in transitions, and collapses every transition duration.
- A React error boundary around each canvas (`CanvasShell`) replaces a failed WebGL context with an explanatory
  panel instead of an empty rectangle, and each canvas carries a text alternative plus an equivalent DOM control.

## Reading the audit honestly

- **TTFB in the audit includes Clerk's dev-mode handshake.** With a Clerk *development* instance, a cookieless
  document request is answered with a handshake redirect, so a browser pays two extra round trips to Clerk before
  the HTML arrives (~1.2 s in the tables above, retried three times while the secret key is invalid). Against the
  server directly the same pages answer in ~140 ms (`curl -w '%{time_total}'`). A production instance with live
  keys does not do this.
- The audit disables the HTTP cache so every route is measured as a first visit; it is run on a local machine, so
  treat the absolute milliseconds as a comparison between builds rather than as field data.

## Reproducing the checks

```bash
npm run build        # build + per-route First Load JS report
npm run check        # typecheck, rig geometry, size maths, SQL agreement, SEO graph, session hint, themes, tiers
npm run check:bundle # after a build: per-route JS budget and the "no eager 3D/auth" rule (also runs in CI)
npm run audit:perf   # real browser: TTFB/FCP/LCP/CLS and what was fetched before and after load
THROTTLE=1 npm run audit:perf   # the same, on Slow 4G with a 4x CPU slowdown
```

## The bundle budget moved into CI

`next build`'s "First Load JS" column is an accounting of a route's chunk graph, and twice it did not describe
what a browser actually downloaded: Clerk's 239 kB CDN payload was invisible to it, and it said nothing about the
3D bundles being requested before the first paint. `scripts/check-bundle.mjs` closes that gap without a browser —
it reads the HTML the build produced, takes the exact `<script src>` list out of it (which *is* what a browser
fetches), gzips those files and fails when a route exceeds its budget, when `three`/Clerk/Supabase/`framer-motion`
appear in the first paint, or when three.js has vanished from the build altogether. It runs after the build in CI, so
a bundle regression is a red check rather than a discovery six weeks later.
