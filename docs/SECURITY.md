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

## The console, the payments and the locks (Phase 31)

The phase brief asked for six things. What each one is, in this codebase, and what was measured:

| Requirement | Where it lives | Evidence |
| --- | --- | --- |
| RLS on every table | `supabase/schema.sql`, Phase 31 block 1 and 2 | 34 tables, all with `relrowsecurity = true`; `npm run verify:rls` **PASS** |
| API routes: session, admin-only, rate limited | `lib/write-guard.ts`, `app/api/admin/_lib/guard.ts` | every mutating route reaches `guardWrite` (pinned by `check:security`); unauthenticated `POST /api/admin/models/run` → **404** |
| Storage: only a member's own folder | `supabase/schema.sql`, storage policies | three policies compare `(storage.foldername(name))[1]` with `current_user_id()`; no client write policy on the two asset buckets |
| Input hygiene, no secret on the client | `lib/sanitize.ts`, `lib/env.ts`, `npm run check:secrets` | 405 tracked files scanned on the built bundle, no leak; two `dangerouslySetInnerHTML` sinks, both fed by serializers |
| Middleware protecting admin (and paid) routes | `lib/admin-gate.ts` + `middleware.ts` | `GET /admin/models` → **404** without a session; the API keeps its own gate |
| Logging and monitoring | `lib/security-log.ts`, `/admin/security` | one row written per refusal, measured end to end on the running server |

### The console gate

`/admin/*` pages each asked `adminStatus()` and drew a "sign in" panel — a friendly answer, but a late
one, and the rule lived in three page files. `middleware.ts` now asks the same two questions the
unlaunched modules ask (the allow-lists, then `public.app_admins` against the verified session id) and
answers the house **404** before a line of the console runs. Demo Mode has no identity provider, so it
has no admin: `/admin` answers 404 there too.

The **API** is not gated in the middleware on purpose — `app/api/admin/_lib/guard.ts` already refuses
(tested: `404`, never `403`) and records the refusal, and gating it twice would buy a second database
round trip per admin call. The two are the same two questions, asked in the two places that can ask
them.

### The security log

`public.security_events` (RLS on, readable by `is_admin()` only, **no insert policy at all** — only the
service role writes, so a caller cannot forge an event) is written best-effort by `lib/security-log.ts`:

| Property | Why |
| --- | --- |
| Never throws | a guard that fails because its log write failed is a guard that fails |
| One row per kind and network per minute | a flood must not turn the log into the outage |
| Address stored as `/24` or `/48` | a log is the easiest place to leak personal data; the host is dropped |
| Detail limited to short strings, numbers and booleans | a clipped token is still a token, so long values are dropped |
| `delete from public.security_events where created_at < now() - interval '90 days';` | retention is a decision, and this is the documented one |

Measured on the running server, with the anon key and no session:

```
POST /api/settings  (Sec-Fetch-Site: cross-site)  -> 403   logged as kind=cross-site,  bucket=settings
POST /api/admin/models/policy (no session)        -> 404   logged as kind=admin-denied, route=/api/admin/models/policy
GET  /admin/models                                -> 404   (middleware; not logged, see below)
61 POSTs to /api/favorites in a minute            -> 429   logged as kind=rate-limited
GET  /rest/v1/security_events (anon key)          -> 401   permission denied for table security_events
```

The console page `/admin/security` reads the log: events by kind, newest first, with the address shown
as the prefix that was stored and a section that says what the log is **not**.

### Storage

The panel bucket is public to read and, until this phase, writable by nobody but the service role. A
signed-in member may now write **only inside their own folder**: the first path segment must equal
`public.current_user_id()`, which is the helper every per-user table already uses. The two asset buckets
(`animal-assets`, `animal-sounds`) keep **no** client write policy, and that is asserted as an absence
rather than left to chance — a model or a call is published by the pipeline that recorded its licence
first.

### Input hygiene

`lib/sanitize.ts` is pure and driven by tests. It does **not** claim to make input safe for HTML: React
escapes text, and a second implementation of that rule would be a rule nobody checks. What it does is
drop control characters, zero-width and bidi characters (which survive JSON, are invisible in an editor
and can make a title read one way in the database and another way on the page), normalise line endings,
and bound length **by refusing** rather than truncating. It is wired into the manga text path
(`lib/manga/rules.ts`), which is the one place user text is stored.

The two `dangerouslySetInnerHTML` sinks are pinned by a test to **exactly two** files: the JSON-LD
serializer (which escapes `<`, checked by driving it, not by grepping it) and the generated logo SVG. A
third sink has to be a deliberate decision.

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
  the fix, and it is blocked on Supabase rather than on code: the Clerk session token carries
  `role: authenticated`, its `kid` matches the live JWKS exactly, the third-party auth integration was
  deleted and re-added through the Management API and the project restarted, and PostgREST still answers
  `401 PGRST301 "No suitable key was found to decode the JWT"` — which means it holds no Clerk key at all
  (a wrong key would fail signature verification instead). Two measured controls rule out the alternatives:
  adding an `aud` claim changes nothing, and the anonymous key is accepted on the same endpoint (it fails
  with `42501 permission denied for the anon role`, not `PGRST301`). The remaining steps are a Clerk
  dashboard "Connect with Supabase" wizard and a manual re-add in the Supabase dashboard, then Supabase
  support with that evidence; see PLAN.md, "P0.1 — Kết quả" section 6.
- **The rate limiter is per process.** An in-memory sliding window bounds one instance; a deployment with
  several needs a shared store, which this project deliberately does not require. The README says so.
- **The CSP is not enforcing**, so it stops nothing today — it reports.
- **`sameSite=lax` cookies plus the guard are not authentication.** They stop cross-site writes; who the
  caller is comes from the session, and for admin routes from `public.is_admin()`.
- **No secret rotation automation.** If a key is ever committed, the fix is to rotate it, and that is a
  human step (`npm run check:secrets` will tell you which file, not what to do about it).
- **A `GET` on a `POST`-only admin route answers 405, not 404**, which confirms that the path exists.
  Left as it is: the paths are written in client components, a chunk is a static asset, and the endpoint
  list was never a secret — the control is the gate, which answers 404. Recorded here so the next reader
  does not think it was missed.
- **The security log samples rather than records.** One row per kind and network per minute means a
  determined attacker's events are thinned out. The alternative — one row per request — is a log an
  attacker can use to fill the disk.
- **The admin gate is not a role system.** It answers "is this one of the named admins", from an
  allow-list or a row in `app_admins`. There are no roles, no scopes and no per-module permissions.
