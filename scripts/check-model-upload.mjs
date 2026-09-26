/**
 * The rules for a model an admin brings themselves (Phase 22), checked without a server.
 *
 * The first half runs the pure module against the **real .glb files in the repository**: a parser
 * that only ever sees fixtures it was written for proves nothing, and the files in `public/models/`
 * are the same ones the pipeline ships. The second half reads the source that must not drift from
 * those rules - the SQL, the publish path, the inbox and the two routes - because "a file is
 * published to a species and its card" is a promise made in six places at once.
 *
 *   node --test scripts/check-model-upload.mjs
 */

import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import {
  attributionFor,
  cardEligible,
  fileSizeLabel,
  modelName,
  parseGlb,
  parseSidecar,
  servedPath,
  sidecarName,
  slugFromFilename,
  UPLOAD_LICENSES,
  UPLOAD_PREFIXES,
  validateUploadMeta,
} from "../lib/model-upload.ts";
import { PREVIEW_BUDGET } from "../lib/model-preview.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(join(ROOT, path), "utf8");
const schema = read("supabase/schema.sql");
const publish = read("lib/model-publish.ts");
const ingest = read("lib/upload-ingest.ts");
const scheduler = read("lib/autopilot-scheduler.ts");
const card = read("components/animal/AnimalCard.tsx");
const modelFiles = readdirSync(join(ROOT, "public", "models")).filter((name) => name.endsWith(".glb"));

/** A minimal but real .glb, built here so the parser is tested against a known triangle count. */
function buildGlb(document, { version = 2, declaredBytes = null, jsonChunk = null } = {}) {
  const json = jsonChunk ?? JSON.stringify(document);
  const jsonBytes = new TextEncoder().encode(json.padEnd(Math.ceil(json.length / 4) * 4, " "));
  const total = 12 + 8 + jsonBytes.byteLength;
  const out = new Uint8Array(total);
  const view = new DataView(out.buffer);
  view.setUint32(0, 0x46546c67, true);
  view.setUint32(4, version, true);
  view.setUint32(8, declaredBytes ?? total, true);
  view.setUint32(12, jsonBytes.byteLength, true);
  view.setUint32(16, 0x4e4f534a, true);
  out.set(jsonBytes, 20);
  return out;
}

/* ------------------------------------------------------------------ the parser */

test("every model the repository actually ships parses, and reports its own triangles", () => {
  assert.ok(modelFiles.length >= 20, "expected the shipped catalogue, found " + modelFiles.length + " files");
  for (const name of modelFiles) {
    const result = parseGlb(new Uint8Array(readFileSync(join(ROOT, "public", "models", name))));
    assert.ok(result.ok, name + " did not parse: " + (result.ok ? "" : result.error));
    assert.equal(result.facts.bytes, readFileSync(join(ROOT, "public", "models", name)).byteLength);
    assert.equal(result.facts.version, 2);
    assert.ok(result.facts.triangles > 0, name + " reports " + result.facts.triangles + " triangles");
    assert.ok(result.facts.meshes > 0, name + " has no meshes");
  }
});

test("the triangle count comes from the file's own accessors", () => {
  const glb = buildGlb({
    asset: { version: "2.0", generator: "test" },
    accessors: [{ count: 36 }, { count: 24 }],
    meshes: [
      { primitives: [{ attributes: { POSITION: 1 }, indices: 0, mode: 4 }] },
      { primitives: [{ attributes: { POSITION: 1 } }] },
      { primitives: [{ attributes: { POSITION: 1 }, indices: 0, mode: 0 }] },
    ],
    materials: [{}, {}],
    textures: [{}],
  });

  const result = parseGlb(glb);
  assert.ok(result.ok);
  // 36 indices / 3 + 24 positions / 3, and the POINTS primitive contributes nothing.
  assert.equal(result.facts.triangles, 12 + 8);
  assert.equal(result.facts.meshes, 3);
  assert.equal(result.facts.materials, 2);
  assert.equal(result.facts.textures, 1);
  assert.equal(result.facts.generator, "test");
});

test("a file that is not a .glb is refused with a reason a person can act on", () => {
  const text = new TextEncoder().encode("this is a text file, not a model, but it is long enough");
  const result = parseGlb(text);
  assert.equal(result.ok, false);
  assert.match(result.error, /not a \.glb/);
});

test("a truncated file, a short file and a glTF 1.0 file are each refused", () => {
  const real = new Uint8Array(readFileSync(join(ROOT, "public", "models", modelFiles[0])));
  const truncated = parseGlb(real.slice(0, Math.floor(real.byteLength / 2)));
  assert.equal(truncated.ok, false);
  assert.match(truncated.error, /truncated/);

  assert.match(parseGlb(new Uint8Array(8)).error, /too small/);
  assert.match(parseGlb(new Uint8Array(0)).error, /too small/);

  const old = buildGlb({ asset: { version: "1.0" } }, { version: 1 });
  assert.equal(parseGlb(old).ok, false);
  assert.match(parseGlb(old).error, /version 1 is not supported/);
});

