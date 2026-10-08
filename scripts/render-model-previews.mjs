#!/usr/bin/env node
/**
 * Render a preview image for every 3D model in the repository.
 *
 *   node scripts/render-model-previews.mjs                 the whole catalogue
 *   node scripts/render-model-previews.mjs --only=lion     keys containing "lion" (repeatable)
 *   node scripts/render-model-previews.mjs --force         re-render what already exists
 *   node scripts/render-model-previews.mjs --limit=10      the first ten, for a smoke test
 *
 * Every .glb under public/models/ becomes a 512x512 WebP with a transparent background at
 * public/previews/<same relative path>.webp, framed and lit the way the app's own viewer frames and
 * lights it — see scripts/render-model-page.html, which is where the fidelity lives and where the
 * reasoning for each copied constant is written down.
 *
 * The shape of the run, and why each piece is the way it is:
 *
 *   - **One Chrome, one tab, 236 models.** Launching a browser per model would spend more time in
 *     process start-up than in rendering, so Chrome is started once and driven over the DevTools
 *     protocol, the same way scripts/audit-frames.mjs drives it. The page exposes
 *     window.renderModel(url); this script calls it and writes what comes back.
 *   - **A failure is never a file.** If a model does not load, or comes back with an empty frame,
 *     the page says so and nothing is written for it. A blank square that counts as success is the
 *     one outcome this pipeline must not produce, because the only way to notice it afterwards is to
 *     open 236 images.
 *   - **Resumable.** An output that already exists and is not empty is skipped and re-described from
 *     disk, so a run that is interrupted — or a catalogue that grows by three models — does not pay
 *     for the 233 that are already done. --force overrides.
 *   - **No new dependencies.** Node builtins for the filesystem and the HTTP server, Chrome for the
 *     rendering, and the repository's own three.js served out of node_modules. Nothing is fetched
 *     from a CDN: the page's import map points at /vendor/three/, and the DRACO decoder at the
 *     vendored public/draco/.
 *
 * Environment: CHROME_PATH, CHROME_PORT, CHROME_KEEP (leave the browser and the server up).
 */

import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream, existsSync } from "node:fs";
import { mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { dirname, extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as sleep } from "node:timers/promises";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const MODELS_DIR = join(ROOT, "public", "models");
const PREVIEWS_DIR = join(ROOT, "public", "previews");
const MANIFEST = join(ROOT, "data", "previews.json");
const SIZE = 512;

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].filter(Boolean);

/* -------------------------------------------------------------------------- */
/* Arguments                                                                  */
/* -------------------------------------------------------------------------- */

const argv = process.argv.slice(2);
const has = (name) => argv.includes("--" + name);
const value = (name, fallback) => {
  const hit = argv.find((arg) => arg.startsWith("--" + name + "="));
  return hit === undefined ? fallback : hit.slice(name.length + 3);
};

if (has("help")) {
  console.log("node scripts/render-model-previews.mjs [--force] [--only=KEY] [--limit=N] [--timeout=MS] [--quiet]");
  process.exit(0);
}

const force = has("force");
const quiet = has("quiet");
/** Every --only=KEY given; a model is kept when its key contains any of them. */
const only = argv.filter((arg) => arg.startsWith("--only=")).map((arg) => arg.slice("--only=".length));
const limit = Number(value("limit", "0")) || 0;
const timeoutMs = Number(value("timeout", "180000")) || 180000;
/** The HTTP port the page is served from. 0 means "whatever is free". */
const port = Number(value("port", "0")) || 0;

/* -------------------------------------------------------------------------- */
/* Small helpers                                                              */
/* -------------------------------------------------------------------------- */

const pad = (text, width) => String(text).padEnd(width);

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " kB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

function formatDuration(ms) {
  if (ms < 1000) return Math.round(ms) + "ms";
  if (ms < 60000) return (ms / 1000).toFixed(1) + "s";
  return Math.floor(ms / 60000) + "m" + String(Math.round((ms % 60000) / 1000)).padStart(2, "0") + "s";
}

