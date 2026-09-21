/**
 * Checks for the story map.
 *
 * The failure modes here are publication failures: a story with no source, an image whose licence
 * this site may not use, a credit line that loses the author. So the suite reads the real data
 * file, runs the same validator the seeder runs, and pins the timeline contract D5 borrows from
 * Phase 16 rather than rebuilding.
 *
 * Run with: npm run check:stories
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import {
  IMAGE_LICENSES,
  hasModel,
  imageCredit,
  nearestStories,
  storyForYear,
  storyGapMessage,
  storyToTimelineEvent,
  storyYears,
  validateStories,
} from "../lib/data2map/stories.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const file = JSON.parse(readFileSync(join(root, "data", "data2map-stories.json"), "utf8"));

test("the story file is valid, and the validator is the one the seeder uses", () => {
  assert.deepEqual(validateStories(file), []);
  assert.ok(file.stories.length >= 5, "a story map with two entries is a leaflet");
  assert.ok(file.attribution.length > 10);
});

test("a broken entry is a refusal, not a warning", () => {
  const broken = JSON.parse(JSON.stringify(file));
  broken.stories[0].summary = "Too short";
  broken.stories[0].sourceUrl = "not a url";
  broken.stories[0].lat = 200;
  broken.images[broken.stories[0].slug] = { ...broken.images[broken.stories[0].slug], license: "CC-BY-NC", author: "" };

  const problems = validateStories(broken);
  assert.ok(problems.length >= 4, problems.join(" | "));
  assert.ok(problems.some((problem) => problem.includes("too short")));
  assert.ok(problems.some((problem) => problem.includes("source URL")));
  assert.ok(problems.some((problem) => problem.includes("latitude")));
  assert.ok(problems.some((problem) => problem.includes("not one this site may use")));
  assert.ok(problems.some((problem) => problem.includes("no author")));
});

test("every image has a credit a reader can act on", () => {
  for (const story of file.stories) {
    const image = file.images[story.slug];
    assert.ok(image, `${story.slug} has no image`);
    assert.ok(IMAGE_LICENSES.includes(image.license), `${story.slug}: ${image.license}`);
    assert.ok(image.pageUrl.includes("commons.wikimedia.org"), `${story.slug}: the credit must link to the file page`);

    const credit = imageCredit(image);
    assert.ok(credit.includes(image.author), `${story.slug}: the credit drops the author`);
    assert.ok(credit.includes(image.licenseLabel), `${story.slug}: the credit drops the licence`);
    assert.ok(credit.includes("Wikimedia Commons"));
  }
});

test("share-alike is recorded, not smoothed over", () => {
  const shareAlike = file.stories.filter((story) => file.images[story.slug]?.license === "CC-BY-SA");
  assert.ok(shareAlike.length > 0, "the sample should contain share-alike images, since Commons is full of them");

  for (const story of shareAlike) {
    assert.match(file.images[story.slug].licenseLabel, /^CC BY-SA/);
  }
});

test("the timeline it reuses gets exactly the shape it expects", () => {
  const event = storyToTimelineEvent(file.stories[0], file.attribution);

  // `TimelineEvent` in lib/timeline.ts requires these, and the panel reads all of them.
  for (const key of ["id", "year", "title", "summary", "kind", "slug", "source", "sourceUrl", "attribution"]) {
    assert.ok(key in event, `a story event has no ${key}`);
  }

  assert.equal(typeof event.year, "number");
  assert.equal(event.slug, file.stories[0].slug);
  assert.equal(event.attribution, file.attribution);
});

test("years are unique, sorted, and drive the scale", () => {
  const years = storyYears(file.stories);
  assert.equal(years.length, new Set(years).size);
  assert.deepEqual([...years].sort((a, b) => a - b), years);

  for (const year of years) assert.ok(storyForYear(file.stories, year), `${year} has no story`);
  assert.equal(storyForYear(file.stories, 1), null);
  assert.equal(new Set(file.stories.map((story) => story.year)).size, file.stories.length, "two stories share a year, and the timeline shows one per year");
});

test("a year without a story says so and points at the nearest", () => {
  const message = storyGapMessage(file.stories, 1700);

  assert.match(message, /No story for 1700/);
  assert.ok(message.length > 20);
  assert.equal(storyGapMessage(file.stories, file.stories[0].year), "", "no gap, no message");
  assert.equal(storyGapMessage([], 1700), "No story is recorded for this year.");
});

test("the nearest stories are ordered by distance, then by year", () => {
  const nearest = nearestStories(file.stories, 1500, 3);
  const distances = nearest.map((story) => Math.abs(story.year - 1500));

  assert.equal(nearest.length, 3);
  assert.deepEqual([...distances].sort((a, b) => a - b), distances);
  assert.deepEqual(nearestStories([], 1500), []);
});

test("no story claims a 3D model it does not have", () => {
  // The panel shows a 3D button only when `hasModel` is true, so the flag has to be honest.
  for (const story of file.stories) {
    assert.equal(hasModel(story), false, `${story.slug} claims a model`);
    assert.ok(!("modelUrl" in story) || story.modelUrl === null || story.modelUrl === undefined);
  }

  assert.equal(hasModel({ ...file.stories[0], modelUrl: "/models/lion.glb" }), true);
  assert.equal(hasModel({ ...file.stories[0], modelUrl: "" }), false);
});
