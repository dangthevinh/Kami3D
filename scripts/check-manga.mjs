/**
 * Phase 24 (Manga Studio): page geometry, plus the SQL rules that must not drift from it.
 *
 *   node --test scripts/check-manga.mjs
 *
 * The geometry tests check what a person cannot see by looking: that no template's panels overlap or
 * fall off the page, that the reading order is right-to-left, and that a bubble dropped near an edge
 * is pulled back inside its own panel. The first version of the action template was one thousandth
 * of a page too tall - exactly the mistake this file exists to catch.
 *
 * The second half holds the SQL in `supabase/schema.sql` against the TypeScript that reads it. The
 * schema is frozen and is the authority: it owns the column names, the 400-character bubble, the
 * 1..1000 comment, the three statuses, the two age ratings and the 8 MB image-only bucket. The code
 * is where those numbers are restated, so this file parses the CREATE TABLE statements, the `alter
 * table … add column` lines and the bucket insert, and fails when a name or a number stops matching -
 * which is otherwise a Postgres error at the first write, in production, with no test to blame.
 * The export writer and the AI refusals live next door in scripts/check-manga-export.mjs.
 */

import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import {
  BUBBLE_STYLE,
  BUBBLE_TYPES,
  GUTTER,
  MANGA_TEMPLATES,
  cbzEntryName,
  clampBubble,
  mangaSlug,
  nextPageNumber,
  overlapArea,
  panelAt,
  panelRects,
} from "../lib/manga-layout.ts";
import {
  MANGA_AGE_RATINGS,
  MANGA_BUBBLE_MAX_CHARS,
  MANGA_COLUMNS,
  MANGA_COMMENT_MAX_CHARS,
  MANGA_COMMENT_MIN_CHARS,
  MANGA_IMAGE_TYPES,
  MANGA_PANEL_BUCKET,
  MANGA_PANEL_MAX_BYTES,
  MANGA_STATUSES,
  MANGA_TABLE,
  MANGA_TITLE_MAX_CHARS,
} from "../lib/manga/rules.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const schema = readFileSync(join(ROOT, "supabase", "schema.sql"), "utf8");

/** Every file under app/api/manga, so the route-level rules below are checked, not assumed. */
function routeSources(dir = join(ROOT, "app", "api", "manga"), found = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) routeSources(path, found);
    else if (entry.name.endsWith(".ts")) found.push({ path, source: readFileSync(path, "utf8") });
  }
  return found;
}

/**
 * The columns of one table as the schema declares them.
 *
 * Two sources, because the Phase 24 block adds columns both ways: `is_webtoon` and the three
 * `ai_*` columns are added to tables that already existed, and an `add column if not exists` that
 * this parser ignored is exactly the drift the test is for.
 */
function schemaColumns(name) {
  const start = schema.indexOf("create table if not exists public." + name);
  assert.notEqual(start, -1, "public." + name + " is not created by the schema");

  const open = schema.indexOf("(", start);
  let depth = 0;
  let close = open;
  for (let at = open; at < schema.length; at += 1) {
    if (schema[at] === "(") depth += 1;
    else if (schema[at] === ")") {
      depth -= 1;
      if (depth === 0) {
        close = at;
        break;
      }
    }
  }

  const columns = new Set();
  for (const raw of schema.slice(open + 1, close).split("\n")) {
    const line = raw.replace(/--.*$/, "").trim();
    if (line.length === 0) continue;
    if (/^(constraint|primary key|unique|check|foreign key)\b/i.test(line)) continue;
    const match = /^([a-z_][a-z0-9_]*)\s/.exec(line);
    if (match) columns.add(match[1]);
  }

  const marker = "alter table public." + name;
  let at = schema.indexOf(marker);
  while (at !== -1) {
    const line = schema.slice(at, schema.indexOf("\n", at) === -1 ? undefined : schema.indexOf("\n", at));
    const added = /add column if not exists ([a-z_]+)/.exec(line);
    if (added) columns.add(added[1]);
    at = schema.indexOf(marker, at + 1);
  }

  return columns;
}

