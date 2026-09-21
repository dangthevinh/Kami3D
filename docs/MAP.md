# The map

`/map` draws where each species lives: a habitat layer from PostGIS (or from the bundled sample), a region
filter, layer switches with per-layer opacity, and a species panel that links into the 3D viewer.

```bash
open http://localhost:9000/map
open "http://localhost:9000/map?region=Africa&layers=habitat,historic"
```

## The URL is the state

Which layers are on, which region is selected and which species is highlighted all live in the query string,
and `lib/map-query.ts` is the only module that knows the format. Two reasons:

- **a map view is a thing people share.** `?layers=habitat,historic&region=Africa` opens the same picture for
  the person who receives it, because the server renders from the same query the client hydrates with;
- **it is user input.** `parseMapQuery` drops unknown layers, unknown regions, duplicates and over-long species
  ids instead of throwing, and `npm run check:map` pins that.

The parser and the serialiser are dependency-free, so they are tested in plain Node rather than through a
browser. The Zustand store (`lib/map-layers.ts`) holds the live switches and writes changes back with
`history.replaceState` - not a router navigation, because the layers are drawn on the client and a round trip
would re-render a page that has not changed.

## Two things this map does not do

**It does not need an API key.** Mapbox GL requires an access token before it will draw a tile, which would
break the project rule that a fresh clone runs with no environment variables. The default style is
[OpenFreeMap](https://openfreemap.org) (OpenStreetMap-derived vector tiles, no key, no cookie), and
`NEXT_PUBLIC_MAP_STYLE_URL` overrides it for a self-hosted provider - the same arrangement as
`NEXT_PUBLIC_DRACO_DECODER_PATH`.

**It does not follow your accent colour.** MapLibre paints in WebGL and cannot read a CSS custom property, so
the map keeps the product's dark studio palette whatever accent is chosen - exactly as the 3D canvases do.

## Data, and what it actually is

| Layer | `kind` | Source today |
| --- | --- | --- |
| Habitat range | `habitat_current` | Demo envelopes (synthetic, see below) |
| Historic range | `habitat_historic` | Demo envelopes for the four prehistoric species |
| Observation density | `occurrence` | **GBIF** - 4 323 real records across 23 species, 1980-2026 |
| Protected areas | `protected_area` | Not shipped yet - Phase 15 |
| Human pressure | `pressure` | Not shipped yet - Phase 15 |

The bundled shapes are **generated envelopes around each species' regional anchor**, and every one of them says
so: `"synthetic": true` and a `note` that the panel renders verbatim ("Demo envelope: a synthetic area around
this species' regional anchor, not a published range map"). They exist so that a fresh clone - Demo Mode, no
database - still opens a map, which is the same rule `data/animals.ts` follows for the catalogue.

Real ranges are a licensing question before they are a data question, which is why they are not in yet:
**IUCN range maps** restrict commercial use and are not redistributable here, and **GBIF** records are CC BY 4.0
and must be cited with the DOI of the download. When they arrive they arrive through a pipeline that records
`license` + `attribution` per row - the columns already exist and are `NOT NULL`.

Regenerate and push the bundled sample:

```bash
npm run geo:generate   # rewrite data/animal-geodata.json from the regional anchors
npm run geo:seed       # upsert it into public.animal_geodata (service role, idempotent)
npm run geo:status     # what the database currently holds
npm run check:geo      # the axis order, the ring maths, and the bundled file
```

## Observation density, from GBIF

```bash
npm run geo:report                          # what is available per species, nothing written
npm run geo:fetch                           # every species (--all --apply)
node scripts/fetch-geodata.mjs --species=lion --apply
```

This is where the licence rule bites hardest. GBIF holds 15 971 lion records and only **3 096** may be used
here: the rest are CC BY-NC, and this site carries advertising. Every species is the same, so the search is
filtered at the source (`license=CC0_1_0&license=CC_BY_4_0`) *and* every record is checked again before it is
kept. The pipeline prints the ratio it accepted so the number cannot be quietly ignored:

```
→ lion: 317 points from 370 examined (3096/15971 usable, 19%) · 26 dataset(s) · CC-BY · 1980-2026
✘ megalodon: 188 records, none this site may use (all NC/ND/unknown)
```

Two decisions worth knowing:

- **Sampling is spread across the year range, not taken from the top.** GBIF returns the newest records
  first, so "the first 400 since 1980" is four hundred records from the last two years - a heatmap of recent
  birdwatching rather than of where a species lives. `yearBuckets` splits the window and samples each bucket,
  which is why the stored year range is 1980-2026 rather than 2024-2026.
- **What is stored is a MultiPoint, not the record set.** 4 323 points across 23 species, thinned to one point
  per ~11 m (two records from the same reserve are one dot on a heatmap). The properties keep the honest
  counts - available, usable, refused, datasets, countries, year range - and the panel prints them.

The map draws it with **MapLibre's own heatmap layer**, not `Deck.gl HeatmapLayer` as the plan proposed:
deck.gl is several hundred kilobytes for a layer the renderer already has, on a route whose whole budget is
140 kB. The plan's own constraint says a heavy library has to earn its place. If Phase 16 needs arc or trip
layers - which MapLibre genuinely cannot draw - that trade is worth revisiting.

## The database

`public.animal_geodata` carries every spatial layer in one table, because the alternative was an `alter table`
at the start of each of the next four phases:

| Column | Meaning |
| --- | --- |
| `kind` | `habitat_current` / `habitat_historic` / `protected_area` / `occurrence` - CHECK constrained |
| `year` | Negative is BCE (the prehistoric species), `NULL` is present day |
| `geometry` | `extensions.geometry(Geometry, 4326)` - **longitude first** |
| `source`, `source_url`, `license`, `attribution` | the licence terms the row arrived with |
| `dedupe_key` | generated `kind:year:source`, so `on_conflict` can make a re-import an update |

The map does not select that table directly. It calls `public.map_geodata(p_kind, p_tolerance)`, a
`security definer` function that returns a ready FeatureCollection with `ST_SimplifyPreserveTopology` applied
to polygons (measured: 456 points at tolerance 0, 268 at 0.5 degrees, 125 at 2) and only the properties the map
draws. Points pass through untouched - simplifying a sighting moves it.

PostGIS is installed into the `extensions` schema (the Supabase convention), the `geometry` column has a **GiST**
index (a viewport query plans as `Index Scan using animal_geodata_geometry_idx`), and the table refuses
self-intersecting rings with `ST_IsValid` - an invalid polygon makes `ST_Intersects` answer wrongly and say
nothing. RLS is on with a single public `SELECT` policy and **no write policy**: geospatial data is public
reference material, and a browser must not be able to invent a range map.

## Coordinates: `[lng, lat]` versus `{ lat, lng }`

GeoJSON, MapLibre and PostGIS speak `[longitude, latitude]`. The rest of this codebase - `lib/globe.ts`, the
species data, the region anchors - speaks `{ lat, lng }`. Both are correct and mixing them is not, because the
failure is silent: a swapped pair still renders, just somewhere else. Kazakhstan is a plausible point on a world
map.

`lib/geo.ts` holds the four converters (`toLngLat`, `fromLngLat`, `toLngLatRing`, `fromLngLatRing`) plus the
geometry a map needs without a map library: ring closure, a self-intersection test (the client-side
counterpart of `ST_IsValid`), spherical ring area, bounding boxes and the deterministic envelope generator.
`npm run check:geo` pins every one of them.

## Bundle cost, measured

MapLibre is roughly 250 kB gzipped with its style and workers - more than the entire first-paint budget of a
species page. It is therefore loaded exactly the way `three` is:

```
MapExperience  →  LazyMap  →  next/dynamic({ ssr: false })  →  MapCanvas  →  react-map-gl + MapLibre
                   ↑ WebGL probe          ↑ MountWhenVisible
```

`check:bundle` has two markers for it (`maplibre-gl`, `MaplibreMap`) and fails if either reaches the initial
chunks of any route, plus a budget for `/map` itself. The route is server-rendered on demand - its URL decides
what the server draws - so its chunk list comes from `app-build-manifest.json` rather than from a prerendered
HTML file.

| Route | Initial JS (gzip) | Budget |
| --- | --- | --- |
| `/map` | 128.4 kB | 140 kB |
| every other route | unchanged (129-158 kB) | 165 kB |

## What is verified, and what is not

Verified in a real browser (`/map?region=Africa&layers=habitat`): the server renders the region from the URL, the
client normalises it back to `?layers=habitat&region=Africa`, the 28 shapes reach the panel, hydration is clean
(no console errors), and with WebGL unavailable the page shows an explanatory panel instead of a blank
rectangle.

**Not verified here: the rendered map itself.** The headless Chrome in this environment has no WebGL context, so
MapLibre never draws. Everything above the renderer is tested; the renderer is MapLibre doing what MapLibre
does. Open `/map` in a real browser before trusting the picture.
