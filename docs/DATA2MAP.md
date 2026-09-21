# Data2Map

Data2Map is the second product surface on this infrastructure: **data maps for business users** rather than an
animal encyclopedia. It shares the authentication, the database, the UI kit and the map stack with Kami3D, and
nothing else — different questions, different data, different pages, and its own routes (`/data2map/*`),
components (`components/data2map/*`) and tables (`data2map_*`).

```bash
open http://localhost:9000/data2map
npm run data2map:seed     # write the registry into PostGIS
npm run data2map:status   # what the database holds
npm run check:data2map    # the catalogue, the registry, the RLS patterns, the doc
```

## What D1 (the foundation) actually built

Not a second map stack. The plan for this module asked for `BaseMap.tsx`, `LayerControl.tsx`, `MapLegend.tsx`,
`MapSearch.tsx` and a `useData2Map` context; every one of those already exists in this repository in a form that
does the job, and a second copy would be two places to fix every bug:

| The plan asked for | What this module uses |
| --- | --- |
| `components/data2map/BaseMap.tsx` | `components/map/BaseMap.tsx` — MapLibre, keyless style, native controls |
| `LayerControl.tsx` | `components/map/LayerPanel.tsx`, now fed by a registry instead of hard-coded rows |
| `MapSearch.tsx` | `lib/map-query.ts` — the URL is the state, already tested by `check:map` |
| `useData2Map` + context | `lib/map-layers.ts` (zustand) — one store, one source of truth per switch |
| "enable PostGIS" | already installed (`extensions` schema, Phase 13) |
| Turf.js, Shadcn UI | already dependencies |

So D1 is: a module layout, a landing page that lists the five products **and** their data sources, a navbar entry,
three tables, and a registry the layer panel will read. The renderer is shared, and the budget is shared with it.

## The registry, and why it is a table

`data2map_layers` is what a product page renders its switches from, so five pages do not each hard-code the same
switch five times. `data2map_datasets` is the provenance behind those layers: source, licence, year, record count,
and **whether the data is simulated**. `data/data2map-registry.json` is the source of truth and the tables are a
copy of it, the same arrangement as the species catalogue and the geodata.

A layer whose dataset has `status = 'planned'` is not drawn: the panel says what is missing rather than showing an
empty layer, which is the same rule `/map` follows for protected areas.

## Licence decisions, taken before any data was written

| Source | Licence | Decision |
| --- | --- | --- |
| OpenStreetMap via Overpass | ODbL 1.0 | **accepted for amenities and roads**, displayed with attribution and fetched per view rather than stored as a derived database |
| WorldPop population | CC BY 4.0 | accepted, not yet imported |
| Copernicus Sentinel-2 (NDVI) | CC BY 4.0, "Contains modified Copernicus Sentinel data" | accepted; the licence is settled, the tile pipeline is not built |
| **Google Places** | ToS forbids caching or storing place data | **refused** — the original plan suggested seeding from it, and that is both a terms violation and an API key (which would break "a fresh clone runs with no keys") |
| Vietnamese land price tables and zoning | published as legal documents and drawings | **not machine-readable**: the honest path is upload (the admin geodata pipeline), plus simulated demo data that says it is simulated |

This is why `data2map_datasets.license` accepts one value no other table does — `ODbL`. It is a share-alike *data*
licence rather than the attribution-only pair the rest of the product ships, so it is allowed here, recorded per
row, and attributed in the UI. The animal tables keep their stricter two-value rule.

## Simulated data is labelled, not hidden

Footfall by hour, fleet telemetry and land prices have no open source. The registry marks those datasets
`synthetic: true` with a `note` that the UI renders verbatim, and `check:data2map` fails if a simulated dataset
lacks one. A demo that looks like telemetry is worse than no demo: this module would rather say "simulated" than
let someone make a decision on a number we invented.

## The renderer decision, recorded so it is not re-litigated

**No deck.gl.** MapLibre already draws heatmaps, clusters, circles, fills, lines, symbols and extrusions, and Turf
— already a dependency — produces hex grids for a `fill` layer. deck.gl would add several hundred kilobytes to a
route whose whole budget is 150 kB, for layers the renderer already has. It becomes worth revisiting when a
measured layer needs it: more than roughly 100 000 points on screen, or an arc/trip animation MapLibre genuinely
cannot draw. If that day comes: `dynamic(ssr: false)` inside the route, its own budget, and a new marker in
`FORBIDDEN` in `scripts/bundle-budget.mjs`.

## D2 — Real Estate & Zoning

`/data2map/real-estate`: a land-price hex grid, zoning parcels, flood bands and the amenities around a plot,
plus a **potential score** that shows every input behind it.

### What is real, and what is a labelled simulation

