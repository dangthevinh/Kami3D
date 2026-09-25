# Security notes

What this project protects, how, and — the part that matters as much — what it does not.

## Response headers

Set in `next.config.ts`, verified with `curl -I` on the running server rather than by reading the config:

| Header | Value | Why |
| --- | --- | --- |
| `X-Content-Type-Options` | `nosniff` | a `.txt` that a browser sniffs into a script is an XSS primitive |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | every outbound link would otherwise leak the full path |
| `X-Frame-Options` | `DENY` | a framed `/admin` is a clickjacking target |
| `Permissions-Policy` | camera, microphone, geolocation, payment, usb, interest-cohort all `()` | capabilities this app never asks for |
| `Cross-Origin-Opener-Policy` | `same-origin` | a window opened from here does not share a browsing context |
| `X-DNS-Prefetch-Control` | `off` | no speculative DNS to third parties from a page that needs none |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | **production only**: HSTS from an http dev server pins the developer to a scheme it cannot serve |
| `Content-Security-Policy-Report-Only` | see below | **report-only on purpose** |

The content policy is deliberately **not enforcing**. A policy that blocks the wrong thing takes the 3D
viewer, the map or the sign-in down, and this project measures before it enforces. The report-only list is
what the app actually loads today — Clerk, Supabase, MapLibre (worker + `blob:`), `images.unsplash.com`,
AdSense when configured — plus `object-src 'none'`, `base-uri 'self'` and `frame-ancestors 'none'`, which
cost nothing and stop the two classic escalations. Tightening it (`'unsafe-inline'` out, nonces in) is a
separate change with its own measurements.

## Every route that writes

`lib/write-guard.ts` gives one guard, used by all eleven mutating routes:

```
guardWrite(request, { name, rule, expectedHost })
```

It refuses a **cross-site** request (reading `Sec-Fetch-Site`, which page JavaScript cannot forge, with
`Origin`/`Referer` as the fallback) and applies a **sliding window per address**. Measured on the running
server:

| Probe | Result |
| --- | --- |
| `POST /api/settings` with `Sec-Fetch-Site: cross-site` | **403** cross-site requests are not accepted |
| `POST /api/favorites` with a foreign `Origin` | **403** |
| `POST /api/settings` same-origin, no session | **401** — the guard let it through to the route, which asked for a session |
| 61 requests to `/api/favorites` in a minute | **429** with `retry-after: 56` |

The tightest buckets are the routes that **spawn a child process** — `/api/admin/models/run` six a minute,
`/api/admin/models/search` ten, `/api/admin/models/download` four per five minutes — because each request
is a process, not a query.

## Secrets

`npm run check:secrets` reads the secret values from the environment, then looks for them in every file git
tracks and in the built client chunks. It runs in CI **after the build**, on the artifacts rather than on the
source, and it never prints a value — only the key name and the file, because a check that echoes what it
guards is a second leak.

Last local run: 405 files scanned (including the client chunks), 5 configured secrets, no leak. That is the
only evidence for "tokens stay on the server"; the claim is otherwise a comment.

## What this does not protect

- **RLS under Clerk is not enforcing yet.** In Clerk mode the server writes personal data with the service
  role and filters by `user_id`, so ownership is enforced by the query rather than by the database. P0.1 is
  the fix; the Supabase side is configured (provider registered, issuer and JWKS match) and PostgREST still
  refuses the token, so the last mile is open — see PLAN.md.
- **The rate limiter is per process.** An in-memory sliding window bounds one instance; a deployment with
  several needs a shared store, which this project deliberately does not require. The README says so.
- **The CSP is not enforcing**, so it stops nothing today — it reports.
- **`sameSite=lax` cookies plus the guard are not authentication.** They stop cross-site writes; who the
  caller is comes from the session, and for admin routes from `public.is_admin()`.
- **No secret rotation automation.** If a key is ever committed, the fix is to rotate it, and that is a
  human step (`npm run check:secrets` will tell you which file, not what to do about it).