async function statOrNull(path) {
  try {
    return await stat(path);
  } catch {
    return null;
  }
}

/** Every .glb under public/models, sorted, as paths relative to it ("landmarks/taj-mahal.glb"). */
async function walkModels(directory) {
  const found = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const full = join(directory, entry.name);
    if (entry.isDirectory()) found.push(...(await walkModels(full)));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith(".glb")) found.push(full);
  }
  return found;
}

/**
 * The size of a WebP, read out of its own container.
 *
 * The driver checks the bytes rather than trusting the page's own report, because "512x512 WebP" is
 * the deliverable and a promise about it is not the same thing as a file that is one. All three
 * WebP layouts are handled: VP8X (extended, which is what an encoder emits when the image has an
 * alpha channel), VP8L (lossless) and VP8 (lossy).
 */
function readWebp(bytes) {
  if (bytes.length < 30) return null;
  if (bytes.toString("ascii", 0, 4) !== "RIFF") return null;
  if (bytes.toString("ascii", 8, 12) !== "WEBP") return null;

  const fourcc = bytes.toString("ascii", 12, 16);

  if (fourcc === "VP8X") {
    const width = 1 + (bytes[24] | (bytes[25] << 8) | (bytes[26] << 16));
    const height = 1 + (bytes[27] | (bytes[28] << 8) | (bytes[29] << 16));
    return { format: "VP8X", width, height };
  }

  if (fourcc === "VP8L") {
    if (bytes[20] !== 0x2f) return null;
    const packed = bytes.readUInt32LE(21);
    return { format: "VP8L", width: 1 + (packed & 0x3fff), height: 1 + ((packed >> 14) & 0x3fff) };
  }

  if (fourcc === "VP8 ") {
    if (bytes[23] !== 0x9d || bytes[24] !== 0x01 || bytes[25] !== 0x2a) return null;
    return { format: "VP8", width: bytes.readUInt16LE(26) & 0x3fff, height: bytes.readUInt16LE(28) & 0x3fff };
  }

  return null;
}

/** Describe an image that is already on disk, for the manifest's skipped entries. */
async function describeFile(path) {
  const bytes = await readFile(path);
  const size = readWebp(bytes);
  if (!size) return null;
  if (size.width !== SIZE || size.height !== SIZE) {
    return { error: size.width + "x" + size.height + " is not " + SIZE + "x" + SIZE };
  }
  return { bytes: bytes.length, width: size.width, height: size.height, md5: createHash("md5").update(bytes).digest("hex") };
}

/* -------------------------------------------------------------------------- */
/* The HTTP server the page is loaded from                                    */
/* -------------------------------------------------------------------------- */

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".wasm": "application/wasm",
  ".glb": "model/gltf-binary",
  ".gltf": "model/gltf+json",
  ".bin": "application/octet-stream",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ktx2": "image/ktx2",
  ".hdr": "image/vnd.radiance",
};

/** Resolve a request path inside a root, refusing anything that climbs out of it. */
function safeJoin(base, tail) {
  const full = resolve(base, tail);
  return full === base || full.startsWith(base + sep) ? full : null;
}

function routePath(pathname) {
  if (pathname === "/" || pathname === "/index.html") return join(HERE, "render-model-page.html");
  if (pathname.startsWith("/models/")) return safeJoin(MODELS_DIR, pathname.slice("/models/".length));
  if (pathname.startsWith("/draco/")) return safeJoin(join(ROOT, "public", "draco"), pathname.slice("/draco/".length));
  // The import map in the page points three and its addons here: the repository's own copy, never a
  // CDN. /vendor/three/build/three.module.js imports ./three.core.js relatively, which lands in the
  // same directory and is served by this same rule.
  if (pathname.startsWith("/vendor/three/")) return safeJoin(join(ROOT, "node_modules", "three"), pathname.slice("/vendor/three/".length));
  return null;
}