| Layer | Source | Real? |
| --- | --- | --- |
| Amenities | OpenStreetMap via Overpass, ODbL | **real** — 280 schools, hospitals, markets and parks in the sample view |
| Land price | `data/data2map-real-estate.json` (Turf hex grid) | simulated, `synthetic: true` + note |
| Zoning | same file | simulated |
| Flood bands | same file | simulated, with a return period per band |
| Air and noise pollution | — | **not drawn**: Vietnam publishes monitoring stations, not polygons, and an inferred surface would be a guess dressed as data |

Vietnam publishes land price tables as legal documents and zoning as drawings; there is no open machine-readable
layer for either. The page is real — the layers, the scoring, the satellite base and the amenity overlay all work —
and the price surface advertises itself as an artefact. **Upload is the main path**: a real dataset arrives through
`/admin/geodata` or `npm run geodata:import`, and the sample steps aside layer by layer without the page changing.

### Amenities, and why they are not stored

ODbL is fine to display with attribution and is **not** something to accumulate into a private database, so
`app/api/data2map/amenities` queries Overpass per view, answers with GeoJSON, and stores nothing beyond an HTTP
cache. It tries the documented mirrors in order (`OVERPASS_URL` first, for a self-hosted instance) because the
main endpoint answered 504 during this build — and when every mirror is down it says so and lets the other layers
keep working, rather than showing an empty layer as if the city had no schools.

### The satellite base

