/**
 * Assertions for the two-store theme reconciliation.
 *
 * One preference lives in two places — next-themes’ `kami-theme` key and the settings
 * object — and **both are shared between documents**, which is what made the first
 * version of the reconciler a bug rather than a feature. It compared the two values and
 * re-imposed its own whenever they differed; each document holds its own copy of the
 * settings, so two open tabs argued forever and the page blinked light/dark. Measured
 * on the running app: 20 alternating writes in 25 seconds, still climbing.
 *
 * The rule is pinned here rather than trusted to review, including the part that is
 * easy to “simplify” back into the bug:
 *
 *   edge-triggered   a document reacts to a *change*, never to a standing disagreement
 *   asymmetric       a value that arrived from outside is adopted, never pushed back
 *   one-way per step at most one of `push` / `adopt` per step, so effect order cannot
 *                    decide the outcome
 *
 * The last test runs the old level-triggered rule through the same simulator and asserts
 * that it does *not* settle — a regression test that cannot fail is not one.
 *
 * Run with: npm run check:theme-sync
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import { isThemeValue, nextThemeSync } from "../lib/theme-sync.ts";

const quiet = (step) => step.push === null && step.adopt === null;

/** The rule under test, plus the one it replaced, as interchangeable policies. */
const SHIPPED = (state) => nextThemeSync(state);
const LEVEL_TRIGGERED = (state) => {
  // What SettingsProvider did before: if the two stores disagree, impose our own.
  const { ready, theme, settingsTheme } = state;
  if (!ready || !isThemeValue(theme)) return { push: null, adopt: null, pushed: null, seen: state.seen };
  if (theme !== settingsTheme) return { push: settingsTheme, adopt: null, pushed: null, seen: theme };
  return { push: null, adopt: null, pushed: null, seen: theme };
};

/**
 * Two documents on one origin: one shared `kami-theme`, one settings object *per
 * document* (each tab holds its own copy in memory — the whole reason they can fight).
 */
function simulate(policy, { steps = 200, clickAt = 1 } = {}) {
  const docs = [
    { name: "A", theme: "dark", settingsTheme: "dark", pushed: null, seen: "dark", pushes: 0 },
    { name: "B", theme: "dark", settingsTheme: "dark", pushed: null, seen: "dark", pushes: 0 },
  ];
  const log = [];

  for (let step = 0; step < steps; step += 1) {
    const doc = docs[step % 2];
    // Each document clicks Light once, at the start — the reproducible trigger.
    if (step === clickAt) {
      doc.settingsTheme = "light";
      doc.theme = "light";
      docs.forEach((other) => { if (other !== doc) other.theme = "light"; });
      continue;
    }

    const result = policy({
      ready: true,
      theme: doc.theme,
      settingsTheme: doc.settingsTheme,
      pushed: doc.pushed,
      seen: doc.seen,
    });

    doc.pushed = result.pushed;
    doc.seen = result.seen;
    if (result.adopt) doc.settingsTheme = result.adopt;
    if (result.push) {
      doc.pushes += 1;
      doc.theme = result.push;
      log.push([step, doc.name, result.push]);
      // A write to the shared key reaches the other document as a storage event.
      docs.forEach((other) => { if (other !== doc) other.theme = result.push; });
    }
  }

  return { docs, log, pushes: docs.reduce((total, doc) => total + doc.pushes, 0) };
}

test("nothing happens while the two stores agree", () => {
  const step = nextThemeSync({ ready: true, theme: "dark", settingsTheme: "dark", pushed: null, seen: "dark" });
  assert.ok(quiet(step), "an agreeing pair must produce no work");
  assert.equal(step.seen, "dark", "but the value is still remembered");
});

test("nothing happens before the settings have been read", () => {
  const step = nextThemeSync({ ready: false, theme: "light", settingsTheme: "dark", pushed: null, seen: null });
  assert.ok(quiet(step), "a half-read provider must not move the theme");
});

test("our own preference is pushed once, then treated as landed", () => {
  const first = nextThemeSync({ ready: true, theme: "dark", settingsTheme: "light", pushed: null, seen: "dark" });
  assert.equal(first.push, "light", "the account’s value must reach next-themes");
  assert.equal(first.adopt, null, "and never the other way in the same step");

  const landed = nextThemeSync({ ready: true, theme: "light", settingsTheme: "light", pushed: first.pushed, seen: first.seen });
  assert.ok(quiet(landed), "once it lands there is nothing left to do");
  assert.equal(landed.pushed, null, "and the request is no longer in flight");
});

test("a value from outside is adopted, never pushed back", () => {
  // This is the anti-echo rule: next-themes moved, this document did not ask for it.
  const step = nextThemeSync({ ready: true, theme: "light", settingsTheme: "dark", pushed: null, seen: "dark" });
  assert.equal(step.push, null, "an outside value must not be answered with a write");
  assert.equal(step.adopt, "light", "it is taken as this document’s preference instead");
  assert.equal(step.seen, "light", "and remembered as seen");

  // Even when the two agree there must be no write back to the shared key.
  const agree = nextThemeSync({ ready: true, theme: "light", settingsTheme: "light", pushed: null, seen: "dark" });
  assert.equal(agree.push, null, "adoption that changes nothing still must not echo");
  assert.equal(agree.adopt, null, "and there is nothing to adopt");
});

test("a step never does both things at once", () => {
  const states = [];
  for (const theme of ["light", "dark", "system", null]) {
    for (const settingsTheme of ["light", "dark", "system"]) {
      for (const pushed of ["light", null]) {
        for (const seen of ["light", "dark", null]) {
          states.push({ ready: true, theme, settingsTheme, pushed, seen });
        }
      }
    }
  }

  for (const state of states) {
    const step = nextThemeSync(state);
    assert.ok(
      !(step.push !== null && step.adopt !== null),
      "both directions in one step is the shape of a loop: " + JSON.stringify(state),
    );
    if (step.push) assert.equal(step.push, state.settingsTheme, "a push carries our own value");
    if (step.adopt) assert.equal(step.adopt, state.theme, "an adopt carries theirs");
  }
});

test("the system choice is a value, not a stray class", () => {
  assert.equal(isThemeValue("system"), true, "system is a real preference");
  assert.equal(isThemeValue("Light"), false, "and casing is not a synonym");
  assert.equal(isThemeValue(null), false);

  const step = nextThemeSync({ ready: true, theme: "dark", settingsTheme: "system", pushed: null, seen: "dark" });
  assert.equal(step.push, "system", "it is handed to next-themes as-is, to resolve against the OS");
});

test("two documents settle instead of echoing each other", () => {
  const { docs, log, pushes } = simulate(SHIPPED);

  assert.equal(docs[0].theme, docs[1].theme, "both documents must end on the same theme");
  assert.ok(pushes <= 2, "the exchange must end after one round, saw " + pushes + " writes");
  assert.ok(
    log.every(([step]) => step < 50),
    "no document may still be writing late in the run: " + JSON.stringify(log.slice(-4)),
  );
});

test("the level-triggered rule this replaced never settles", () => {
  // The control: the same simulation, the old rule. If this ever starts converging,
  // the test above has stopped testing anything.
  const { log, pushes } = simulate(LEVEL_TRIGGERED);
  assert.ok(pushes > 20, "the old rule wrote continuously, saw " + pushes);
  assert.ok(
    log.some(([step]) => step > 150),
    "and was still writing at the end of the run, which is the bug that was reported",
  );
});