const server = createServer((request, response) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, "http://127.0.0.1").pathname);
  } catch {
    response.writeHead(400).end("bad request");
    return;
  }

  const path = routePath(pathname);
  if (!path || !existsSync(path)) {
    response.writeHead(404, { "content-type": "text/plain" }).end("not found");
    return;
  }

  response.writeHead(200, {
    "content-type": MIME[extname(path).toLowerCase()] || "application/octet-stream",
    // No caching: 236 models is a lot to hold in a renderer's cache, and nothing here is loaded twice.
    "cache-control": "no-store",
  });
  const stream = createReadStream(path);
  stream.on("error", () => response.destroy());
  stream.pipe(response);
});

await new Promise((ready) => server.listen(port, "127.0.0.1", ready));
const origin = "http://127.0.0.1:" + server.address().port;

/* -------------------------------------------------------------------------- */
/* Chrome, over the DevTools protocol                                         */
/* -------------------------------------------------------------------------- */

const chromePath = CHROME_CANDIDATES.find((candidate) => existsSync(candidate));
if (!chromePath) {
  console.error("No Chrome found. Set CHROME_PATH to a Chrome or Chromium binary.");
  await new Promise((done) => server.close(done));
  process.exit(2);
}

// A debugging port and a profile directory of this run's own: an interrupted run can leave a Chrome
// holding the port, and the next one then silently talks to the wrong browser. See audit-frames.mjs.
const debugPort = Number(process.env.CHROME_PORT || 0) || 9340 + (process.pid % 200);
const profile = join(process.env.TMPDIR || "/tmp", "kami-previews-" + process.pid);

const chrome = spawn(
  chromePath,
  [
    "--headless=new",
    "--remote-debugging-port=" + debugPort,
    "--user-data-dir=" + profile,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-extensions",
    "--mute-audio",
    "--hide-scrollbars",
    "--window-size=" + SIZE + "," + SIZE,
    // Chrome's own sandbox cannot initialise inside a restricted shell (measured here: "sandbox
    // initialization failed: Operation not permitted", after which the GPU and network services
    // crash-loop and the browser exits before its debugging port answers). scripts/r2-browser-probe.mjs
    // passes --no-sandbox for the same reason. The crash reporter is off because its directory is
    // outside anything this script may write to.
    "--no-sandbox",
    "--disable-gpu-sandbox",
    "--disable-crash-reporter",
    // Software WebGL, permitted rather than forced. Headless Chrome refuses to fall back to
    // SwiftShader without this flag on a machine where the GPU process cannot start, and that
    // failure mode is an empty catalogue rather than an error anybody can read.
    "--enable-unsafe-swiftshader",
    "about:blank",
  ],
  { stdio: ["ignore", "ignore", process.env.DEBUG_CHROME ? "inherit" : "ignore"] },
);

let chromeGone = false;
chrome.on("exit", (code, signal) => {
  chromeGone = true;
  // The browser is gone, so nothing it was asked for is still coming. Without this, a run whose Chrome
  // died mid-model waits on a promise that can never settle - the "hung with no Chrome process" fault.
  failPending("Chrome exited (code " + code + ", signal " + signal + ") before the page answered");
});

async function devtoolsTarget() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (chromeGone) throw new Error("Chrome exited before it opened its debugging port");
    try {
      const list = await (await fetch("http://127.0.0.1:" + debugPort + "/json/list")).json();
      const page = list.find((entry) => entry.type === "page");
      if (page && page.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch {
      // Not listening yet.
    }
    await sleep(250);
  }
  throw new Error("Chrome never opened its debugging port");
}

let socket = null;
let sequence = 0;
let pending = new Map();
let pageLogs = [];
let connected = false;