test("every template keeps its panels on the page and out of each other", () => {
  assert.ok(MANGA_TEMPLATES.length >= 5);
  for (const template of MANGA_TEMPLATES) {
    assert.ok(template.panels.length >= 1, template.id + " has no panels");
    for (const panel of template.panels) {
      assert.ok(panel.x >= 0 && panel.y >= 0, template.id + " starts off the page");
      assert.ok(panel.x + panel.w <= 1.000001 && panel.y + panel.h <= 1.000001, template.id + " runs off the page");
      assert.ok(panel.w > GUTTER && panel.h > GUTTER, template.id + " has a panel thinner than the gutter");
    }
    for (let i = 0; i < template.panels.length; i += 1) {
      for (let j = i + 1; j < template.panels.length; j += 1) {
        assert.equal(overlapArea(template.panels[i], template.panels[j]), 0, template.id + " has overlapping panels");
      }
    }
  }
});

test("the grid templates read right to left, like a manga page", () => {
  const [first, second] = panelRects("classic-4");
  assert.ok(first.x > second.x, "the first panel must be the right-hand one");
  assert.equal(first.y, second.y, "the first two panels share a row");
  const [, , third] = panelRects("classic-4");
  assert.ok(third.y > first.y, "the third panel is on the next row down");
});

test("the webtoon template is a vertical strip of full-width panels", () => {
  const spec = MANGA_TEMPLATES.find((entry) => entry.id === "webtoon");
  assert.ok(spec && spec.aspect > 2, "a webtoon page scrolls, so it is much taller than wide");
  const panels = spec.panels;
  assert.deepEqual([...new Set(panels.map((panel) => panel.x))], [GUTTER], "every panel is full width");
  for (let i = 1; i < panels.length; i += 1) assert.ok(panels[i].y > panels[i - 1].y, "panels stack downwards");
});

test("the action template is five panels, the top one a wide shot", () => {
  const panels = panelRects("action-5");
  assert.equal(panels.length, 5);
  assert.ok(panels[0].w > panels[1].w, "the top panel spans the page");
});

test("an unknown template falls back instead of rendering nothing", () => {
  assert.equal(panelRects("not-a-template").length, panelRects("classic-4").length);
});

test("a bubble dropped outside its panel is pulled back inside it", () => {
  const panel = { x: 0, y: 0, w: 0.5, h: 0.5 };
  assert.deepEqual(clampBubble({ x: 0.9, y: 0.9, w: 0.3, h: 0.3 }, panel), { x: 0.2, y: 0.2, w: 0.3, h: 0.3 });
  assert.deepEqual(clampBubble({ x: -0.2, y: -0.2, w: 0.2, h: 0.2 }, panel), { x: 0, y: 0, w: 0.2, h: 0.2 });
  const inside = { x: 0.1, y: 0.1, w: 0.2, h: 0.2 };
  assert.deepEqual(clampBubble(inside, panel), inside, "a bubble already inside is left alone");
});

test("a bubble too big for its panel is shrunk to the panel", () => {
  const panel = { x: 0.5, y: 0.5, w: 0.25, h: 0.2 };
  const clamped = clampBubble({ x: 0.5, y: 0.5, w: 0.9, h: 0.9 }, panel);
  assert.deepEqual(clamped, { x: 0.5, y: 0.5, w: 0.25, h: 0.2 });
});

test("a point in a gutter belongs to no panel", () => {
  const rects = panelRects("classic-4");
  const first = rects[0];
  assert.equal(panelAt(rects, first.x + first.w / 2, first.y + first.h / 2), 0);
  assert.equal(panelAt(rects, 0, 0), null, "the corner is the page margin");
  assert.equal(panelAt(rects, GUTTER / 2, GUTTER / 2), null, "and so is the gutter");
});

test("page numbers fill the first hole rather than counting up blindly", () => {
  assert.equal(nextPageNumber([]), 1);
  assert.equal(nextPageNumber([1]), 2);
  assert.equal(nextPageNumber([1, 2, 4]), 3, "deleting page 3 must not renumber page 4");
});

test("every bubble kind has a look, and narration is the odd one out", () => {
  for (const type of BUBBLE_TYPES) assert.ok(BUBBLE_STYLE[type], type + " has no style");
  assert.equal(BUBBLE_STYLE.narration.shape, "box", "narration is a caption box, not a bubble");
  assert.equal(BUBBLE_STYLE.thought.shape, "cloud");
});

test("export helpers produce names a comic reader can sort", () => {
  assert.equal(cbzEntryName(7), "0007.png");
  assert.equal(cbzEntryName(1234, "jpg"), "1234.jpg");
  assert.ok(cbzEntryName(2) < cbzEntryName(10), "zero padding is what survives a sort");
  assert.equal(mangaSlug("  Night of the Kitsune!! "), "night-of-the-kitsune");
  assert.equal(mangaSlug("日本語"), "manga");
});

