/**
 * The auto-pilot's skip rule, checked at last (the debt Phase 21 left behind).
 *
 * `lib/autopilot-scheduler.ts` has refused to tick during a build, and refused to tick at all when
 * `MODEL_AUTOPILOT=off`, since the day it was written. Those lines have been running in production
 * builds and deploys ever since, and nothing tested them: `scripts/check-model-upload.mjs` reads the
 * file, but only to assert the two inbox lines further down it.
 *
 * They could not be tested from here because the scheduler opens with the `server-only` package,
 * which throws outside a React Server Component bundle, so no `node --test` file can import it. The
 * decision therefore moved into `lib/autopilot-clock.ts` - a module with no imports at all - and the
 * scheduler now calls it. What this file tests is the rule that really runs, not a copy of it that
 * can drift away from the code.
 *
 * What breaks when a rule here is deleted:
 *
 *   - the build rules: `next build` imports instrumentation.ts, so a build would start downloading
 *     models - from CI, on a machine nobody is watching, for a compiler that is about to exit;
 *   - the `off` rule: the one switch a human sets to be certain this process never downloads;
 *   - the idempotency rule: a second call would leave the first interval ticking with nothing
 *     holding its handle;
 *   - the tick floor: a zero, negative or unreadable `MODEL_AUTOPILOT_TICK_MS` would turn the server
 *     process into a busy loop instead of a clock.
 *
 *   node --test scripts/check-autopilot-clock.mjs
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import {
  AUTOPILOT_TICK_DEFAULT_MS,
  AUTOPILOT_TICK_FLOOR_MS,
  autopilotClockVerdict,
  autopilotTickMs,
} from "../lib/autopilot-clock.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(join(ROOT, path), "utf8");
const scheduler = read("lib/autopilot-scheduler.ts");
const clock = read("lib/autopilot-clock.ts");

/** The verdict for a process that has not started its clock yet. */
const cold = (env = {}) => autopilotClockVerdict(env, false);

/* ------------------------------------------------------------- whether to start */

test("with nothing set the clock may start, and the database still has the last word", () => {
  // Being allowed to start is not the same as downloading: the tick reads the `model_autopilot` row,
  // which is off in every fresh clone, so this is permission rather than an action.
  assert.equal(cold({}).start, true);
  assert.equal(cold({ NEXT_PHASE: "phase-production-server" }).start, true);
});

test("MODEL_AUTOPILOT=off ends the question, and it wins over a build", () => {
  const off = cold({ MODEL_AUTOPILOT: "off" });
  assert.equal(off.start, false, "the switch a human sets must be obeyed");
  assert.match(off.reason, /MODEL_AUTOPILOT/, "the log must name the variable that did it");

  // The order is load-bearing, and this is the one case where it is visible: an operator who turned
  // the clock off, in a process that is also a build, must read about their own switch rather than
  // about a build they may not know about.
  const offDuringBuild = autopilotClockVerdict(
    { MODEL_AUTOPILOT: "off", NEXT_PHASE: "phase-production-build", npm_lifecycle_event: "build" },
    false,
  );
  assert.equal(offDuringBuild.start, false);
  assert.match(offDuringBuild.reason, /MODEL_AUTOPILOT/);

  // The comparison is exact and has always been: only the word "off" is off.
  for (const value of ["OFF", "Off", "0", "false", "", "maybe"]) {
    assert.equal(cold({ MODEL_AUTOPILOT: value }).start, true, value + " is not the word off");
  }
});

test("a production build does not start the clock, and says why", () => {
  // Without this rule, `next build` - which imports instrumentation.ts to register the runtime -
  // would start a clock inside the compiler.
  const build = cold({ NEXT_PHASE: "phase-production-build" });
  assert.equal(build.start, false);
  assert.match(build.reason, /build/, "the reason must say it is a build, not a server");
});