test("a GLB whose JSON chunk is not JSON is refused rather than half-read", () => {
  const broken = buildGlb({}, { jsonChunk: "{not json at all" });
  const result = parseGlb(broken);
  assert.equal(result.ok, false);
  assert.match(result.error, /not valid JSON/);

  const past = buildGlb({ asset: { version: "2.0" } }, { declaredBytes: 4_000_000 });
  assert.equal(parseGlb(past).ok, false);
  assert.match(parseGlb(past).error, /truncated/);
});

/* -------------------------------------------------------------------- the credit */

test("a credit needs a title, an author and a licence from the allow-list", () => {
  assert.deepEqual(UPLOAD_LICENSES, ["CC0", "CC-BY"]);

  assert.match(validateUploadMeta({ author: "A", license: "CC0" }).error, /needs a title/);
  assert.match(validateUploadMeta({ title: "T", license: "CC0" }).error, /needs an author/);
  assert.match(validateUploadMeta({ title: "T", author: "A" }).error, /licence must be one of CC0, CC-BY/);
  assert.match(validateUploadMeta({ title: "T", author: "A", license: "CC-BY-NC" }).error, /licence must be one of/);
  assert.match(validateUploadMeta({ title: "T", author: "A", license: "unknown" }).error, /licence must be one of/);

  const ok = validateUploadMeta({ title: "  Bengal Tiger  ", author: " A. Person ", license: "CC-BY", sourceUrl: "https://example.org/x" });
  assert.ok(ok.ok);
  assert.equal(ok.meta.title, "Bengal Tiger");
  assert.equal(ok.meta.author, "A. Person");
  assert.equal(ok.meta.sourceUrl, "https://example.org/x");
  assert.equal(ok.meta.note, null, "an absent note is null, not an empty string");
});

test("a source URL that is not http(s) is refused", () => {
  assert.match(validateUploadMeta({ title: "T", author: "A", license: "CC0", sourceUrl: "javascript:alert(1)" }).error, /must start with http/);
  assert.ok(validateUploadMeta({ title: "T", author: "A", license: "CC0", sourceUrl: "" }).ok);
});

test("the sidecar goes through exactly the same rules as the form", () => {
  assert.match(parseSidecar("nope").error, /not a JSON object/);
  assert.match(parseSidecar({ title: "T", author: "A", license: "CC-BY-SA" }).error, /licence must be one of/);
  assert.ok(parseSidecar({ title: "T", author: "A", license: "CC0" }).ok);
});

test("the published credit names the licence and says where it came from", () => {
  const line = attributionFor({ title: "Seal", author: "A. Person", license: "CC-BY", sourceUrl: "https://example.org/seal", note: null });
  assert.equal(line, "Seal by A. Person, CC-BY (https://example.org/seal) - uploaded by an admin");
  const bare = attributionFor({ title: "Seal", author: "A. Person", license: "CC0", sourceUrl: null, note: null });
  assert.equal(bare, "Seal by A. Person, CC0 - uploaded by an admin");
});

/* --------------------------------------------------------------------- the paths */

test("a filename becomes a slug the catalogue can use", () => {
  assert.equal(slugFromFilename("Bengal Tiger (rev 2).GLB"), "bengal-tiger-rev-2");
  assert.equal(slugFromFilename("/tmp/../etc/passwd.glb"), "passwd", "a path never survives");
  assert.equal(slugFromFilename("WEDDELL_SEAL.glb"), "weddell-seal");
  assert.equal(slugFromFilename("....glb"), "");
  assert.equal(sidecarName("lion"), "lion.json");
  assert.equal(modelName("lion"), "lion.glb");
});

test("a stored model gets a timestamped path, so replacing one is never a stale cache hit", () => {
  const early = servedPath("lion", new Date("2026-09-25T16:45:00.000Z"));
  const late = servedPath("lion", new Date("2026-09-25T17:45:00.000Z"));
  assert.equal(early, UPLOAD_PREFIXES.served + "/lion-20260925-164500.glb");
  assert.notEqual(early, late);
  assert.match(late, /\.glb$/);
});

test("the card budget is the one lib/model-preview.ts already owns", () => {
  assert.equal(cardEligible(1_000_000, 50_000), true);
  assert.equal(cardEligible(PREVIEW_BUDGET.bytes, PREVIEW_BUDGET.faces), true, "exactly at the budget is inside it");
  assert.equal(cardEligible(PREVIEW_BUDGET.bytes + 1, 1_000), false);
  assert.equal(cardEligible(1_000, PREVIEW_BUDGET.faces + 1), false);
  assert.equal(cardEligible(0, 0), false, "a file with no bytes is not previewable");
});

test("sizes are printed the way the panel prints them", () => {
  assert.equal(fileSizeLabel(1_048_576), "1.0 MB");
  assert.equal(fileSizeLabel(341_076), "0.3 MB");
});

/* ------------------------------------------------------- the rules that must agree */

