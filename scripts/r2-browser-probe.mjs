#!/usr/bin/env node
/**
 * Ask a real browser one question: can this origin load a model from the CDN?
 *
 * Reading three's source says FileLoader goes through fetch() (node_modules/three/src/loaders/FileLoader.js),
 * and a cross-origin fetch with no Access-Control-Allow-Origin header is blocked by the browser. That is an
 * argument, not a measurement — and this project has been caught by that difference before. So this script
 * serves scripts/r2-probe-page.html over HTTP (the same shape as the app), has Chrome run the fetch the 3D
 * view would run, and reports what the browser actually said.
 *
 * The audio path is probed separately because the two genuinely differ: SoundButton plays an <audio> element,
 * which works cross-origin with no CORS header at all, while useGLTF cannot.
 *
 *   node scripts/r2-browser-probe.mjs
 *   node scripts/r2-browser-probe.mjs --key=models/hellbender.glb
 *
 * Needs Chrome and network, so it is not part of `npm run check` — same rule as the audit scripts.
 */

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { createR2, describeR2Config, loadEnvFiles, readR2Config } from "./r2.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].filter(Boolean);

await loadEnvFiles();
const config = readR2Config();
if (!config.configured) {
  console.error("R2 chưa được cấu hình: " + config.missing.join(", "));
  process.exit(1);
}

const chromePath = CHROME_CANDIDATES.find((candidate) => existsSync(candidate));
if (!chromePath) {
  console.error("Không tìm thấy Chrome. Đặt CHROME_PATH trỏ tới binary.");
  process.exit(1);
}

const r2 = createR2(config);
const keyFlag = process.argv.find((arg) => arg.startsWith("--key="));
const modelKey = keyFlag ? keyFlag.slice(6) : "models/lion.glb";
const soundKey = "sounds/lion.ogg";

console.log("R2\n  " + describeR2Config(config) + "\n");
console.log("Thử trong Chrome thật: model " + modelKey + " · âm thanh " + soundKey + "\n");

const template = await readFile(join(HERE, "r2-probe-page.html"), "utf8");
const page = template.replace(
  "/*--PROBE-URLS--*/ null",
  JSON.stringify({ model: r2.publicUrl(modelKey), sound: r2.publicUrl(soundKey) }),
);

let chrome = null;
let finished = false;

const server = createServer((request, response) => {
  if (request.method === "POST" && request.url === "/result") {
    let body = "";
    request.on("data", (chunk) => (body += chunk));
    request.on("end", () => {
      response.writeHead(204).end();
      try {
        finish(JSON.parse(body).results);
      } catch (error) {
        finish([]);
      }
    });
    return;
  }
  response.writeHead(200, { "content-type": "text/html; charset=utf-8" }).end(page);
});

function finish(results) {
  if (finished) return;
  finished = true;
  if (chrome) chrome.kill();

  let blocked = 0;
  for (const result of results) {
    if (!result.ok) blocked += 1;
    const bytes = result.bytes >= 0 ? String(result.bytes).padStart(9) + " B" : "          ";
    console.log(
      (result.ok ? "OK    " : "CHẶN  ") + result.name.padEnd(32) + " HTTP " + String(result.status).padEnd(4) +
        bytes + "  " + String(result.ms).padStart(6) + " ms  " + result.detail,
    );
  }

  console.log("");
  if (results.length === 0) {
    console.log("Trình duyệt không trả kết quả nào — thử lại, hoặc kiểm tra Chrome có chạy headless được không.");
  } else if (blocked === 0) {
    console.log("Trình duyệt tải được cả model lẫn âm thanh từ " + config.publicBase + " — cắt sang CDN được.");
  } else {
    console.log(blocked + " đường bị trình duyệt chặn. Với model, nguyên nhân gần như chắc chắn là bucket thiếu CORS rule:");
    console.log("  Cloudflare dashboard → R2 → bucket " + config.bucket + " → Settings → CORS policy → rule: GET, HEAD, origin *");
    console.log("  Khoá S3 hiện có là object-scoped: PutBucketCors trả 403, nên việc này phải làm trong dashboard");
    console.log("  (hoặc tạo token R2 có quyền Admin Read & Write rồi chạy: node scripts/r2.mjs cors).");
  }

  server.close(() => process.exit(blocked === 0 && results.length > 0 ? 0 : 1));
  setTimeout(() => process.exit(blocked === 0 && results.length > 0 ? 0 : 1), 400);
}

server.listen(0, "127.0.0.1", () => {
  const origin = "http://127.0.0.1:" + server.address().port;
  chrome = spawn(
    chromePath,
    ["--headless=new", "--no-first-run", "--no-default-browser-check", "--disable-gpu", "--no-sandbox", "--virtual-time-budget=30000", origin],
    { stdio: ["ignore", "ignore", "ignore"] },
  );
  chrome.on("exit", () => setTimeout(() => finish([]), 300));
});

setTimeout(() => finish([]), 60_000);
