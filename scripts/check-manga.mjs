/**
 * Phase 24 (Manga Studio): page geometry, plus the SQL rules that must not drift from it.
 *
 *   node --test scripts/check-manga.mjs
 *
 * The geometry tests check what a person cannot see by looking: that no template's panels overlap or
 * fall off the page, that the reading order is right-to-left, and that a bubble dropped near an edge
 * is pulled back inside its own panel. The first version of the action template was one thousandth
 * of a page too tall - exactly the mistake this file exists to catch.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const schema = readFileSync(join(ROOT, "supabase", "schema.sql"), "utf8");

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
    assert.ok(schema.includes("alter table public." + table + " enable row level security"), table + " has no RLS");
  }
  assert.ok(schema.includes("using (user_id = public.current_user_id())"), "ownership must use current_user_id()");
  const manga = schema.slice(schema.indexOf("Phase 24 - Manga Studio"));
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