test("ownership in SQL goes through the identity helper every other table uses", () => {
  for (const table of ["manga_projects", "manga_chapters", "manga_panels", "manga_pages", "manga_bubbles", "manga_likes"]) {
    assert.ok(schema.includes("create table if not exists public." + table), table + " is missing");
    const pattern = new RegExp("alter table public\." + table + "\\s+enable row level security");
    assert.ok(pattern.test(schema), table + " has no RLS");
  }
  assert.ok(schema.includes("using (user_id = public.current_user_id())"), "ownership must use current_user_id()");
  // Only the Phase 24 block: the schema goes on to other phases, and older tables still use
  // auth.uid() in places this phase has nothing to do with.
  const start = schema.indexOf("Phase 24 - Manga Studio");
  const next = schema.indexOf("/* ======", start);
  const manga = schema.slice(start, next === -1 ? undefined : next);
  // Legacy tables elsewhere in the schema still carry auth.uid(); what matters is that no
  // Phase 24 policy does, because under Clerk that function is always null.
  assert.ok(manga.length > 1000, "the Phase 24 block is missing");
  assert.ok(!manga.includes("auth.uid()"), "a manga policy uses auth.uid(): always null under Clerk");
});

test("the view counter is a function nobody can go around", () => {
  assert.ok(schema.includes("create or replace function public.increment_manga_view(p_project uuid)"));
  assert.ok(schema.includes("where id = p_project and is_public and status = 'published'"));
  assert.ok(schema.includes("grant execute on function public.increment_manga_view(uuid) to anon, authenticated"));
});

test("the column list the code reads is the column list the SQL declares", () => {
  for (const [key, table] of Object.entries(MANGA_TABLE)) {
    const declared = schemaColumns(table);
    const read = MANGA_COLUMNS[key];

    assert.equal(typeof read, "string", table + " has no column list in MANGA_COLUMNS");
    const columns = read.split(",").map((column) => column.trim());
    assert.equal(new Set(columns).size, columns.length, table + ": a column is listed twice");

    for (const column of columns) {
      assert.ok(declared.has(column), table + "." + column + " is read by the code but does not exist in the schema");
    }
    for (const column of declared) {
      assert.ok(
        columns.includes(column),
        table + "." + column + " exists in the schema but no read asks for it: the row type would be missing it",
      );
    }
  }
});

test("the limits the routes enforce are the limits the SQL checks", () => {
  assert.ok(schema.includes("check (length(content) <= " + MANGA_BUBBLE_MAX_CHARS + ")"), "the bubble cap drifted");
  assert.ok(
    schema.includes(
      "check (length(btrim(content)) between " + MANGA_COMMENT_MIN_CHARS + " and " + MANGA_COMMENT_MAX_CHARS + ")",
    ),
    "the comment length rule drifted",
  );
  for (const table of ["manga_projects", "manga_chapters"]) {
    assert.ok(
      schema.includes("check (length(btrim(title)) between 1 and " + MANGA_TITLE_MAX_CHARS + ")"),
      table + " has a different title limit",
    );
  }

  // The three statuses and the two age ratings, spelled out of the constants the routes validate with.
  const statuses = MANGA_STATUSES.map((status) => "'" + status + "'").join(", ");
  assert.ok(schema.includes("status in (" + statuses + ")"), "the status set drifted");
  assert.ok(schema.includes("age_rating in (" + MANGA_AGE_RATINGS.map((rating) => "'" + rating + "'").join(", ") + ")"));

  // The bubble kinds are geometry (lib/manga-layout.ts) *and* a CHECK constraint: the two lists are
  // the same list, or a bubble the composer can draw cannot be stored.
  assert.ok(
    schema.includes("bubble_type in (" + BUBBLE_TYPES.map((type) => "'" + type + "'").join(", ") + ")"),
    "the four bubble kinds in SQL and in the layout module have drifted apart",
  );
});

