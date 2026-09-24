# Channel analytics (Phase 18A)

`/admin/analytics` answers one question — **which channels bring readers, and what do they do here** — with the
smallest amount of data that can answer it, and without a third-party SDK anywhere near the site.

## What is counted, and where

| Table | Columns | Why that is all |
| --- | --- | --- |
| `traffic_daily` | `day`, `channel`, `hits` | one row per day per acquisition channel |
| `page_daily` | `day`, `route`, `hits` | `route` is a normalised page shape (`/animal/[slug]`), never a URL with a query string |
| `search_daily` | `day`, `outcome`, `slug`, `hits` | `outcome` is `matched` or `no_match`; `slug` is the species it matched, empty otherwise |

The middleware writes them: it classifies the request with `lib/channel.ts`, then calls
`public.bump_traffic()` through PostgREST with the service role inside `event.waitUntil`. A slow database cannot
slow a page, and a failed count cannot reach a reader.

## The seven channels

| Channel | Decided by |
| --- | --- |
| `bot` | the user agent (crawlers, monitors, previews, command-line clients) — **checked first**, so a crawler is never counted as a reader |
| `campaign` | a `utm_source`/`utm_campaign` tag, normalised to `[a-z0-9_-]` and capped at 40 characters |
| `internal` | the referrer host is this host, or the navigation is same-origin/same-site with no referrer |
| `search` | the referrer host is a search engine (matched on the domain, so `google.co.uk` counts) |
| `social` | the referrer host is a social network or a chat app |
| `referral` | any other referrer host |
| `direct` | no referrer and no same-origin signal: a typed URL, a bookmark, or a referrer the browser stripped |

Bot hits are reported as their own row and **every percentage on the page excludes them**.

## What is deliberately not kept

- **no IP address, no raw user agent, no device or browser id, no fingerprint** — `npm run check:channel` parses
  `supabase/schema.sql` and fails if a column is ever named like one of them;
- **no query strings** — the campaign tag is extracted, sanitised and stored alone; everything else in a URL is
  dropped. A search term is never stored either: `search_daily` records whether a search matched and which
  species it matched, because a search box can hold a person's name;
- **no cross-site anything.** There is no id to follow, and nothing is read from another site;
- **no third-party analytics SDK.** No GA4, Plausible cloud, PostHog or heat-map recorder: docs/REVIEW.md measured
  what an outside script costs on every page once already, and this project does not pay it again.

## Opting out, and retention

`DNT: 1` or `Sec-GPC: 1` means the request is **not written at all** — not a hash, not a count. Rows older than
**400 days** are deleted by `public.prune_traffic()`, scheduled nightly when `pg_cron` exists and runnable by hand
(`npm run traffic:prune`) when it does not.

## Who can read it

Only admins: the three tables have row level security on, a `select` policy that calls `public.is_admin()`, and
`revoke all` for `anon`. There is no write policy at all — the only writer is `bump_traffic()`, executable by
`service_role` alone. The page itself repeats the check with the same `is_admin()` call `/admin/geodata` uses, so
a non-admin sees an explanation rather than a table.

## Personal analytics, for the visitor themselves

`/analytics` is the other half of this document's subject, and its opposite in every design decision. The admin page
answers "which channels bring readers" from aggregate first-party counts; this one answers "what do my own rounds
and favourites add up to" from rows the visitor already owns, and it can only ever describe the person reading it.

| | Admin (`/admin/analytics`) | Visitor (`/analytics`) |
| --- | --- | --- |
| Reads | `traffic_daily`, `page_daily`, `search_daily` | `quiz_scores`, `user_favorites`, or this browser's cookie |
| Scope | every visitor, in aggregate | one visitor, and only their own rows |
| Access | `is_admin()` (RLS) plus an env allow-list | whoever is signed in — or the browser that holds the cookie |
| Indexed | no | no (`robots: index: false`) |
| New collection | none (request headers only) | **none at all** — it counts what is already stored |

### What it shows

- **Quiz**: rounds, questions, accuracy, best round, current run, accuracy per round as a fixed 0–100% line with the
  run threshold drawn on it, the five accuracy bands, the split by mode, and the last twelve seven-day windows.
- **Favourites**: how many of the catalogue, and breakdowns by class, region, diet and conservation status, plus the
  regions with nothing in them yet and how many of the picks are IUCN-threatened.
- **Provenance**: a footer naming the exact sources and row counts, so a reader can check the arithmetic rather than
  trust it.

### The three rules it follows

1. **No invented numbers.** Nothing played means `—` for every rate and an empty series, never "0%". A zero the
   visitor did not earn is a lie, and it is the specific lie a dashboard tells by default.
2. **Stated definitions.** "Run" is rounds in a row at or above `ROUND_GOOD_PERCENT` (60, the same line the quiz
   badges use), because the table stores a score per round and not which question was missed. The weekly chart counts
   back from the most recent round, not from today, so a quiet month is not eleven empty bars.
3. **Deterministic output.** Every list is sorted by count and then by label, and the whole page is a pure function of
   the rows — `npm run check:insights` runs it twice on the same input and asserts the two are deep-equal.

All of the maths lives in `lib/insights.ts` and is pinned by `npm run check:insights` (10 tests); the page itself is a
server component that renders inline SVG, so it adds no client JavaScript beyond the shared layout.

## Verifying it

```bash
npm run db:schema        # the tables, the function, the policies, the retention job
npm run check:channel    # the classifier, the schema's privacy shape, and the middleware capture
npm run check:rls        # the identity layer these tables rely on
```

Measured end to end after the first build: five requests with five different referrers (a search engine, a social
network, an external site, none at all, and one `Googlebot`) produced exactly one row each in `traffic_daily` —
`search`, `social`, `referral`, `direct` and `bot` — with the matching routes in `page_daily`.
