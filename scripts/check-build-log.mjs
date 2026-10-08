/**
 * The one webpack message this project silences, and proof that it silences only that one.
 *
 *   node --test scripts/check-build-log.mjs
 *
 * `next build` used to print three `Serializing big strings` lines per run. They come from webpack's
 * own cache serialiser, which warns for any cached string over 100 KiB, and the three strings are the
 * sources of `@clerk/backend` (277 KiB) and `@supabase/{auth,storage}-js` (267 and 113 KiB) - all
 * measured with a temporary plugin that printed every module over the threshold, per compilation.
 * None of them is this project's code, and none of them can be made smaller from here, so the line is
 * filtered in `lib/webpack-log-filter.ts`.
 *
 * A filter that drops log lines is exactly the kind of change that should not be trusted on sight:
 * the danger is not that it fails to drop the one message, it is that it quietly swallows others. So
 * this file tests both halves - the message goes, everything else stays, with its `<w> ` marker - and
 * it tests the near-miss: a line that quotes the phrase from some *other* logger must still print.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import {
  BIG_STRING_HINT,
  BIG_STRING_LOGGER,
  isBigStringHint,
  webpackInfrastructureConsole,
} from "../lib/webpack-log-filter.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/** A console that records what reached it, which is what "forwarded" means here. */
function recordingSink() {
  const calls = [];
  const record = (method) => (...args) => calls.push({ method, args });
  return {
    calls,
    sink: { log: record("log"), info: record("info"), warn: record("warn"), error: record("error"), debug: record("debug"), trace: record("trace") },
  };
}

/** Exactly the shape webpack's logger builds: the logger's name prefixed to the first argument. */
const hint = (kib) => ["[webpack.cache." + BIG_STRING_LOGGER + "] " + BIG_STRING_HINT + " (" + kib + "kiB) impacts deserialization performance (consider using Buffer instead and decode when needed)"];

test("the three lines that were measured are the three that are dropped", () => {
  for (const kib of [277, 267, 113]) {
    assert.equal(isBigStringHint(hint(kib)), true, kib + "kiB must be dropped");
  }
});

test("the filter needs the logger as well as the phrase", () => {
  // A different logger quoting the same words is a different message, and it must survive.
  assert.equal(isBigStringHint(["[webpack.something.else] " + BIG_STRING_HINT + " is a phrase"]), false);
  assert.equal(isBigStringHint(["[" + BIG_STRING_LOGGER + "] some other warning"]), false);
  assert.equal(isBigStringHint([]), false);
  assert.equal(isBigStringHint([{ message: BIG_STRING_HINT }]), false, "a non-string first argument is not a message");
});

test("the hint is dropped and every other warn keeps its marker", () => {
  const { calls, sink } = recordingSink();
  const logger = webpackInfrastructureConsole(sink);

  logger.warn(...hint(277));
  assert.equal(calls.length, 0, "the hint must not reach the console");

  logger.warn("[webpack.cache.PackFileCacheStrategy] something else entirely", { detail: 1 });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].method, "warn");
  assert.deepEqual(calls[0].args, ["<w>", "[webpack.cache.PackFileCacheStrategy] something else entirely", { detail: 1 }], "the marker webpack's default console adds has to come back");
});

test("every other level is forwarded untouched", () => {
  const { calls, sink } = recordingSink();
  const logger = webpackInfrastructureConsole(sink);

  logger.log("plain");
  logger.info("[i] info");
  logger.error("[e] error");
  logger.debug("[d] debug");
  logger.trace();

  assert.deepEqual(calls.map((call) => call.method), ["log", "info", "error", "debug", "trace"]);
  assert.deepEqual(calls[0].args, ["plain"], "a forwarded line is passed through byte for byte");
  assert.deepEqual(calls[1].args, ["[i] info"]);
});

test("next.config.ts actually uses it, and only replaces the console", () => {
  const config = readFileSync(join(ROOT, "next.config.ts"), "utf8");

  assert.match(config, /webpackInfrastructureConsole\(console\)/, "the build must install the filter");
  assert.match(config, /import \{ webpackInfrastructureConsole \} from "\.\/lib\/webpack-log-filter"/);
  // The level and the debug filter belong to Next: it sets them when NEXT_WEBPACK_LOGGING asks, and
  // spreading them back is what keeps that working. Overwriting them here would silence whole
  // categories of webpack logging rather than one message.
  assert.match(config, /infrastructureLogging = \{\s*\.\.\.\(config\.infrastructureLogging \?\? \{\}\)/, "the rest of infrastructureLogging must be preserved");
  assert.ok(!/level:\s*"warn"/.test(config), "the filter must not raise the level: that is not a filter");
});