/**
 * Fail every request the page will never answer, with the reason it will never be answered.
 *
 * This is the fix for the one incident this script could not explain: a run that **hung with no Chrome
 * process anywhere on the machine**. The socket had been open, the browser was gone, so no reply was
 * ever coming - and a request only had a timeout when its caller passed one, which `Page.enable`,
 * `Runtime.enable` and `Page.navigate` do not. A promise that is never settled is a process that
 * stays alive for ever with nothing to show for it, and that is exactly what the incident looked like
 * from outside: the driver waiting, the browser already dead.
 *
 * Chrome's death and the socket's death are both watched, because either one ends the run and neither
 * one is a state this script can recover from - `recover()` reloads a wedged *page*, and there is no
 * page left to reload.
 */
let fatal = null;

function failPending(reason) {
  fatal = fatal ?? reason;
  const waiting = [...pending.values()];
  pending = new Map();
  for (const settle of waiting) settle({ error: { message: reason } });
}

function connect(webSocketUrl) {
  return new Promise((opened, refused) => {
    socket = new WebSocket(webSocketUrl);
    socket.onopen = () => {
      connected = true;
      opened();
    };
    socket.onerror = (event) => {
      if (!connected) {
        refused(new Error("the DevTools socket refused to open"));
        return;
      }
      failPending("the DevTools socket errored: " + (event?.message ?? String(event?.type ?? "unknown")));
    };
    socket.onclose = (event) =>
      failPending("the DevTools socket closed (" + event.code + (event.reason ? " " + event.reason : "") + ")");
    socket.onmessage = (event) => {
      let message;
      try {
        message = JSON.parse(event.data);
      } catch {
        return;
      }
      if (message.id && pending.has(message.id)) {
        const settle = pending.get(message.id);
        pending.delete(message.id);
        settle(message);
        return;
      }
      // Console errors and uncaught exceptions are the only explanation a failed model gets that the
      // page itself cannot give, so they are kept for the failure line.
      if (message.method === "Runtime.consoleAPICalled" && (message.params.type === "error" || message.params.type === "warning")) {
        pageLogs.push(
          message.params.type + ": " +
            (message.params.args || []).map((arg) => arg.value ?? arg.description ?? arg.type).join(" "),
        );
        if (pageLogs.length > 12) pageLogs.shift();
      }
      if (message.method === "Runtime.exceptionThrown") {
        const details = message.params.exceptionDetails || {};
        pageLogs.push("exception: " + (details.exception?.description || details.text || "unknown"));
        if (pageLogs.length > 12) pageLogs.shift();
      }
    };
  });
}

/**
 * No request is ever left without a timer.
 *
 * A caller that knows how long its answer takes passes its own timeout; the control calls that have no
 * natural one (`Page.enable`, `Runtime.enable`) get this ceiling instead of waiting for ever.
 */
const DEFAULT_SEND_TIMEOUT_MS = 30000;

function send(method, params, timeout) {
  const limit = timeout ?? DEFAULT_SEND_TIMEOUT_MS;
  return new Promise((settled, failed) => {
    const id = ++sequence;
    const timer = setTimeout(() => {
      pending.delete(id);
      failed(new Error(method + " timed out after " + limit + " ms"));
    }, limit);
    pending.set(id, (message) => {
      if (timer) clearTimeout(timer);
      if (message.error) failed(new Error(method + ": " + message.error.message));
      else settled(message.result || {});
    });
    socket.send(JSON.stringify({ id, method, params: params || {} }));
  });
}

async function evaluate(expression, options) {
  const settings = options || {};
  const result = await send(
    "Runtime.evaluate",
    { expression, awaitPromise: Boolean(settings.awaitPromise), returnByValue: true },
    settings.timeout,
  );
  if (result.exceptionDetails) {
    const details = result.exceptionDetails;
    throw new Error(details.exception?.description || details.text || "the page threw");
  }
  return result.result ? result.result.value : undefined;
}

