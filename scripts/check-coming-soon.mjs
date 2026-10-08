/**
 * The modules that are built but not launched: Data2Map and Manga Studio.
 *
 *   node --test scripts/check-coming-soon.mjs
 *
 * Two things have to be true at once, and they are easy to confuse:
 *
 *   1. **the menu is a courtesy.** Both entries are drawn for everybody, greyed out and labelled
 *      "Coming soon", so a visitor is told the module exists rather than shown nothing;
 *   2. **the gate is the lock.** Every path in the module - pages *and* API - answers 404 to anyone
 *      who is not an admin, on every request, in the middleware.
 *
 * A test that only checked the first would pass while the routes were wide open, which is why the
 * path matchers are tested here for real rather than read as text: a gate with a hole in its matcher
 * is not a gate.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import {
  COMING_SOON_MODULES,
  comingSoonById,
  comingSoonFor,
  isComingSoonPath,
  isMangaStudioPath,
  mangaStudioIsPublic,
} from "../lib/coming-soon.ts";

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), "utf8");

test("the registry is the one list of unlaunched modules", () => {
  assert.deepEqual(
    COMING_SOON_MODULES.map((module) => module.id).sort(),
    ["data2map", "manga-studio"],
    "a third module would need its own switch and its own line here",
  );

  for (const module of COMING_SOON_MODULES) {
    assert.ok(module.href.startsWith("/"), module.id + " needs a path");
    assert.ok(module.launchSwitch.startsWith("NEXT_PUBLIC_"), module.id + " needs a switch a browser can read");
    assert.ok(module.label.length > 2, module.id + " needs a label for the menu");
    assert.equal(comingSoonById(module.id)?.href, module.href, module.id + " must be findable by id");
  }

  assert.equal(comingSoonById("not-a-module"), null);
  assert.equal(comingSoonFor("/explore"), null, "the encyclopedia is not behind this gate");
});

test("a module that answers 404 is not advertised in the sitemap", () => {
  const sitemap = read("app/sitemap.ts");
  assert.ok(sitemap.includes("mangaStudioIsPublic()"), "the sitemap must ask about Manga Studio");
  assert.ok(/mangaStudioIsPublic\(\)\s*\n?\s*\?/.test(sitemap), "and list its gallery only when it is open");
  assert.ok(sitemap.includes("mangaRoutes"), "the routes it decides about must actually be returned");
});

test("the gate covers the pages and the API of each module", () => {
  for (const path of [
    "/data2map",
    "/data2map/",
    "/data2map/twin",
    "/data2map/agriculture?season=2",
    "/api/data2map",
    "/api/data2map/pois",
    "/manga-studio",
    "/manga-studio/gallery",
    "/manga-studio/reader/abc",
    "/api/manga",
    "/api/manga/projects",
  ]) {
    assert.equal(isComingSoonPath(path), true, path + " must be behind the gate");
  }

  // The near-misses, which are the whole reason the matcher works on segments: a prefix comparison
  // would gate somebody else's route and miss the query string.
  for (const path of [
    "/",
    "/map",
    "/explore",
    "/data2mapx",
    "/api/data2mapish",
    "/maps/data2map",
    "/manga-studiox",
    "/api/mangaid",
    "/api/module-access",
  ]) {
    assert.equal(isComingSoonPath(path), false, path + " must not be gated by string luck");
  }

  assert.equal(isMangaStudioPath("/manga-studio"), true);
  assert.equal(isMangaStudioPath("/api/manga/ai/status"), true);
});

test("both modules are closed by default and each has its own switch", () => {
  const previousManga = process.env.NEXT_PUBLIC_MANGA_PUBLIC;
  const previousNodeEnv = process.env.NODE_ENV;

  try {
    delete process.env.NEXT_PUBLIC_MANGA_PUBLIC;
    process.env.NODE_ENV = "production";
    assert.equal(mangaStudioIsPublic(), false, "Manga Studio must not be public by accident");

    process.env.NEXT_PUBLIC_MANGA_PUBLIC = "1";
    assert.equal(mangaStudioIsPublic(), true, "the launch switch opens it");

    // `npm run dev` is where a module is written, and hiding it there only teaches people to work
    // around the gate.
    delete process.env.NEXT_PUBLIC_MANGA_PUBLIC;
    process.env.NODE_ENV = "development";
    assert.equal(mangaStudioIsPublic(), true, "a development build shows it to everybody");
  } finally {
    if (previousManga === undefined) delete process.env.NEXT_PUBLIC_MANGA_PUBLIC;
    else process.env.NEXT_PUBLIC_MANGA_PUBLIC = previousManga;
    process.env.NODE_ENV = previousNodeEnv;
  }
});

test("the middleware asks the registry instead of naming a module itself", () => {
  const middleware = read("middleware.ts");

  assert.ok(middleware.includes("comingSoonFor"), "the middleware must ask which module a path is in");
  assert.ok(!middleware.includes("isData2MapPath"), "and must not special-case one of them");
  assert.ok(!middleware.includes("manga-studio"), "including the one this test was written for");
  assert.ok(middleware.includes("canEnter"), "and must ask who may enter");
  assert.ok(middleware.includes("isDatabaseAdmin"), "against the admin table");

  // Every branch of the provider switch applies it: Supabase, Clerk and Demo Mode.
  assert.ok(
    (middleware.match(/hiddenResponse\(\)/g) ?? []).length >= 3,
    "each provider path needs the gate",
  );
  assert.ok(/status: 404/.test(middleware), "a module that is not launched answers 404, not 403");
  assert.ok(middleware.includes("x-robots-tag"), "and tells crawlers to stay out");
});

test("the navbar and the middleware agree about which modules are unlaunched", () => {
  const navbar = read("components/layout/Navbar.tsx");
  const middleware = read("middleware.ts");

  // One registry, read by both. The failure this prevents: opening a module in the menu while the
  // route still answers 404, or leaving a route open after the menu says "coming soon".
  assert.ok(navbar.includes("COMING_SOON_MODULES"), "the navbar must read the registry");
  assert.ok(middleware.includes("lib/coming-soon"), "and so must the middleware");
  assert.ok(navbar.includes("/api/module-access"), "with one probe that answers for all of them");

  // A locked entry is a label rather than a link, and it is never the way into the module.
  assert.ok(navbar.includes("aria-disabled"), "a locked entry must say it is disabled");
  for (const module of COMING_SOON_MODULES) {
    assert.ok(navbar.includes(module.href), module.id + " must be drawn in the menu");
    assert.ok(middleware.includes("comingSoonFor"), module.id + " must be gated");
  }
});