A raster layer over the dark style, not a second basemap: **NASA EOSDIS GIBS**, public domain, keyless,
world-wide. It is daily imagery from a fixed snapshot date at a coarse resolution, and the panel says exactly
that. A high-resolution commercial provider would need a key (breaking "a fresh clone runs with no
configuration") and its own terms review, which is why none is pointed at by default.

### The potential score

`lib/data2map/score.ts`, pinned by 12 checks in `npm run check:score` — the same discipline as the animal risk
index, for a higher-stakes question:

| Input | Weight | Where it comes from |
| --- | --- | --- |
| Price against the area median | 30 | the hex that was clicked, and the median of the grid |
| Amenities within 1 km | 30 | the Overpass layer, counted per kind and capped at two each |
| Flood band | 25 | the band the point falls inside, inverted so lower hazard scores higher |
| Zoning and floor-area ratio | 15 | the parcel the point falls inside |

A missing input is dropped from the weighted mean and listed — the panel prints the coverage and which inputs were
missing, because scoring a plot on one layer and presenting it as a verdict is the failure mode this exists to
avoid. The number is labelled "a Kami3D index, not an appraisal", next to the weights.

## D3 — Footfall & Trend Map

`/data2map/trends`: one hex grid over Ho Chi Minh City where the phase's **real and simulated halves sit on
the same geometry**, plus the real places the site score counts.

### What is real, and what is a labelled simulation

| Layer | Source | Real? |
| --- | --- | --- |
| Population density | WorldPop 2020, CC BY 4.0, summed per hex through their statistics API | **real** — 162 hexes |
| Food & drink | OpenStreetMap via Overpass, ODbL | **real** — cafes, bubble-tea shops, restaurants and bakeries, fetched per view and never stored |
| Hourly footfall | derived from the real density and an hourly profile per type of business | simulated, `synthetic: true` + CC0, stated in the layer hint, in the clock's own note and in the popup |
| Traffic volume | — | **not drawn**: there is no open traffic-count layer for Vietnamese cities |
| "Real-time" hotspots | — | **refused and relabelled** (below) |

### The promise that had to be relabelled

The brief asked for a real-time hotspot map, mocked from Google Places. Neither half survives contact with the
data: Google's terms forbid storing place data and need a key, and hourly footfall is sold rather than
published. So places come from OpenStreetMap, busy-ness is simulated and says so, and the page prints both
provenances next to each other instead of blending them into one confident number.

### Population without a tile pipeline

WorldPop is a raster, this project has no GDAL and no tile pipeline, and shipping a fake density surface was
never on the table. It turns out not to be needed: **`api.worldpop.org/v1/services/stats` answers a polygon
with the population inside it**, keyless. `scripts/fetch-trends.mjs` builds the Turf hex grid, asks once per
hex, and commits the numbers — the raster never enters the repository.

The asynchronous path is the one that works: `runasync=false` answered inline and took roughly a hundred
seconds per polygon once a few dozen were in flight (a four-hour run), while submitting a task and polling it
took about twenty-five seconds for four hexes. The run is resumable and checkpoints every ten hexes with
`partial: true`, so an interruption costs ten hexes rather than ninety — and `--check` refuses a file that is
still a checkpoint. The committed file records the method, the year and the licence in
`properties.provenance.population`: *WorldPop 2020, 100 m gridded population (CC BY 4.0)*.

### The clock is Phase 16's, not a second slider

`RangeTimeline` learned three optional props — `format`, `labels` and `stepMs` — rather than gaining a
sibling. The animal map steps through years, the trends page steps through hours of the day, and the numbers,
the keyboard behaviour and the reduced-motion rule stay one implementation. The hour is a URL-free piece of
page state, which is the one place this page is less linkable than `/map`.

### The site-gap score

`lib/data2map/footfall.ts`, pinned by 17 checks in `npm run check:footfall` and 9 more in `check:trends`:

| Input | Weight | Where it comes from |
| --- | --- | --- |
| Demand | 45 | **real** population density, logarithmic and saturating at 30 000/km². Falls back to the simulated footfall index only when density is missing — and the panel prints which of the two it used |
| Supply | 40 | **real** competitor count from OpenStreetMap within 1 km, curved so that an empty block scores 0.8 (it may be empty for a reason) and saturation scores 0 |
| Access | 15 | usually missing, and reported as missing rather than scored as zero |

A missing input is dropped from the weighted mean and listed with the coverage, the same rule D2's potential
score follows. The number is labelled "a Kami3D index, not a market study".

### One Overpass client, two pages

D2's amenities route and D3's food-and-drink route needed the same three things: a bounded query, a mirror
list and elements turned into attributed GeoJSON. That machinery moved to `lib/overpass.ts` and both routes
call it, pinned by `npm run check:overpass` — which also fails if either route grows its own endpoint list or
if a category the page offers has no Overpass selector.

Three things the merge taught us, all recorded because they cost real time:

1. **A mirror list is configuration, not decoration.** On the day this page was built, `overpass-api.de`
   answered 504 and both other mirrors timed out — for a 2 km box with four selectors — while
   `maps.mail.ru` answered instantly. It is in the list now, with a comment saying why.
2. **An empty answer is re-asked.** Most instances carry the whole planet; some are regional extracts.
   `overpass.osm.ch` answered a district of Ho Chi Minh City with zero cafes, which is indistinguishable
   from a real empty answer. `runOverpass` now tries every mirror before believing an empty set — and the
   regional instance was removed from the list anyway.
3. **Ask a viewport-sized question.** The page's first version asked for its whole 27 × 18 km window at
   once; every mirror refused it. The layer is now fetched **per view** (refetched, debounced, when the
   visitor pans) and the score's competitor count comes from a separate one-kilometre box around the clicked
   hex — which is also the more correct query, because it no longer depends on the zoom level.

## D5 — Cultural & Story Maps

`/data2map/stories`: eight places in Vietnam, a timeline, and the photograph that goes with each one.

**The timeline is Phase 16's.** `RangeTimeline` and `lib/timeline.ts` already handle years, annotations and
autoplay; D5 only changes the source, and `storyToTimelineEvent` maps a story onto the shape the panel already
takes. A second slider would have been two places to fix every bug, which the phase brief forbids.

**Story mode is that play button**, and it refuses to run when the visitor has asked for reduced motion — in the
operating system or in `/settings`. Story mode is exactly the kind of continuous self-running motion those
preferences exist to stop, so the button is disabled with a tooltip saying why rather than silently doing nothing.

### Images: Commons, with the licence recorded

`scripts/fetch-stories.mjs` searches Wikimedia Commons per story, accepts only CC0, public domain, CC BY and
CC BY-SA, and records the file page, the author and the **exact** licence label. Share-alike is a condition of
use rather than a courtesy, so the credit is rendered on the page and again in the lightbox. Fluffy artist fields
are cleaned into something a person can read (one came back as three hundred characters of licence notes).

```bash
npm run stories:report           # what each story would get
npm run stories:fetch -- --force # resolve and write the credits
npm run check:stories            # validity, credits, timeline contract
```

The stories themselves — eight summaries, each citing its source — are Kami3D's own text, the same rule the
animal timeline follows. The sample carries two public-domain images, one CC0, three CC BY-SA and two CC BY.

### The 3D slot, honestly empty

The phase asked for a 3D model or a 360 photo per site. This project has models of **animals** and none of
heritage sites, and a 360 viewer would need both a library and 360 sources. So the panel says what is missing
rather than showing a button that opens nothing, and the route mounts no second canvas at all — which satisfies
the one-WebGL-context rule by not needing one. When a heritage model exists, it arrives through the admin
pipeline and the panel gains the button.

## Conventions this module follows

- **One WebGL context per page.** A product page with a map may mount at most one extra 3D canvas, on demand, and
  the GLB is disposed when it changes (that was defect R6; `GltfModel` releases geometry, materials and textures).
- **No Framer Motion.** It is gone from the project and `check:bundle` blocks it; animation is CSS.
- **Public data has a read policy and no write policy**; a visitor's own switches are owner-only, following
  `user_settings`. Writes go through the admin geodata path with `app_admins` / `is_admin()`.
- **Every new route gets a budget** in `scripts/bundle-budget.mjs`. `/data2map` is a page of cards and must not load
  the map renderer; a product page that draws a map declares its own number, measured.
- **Language**: the module ships in English like the rest of the application. `lib/i18n.ts` currently translates the
  settings panel only, and Data2Map strings will go through it when the module is translated — the mechanism exists,
  the translation does not.