async function openPage() {
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Page.navigate", { url: origin });
  for (let attempt = 0; attempt < 120; attempt += 1) {
    await sleep(250);
    let ready = false;
    let error = null;
    try {
      ready = await evaluate("Boolean(window.__rendererReady)", { timeout: 10000 });
      if (!ready) error = await evaluate("window.__rendererError || null", { timeout: 10000 });
    } catch {
      continue;
    }
    if (error) throw new Error("the render page failed to start: " + error);
    if (ready) return true;
  }
  throw new Error("the render page never reported itself ready");
}

await connect(await devtoolsTarget());
await openPage();

const info = (await evaluate("window.__rendererInfo || null", { timeout: 10000 })) || {};

/* -------------------------------------------------------------------------- */
/* Cleanup                                                                    */
/* -------------------------------------------------------------------------- */

let finished = false;

async function shutdown(code) {
  if (finished) return;
  finished = true;
  try {
    socket?.close();
  } catch {
    // Already gone.
  }
  if (!process.env.CHROME_KEEP) chrome.kill("SIGKILL");
  // Chrome holds keep-alive connections to the server; close() alone would wait for them to time out.
  server.closeAllConnections?.();
  await new Promise((done) => server.close(done));
  if (!process.env.CHROME_KEEP) await rm(profile, { recursive: true, force: true }).catch(() => undefined);
  process.exit(code);
}

process.on("SIGINT", () => {
  console.log("\n  interrupted — the manifest still describes what is on disk");
  void flush().then(() => shutdown(130));
});

/* -------------------------------------------------------------------------- */
/* The run                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Every model in the repository, and then the subset this invocation will actually render.
 *
 * The two are kept apart on purpose. --only and --limit decide what gets *rendered*; they must not
 * decide what the manifest *describes*, or a run for one model would rewrite data/previews.json to
 * describe one model and quietly drop the other 235 that are sitting on disk.
 */
const discovered = (await walkModels(MODELS_DIR))
  .map((full) => {
    const rel = relative(MODELS_DIR, full).split(sep).join("/");
    const key = rel.replace(/\.glb$/i, "");
    return {
      key,
      rel,
      source: "public/models/" + rel,
      file: "public/previews/" + key + ".webp",
      output: join(PREVIEWS_DIR, key + ".webp"),
      url: "/models/" + rel.split("/").map(encodeURIComponent).join("/"),
    };
  })
  .sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));

const catalogue = discovered
  .filter((model) => (only.length === 0 ? true : only.some((needle) => model.key.includes(needle))))
  .slice(0, limit > 0 ? limit : undefined);

if (catalogue.length === 0) {
  console.error("No .glb files matched under public/models/" + (only.length ? " for --only=" + only.join(",") : ""));
  await shutdown(2);
}

console.log("Kami3D model previews");
console.log("  models   : " + catalogue.length + (only.length ? " (filtered by --only=" + only.join(",") + ")" : " under public/models/"));
console.log("  output   : public/previews/**/*.webp  (" + SIZE + "x" + SIZE + ", WebP, transparent)");
console.log("  renderer : three r" + (info.three || "?") + " via " + (info.gpu || "unknown GL") + " in headless Chrome " + (chromePath.split("/").pop() || ""));
console.log("  manifest : data/previews.json");
console.log("");

/** --quiet keeps the per-model lines off; failures and the summary always print. */
const say = (line) => {
  if (!quiet) console.log(line);
};

/** The key column is as wide as the longest key, so a 43-character one cannot shift the status. */
const KEY_WIDTH = catalogue.reduce((best, model) => Math.max(best, model.key.length), 0) + 2;

const entries = [];
const failures = [];
let rendered = 0;
let retried = 0;
let skipped = 0;
let renderedBytes = 0;
const startedRun = Date.now();

/**
 * The manifest, written from what is actually on disk.
 *
 * It is rebuilt from every model's output rather than from this run's successes, so a resumed run
 * (which skips most of them) still produces a complete and identical manifest.
 */