test("an upload is budgeted like everything else, through the one choke point", () => {
  assert.match(publish, /rpc\("reserve_model_download",\s*\{[\s\S]{0,120}?p_provider: "upload"/);
  assert.match(publish, /p_approved: true/, "an admin's own file is approved by definition, and still logged");
  assert.match(publish, /decision\.allowed !== true/, "the database's answer is what decides");
  // ("force: true" is the `rm` option in the temporary directory, not a flag on the budget.)
  assert.ok(!/skipBudget|bypassBudget|options\.force|if \(force\)/.test(publish), "there is no flag that skips the budget");
  assert.match(schema, /'upload'\]/, "the policy default knows the provider name 'upload'");
  assert.match(schema, /array_append\(providers_allowed, 'upload'\)/, "and an existing project is widened idempotently");
});

test("a failed upload hands its slot back instead of quietly keeping it", () => {
  const settlements = publish.match(/settle_model_download[\s\S]{0,200}?p_outcome: "failed"/g) ?? [];
  assert.ok(settlements.length >= 4, "expected every failure path to settle as failed, found " + settlements.length);
  assert.match(publish, /p_outcome: "downloaded",\s*p_bytes: finalBytes\.byteLength/);
});

test("the measurements come from the file, not from the form", () => {
  assert.match(publish, /const parsed = parseGlb\(input\.bytes\)/);
  assert.match(publish, /const finalParse = parseGlb\(finalBytes\)/, "and again after compression");
  assert.match(publish, /cardEligible\(finalBytes\.byteLength, finalParse\.facts\.triangles\) && drawOnCard/);
  assert.match(publish, /face_count: finalParse\.facts\.triangles/);
  assert.match(publish, /file_size_bytes: finalBytes\.byteLength/);
  assert.ok(!/fields?\.triangles|form\.get\("triangles"\)/.test(publish), "a triangle count from the client is not a measurement");
});

test("publishing wires the species and decides the card, which is why no rebuild is needed", () => {
  assert.match(publish, /update\(\{ model_url: publicUrl, preview_eligible: card \}\)/);
  assert.match(schema, /alter table public\.animals add column if not exists preview_eligible boolean/);
  assert.match(schema, /comment on column public\.animals\.preview_eligible/);
  assert.match(card, /const previewAllowed = animal\.preview_eligible \?\? isPreviewableModel\(animal\.slug\)/);
  assert.match(card, /Boolean\(animal\.model_url\) && previewAllowed/);
});

test("the automatic path refuses a file with no credit, and never retries one it processed", () => {
  const validateAt = ingest.indexOf("validateUploadMeta(sidecarJson)");
  const publishAt = ingest.indexOf("publishUploadedModel({");
  assert.ok(validateAt > 0 && publishAt > validateAt, "the credit is checked before anything is published");

  assert.match(ingest, /if \(!item\.hasSidecar\)[\s\S]{0,200}?continue;/, "no sidecar means no publish");
  assert.match(ingest, /UPLOAD_PREFIXES\.rejected \+ "\/" \+ item\.name \+ "\.reason\.txt"/, "a refusal leaves its reason beside the file");
  assert.match(ingest, /moveObject\(modelPath, UPLOAD_PREFIXES\.published/, "a published file leaves the inbox");
  assert.match(ingest, /remove\(\[from\]\)/, "moving is a copy and a delete, so the inbox really empties");
});

test("the app's clock watches the inbox, so an admin does not have to press anything", () => {
  assert.match(scheduler, /const waiting = await readInbox\(\)/);
  assert.match(scheduler, /ingestInbox\(\{ actor: "scheduler" \}\)/);
  assert.match(scheduler, /MODEL_UPLOADS !== "off"/, "and it can be turned off");
});

test("both doors are admin-only and rate-limited, like every other write in the app", () => {
  const upload = read("app/api/admin/models/upload/route.ts");
  const inbox = read("app/api/admin/models/inbox/route.ts");

  for (const [name, source] of [["upload", upload], ["inbox", inbox]]) {
    assert.match(source, /requireAdmin\(\)/, name + " must check the admin");
    assert.match(source, /guardWrite\(request, \{/, name + " must go through the shared write guard");
    assert.match(source, /rule: \{ limit: \d+, windowMs: [\d_]+ \}/, name + " must carry a rate limit");
  }
  assert.match(upload, /report\.ok \? 200 : 422/, "a refusal is an answer, not a server error");
  assert.match(upload, /file instanceof File/, "and the file is checked before it is read");
});

test("the panel offers both halves, and the inbox shows what is waiting", () => {
  const page = read("app/admin/models/page.tsx");
  assert.match(page, /<ModelUploadForm/);
  assert.match(page, /<UploadInbox items=\{inbox\}/);
  assert.match(page, /readInbox\(\)/);
  const form = read("components/admin/ModelUploadForm.tsx");
  assert.match(form, /accept="\.glb,model\/gltf-binary"/);
  assert.match(form, /UPLOAD_LICENSES\.map/, "the licence list is the allow-list, not a text box");
});
