# Manga Studio — the data and API half

Phase 24 adds a manga/webtoon studio: a project holds chapters, a chapter holds panels and pages, and a
page holds speech bubbles laid out by `lib/manga-layout.ts`. This document covers the half that owns
the database, the wire format and the AI call: `lib/manga/*` and `app/api/manga/**`. The studio UI is a
separate half built against the same types.

Everything here runs with **no configuration at all**. With no Supabase the reads return empty lists, no
Clerk (or Supabase Auth) means writes answer `503` with the sentence that says what to set, and
`GET /api/manga/ai/status` answers `configured: false` with the reason. Nothing throws, and no page goes
white.

## The tables

Created by `supabase/schema.sql` (frozen; the code follows it, never the other way round):

| Table | What it holds | Ownership |
| --- | --- | --- |
| `manga_projects` | title, description, cover, genres, age rating, status, `is_webtoon`, `view_count` | `user_id = public.current_user_id()` |
| `manga_chapters` | title, number (`unique (project_id, chapter_number)`), script, status | through its project |
| `manga_panels` | the image URL, its order, its size, and `ai_prompt / ai_provider / ai_model` | through its chapter |
| `manga_pages` | the template and the slot rectangles, as `layout_data` jsonb | through its chapter |
| `manga_bubbles` | text (≤ 400), kind, position, style | through its page |
| `manga_likes` | `primary key (project_id, user_id)` | its own row |
| `manga_comments` | text (1..1000) | its author |
| `manga_follows` | `primary key (follower_id, following_id)`, no self-follow | its own row |

Three consequences worth knowing:

- **A double tap cannot count twice.** Likes and follows are keyed by their pair, so a second insert is a
  duplicate-key error, and the routes report that as "you already like this" rather than as a failure.
- **`view_count` has one writer.** `public.increment_manga_view(uuid)` is SECURITY DEFINER and only
  counts a project that is `is_public and status = 'published'`. There is no update policy and no grant
  for the column, so a browser cannot PATCH it.
- **Counts come from rows.** `chapterCount`, `pageCount`, `panelCount` and `likeCount` are counted in
  the database on every read (one batch per list, not one query per card), never taken from a client.

## The HTTP surface

Every route answers JSON; an error is `{ "error": string }` with the status that goes with it. Every
route that writes calls `guardWrite` (cross-site requests refused, sliding-window rate limit per address)
and takes the user id from the verified session — never from the body.

| Method and path | Body | Answer |
| --- | --- | --- |
| `GET /api/manga/projects?scope=mine\|public` | — | `{ projects }` |
| `POST /api/manga/projects` | `{ title, description, genres, ageRating, isWebtoon }` | `{ project }` |
| `GET /api/manga/projects/[projectId]` | — | `{ project, chapters }` |
| `PATCH /api/manga/projects/[projectId]` | any of `{ title, description, genres, ageRating, isWebtoon, coverUrl }` | `{ project }` |
| `DELETE /api/manga/projects/[projectId]` | — | `{ ok: true }` |
| `POST …/[projectId]/publish` | `{ publish }` | `{ project }` |
| `POST …/[projectId]/like` | — | `{ liked, likeCount }` |
| `POST …/[projectId]/view` | — | `{ viewCount, counted, reason }` |
| `GET …/[projectId]/comments` | — | `{ comments }` |
| `POST …/[projectId]/comments` | `{ content }` | `{ comment }` |
| `DELETE …/[projectId]/comments/[commentId]` | — | `{ ok: true }` |
| `POST /api/manga/users/[userId]/follow` | — | `{ following }` |
| `POST …/[projectId]/chapters` | `{ title, chapterNumber?, script? }` | `{ chapter }` |
| `GET /api/manga/chapters/[chapterId]` | — | `{ chapter, panels, pages, bubbles }` |
| `PATCH /api/manga/chapters/[chapterId]` | any of `{ title, script, status }` | `{ chapter }` |
| `DELETE /api/manga/chapters/[chapterId]` | — | `{ ok: true }` |
| `POST …/[chapterId]/panels` | multipart, a `file` field | `{ panel }` |
| `DELETE /api/manga/panels/[panelId]` | — | `{ ok: true }` |
| `POST …/[chapterId]/pages` | `{ template, slots }` | `{ page }` |
| `PATCH /api/manga/pages/[pageId]` | any of `{ template, slots, bubbles, pageNumber }` | `{ page }` |
| `DELETE /api/manga/pages/[pageId]` | — | `{ ok: true }` |
| `POST …/[pageId]/bubbles` | `{ panelId, content, bubbleType, position }` | `{ bubble }` |
| `PATCH /api/manga/bubbles/[bubbleId]` | any of `{ content, position }` | `{ bubble }` |
| `DELETE /api/manga/bubbles/[bubbleId]` | — | `{ ok: true }` |
| `GET /api/manga/ai/status` | — | `MangaAiStatus` |
| `POST /api/manga/ai/panel` | `{ chapterId, prompt }` | `201 { panel }`, or `503 { error }` |

Rate limits, per address and per instance: 60 writes a minute, 20 uploads, 30 likes/comments/follows,
5 AI generations, 40 views. The view route also sets a six-hour cookie so a refresh does not inflate the
figure — that is a coarse defence against a reload, not an identity.