async function flush() {
  const records = [];
  for (const model of discovered) {
    const described = await statOrNull(model.output);
    if (!described || described.size === 0) continue;
    let entry = entries.find((candidate) => candidate.key === model.key);
    if (!entry) {
      const facts = await describeFile(model.output);
      if (!facts || facts.error) continue;
      entry = {
        key: model.key,
        source: model.source,
        file: model.file,
        bytes: facts.bytes,
        width: facts.width,
        height: facts.height,
        md5: facts.md5,
      };
    }
    records.push(entry);
  }

  const total = records.reduce((sum, record) => sum + record.bytes, 0);
  await mkdir(dirname(MANIFEST), { recursive: true });
  await writeFile(
    MANIFEST,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        size: SIZE,
        count: records.length,
        bytes: total,
        entries: records,
      },
      null,
      2,
    ) + "\n",
  );
  return records;
}

/**
 * Put the page back on its feet after a wedge — a model that hung the main thread.
 *
 * Returns false when there is no browser left to reload. A wedged *page* is recoverable; a dead
 * browser is not, and pretending otherwise turns one failure into the remaining 235 reported as
 * broken models.
 */
async function recover() {
  if (fatal) return false;
  pageLogs = [];
  pending = new Map();
  try {
    await evaluate("1", { timeout: 5000 });
    return true;
  } catch {
    // The page is wedged. Reload it; the driver-side loop picks up where it left off.
    if (!quiet) console.log("  the page stopped answering — reloading it");
    await openPage();
    return true;
  }
}

for (let index = 0; index < catalogue.length; index += 1) {
  const model = catalogue[index];
  const position = "[" + pad(index + 1, String(catalogue.length).length) + "/" + catalogue.length + "] " + pad(model.key, KEY_WIDTH);
  const existing = await statOrNull(model.output);

  if (!force && existing && existing.size > 0) {
    const facts = await describeFile(model.output);
    if (facts && !facts.error) {
      entries.push({
        key: model.key,
        source: model.source,
        file: model.file,
        bytes: facts.bytes,
        width: facts.width,
        height: facts.height,
        md5: facts.md5,
      });
      skipped += 1;
      say(position + " skip  " + pad(formatBytes(facts.bytes), 10) + " already rendered");
      continue;
    }
    say(position + " note  the existing file is unusable (" + (facts ? facts.error : "not a WebP") + "); rendering it again");
  }

  const began = Date.now();
  let result;
  let attempts = 0;

  while (true) {
    attempts += 1;
    try {
      result = await evaluate(
        "window.renderModel(" + JSON.stringify(model.url) + ", { timeoutMs: " + timeoutMs + " })",
        { awaitPromise: true, timeout: timeoutMs + 45000 },
      );
    } catch (error) {
      result = { ok: false, reason: "driver: " + error.message };
      if (!(await recover())) {
        // The run stops here, with a sentence rather than a stack trace: the models after this one
        // were never looked at, and reporting them as failures would be a lie about the assets.
        console.log("");
        console.log("  the driver lost the browser: " + fatal);
        console.log("  " + index + " of " + catalogue.length + " models were attempted before it went");
        const soFar = await flush();
        console.log("  images on disk    : " + soFar.length + " of " + discovered.length + " models (the manifest is still complete)");
        await shutdown(1);
      }
    }

    if (!result || typeof result !== "object") {
      result = { ok: false, reason: "the page returned nothing for this model" };
    }

    if (result.ok || attempts >= 2) break;

    // One retry, and only one. A run over 236 models hits the occasional stall that has nothing to
    // do with the asset: measured here, plants/ginkgo timed out at 225 s in the full run and then
    // rendered in 2.6 s on the next one. A retry costs a second and turns a lost image into a
    // rendered one. A genuine failure — a model that will not decode, a frame with nothing in it —
    // fails the second time too, and the reason reported is that second answer.
    say(position + " retry " + result.reason);
    await sleep(500);
  }

  if (result.ok && attempts > 1) retried += 1;

  if (!result.ok) {
    const logs = pageLogs.splice(0, pageLogs.length);
    const reason = String(result.reason || "unknown failure") + (logs.length ? "  [" + logs.join(" | ") + "]" : "");
    failures.push({ key: model.key, reason });
    console.log(position + " FAIL  " + reason);
    continue;
  }

  const base64 = String(result.dataUrl).slice(String(result.dataUrl).indexOf(",") + 1);
  const bytes = Buffer.from(base64, "base64");
  const size = bytes.length > 0 ? readWebp(bytes) : null;

  if (!size) {
    failures.push({ key: model.key, reason: "the page returned " + bytes.length + " bytes that are not a WebP" });
    console.log(position + " FAIL  the page returned bytes that are not a WebP");
    continue;
  }
  if (size.width !== SIZE || size.height !== SIZE) {
    failures.push({ key: model.key, reason: "the encoder produced " + size.width + "x" + size.height });
    console.log(position + " FAIL  the encoder produced " + size.width + "x" + size.height);
    continue;
  }

  await mkdir(dirname(model.output), { recursive: true });
  await writeFile(model.output, bytes);

  const record = {
    key: model.key,
    source: model.source,
    file: model.file,
    bytes: bytes.length,
    width: size.width,
    height: size.height,
    md5: createHash("md5").update(bytes).digest("hex"),
  };
  entries.push(record);
  rendered += 1;
  renderedBytes += bytes.length;

  say(
    position +
      " ok    " +
      pad(formatBytes(bytes.length), 10) +
      pad(formatDuration(result.ms ?? Date.now() - began), 8) +
      pad((result.coverage * 100).toFixed(1) + "% cover", 12) +
      pad("luma " + Math.round(result.luma), 10) +
      pad(size.format, 6) +
      (result.triangles ? Math.round(result.triangles / 1000) + "k tris" : "") +
      (attempts > 1 ? "  (after a retry)" : ""),
  );
}

