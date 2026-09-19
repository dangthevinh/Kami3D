# Performance notes

Everything here is measurable in this repository: the numbers come from `npm run build` output and from
inspecting which chunks the served HTML actually references.

## The core rule: content first, WebGL second

A species page must be readable before a single triangle is drawn. `three`, `@react-three/fiber` and
`@react-three/drei` together are roughly **750 KB of raw JavaScript**, so they are never part of a page's initial
payload:

- The root layout and every page are Server Components; species text, fact sheets, internal links, metadata and
  JSON-LD are static HTML.
- Every canvas sits behind `next/dynamic` with `ssr: false` (`components/3d/LazyViewers.tsx`,
  `components/3d/LazyGlobe.tsx`, and the quiz stage inside `QuizGame`).
- `experimental.optimizePackageImports` in `next.config.ts` tree-shakes `lucide-react`, `framer-motion` and
  `@react-three/drei`.

### Measured effect

First Load JS, before and after deferring the globe, the quiz stage and the card previews:

| Route | Before | After |
| --- | --- | --- |
| `/` | 426 kB | **173 kB** |
| `/explore` | 427 kB | **174 kB** |
| `/quiz` | 417 kB | **168 kB** |
| `/animal/[slug]` | 167 kB | **127 kB** |
| `/profile` | 166 kB | **125 kB** |
| shared by all routes | 103 kB | 103 kB |

Verifying that the split is real (not just a smaller number in the report):

```bash
npm run build
# The two largest client chunks are three + R3F/drei:
ls -S .next/static/chunks/*.js | head -2
# 386927  bd904a5c....js
# 368289  b536a0f1....js

# Neither is referenced by the served landing page:
curl -s http://localhost:9000/ | grep -c bd904a5c   # -> 0
```

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
   canvas, and the globe texture is a canvas-generated graticule. The DRACO decoder is the only external fetch,
   and it happens on the first `.glb` load — vendor it into `public/draco/` for offline deployments (see
   `docs/ASSETS.md`).

## 3D asset budget

Enforced by review, documented in `docs/ASSETS.md`:

- ≤ 1.5 MB per compressed `.glb`
- ≤ 75k triangles (the quiz swaps models every question)
- textures at 1024 px, WebP or KTX2
- DRACO compression on every model; the decoder is wired through `useGLTF(url, decoderPath)`

## Caching

`next.config.ts` sets `Cache-Control: public, max-age=31536000, immutable` on `/models/*` and `/draco/*`,
which is safe because those filenames are effectively content-addressed by slug plus model version. Species pages
revalidate every 5 minutes; the sitemap and robots files are fully static.

## SEO

- `generateStaticParams` pre-renders all 24 species; `generateMetadata` produces per-species title, description,
  keywords, canonical URL, OpenGraph and Twitter card tags.
- `opengraph-image.tsx` renders a 1200×630 social card per species with Satori, using the species' own accent
  colours and measurements.
- `app/sitemap.ts` emits 24 species URLs plus the four landing surfaces; `app/robots.ts` keeps `/api`,
  `/profile`, `/sign-in` and `/sign-up` out of the index.
- Every species page embeds `Taxon` JSON-LD.

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

## Reproducing the checks

```bash
npm run build     # build + per-route First Load JS report
npm run check     # typecheck, rig geometry, size maths, SQL/dataset agreement
```