test("npm_lifecycle_event=build is a build too, and that is the one CI hits", () => {
  // `npm run build` exports npm_lifecycle_event=build, and a deploy's build step is where this fires:
  // NEXT_PHASE is a Next-internal variable, so on its own it is not enough.
  const ci = cold({ npm_lifecycle_event: "build" });
  assert.equal(ci.start, false);
  assert.match(ci.reason, /build/);

  // Every other lifecycle event is a server: `npm start` after a build must still tick.
  for (const event of ["start", "dev", "test", "secrets:report"]) {
    assert.equal(cold({ npm_lifecycle_event: event }).start, true, event + " is not a build");
  }
});

test("a clock that is already ticking is never started a second time", () => {
  // Two intervals would double every round's cadence, and the first timer would keep running with no
  // handle left to stop it.
  const again = autopilotClockVerdict({}, true);
  assert.equal(again.start, false);
  assert.match(again.reason, /already started/);

  // The environment rules are still answered first, so the log keeps naming the variable.
  assert.match(autopilotClockVerdict({ MODEL_AUTOPILOT: "off" }, true).reason, /MODEL_AUTOPILOT/);
  assert.match(autopilotClockVerdict({ npm_lifecycle_event: "build" }, true).reason, /build/);
});

/* ------------------------------------------------------------------ the tick floor */

test("the clock can never be told to tick faster than once a minute", () => {
  for (const value of ["1", "1000", "0", "-1", "-60000"]) {
    assert.equal(
      autopilotTickMs({ MODEL_AUTOPILOT_TICK_MS: value }),
      AUTOPILOT_TICK_FLOOR_MS,
      value + " must land on the floor rather than on a busy loop",
    );
  }

  // A value that is not a number is not a zero. Before this floor existed, `MODEL_AUTOPILOT_TICK_MS=abc`
  // reached setInterval as NaN - which Node reads as a 1 ms delay - and the server process ticked a
  // thousand times a second.
  for (const junkValue of ["abc", "NaN", ""]) {
    const junk = autopilotTickMs({ MODEL_AUTOPILOT_TICK_MS: junkValue });
    assert.ok(Number.isFinite(junk), junkValue + " produced " + junk + ", which setInterval reads as 1 ms");
    assert.ok(junk >= AUTOPILOT_TICK_FLOOR_MS, junkValue + " produced " + junk + " ms between ticks");
  }

  assert.equal(autopilotTickMs({}), AUTOPILOT_TICK_DEFAULT_MS, "unset is five minutes");
  assert.equal(autopilotTickMs({ MODEL_AUTOPILOT_TICK_MS: "60000" }), 60_000, "exactly the floor is inside it");
  assert.equal(autopilotTickMs({ MODEL_AUTOPILOT_TICK_MS: "900000" }), 900_000, "a slower clock is the knob's whole job");
});

/* --------------------------------------------------- the rule must be the one that runs */

test("the scheduler calls this module, so the rule tested above is the rule that runs", () => {
  // Why this assertion is here at all: every test above would keep passing if someone re-inlined
  // these checks into lib/autopilot-scheduler.ts and left the pure module behind as a decorative
  // copy - and the build guard would be unprotected while the suite showed green. The wiring is part
  // of the rule, so it is asserted like the rest of it.
  assert.match(scheduler, /from "@\/lib\/autopilot-clock"/, "the scheduler must import the pure module");
  assert.match(scheduler, /autopilotClockVerdict\(/, "and call it to decide whether to start");
  assert.match(scheduler, /autopilotTickMs\(/, "and take the tick from it");

  assert.ok(!scheduler.includes("process.env.MODEL_AUTOPILOT ==="), "the off rule must not be inlined beside the call");
  assert.ok(!scheduler.includes("process.env.NEXT_PHASE"), "nor the build rule");
  assert.ok(!scheduler.includes("npm_lifecycle_event"), "nor the CI half of it");

  // And the module has to stay loadable by bare node, which is the only reason it exists: comments do
  // not count, so they are stripped before looking for an import statement.
  const code = clock.replace(/\/\*[\s\S]*?\*\//g, "");
  assert.ok(!/^\s*import\b/m.test(code), "lib/autopilot-clock.ts must import nothing, or this suite cannot load it");
  assert.ok(!/server-only/.test(code), "and it must never pull in the package that breaks node --test");
});