test("the bucket the code uploads to is the bucket the SQL creates", () => {
  // Three buckets are created by this schema (models, sounds, panels); the one this phase owns is the
  // one naming manga-panels, so it is found by name rather than by "the first insert into storage.buckets".
  let at = schema.indexOf("insert into storage.buckets");
  while (at !== -1 && !schema.slice(at, at + 400).includes("'" + MANGA_PANEL_BUCKET + "'")) {
    at = schema.indexOf("insert into storage.buckets", at + 1);
  }
  assert.notEqual(at, -1, "the schema does not create the " + MANGA_PANEL_BUCKET + " bucket");
  const statement = schema.slice(at, schema.indexOf("on conflict", at));

  assert.ok(
    statement.includes("'" + MANGA_PANEL_BUCKET + "', '" + MANGA_PANEL_BUCKET + "', true,"),
    "the bucket must be public to read and named exactly once",
  );
  assert.ok(statement.includes(String(MANGA_PANEL_MAX_BYTES)), "the 8 MB file size limit drifted");
  for (const type of MANGA_IMAGE_TYPES) {
    assert.ok(statement.includes("'" + type + "'"), "the bucket no longer allows " + type);
  }
  assert.ok(statement.includes("file_size_limit") && statement.includes("allowed_mime_types"), "the bucket lost its limits");
});

test("a like or a follow cannot be counted twice, and nobody can follow themselves", () => {
  assert.ok(schema.includes("primary key (project_id, user_id)"), "manga_likes needs its composite key: a double tap must not count twice");
  assert.ok(schema.includes("primary key (follower_id, following_id)"), "manga_follows needs its composite key");
  assert.ok(schema.includes("constraint manga_follows_not_self check (follower_id <> following_id)"), "a self-follow is storable");
});

test("the view function is the only writer of view_count, and the route calls it by its real name", () => {
  const rpc = routeSources().find((file) => file.path.endsWith(join("view", "route.ts")));
  assert.ok(rpc, "the view route is missing");
  assert.ok(rpc.source.includes('rpc("increment_manga_view"'), "the route does not call the function");
  assert.ok(
    rpc.source.includes("p_project: projectId"),
    "the argument name must match the function's parameter, or PostgREST answers 404",
  );
  assert.ok(schema.includes("security definer"), "the view function must be SECURITY DEFINER to write what anon cannot");

  // No route may set the counter directly: a client that could PATCH view_count would make it fiction.
  for (const file of routeSources()) {
    if (file.source.includes("view_count")) {
      assert.ok(file.path.endsWith(join("view", "route.ts")), file.path + " mentions view_count; only the view route may");
    }
  }
});

test("every manga route that writes goes through the shared guard", () => {
  const files = routeSources();
  assert.ok(files.length >= 15, "expected the whole manga API surface, found " + files.length + " files");

  for (const file of files) {
    const writes = /export async function (POST|PATCH|PUT|DELETE)\b/.test(file.source);
    if (!writes) continue;
    assert.ok(
      file.source.includes('from "@/app/api/manga/_lib/guard"'),
      file.path + " writes but does not import the guard",
    );
    assert.ok(
      /await writer\(|block\(/.test(file.source),
      file.path + " writes without guardWrite: a cross-site POST and a loop would both go through",
    );
  }

  // And the one route an anonymous visitor may write to is rate limited on purpose.
  const view = files.find((file) => file.path.endsWith(join("view", "route.ts")));
  assert.ok(view.source.includes("block(request"), "the view route must be rate limited");
});


test("a webtoon can be reordered, and the two writes cannot collide", () => {
  // Found by reading the two halves against each other: the composer reorders a webtoon by swapping
  // two pages' numbers, and \`PATCH /api/manga/pages/[pageId]\` answered 400 "Nothing to update" because
  // nothing parsed \`pageNumber\`. The rule is locked here rather than in a browser because the module
  // is \`server-only\` and cannot be imported by a suite.
  const project = readFileSync(join(ROOT, "lib", "manga", "project.ts"), "utf8");

  assert.match(project, /pageNumber\?: number/, "the page patch must carry a reading position");
  assert.match(project, /body\.pageNumber !== undefined/, "and the parser must read it, or the editor's reorder is a 400");
  assert.match(project, /if \(patch\.pageNumber !== undefined\)/, "and the write must act on it");

  // \`manga_pages\` is \`unique (chapter_id, page_number)\` and not deferrable, so setting a page's number
  // to the one another page holds is a swap: the occupant is parked first, then both land. Without the
  // park, the first update raises a duplicate-key error and reordering never works at all.
  assert.match(project, /async function movePageTo\(/, "the swap needs its own function");
  assert.match(project, /page_number: highest \+ 1/, "the occupant is parked outside the chapter's range before the two land");
  assert.match(project, /const occupant = rows\.find\(/, "and the occupant is whoever holds the target number");
});