The three numbers a layout depends on are not the client's to choose: a **page number** is
`nextPageNumber` over the numbers the chapter already uses (so deleting page 3 does not renumber page 4),
a **panel order** is the highest in use plus one, and a **bubble position** is clamped inside its own
panel by `clampBubble`, the same arithmetic the composer draws with.

**Sending `pageNumber` moves a page, and holds the unique constraint.** Webtoon mode has no page
turning, so its reading order *is* the page order and the editor reorders by swapping two pages'
numbers. `manga_pages` is `unique (chapter_id, page_number)` and the constraint is not deferrable, so a
swap cannot be two updates — the first would collide with the row still sitting there. The page holding
the target is parked on one past the chapter's highest number, both then land, and a failure in between
leaves a wrong order rather than a lost page. A target nobody holds is a plain move, and the gap it
leaves is deliberate: renumbering the pages behind the author's back would move work they did not touch.

## AI panels

`lib/manga/ai.ts` reads three variables:

```bash
MANGA_AI_PROVIDER=openai      # openai | stability | replicate
MANGA_AI_API_KEY=sk-…         # the provider's key
MANGA_AI_MODEL=gpt-image-1    # never guessed: the model your account can actually use
```

- The request is plain `fetch`, through **`lib/net-retry.ts`**: 5xx, 429 and 408 are retried with
  backoff, and a 4xx is an answer that is handed straight back. Measured in the suite: a 401 produces
  exactly one request, a 503 produces the whole retry budget.
- The answer is read back as an image: an inline base64 body, a URL to download, or — for Stability —
  the image bytes themselves. The content type is **sniffed from the bytes**, not taken from a header,
  and anything that is not PNG, JPEG, WebP or AVIF is refused.
- The download is capped at the bucket's own 8 MB, checked from `content-length` first and enforced on
  the stream second, so an oversized image is never held in memory.
- The stored object goes to `manga-panels` under `<user>/<chapter>/<uuid>.<ext>`, and the row records
  `ai_prompt`, `ai_provider` and `ai_model`. The row is written after the object: a row pointing at a
  missing file is a broken image on a published page.
- With no key, nothing is called and `POST /api/manga/ai/panel` answers **503 with the reason** — the
  sentence names the missing variable. A provider failure is a **502 carrying the provider's own
  message**, because "invalid key", "unknown model" and "upstream is down" are three different problems.

Two honest limits: the request shapes are each provider's documented HTTP API, and the model name is
passed through rather than validated against a list this file cannot keep true — a name that does not
exist comes back as the provider's own error. Stability's model is validated to letters, digits and dashes
first, because it is placed in a URL path segment.

## Storage

`manga-panels` is created public-read, image-only, 8 MB per object. It has **no write policy**: the only
way in is the service role, so a deployment without `SUPABASE_SERVICE_ROLE_KEY` cannot store panels and
the upload route answers 503 with that sentence. That is deliberate — a policy that let any signed-in
account write to the bucket would let it write anywhere in the bucket.

An uploaded file is checked three times: the declared content type is on the bucket's list, the bytes
really are that type (a text file named `panel.png` arrives labelled `image/png`), and the size is under
the limit before the body is read.

## Export

No new dependency, and nothing that only works on a server:

- **CBZ** is `buildCbz` in `lib/manga/export.ts`: a ZIP writer written by hand, **store only** (no
  compression — a PNG is already compressed, and deflating it would cost a dependency for a fraction of a
  percent). Entries are named with `cbzEntryName`, so the file-name order is the reading order, and
  `ComicInfo.xml` can be written first. `scripts/check-manga-export.mjs` reads the archive back with an
  **independent** parser and checks the CRC with `node:zlib`'s own implementation.
- **PDF** is the reader's print stylesheet (`PRINT_STYLESHEET`) plus the browser's own "Save as PDF". A
  hand-written PDF encoder would be a thousand lines of font embedding to produce something worse.
- **PNG** is per-panel `canvas.toBlob` in the browser, which needs no code in this repository.

## Running the checks

```bash
node --test scripts/check-manga.mjs scripts/check-manga-export.mjs
```

39 tests. The first file pins the page geometry and holds the SQL and the TypeScript against each other:
every column the code reads is parsed out of `CREATE TABLE` (and out of the `alter table … add column`
lines), the 400-character bubble, the 1..1000 comment, the three statuses, the two age ratings, the four
bubble kinds and the bucket's size and content types are all compared with the constants the routes use.
It also fails if a route that writes stops importing the shared guard, or if anything but the view route
mentions `view_count`. The second file pins the ZIP bytes, the export names and every AI refusal,
including the retry count for a 4xx.

Both suites import the modules under test with plain Node, where `server-only` throws by design. That is
why `lib/manga/export.ts`, `lib/manga/rules.ts` and `lib/manga/ai.ts` carry no `server-only` import, and why
the one place `ai.ts` needs the Supabase clients it imports them lazily, inside the function that runs on
the server. `project.ts`, `panel.ts` and `social.ts` touch personal data, so they do import `server-only`
and are covered by the structural tests instead: the suites read their source and hold it against the SQL.
