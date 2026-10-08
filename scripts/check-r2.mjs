/**
 * The rules that decide where an asset is served from, and the receipt that says it is really there.
 *
 * Two facts have to stay true together, and neither is visible to a type:
 *
 *   1. **The uploader and the site must agree on the path.** `scripts/r2-push.mjs` writes the key
 *      `models/lion.glb`; `assetUrl("/models/lion.glb")` appends exactly that. If those two ever drift,
 *      every model 404s and nothing in TypeScript notices — so the agreement is asserted here.
 *   2. **Every path the catalogue references must exist on the CDN.** The manifest is written from the
 *      files that were actually pushed and read back, so comparing the data files against it is a real
 *      check that the 236-model migration was complete — not a claim that it was.
 *
 * No network: this runs in `npm run check`, and the live proof is `npm run r2:verify` (bytes over the
 * public URL) and `npm run r2:probe` (a real browser).
 *
 * Run with: npm run check:r2
 */

import assert from "node:assert/strict";
import { existsSync, statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { ANIMALS } from "../data/animals.ts";
import { PLANT_ENTRIES } from "../data/plants.ts";
import { SPACE_ENTRIES } from "../data/space.ts";
import { VEHICLE_ENTRIES } from "../data/vehicles.ts";
import { ALL_LANDMARKS } from "../data/landmarks/all.ts";
import { panelKey, panelObjectPath, parseStorageUrl, r2KeyFor } from "../lib/r2-paths.ts";
import { assetCdnBase, assetUrl, isAssetCdnEnabled } from "../lib/r2.ts";
import { keyFor, MANIFEST } from "./r2-push.mjs";

const BASE = "https://cdn.example.test";

/** Run a body with the two R2 variables set, and put the environment back afterwards. */
function withEnv(values, body) {
  const saved = {
    NEXT_PUBLIC_R2_PUBLIC_URL: process.env.NEXT_PUBLIC_R2_PUBLIC_URL,
    NEXT_PUBLIC_R2_ASSETS: process.env.NEXT_PUBLIC_R2_ASSETS,
  };

  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }

  try {
    return body();
  } finally {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

/** The repository root, the same way the other suites find it: from this file's own URL. */
const ROOT = fileURLToPath(new URL("..", import.meta.url));

const manifest = JSON.parse(await readFile(MANIFEST, "utf8"));
const keys = new Set(manifest.objects.map((object) => object.key));

test("the trailing slash on the base URL is not doubled", () => {
  withEnv({ NEXT_PUBLIC_R2_PUBLIC_URL: "https://cdn.example.test///", NEXT_PUBLIC_R2_ASSETS: "on" }, () => {
    assert.equal(assetCdnBase(), BASE);
    assert.equal(assetUrl("/models/lion.glb"), BASE + "/models/lion.glb");
  });
});

test("with the cutover off, a repository path is served as it always was", () => {
  withEnv({ NEXT_PUBLIC_R2_PUBLIC_URL: BASE, NEXT_PUBLIC_R2_ASSETS: undefined }, () => {
    assert.equal(isAssetCdnEnabled(), false);
    assert.equal(assetUrl("/models/lion.glb"), "/models/lion.glb");
    assert.equal(assetUrl("/sounds/lion.ogg"), "/sounds/lion.ogg");
  });
});

test("with the cutover on, the host changes and the path does not", () => {
  withEnv({ NEXT_PUBLIC_R2_PUBLIC_URL: BASE, NEXT_PUBLIC_R2_ASSETS: "on" }, () => {
    assert.equal(isAssetCdnEnabled(), true);
    assert.equal(assetUrl("/models/landmarks/taj-mahal.glb"), BASE + "/models/landmarks/taj-mahal.glb");
    assert.equal(assetUrl("/sounds/bald-eagle.mp3"), BASE + "/sounds/bald-eagle.mp3");
  });
});

test("a configured bucket is not enough on its own: the switch has to say on", () => {
  // Anything that is not "on" keeps the repository copy. A near-miss ("true", "ON", "yes", a stray
  // space) must fail closed rather than half-migrate a site: an asset host that is on for some readers
  // and off for others is worse than one that is off for everyone.
  for (const flag of ["1", "true", "yes", "ON", "on.", "off", ""]) {
    withEnv({ NEXT_PUBLIC_R2_PUBLIC_URL: BASE, NEXT_PUBLIC_R2_ASSETS: flag }, () => {
      assert.equal(isAssetCdnEnabled(), false, "NEXT_PUBLIC_R2_ASSETS=" + JSON.stringify(flag) + " must not cut over");
    });
  }

  // The one form that does count, whitespace and all, because that is what a .env file tends to hold.
  withEnv({ NEXT_PUBLIC_R2_PUBLIC_URL: BASE, NEXT_PUBLIC_R2_ASSETS: " on " }, () => {
    assert.equal(isAssetCdnEnabled(), true);
  });
});

test("the switch alone is not enough either: there has to be a bucket", () => {
  withEnv({ NEXT_PUBLIC_R2_PUBLIC_URL: undefined, NEXT_PUBLIC_R2_ASSETS: "on" }, () => {
    assert.equal(isAssetCdnEnabled(), false);
    assert.equal(assetUrl("/models/lion.glb"), "/models/lion.glb");
  });
});

test("null, empty and already-absolute URLs are left alone", () => {
  withEnv({ NEXT_PUBLIC_R2_PUBLIC_URL: BASE, NEXT_PUBLIC_R2_ASSETS: "on" }, () => {
    assert.equal(assetUrl(null), null);
    assert.equal(assetUrl(""), "");

    // Rule 2: an admin upload stores an absolute Storage URL, and an attribution image can be anywhere.
    const storage = "https://ztihljcpeylprcgblnpv.supabase.co/storage/v1/object/public/animal-assets/uploads/models/x.glb";
    assert.equal(assetUrl(storage), storage);

    // Rule 3: protocol-relative is a host, not a path.
    assert.equal(assetUrl("//cdn.example.test/models/lion.glb"), "//cdn.example.test/models/lion.glb");

    // And a bare relative path was never a public path in this repository.
    assert.equal(assetUrl("models/lion.glb"), "models/lion.glb");
  });
});

test("the key the uploader writes is the path the site appends", () => {
  withEnv({ NEXT_PUBLIC_R2_PUBLIC_URL: BASE, NEXT_PUBLIC_R2_ASSETS: "on" }, () => {
    for (const relative of ["models/lion.glb", "models/landmarks/taj-mahal.glb", "sounds/lion.ogg"]) {
      const file = fileURLToPath(new URL("../public/" + relative, import.meta.url));
      const key = keyFor(file);

      assert.equal(key, relative, "the key is the path under public/, with no leading slash");
      assert.equal(assetUrl("/" + key), BASE + "/" + key, "the site must build the URL of that same key");
    }
  });
});

test("the manifest is internally consistent", () => {
  assert.equal(manifest.count, manifest.objects.length);

  const bytes = manifest.objects.reduce((sum, object) => sum + object.bytes, 0);
  assert.equal(manifest.bytes, bytes, "the manifest's total must be the sum of its objects");

  assert.equal(keys.size, manifest.objects.length, "two objects must never share a key");

  for (const object of manifest.objects) {
    assert.ok(!object.key.startsWith("/"), object.key + " must be a key, not a path");
    assert.ok(object.bytes > 0, object.key + " has no bytes");
    assert.match(object.md5, /^[0-9a-f]{32}$/, object.key + " has no md5 receipt");

    // `source: null` is a state, not a gap: 44 objects reached R2 without being produced from
    // `public/**` — the Storage migration copied 35 models that exist nowhere else plus 9
    // pre-compression originals, and jobs written by the upload path land under `uploads/`. When there
    // IS a source, the key must be that path with `public/` removed; that is the invariant that makes
    // the CDN and the repository the same catalogue rather than two.
    if (object.source !== null) {
      assert.equal(object.key, object.source.replace(/^public\//, ""), object.source + " and " + object.key + " disagree");
    }
  }
});

test("every asset the catalogue references exists in the bucket", () => {
  const referenced = [];
  const collect = (record) => {
    for (const field of ["model_url", "sound_url", "image_url"]) {
      const value = record[field];
      if (typeof value === "string" && value.startsWith("/")) referenced.push(value);
    }
  };

  for (const animal of ANIMALS) collect(animal);
  for (const landmark of ALL_LANDMARKS) collect(landmark);
  for (const entry of [...PLANT_ENTRIES, ...SPACE_ENTRIES, ...VEHICLE_ENTRIES]) collect(entry);

  assert.ok(referenced.length > 200, "expected the whole catalogue, found only " + referenced.length);

  const missing = [...new Set(referenced)].filter((path) => !keys.has(path.slice(1)));
  assert.deepEqual(missing, [], missing.length + " asset(s) the catalogue points at are not in the bucket");

  // The 6 recordings are a fixed, small set: an extra one here means a file was pushed that nothing
  // references, which is how a bucket slowly fills with orphans.
  const sounds = manifest.objects.filter((object) => object.key.startsWith("sounds/"));
  assert.equal(sounds.length, 6);
  assert.equal(ANIMALS.filter((animal) => animal.sound_url && animal.sound_url.startsWith("/")).length, 6);
});

test("every rendered card preview is in the repository and on the CDN", async () => {
  const previews = JSON.parse(await readFile(new URL("../data/previews.json", import.meta.url), "utf8"));
  const onCdn = new Set(manifest.objects.filter((object) => object.key.startsWith("previews/")).map((object) => object.key));

  assert.ok(previews.entries.length > 200, "expected the whole catalogue to have been rendered");

  const missingFromCdn = [];
  for (const entry of previews.entries) {
    // The key is the model path under `models/` without the extension — the same derivation
    // `lib/model-previews.ts` does from `model_url` at render time. If these two ever disagreed, a card
    // would ask for a file the renderer never wrote, and the fallback would hide it.
    assert.equal(entry.key, entry.source.replace(/^public\/models\//, "").replace(/\.glb$/, ""), entry.source);
    assert.equal(entry.file, "public/previews/" + entry.key + ".webp", entry.key);
    assert.ok(entry.bytes > 0, entry.key + " has no bytes");
    assert.match(entry.md5, /^[0-9a-f]{32}$/, entry.key + " has no md5");
    assert.equal(entry.width, entry.height, entry.key + " must be square");

    if (!onCdn.has(entry.file.replace(/^public\//, ""))) missingFromCdn.push(entry.key);
  }

  assert.deepEqual(missingFromCdn, [], "these previews are in the repository but not in the bucket");
});

test("objects that are on R2 but not in the repository are named as such", () => {
  const fromRepo = manifest.objects.filter((object) => object.source !== null);
  const cdnOnly = manifest.objects.filter((object) => object.source === null);

  assert.ok(cdnOnly.length > 0, "the Storage migration copied objects into R2 that no repository file backs");

  // Anything the catalogue can point at must have a repository file: a model_url is a repository path,
  // so an entry with no source would be an asset the site can never serve in Demo Mode.
  for (const object of fromRepo) {
    assert.ok(object.key.length > 0);
  }

  // The two groups the Storage migration created, asserted as invariants rather than as counts: the
  // orphan list **shrinks** every time one of those species is added to the catalogue and its model
  // appears in the repository, so a hard-coded number here would fail on exactly the work it is meant
  // to be watching. (It did: meerkat moved from CDN-only to repository-backed and broke this test.)
  const originals = cdnOnly.filter((object) => object.key.startsWith("originals/"));
  assert.equal(originals.length, 9, "9 pre-compression originals were preserved beside the served files");

  // A model with no repository file must really have none — that is what `source: null` claims.
  for (const object of cdnOnly.filter((entry) => entry.key.startsWith("models/"))) {
    assert.ok(
      !existsSync(join(ROOT, "public", object.key)),
      object.key + " is marked as having no repository file, but public/" + object.key + " exists",
    );
  }

  // An original is the opposite case, and the distinction is the whole reason the prefix exists: the
  // served file at that path **does** exist and is a *different* file — the compressed one the site
  // ships. If the two were ever equal, the copy was pointless and something went wrong during the move.
  for (const object of cdnOnly.filter((entry) => entry.key.startsWith("originals/"))) {
    const served = object.key.replace(/^originals\//, "");
    const servedPath = join(ROOT, "public", served);
    assert.ok(existsSync(servedPath), object.key + " was parked as an original but " + served + " is not in the repository");
    assert.notEqual(
      statSync(servedPath).size,
      object.bytes,
      served + " and its parked original have identical sizes — nothing was preserved",
    );
  }

  // And the other direction: an entry that claims a repository file must have one, because a
  // `model_url` in the catalogue is a repository path — an entry pointing at nothing would be an asset
  // the site cannot serve in Demo Mode.
  for (const object of fromRepo) {
    assert.ok(existsSync(join(ROOT, object.source)), object.source + " is claimed but missing");
  }
});

test("the pushed catalogue is the one the repository ships", async () => {
  const { collectModels, collectSounds } = await import("./r2-push.mjs");

  // `source !== null` because the bucket also holds 35 models that no repository file backs — they came
  // out of Supabase Storage and are recorded, but counting them here would compare the repository
  // against something it is not.
  const models = await collectModels();
  const pushedModels = manifest.objects.filter((object) => object.key.startsWith("models/") && object.source !== null);
  assert.equal(models.length, pushedModels.length, "every model in public/models must be in the bucket");

  const sounds = await collectSounds();
  const pushedSounds = manifest.objects.filter((object) => object.key.startsWith("sounds/") && object.source !== null);
  assert.equal(sounds.length, pushedSounds.length, "every recording in public/sounds must be in the bucket");
});

test("three Supabase buckets became one R2 bucket, and the old name is the prefix", () => {
  // animal-assets is the exception: its paths were already namespaced, which is the reason every
  // storage_path written before R2 existed is still a valid R2 key.
  assert.equal(r2KeyFor("animal-assets", "models/lion.glb"), "models/lion.glb");
  assert.equal(r2KeyFor("animal-assets", "uploads/inbox/a.glb"), "uploads/inbox/a.glb");
  assert.equal(r2KeyFor("animal-sounds", "lion.ogg"), "sounds/lion.ogg");
  assert.equal(r2KeyFor("manga-panels", "user/chapter/panel.png"), "panels/user/chapter/panel.png");

  // A leading slash would produce a key with an empty first segment.
  assert.equal(r2KeyFor("animal-sounds", "/lion.ogg"), "sounds/lion.ogg");
});

test("a panel URL and a panel key round-trip, on both hosts", () => {
  const key = "panels/u_1/c_2/panel.png";
  assert.equal(panelKey("u_1/c_2/panel.png"), key);

  // Written after the move: an R2 public URL.
  assert.equal(panelObjectPath("https://pub-test.r2.dev/panels/u_1/c_2/panel.png"), "u_1/c_2/panel.png");

  // Written before it: a Supabase Storage URL. A row from last year must still be deletable, which is
  // the only reason this second marker exists.
  assert.equal(
    panelObjectPath("https://abc.supabase.co/storage/v1/object/public/manga-panels/u_1/c_2/panel.png"),
    "u_1/c_2/panel.png",
  );

  // A query string is not part of the path, and neither is an unrelated URL.
  assert.equal(panelObjectPath("https://pub-test.r2.dev/panels/u_1/p.png?token=x"), "u_1/p.png");
  assert.equal(panelObjectPath("https://example.com/whatever.png"), null);

  // The round trip is what the delete path actually does.
  assert.equal(panelKey(panelObjectPath("https://pub-test.r2.dev/" + key)), key);
});

test("a Storage URL is parsed into a bucket and a path, and anything else is refused", () => {
  assert.deepEqual(
    parseStorageUrl("https://abc.supabase.co/storage/v1/object/public/animal-sounds/lion.ogg"),
    { bucket: "animal-sounds", path: "lion.ogg" },
  );
  assert.deepEqual(
    parseStorageUrl("https://abc.supabase.co/storage/v1/object/public/animal-assets/models/lion.glb"),
    { bucket: "animal-assets", path: "models/lion.glb" },
  );

  // An R2 URL is not a Storage URL, and a signed URL of some other shape must not be mistaken for one.
  assert.equal(parseStorageUrl("https://pub-test.r2.dev/models/lion.glb"), null);
  assert.equal(parseStorageUrl("https://abc.supabase.co/storage/v1/object/sign/animal-assets/x.glb?token=y"), null);
});
