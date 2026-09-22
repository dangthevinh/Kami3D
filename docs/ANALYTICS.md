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

## Verifying it

```bash
npm run db:schema        # the tables, the function, the policies, the retention job
npm run check:channel    # the classifier, the schema's privacy shape, and the middleware capture
npm run check:rls        # the identity layer these tables rely on
```

Measured end to end after the first build: five requests with five different referrers (a search engine, a social
network, an external site, none at all, and one `Googlebot`) produced exactly one row each in `traffic_daily` —
`search`, `social`, `referral`, `direct` and `bot` — with the matching routes in `page_daily`.