/* -------------------------------------------------------------------------- */
/* Summary                                                                    */
/* -------------------------------------------------------------------------- */

const records = await flush();
const bytes = records.map((record) => record.bytes);
const total = bytes.reduce((sum, value) => sum + value, 0);
const mean = bytes.length ? total / bytes.length : 0;
const largest = records.reduce((best, record) => (best && best.bytes >= record.bytes ? best : record), null);
const smallest = records.reduce((best, record) => (best && best.bytes <= record.bytes ? best : record), null);

console.log("");
console.log("  rendered this run : " + rendered + "  (" + formatBytes(renderedBytes) + ")");
console.log("  only after retry  : " + retried);
console.log("  skipped, existing : " + skipped);
console.log("  failed            : " + failures.length);
console.log("  images on disk    : " + records.length + " of " + discovered.length + " models");
console.log("  total bytes       : " + formatBytes(total));
console.log("  mean / largest    : " + formatBytes(Math.round(mean)) + " / " + formatBytes(largest ? largest.bytes : 0) +
  (largest ? "  (" + largest.key + ")" : ""));
console.log("  smallest          : " + formatBytes(smallest ? smallest.bytes : 0) + (smallest ? "  (" + smallest.key + ")" : ""));
console.log("  elapsed           : " + formatDuration(Date.now() - startedRun));
console.log("  manifest          : data/previews.json");

if (failures.length > 0) {
  console.log("");
  console.log("  failures:");
  // The key column is as wide as the longest failing key, so a 43-character one cannot run into
  // its own reason.
  const width = failures.reduce((best, failure) => Math.max(best, failure.key.length), 0) + 2;
  for (const failure of failures) console.log("    " + pad(failure.key, width) + failure.reason);
  console.log("");
  console.log("  Nothing was written for those models. Re-run to retry only them" +
    (force ? "" : " (they have no output, so they are never skipped)") + ".");
}

await shutdown(failures.length > 0 ? 1 : 0);
